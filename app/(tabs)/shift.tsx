import {
  ScrollView, View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, Modal, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { Colors } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { useAuthStore } from '../../store/auth';

const CAST_COLORS = ['#ff6b9d','#00d4ff','#ffd700','#a855f7','#00e5a0','#ff9500','#00c7be','#ff3b30','#34aadc','#4cd964'];
const HOURS = Array.from({ length: 31 }, (_, i) => i);
const MINUTES = ['00', '10', '20', '30', '40', '50'];
const CAL_DAYS = ['月', '火', '水', '木', '金', '土', '日'];

function getDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getWeekDates(base: string): string[] {
  const b = new Date(base + 'T00:00:00');
  const day = b.getDay();
  const monday = new Date(b);
  monday.setDate(b.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return getDateStr(d);
  });
}
function fmtFull(ds: string) {
  const d = new Date(ds + 'T00:00:00');
  return `${d.getMonth()+1}月${d.getDate()}日(${CAL_DAYS[d.getDay() === 0 ? 6 : d.getDay()-1]})`;
}
function tLabel(h: number) { return h >= 24 ? `翌${h-24}時` : `${h}時`; }
function getCastColor(index: number) { return CAST_COLORS[index % CAST_COLORS.length]; }

// iOSネイティブPickerで時間選択
function TimeSelector({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [tempH, setTempH] = useState(0);
  const [tempM, setTempM] = useState('00');

  // valueから時・分を取得（24時=翌0時などを考慮）
  const parseValue = (v: string) => {
    const parts = v.split(':');
    const hour = parseInt(parts[0]) || 0;
    const min = parts[1]?.slice(0, 2) || '00';
    // HOURS配列のindex（0-30）に変換
    const idx = HOURS.findIndex(hh => hh % 24 === hour % 24 && (hour >= 24 ? hh >= 24 : hh < 24));
    return { h: idx >= 0 ? HOURS[idx] : hour, m: min };
  };

  const { h, m } = parseValue(value);
  const displayLabel = `${tLabel(h)}${m}分`;

  const openPicker = () => {
    setTempH(h);
    setTempM(m);
    setModalVisible(true);
  };

  const confirm = () => {
    const hh = String(tempH % 24).padStart(2, '0');
    onChange(`${hh}:${tempM}`);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity onPress={openPicker} style={ts.btn}>
        {label && <Text style={ts.btnLabel}>{label}</Text>}
        <Text style={ts.btnValue}>{displayLabel}</Text>
        <Ionicons name="time-outline" size={14} color={Colors.gold} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={ts.overlay} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={ts.sheet}>
            <View style={ts.sheetHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
                <Text style={ts.sheetCancel}>キャンセル</Text>
              </TouchableOpacity>
              <Text style={ts.sheetTitle}>{label || '時間を選択'}</Text>
              <TouchableOpacity onPress={confirm} style={{ padding: 4 }}>
                <Text style={ts.sheetDone}>完了</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', height: 200 }}>
              <Picker
                selectedValue={tempH}
                onValueChange={(v) => setTempH(Number(v))}
                style={{ flex: 1 }}
                itemStyle={{ color: '#000', fontSize: 20 }}>
                {HOURS.map(hh => (
                  <Picker.Item key={hh} label={tLabel(hh)} value={hh} />
                ))}
              </Picker>
              <Picker
                selectedValue={tempM}
                onValueChange={(v) => setTempM(String(v))}
                style={{ flex: 1 }}
                itemStyle={{ color: '#000', fontSize: 20 }}>
                {MINUTES.map(mm => (
                  <Picker.Item key={mm} label={`${mm}分`} value={mm} />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ── オーナー向けシフト管理 ──────────────────────────────────────
function OwnerShiftView({ shopId }: { shopId: string }) {
  const [weekBase, setWeekBase] = useState(getDateStr(new Date()));
  const [confirmed, setConfirmed] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [casts, setCasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, { cast_id: string; start_time: string; end_time: string }[]>>({});

  const dates = getWeekDates(weekBase);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const wb = new Date(weekBase + 'T00:00:00');
      const wy = wb.getFullYear(), wm = wb.getMonth() + 1;
      const [r1, castRes] = await Promise.all([
        fetch(`${API_BASE}/confirm-shift?shop_id=${shopId}&year=${wy}&month=${wm}`),
        fetch(`${API_BASE}/casts?shop_id=${shopId}`),
      ]);
      const d1 = await r1.json();
      setConfirmed(Array.isArray(d1.confirmed) ? d1.confirmed : Array.isArray(d1) ? d1 : []);
      setRequests(Array.isArray(d1.requests) ? d1.requests : []);
      const castData = await castRes.json();
      setCasts(Array.isArray(castData) ? castData : []);
    } catch { } finally { setLoading(false); }
  }, [shopId, weekBase]);

  useEffect(() => { load(); }, [load]);

  const confirmedOnDate = (date: string) => confirmed.filter((s: any) => s.date === date);
  const pendingOnDate = (date: string) => requests.filter((s: any) => s.date === date && s.status === 'pending');
  const isInDraft = (date: string, castId: string) => (draft[date] || []).some(e => e.cast_id === castId);

  const addToDraft = (date: string, castId: string) => {
    const req = requests.find((r: any) => String(r.cast_id) === castId && r.date === date);
    setDraft(prev => ({
      ...prev,
      [date]: [...(prev[date] || []).filter(e => e.cast_id !== castId), {
        cast_id: castId,
        start_time: req?.start_time?.slice(0, 5) || '20:00',
        end_time: req?.end_time?.slice(0, 5) || '24:00',
      }],
    }));
  };

  const removeFromDraft = (date: string, castId: string) => {
    setDraft(prev => {
      const n = { ...prev };
      n[date] = (n[date] || []).filter(e => e.cast_id !== castId);
      if (!n[date].length) delete n[date];
      return n;
    });
  };

  const updateDraftTime = (date: string, castId: string, field: 'start_time' | 'end_time', val: string) => {
    setDraft(prev => ({
      ...prev,
      [date]: (prev[date] || []).map(e => e.cast_id === castId ? { ...e, [field]: val } : e),
    }));
  };

  const totalDraft = Object.values(draft).flat().length;

  const handleConfirm = async () => {
    const shifts = Object.entries(draft).flatMap(([date, entries]) =>
      entries.map(e => ({ cast_id: e.cast_id, date, start_time: e.start_time, end_time: e.end_time }))
    );
    if (!shifts.length) { Alert.alert('確定するシフトがありません'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/confirm-shift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: shopId, shifts }),
      });
      if (res.ok) {
        Alert.alert(`${shifts.length}件のシフトを確定しました`);
        setDraft({});
        load();
      } else { Alert.alert('エラー', '確定に失敗しました'); }
    } catch { Alert.alert('エラー', '確定に失敗しました'); } finally { setSaving(false); }
  };

  const handleDeleteConfirmed = async (castId: string, date: string) => {
    try {
      await fetch(`${API_BASE}/confirm-shift`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cast_id: castId, date }),
      });
      load();
    } catch { Alert.alert('エラー', '削除に失敗しました'); }
  };

  const handleDeleteRequest = async (id: string) => {
    try {
      await fetch(`${API_BASE}/cast-shift-request`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      load();
    } catch { }
  };

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;

  const todayStr = getDateStr(new Date());
  const todayConfirmed = confirmed.filter((s: any) => s.date === todayStr);
  const pendingCount = requests.filter((r: any) => r.status === 'pending').length;
  const weekConfirmed = dates.flatMap(date =>
    confirmed.filter((s: any) => s.date === date).map((s: any) => ({ ...s, date }))
  );

  return (
    <View>
      {/* 今日・承認待ちサマリー */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <View style={[styles.summaryCard, { flex: 1 }]}>
          <Text style={styles.summaryLabel}>本日出勤</Text>
          <Text style={[styles.summaryValue, { color: Colors.green }]}>{todayConfirmed.length}名</Text>
          {todayConfirmed.map((s: any) => {
            const cast = casts.find((c: any) => String(c.id) === String(s.cast_id));
            return <Text key={s.id} style={styles.summaryDetail}>{cast?.name} {s.start_time?.slice(0,5)}〜{s.end_time?.slice(0,5)}</Text>;
          })}
        </View>
        <View style={[styles.summaryCard, { flex: 1 }]}>
          <Text style={styles.summaryLabel}>承認待ち</Text>
          <Text style={[styles.summaryValue, { color: pendingCount > 0 ? Colors.gold : Colors.text2 }]}>{pendingCount}件</Text>
          {pendingCount > 0 && <Text style={styles.summaryDetail}>↓ 下のカレンダーで確認</Text>}
        </View>
      </View>

      {/* 週ナビ */}
      <View style={styles.weekNav}>
        <TouchableOpacity onPress={() => { const d = new Date(weekBase + 'T00:00:00'); d.setDate(d.getDate()-7); setWeekBase(getDateStr(d)); }} style={styles.weekBtn}>
          <Ionicons name="chevron-back" size={18} color={Colors.text2} />
          <Text style={styles.weekBtnText}>前週</Text>
        </TouchableOpacity>
        <Text style={styles.weekLabel}>{dates[0].slice(5).replace('-','/')} 〜 {dates[6].slice(5).replace('-','/')}</Text>
        <TouchableOpacity onPress={() => { const d = new Date(weekBase + 'T00:00:00'); d.setDate(d.getDate()+7); setWeekBase(getDateStr(d)); }} style={styles.weekBtn}>
          <Text style={styles.weekBtnText}>次週</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.text2} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => setWeekBase(getDateStr(new Date()))} style={styles.todayBtn}>
        <Text style={styles.todayBtnText}>今週</Text>
      </TouchableOpacity>

      {/* 確定ボタン */}
      {totalDraft > 0 && (
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={saving}>
          {saving ? <ActivityIndicator color="#1a1200" /> : <Text style={styles.confirmBtnText}>📲 {totalDraft}件のシフトを確定</Text>}
        </TouchableOpacity>
      )}

      {/* 日別リスト */}
      {dates.map(date => {
        const conf = confirmedOnDate(date);
        const pend = pendingOnDate(date);
        const draftEntries = draft[date] || [];
        const isSelected = selectedDate === date;
        const today = date === getDateStr(new Date());

        return (
          <View key={date} style={styles.dateBlock}>
            {/* 日付行 */}
            <TouchableOpacity style={[styles.dateRow, today && styles.dateRowToday, isSelected && styles.dateRowSelected]}
              onPress={() => setSelectedDate(isSelected ? null : date)}>
              <Text style={[styles.dateLabel, today && { color: Colors.gold }]}>{fmtFull(date)}</Text>
              {today && <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>今日</Text></View>}
              {pend.length > 0 && <Text style={styles.pendingBadge}>希望{pend.length}件</Text>}
              <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginLeft: 4 }}>
                {conf.map((s: any) => {
                  const ci = casts.findIndex((c: any) => String(c.id) === String(s.cast_id));
                  const color = getCastColor(ci);
                  return (
                    <View key={s.id} style={[styles.castChip, { backgroundColor: color + '33', borderColor: color }]}>
                      <Text style={[styles.castChipText, { color }]}>{s.casts?.name} {s.start_time?.slice(0,5)}〜{s.end_time?.slice(0,5)}</Text>
                    </View>
                  );
                })}
                {draftEntries.map(e => {
                  const cast = casts.find((c: any) => String(c.id) === e.cast_id);
                  const ci = casts.findIndex((c: any) => String(c.id) === e.cast_id);
                  const color = getCastColor(ci);
                  return (
                    <View key={e.cast_id} style={[styles.castChip, { backgroundColor: color + '33', borderColor: color, borderStyle: 'dashed' }]}>
                      <Text style={[styles.castChipText, { color }]}>{cast?.name} {e.start_time}〜{e.end_time}</Text>
                    </View>
                  );
                })}
              </View>
              <Ionicons name={isSelected ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.text3} />
            </TouchableOpacity>

            {/* 展開パネル */}
            {isSelected && (
              <View style={styles.datePanel}>
                {/* 希望シフト */}
                {pend.length > 0 && (
                  <View style={styles.panelSection}>
                    <Text style={styles.panelSectionTitle}>📩 希望シフト</Text>
                    {pend.map((req: any) => {
                      const ci = casts.findIndex((c: any) => String(c.id) === String(req.cast_id));
                      const color = getCastColor(ci);
                      return (
                        <View key={req.id} style={[styles.reqRow, { backgroundColor: color + '11', borderColor: color + '33' }]}>
                          <Text style={[styles.reqCastName, { color }]}>{req.casts?.name}</Text>
                          <Text style={styles.reqTime}>{req.start_time?.slice(0,5)}〜{req.end_time?.slice(0,5)}</Text>
                          {req.note ? <Text style={styles.reqNote}>📝{req.note}</Text> : null}
                          <TouchableOpacity style={styles.approveBtn} onPress={() => addToDraft(date, String(req.cast_id))}>
                            <Text style={styles.approveBtnText}>確定へ</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteRequest(req.id)} style={styles.deleteReqBtn}>
                            <Ionicons name="trash-outline" size={14} color={Colors.red} />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* キャスト選択 */}
                <View style={styles.panelSection}>
                  <Text style={styles.panelSectionTitle}>出勤キャストを選択</Text>
                  <View style={styles.castSelectRow}>
                    {casts.map((cast: any, ci: number) => {
                      const selected = isInDraft(date, String(cast.id));
                      const hasReq = requests.some((r: any) => String(r.cast_id) === String(cast.id) && r.date === date);
                      const color = getCastColor(ci);
                      return (
                        <TouchableOpacity key={cast.id}
                          onPress={() => selected ? removeFromDraft(date, String(cast.id)) : addToDraft(date, String(cast.id))}
                          style={[styles.castSelectBtn, {
                            backgroundColor: selected ? color : Colors.surface2,
                            borderColor: selected ? color : hasReq ? color + '88' : Colors.border,
                          }]}>
                          <Text style={[styles.castSelectBtnText, { color: selected ? '#fff' : hasReq ? color : Colors.text2 }]}>
                            {selected ? '✓ ' : ''}{cast.name}{hasReq && !selected ? ' 📩' : ''}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* 時間設定 */}
                {(draft[date] || []).map(entry => {
                  const cast = casts.find((c: any) => String(c.id) === entry.cast_id);
                  const ci = casts.findIndex((c: any) => String(c.id) === entry.cast_id);
                  const color = getCastColor(ci);
                  return (
                    <View key={entry.cast_id} style={[styles.timeSetBlock, { backgroundColor: color + '11', borderColor: color + '44' }]}>
                      <Text style={[styles.timeSetName, { color }]}>{cast?.name}</Text>
                      <View style={{ gap: 8 }}>
                        <TimeSelector value={entry.start_time} onChange={v => updateDraftTime(date, entry.cast_id, 'start_time', v)} label="開始" />
                        <TimeSelector value={entry.end_time} onChange={v => updateDraftTime(date, entry.cast_id, 'end_time', v)} label="終了" />
                      </View>
                    </View>
                  );
                })}

                {/* 確定済み */}
                {conf.length > 0 && (
                  <View style={styles.panelSection}>
                    <Text style={styles.panelSectionTitle}>📌 確定済み</Text>
                    {conf.map((s: any) => {
                      const ci = casts.findIndex((c: any) => String(c.id) === String(s.cast_id));
                      const color = getCastColor(ci);
                      return (
                        <View key={s.id} style={styles.confirmedRow}>
                          <Text style={[styles.confirmedName, { color }]}>{s.casts?.name}</Text>
                          <Text style={styles.confirmedTime}>{s.start_time?.slice(0,5)}〜{s.end_time?.slice(0,5)}</Text>
                          <TouchableOpacity style={styles.changeTimeBtn} onPress={() => addToDraft(date, String(s.cast_id))}>
                            <Text style={styles.changeTimeBtnText}>時間変更</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => Alert.alert('削除確認', `${s.casts?.name}のシフトを削除しますか？`, [
                            { text: 'キャンセル', style: 'cancel' },
                            { text: '削除', style: 'destructive', onPress: () => handleDeleteConfirmed(String(s.cast_id), date) },
                          ])} style={styles.deleteConfBtn}>
                            <Ionicons name="trash-outline" size={14} color={Colors.red} />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}

      {totalDraft > 0 && (
        <TouchableOpacity style={[styles.confirmBtn, { marginTop: 16 }]} onPress={handleConfirm} disabled={saving}>
          {saving ? <ActivityIndicator color="#1a1200" /> : <Text style={styles.confirmBtnText}>📲 {totalDraft}件のシフトを確定</Text>}
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── キャスト向けシフト希望提出 ──────────────────────────────────
function CastShiftView({ castId, shopId }: { castId: string; shopId: string }) {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selDate, setSelDate] = useState(getDateStr(new Date()));
  const [startTime, setStartTime] = useState('20:00');
  const [endTime, setEndTime] = useState('24:00');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // カレンダー
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/cast-shift-request?cast_id=${castId}&shop_id=${shopId}`);
      const data = await res.json();
      setShifts(Array.isArray(data) ? data : []);
    } catch { setShifts([]); } finally { setLoading(false); }
  }, [castId, shopId]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch(`${API_BASE}/cast-shift-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cast_id: castId, shop_id: shopId, date: selDate, start_time: startTime, end_time: endTime, note }),
      });
      Alert.alert('提出しました');
      setModalVisible(false);
      load();
    } catch { Alert.alert('エラー', '提出に失敗しました'); } finally { setSubmitting(false); }
  };

  // カレンダー生成
  const firstDay = new Date(calYear, calMonth - 1, 1);
  const lastDay = new Date(calYear, calMonth, 0);
  const startPad = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const calDays: (number | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: lastDay.getDate() }, (_, i) => i + 1)];
  const shiftDates = shifts.map(s => s.date);

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;

  return (
    <View>
      {/* カレンダー */}
      <View style={styles.calCard}>
        <View style={styles.calHeader}>
          <TouchableOpacity onPress={() => { const d = new Date(calYear, calMonth-2, 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()+1); }}>
            <Ionicons name="chevron-back" size={20} color={Colors.text2} />
          </TouchableOpacity>
          <Text style={styles.calTitle}>{calYear}年{calMonth}月</Text>
          <TouchableOpacity onPress={() => { const d = new Date(calYear, calMonth, 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()+1); }}>
            <Ionicons name="chevron-forward" size={20} color={Colors.text2} />
          </TouchableOpacity>
        </View>
        <View style={styles.calDayRow}>
          {CAL_DAYS.map(d => <Text key={d} style={styles.calDayLabel}>{d}</Text>)}
        </View>
        <View style={styles.calGrid}>
          {calDays.map((day, i) => {
            if (!day) return <View key={`pad-${i}`} style={styles.calCell} />;
            const dateStr = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const hasShift = shiftDates.includes(dateStr);
            const isToday = dateStr === getDateStr(new Date());
            return (
              <TouchableOpacity key={dateStr} style={[styles.calCell, hasShift && styles.calCellShift, isToday && styles.calCellToday]}
                onPress={() => { setSelDate(dateStr); setModalVisible(true); }}>
                <Text style={[styles.calDayNum, hasShift && styles.calDayNumShift, isToday && styles.calDayNumToday]}>{day}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <TouchableOpacity style={styles.addShiftBtn} onPress={() => setModalVisible(true)}>
        <Ionicons name="add-circle-outline" size={18} color={Colors.gold} />
        <Text style={styles.addShiftBtnText}>シフト希望を追加</Text>
      </TouchableOpacity>

      {/* 提出済みリスト */}
      {shifts.sort((a, b) => a.date.localeCompare(b.date)).map((s: any) => (
        <View key={s.id} style={styles.shiftItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.shiftDate}>{s.date}</Text>
            <Text style={styles.shiftTime}>{s.start_time?.slice(0,5)}〜{s.end_time?.slice(0,5)}</Text>
          </View>
          <View style={[styles.statusBadge, {
            backgroundColor: s.status === 'approved' ? 'rgba(78,203,138,0.15)' : s.status === 'rejected' ? 'rgba(224,92,106,0.15)' : 'rgba(201,168,76,0.15)',
          }]}>
            <Text style={[styles.statusText, {
              color: s.status === 'approved' ? Colors.green : s.status === 'rejected' ? Colors.red : Colors.gold,
            }]}>{s.status === 'approved' ? '承認済み' : s.status === 'rejected' ? '否認' : '審査中'}</Text>
          </View>
        </View>
      ))}

      {/* 希望提出モーダル */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
              <Ionicons name="close" size={22} color={Colors.text2} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>シフト希望を提出</Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView style={{ padding: 20 }}>
            <Text style={styles.modalLabel}>日付</Text>
            {/* 簡易カレンダー選択 */}
            <View style={styles.miniCalWrap}>
              <View style={styles.calHeader}>
                <TouchableOpacity onPress={() => { const d = new Date(calYear, calMonth-2, 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()+1); }}>
                  <Ionicons name="chevron-back" size={18} color={Colors.text2} />
                </TouchableOpacity>
                <Text style={styles.calTitle}>{calYear}年{calMonth}月</Text>
                <TouchableOpacity onPress={() => { const d = new Date(calYear, calMonth, 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()+1); }}>
                  <Ionicons name="chevron-forward" size={18} color={Colors.text2} />
                </TouchableOpacity>
              </View>
              <View style={styles.calDayRow}>
                {CAL_DAYS.map(d => <Text key={d} style={styles.calDayLabel}>{d}</Text>)}
              </View>
              <View style={styles.calGrid}>
                {calDays.map((day, i) => {
                  if (!day) return <View key={`pad2-${i}`} style={styles.calCell} />;
                  const dateStr = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  const isSelected = dateStr === selDate;
                  return (
                    <TouchableOpacity key={dateStr} onPress={() => setSelDate(dateStr)}
                      style={[styles.calCell, isSelected && styles.calCellSelected]}>
                      <Text style={[styles.calDayNum, isSelected && { color: '#1a1200', fontWeight: '700' }]}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <Text style={[styles.modalLabel, { marginTop: 16 }]}>選択日: <Text style={{ color: Colors.gold }}>{selDate}</Text></Text>

            <Text style={[styles.modalLabel, { marginTop: 16 }]}>開始時間</Text>
            <TimeSelector value={startTime} onChange={setStartTime} label="開始" />

            <Text style={[styles.modalLabel, { marginTop: 16 }]}>終了時間</Text>
            <TimeSelector value={endTime} onChange={setEndTime} label="終了" />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#1a1200" /> : <Text style={styles.submitBtnText}>提出する</Text>}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ── メイン ──────────────────────────────────────────────────────
export default function ShiftScreen() {
  const { role, shopId, castId } = useAuthStore();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.screenTitle}>シフト管理</Text>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {role === 'owner' && shopId
          ? <OwnerShiftView shopId={shopId} />
          : castId && shopId
          ? <CastShiftView castId={castId} shopId={shopId} />
          : null
        }
      </ScrollView>
    </SafeAreaView>
  );
}

const ts = StyleSheet.create({
  btn:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 10 },
  btnLabel:    { fontSize: 11, color: Colors.text3, marginRight: 4 },
  btnValue:    { fontSize: 14, color: Colors.gold, fontWeight: '600', flex: 1 },
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:       { backgroundColor: Colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  sheetCancel: { fontSize: 15, color: Colors.text2 },
  sheetTitle:  { fontSize: 15, fontWeight: '600', color: Colors.text },
  sheetDone:   { fontSize: 15, color: Colors.gold, fontWeight: '700' },
});

const styles = StyleSheet.create({
  summaryCard:       { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 0.5, borderColor: Colors.border, padding: 12 },
  summaryLabel:      { fontSize: 11, color: Colors.text3, marginBottom: 4 },
  summaryValue:      { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  summaryDetail:     { fontSize: 11, color: Colors.text2, marginTop: 2 },
  screenTitle:       { fontSize: 20, fontWeight: '500', color: Colors.text, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  scroll:            { paddingHorizontal: 16, paddingBottom: 40 },
  weekNav:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  weekBtn:           { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  weekBtnText:       { fontSize: 13, color: Colors.text2 },
  weekLabel:         { fontSize: 14, fontWeight: '600', color: Colors.text },
  todayBtn:          { alignSelf: 'flex-end', backgroundColor: Colors.surface2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 12 },
  todayBtnText:      { fontSize: 12, color: Colors.text2 },
  confirmBtn:        { backgroundColor: Colors.gold, borderRadius: 12, height: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  confirmBtnText:    { color: '#1a1200', fontSize: 15, fontWeight: '700' },
  dateBlock:         { borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  dateRow:           { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: 12 },
  dateRowToday:      { backgroundColor: 'rgba(201,168,76,0.05)' },
  dateRowSelected:   { backgroundColor: 'rgba(155,127,232,0.08)' },
  dateLabel:         { fontSize: 14, fontWeight: '600', color: Colors.text, minWidth: 100 },
  todayBadge:        { backgroundColor: Colors.goldDim, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  todayBadgeText:    { fontSize: 10, color: Colors.gold, fontWeight: '600' },
  pendingBadge:      { backgroundColor: 'rgba(155,127,232,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, color: Colors.purple } as any,
  castChip:          { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  castChipText:      { fontSize: 12, fontWeight: '700' },
  datePanel:         { backgroundColor: Colors.surface, padding: 14, gap: 12 },
  panelSection:      { gap: 8 },
  panelSectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.text3, textTransform: 'uppercase', letterSpacing: 0.5 },
  reqRow:            { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 0.5, flexWrap: 'wrap' },
  reqCastName:       { fontSize: 13, fontWeight: '700', minWidth: 48 },
  reqTime:           { fontSize: 12, color: Colors.text2 },
  reqNote:           { fontSize: 11, color: Colors.text3, flex: 1 },
  approveBtn:        { backgroundColor: 'rgba(78,203,138,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 0.5, borderColor: Colors.green },
  approveBtnText:    { fontSize: 12, color: Colors.green, fontWeight: '600' },
  deleteReqBtn:      { padding: 4 },
  castSelectRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  castSelectBtn:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  castSelectBtnText: { fontSize: 13, fontWeight: '600' },
  timeSetBlock:      { borderRadius: 12, borderWidth: 0.5, padding: 12, gap: 8 },
  timeSetName:       { fontSize: 14, fontWeight: '700' },
  timeSetRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeSetLabel:      { fontSize: 11, color: Colors.text3, marginBottom: 4 },
  timeSetSep:        { color: Colors.text3, fontSize: 16, marginTop: 16 },
  confirmedRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  confirmedName:     { fontSize: 13, fontWeight: '700', minWidth: 48 },
  confirmedTime:     { fontSize: 12, color: Colors.text2, flex: 1 },
  changeTimeBtn:     { backgroundColor: Colors.goldDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 0.5, borderColor: Colors.gold },
  changeTimeBtnText: { fontSize: 12, color: Colors.gold },
  deleteConfBtn:     { padding: 4 },
  // キャスト向けカレンダー
  calCard:           { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 0.5, borderColor: Colors.border, padding: 14, marginBottom: 16 },
  calHeader:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calTitle:          { fontSize: 15, fontWeight: '600', color: Colors.text },
  calDayRow:         { flexDirection: 'row', marginBottom: 8 },
  calDayLabel:       { flex: 1, textAlign: 'center', fontSize: 11, color: Colors.text3, fontWeight: '600' },
  calGrid:           { flexDirection: 'row', flexWrap: 'wrap' },
  calCell:           { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  calCellShift:      { backgroundColor: Colors.goldDim },
  calCellToday:      { backgroundColor: Colors.purpleDim },
  calCellSelected:   { backgroundColor: Colors.gold },
  calDayNum:         { fontSize: 13, color: Colors.text },
  calDayNumShift:    { color: Colors.gold, fontWeight: '600' },
  calDayNumToday:    { color: Colors.purple, fontWeight: '600' },
  addShiftBtn:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.goldDim, borderRadius: 12, borderWidth: 0.5, borderColor: Colors.gold, padding: 14, marginBottom: 16 },
  addShiftBtnText:   { fontSize: 14, color: Colors.gold, fontWeight: '500' },
  shiftItem:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  shiftDate:         { fontSize: 14, fontWeight: '500', color: Colors.text },
  shiftTime:         { fontSize: 12, color: Colors.text2, marginTop: 2 },
  statusBadge:       { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  statusText:        { fontSize: 12, fontWeight: '600' },
  // モーダル
  modalContainer:    { flex: 1, backgroundColor: Colors.bg },
  modalHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  modalClose:        { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  modalTitle:        { fontSize: 16, fontWeight: '500', color: Colors.text },
  modalLabel:        { fontSize: 12, color: Colors.text2, marginBottom: 8 },
  miniCalWrap:       { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 0.5, borderColor: Colors.border, padding: 12 },
  submitBtn:         { backgroundColor: Colors.gold, borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  submitBtnText:     { color: '#1a1200', fontSize: 15, fontWeight: '600' },
});
