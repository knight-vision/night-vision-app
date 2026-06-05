import {
  ScrollView, View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, Modal, Alert, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors, useColors } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { useAuthStore } from '../../store/auth';
import { GlassCard } from '../../components/GlassCard';
import { PunyTouchable } from '../../components/PunyTouchable';
import { MonthCalendar } from '../../components/MonthCalendar';
import { useRouter } from 'expo-router';

const CAST_COLORS = ['#ff6b9d','#00d4ff','#ffd700','#a855f7','#00e5a0','#ff9500','#00c7be','#ff3b30','#34aadc','#4cd964'];
const HOURS = Array.from({ length: 48 }, (_, i) => i);
const MINUTES = ['', '', '', '', '', ''];
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

const ITEM_H = 48; // 1アイテムの高さ
const VISIBLE = 5; // 表示する行数（奇数）
const DRUM_H = ITEM_H * VISIBLE;

// スナップスクロール式ドラムカラム
function DrumColumn({ items, selectedIndex, onSelect }: {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const ref = useRef<FlatList>(null);
  const pad = Math.floor(VISIBLE / 2); // 上下パディング行数

  // 表示用データ（上下にダミー行を追加）
  const padded = [...Array(pad).fill(''), ...items, ...Array(pad).fill('')];

  const onMomentumEnd = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const clamped = Math.max(0, Math.min(idx, items.length - 1));
    onSelect(clamped);
  };

  // 選択変化時にスクロール
  useEffect(() => {
    ref.current?.scrollToOffset({ offset: selectedIndex * ITEM_H, animated: true });
  }, [selectedIndex]);

  return (
    <FlatList
      ref={ref}
      data={padded}
      keyExtractor={(_, i) => String(i)}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      initialScrollIndex={selectedIndex}
      getItemLayout={(_, index) => ({ length: ITEM_H, offset: ITEM_H * index, index })}
      style={{ height: DRUM_H, flex: 1 }}
      onMomentumScrollEnd={onMomentumEnd}
      renderItem={({ item, index }) => {
        const realIndex = index - pad;
        const isSelected = realIndex === selectedIndex;
        const isEmpty = item === '';
        return (
          <PunyTouchable scaleTo={0.95} haptic="light"
            onPress={() => !isEmpty && onSelect(realIndex)}
            style={[ts.drumItem, isSelected && ts.drumItemActive]}
            activeOpacity={isEmpty ? 1 : 0.7}>
            <Text style={[ts.drumText, isSelected && ts.drumTextActive]}>
              {item}
            </Text>
          </PunyTouchable>
        );
      }}
    />
  );
}

// iOSドラムロール風時間選択
function TimeSelector({ value, onChange, label, minHour, minMinute, maxHour }: {
  value: string; onChange: (v: string) => void; label?: string;
  minHour?: number;   // この時刻以降のみ選択可（HOURSのindex単位、未指定なら制限なし）
  minMinute?: number; // minHourと同時刻の場合のみ有効
  maxHour?: number;   // この時刻まで選択可（HOURSのindex単位、未指定なら制限なし）
}) {
  const [modalVisible, setModalVisible] = useState(false);

  const toHourIndex = (v: string): number => {
    const raw = parseInt(v.split(':')[0], 10);
    return isNaN(raw) ? 20 : Math.max(0, Math.min(raw, 47));
  };
  const toMinIndex = (v: string): number => {
    const raw = v.split(':')[1]?.slice(0, 2) ?? '';
    const idx = MINUTES.indexOf(MINUTES.includes(raw) ? raw : '');
    return idx >= 0 ? idx : 0;
  };

  // 選択可能な時間を絞り込む
  const visibleHours = useMemo(() => {
    let hours = HOURS;
    if (minHour !== undefined) hours = hours.filter(h => h >= HOURS[minHour]);
    if (maxHour !== undefined) hours = hours.filter(h => h <= HOURS[maxHour]);
    return hours;
  }, [minHour, maxHour]);
  const visibleMinutes = useMemo(() => {
    if (minMinute === undefined) return MINUTES;
    return MINUTES.slice(minMinute);
  }, [minMinute]);

  const [tempHIdx, setTempHIdx] = useState(() => toHourIndex(value));
  const [tempMIdx, setTempMIdx] = useState(() => toMinIndex(value));

  const hourLabels = visibleHours.map(h => tLabel(h));
  const minLabels  = visibleMinutes.map(m => `${m}分`);

  const currentH = toHourIndex(value);
  const currentM = toMinIndex(value);

  const open = () => {
    // 表示用のindex変換（filteringされたインデックスにマッピング）
    const hInVisible = visibleHours.indexOf(HOURS[currentH]);
    setTempHIdx(hInVisible >= 0 ? hInVisible : 0);
    // 現在の時(currentH)がminHourと同時刻でない場合は分に制限なし
    if (minHour !== undefined && currentH === minHour && minMinute !== undefined) {
      const mInVisible = visibleMinutes.indexOf(MINUTES[currentM]);
      setTempMIdx(mInVisible >= 0 ? mInVisible : 0);
    } else {
      setTempMIdx(MINUTES.indexOf(MINUTES[currentM] || ''));
    }
    setModalVisible(true);
  };

  const confirm = () => {
    const selectedHourValue = visibleHours[tempHIdx];
    const selectedMinuteValue =
      minHour !== undefined && selectedHourValue === HOURS[minHour]
        ? visibleMinutes[tempMIdx]
        : MINUTES[tempMIdx];
    // Supabase time型は0-23のみ。25時→1時に正規化（日付跨ぎを表現）
    const h = String(selectedHourValue >= 24 ? selectedHourValue - 24 : selectedHourValue).padStart(2, '0');
    onChange(`${h}:${selectedMinuteValue}`);
    setModalVisible(false);
  };

  return (
    <>
      <PunyTouchable onPress={open} style={ts.btn} scaleTo={0.96} haptic="light">
        {label && <Text style={ts.btnLabel}>{label}</Text>}
        <Text style={ts.btnValue}>{tLabel(currentH)} {MINUTES[currentM]}分</Text>
        <Ionicons name="time-outline" size={14} color={Colors.gold} />
      </PunyTouchable>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <PunyTouchable style={ts.overlay} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={ts.sheet}>
            <View style={ts.sheetHeader}>
              <PunyTouchable onPress={() => setModalVisible(false)} style={{ padding: 8 }} scaleTo={0.88} haptic="light">
                <Text style={ts.sheetCancel}>キャンセル</Text>
              </PunyTouchable>
              <Text style={ts.sheetTitle}>{label || '時間を選択'}</Text>
              <PunyTouchable onPress={confirm} style={{ padding: 8 }} scaleTo={0.95} haptic="light">
                <Text style={ts.sheetDone}>完了</Text>
              </PunyTouchable>
            </View>

            {/* セレクター枠線 */}
            <View style={{ position: 'relative' }}>
              <View style={ts.selectorLine} pointerEvents="none" />
              <View style={[ts.selectorLine, { top: ITEM_H * (Math.floor(VISIBLE / 2) + 1) }]} pointerEvents="none" />

              <View style={ts.drumRow}>
                <DrumColumn items={hourLabels} selectedIndex={tempHIdx} onSelect={setTempHIdx} />
                <Text style={ts.drumSep}>:</Text>
                <DrumColumn items={minLabels}  selectedIndex={tempMIdx} onSelect={setTempMIdx} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ── オーナー向けシフト管理 ──────────────────────────────────────
function OwnerShiftView({ shopId }: { shopId: string }) {
  const Colors = useColors();
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth()); // 0-indexed
  const [confirmed, setConfirmed] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [casts, setCasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getDateStr(now));
  const [draft, setDraft] = useState<Record<string, { cast_id: string; start_time: string; end_time: string }[]>>({});

  // 初回のみ loading=true。月切替時はバックグラウンドで取得
  const initialLoadDone = useRef(false);

  const load = useCallback(async () => {
    if (!initialLoadDone.current) setLoading(true);
    try {
      const wy = calYear;
      const wm = calMonth + 1;
      // 前月・当月・翌月の3ヶ月分を並列取得してマージ
      const months = [
        { y: wm === 1 ? wy - 1 : wy, m: wm === 1 ? 12 : wm - 1 },
        { y: wy, m: wm },
        { y: wm === 12 ? wy + 1 : wy, m: wm === 12 ? 1 : wm + 1 },
      ];
      const [castRes, ...shiftResults] = await Promise.all([
        fetch(`${API_BASE}/casts?shop_id=${shopId}`),
        ...months.map(({ y, m }) =>
          fetch(`${API_BASE}/confirm-shift?shop_id=${shopId}&year=${y}&month=${m}`)
        ),
      ]);
      const castData = await castRes.json();
      setCasts(Array.isArray(castData) ? castData : []);
      const allConfirmed: any[] = [];
      const allRequests: any[] = [];
      for (const res of shiftResults) {
        const d = await res.json();
        if (Array.isArray(d.confirmed)) allConfirmed.push(...d.confirmed);
        if (Array.isArray(d.requests)) allRequests.push(...d.requests);
      }
      setConfirmed(allConfirmed);
      setRequests(allRequests);
    } catch { } finally {
      setLoading(false);
      initialLoadDone.current = true;
    }
  }, [shopId, calYear, calMonth]);

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
        start_time: req?.start_time?.slice(0, 5) || ':00',
        end_time: req?.end_time?.slice(0, 5) || ':00',
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

  // カレンダーのイベントドット生成
  const calendarEvents: { date: string; color: string }[] = [];
  const allDates = new Set([
    ...confirmed.map((s: any) => s.date),
    ...requests.filter((r: any) => r.status === 'pending').map((r: any) => r.date),
  ]);
  allDates.forEach(date => {
    const conf = confirmed.filter((s: any) => s.date === date);
    const pend = requests.filter((r: any) => r.date === date && r.status === 'pending');
    if (conf.length > 0) calendarEvents.push({ date, color: Colors.green });
    if (pend.length > 0) calendarEvents.push({ date, color: Colors.gold });
  });

  const conf = confirmedOnDate(selectedDate);
  const pend = pendingOnDate(selectedDate);
  const draftEntries = draft[selectedDate] || [];
  const isToday = selectedDate === todayStr;

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
          {pendingCount > 0 && <Text style={styles.summaryDetail}>↓ カレンダーで確認</Text>}
        </View>
      </View>

      {/* 凡例 */}
      <View style={{ flexDirection: 'row', gap: 14, marginBottom: 8, paddingHorizontal: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green }} />
          <Text style={{ fontSize: 11, color: Colors.text3 }}>確定あり</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.gold }} />
          <Text style={{ fontSize: 11, color: Colors.text3 }}>希望あり</Text>
        </View>
      </View>

      {/* 月カレンダー */}
      <MonthCalendar
        events={calendarEvents}
        year={calYear}
        month={calMonth}
        onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); }}
        onDayPress={(d) => setSelectedDate(getDateStr(d))}
        initialSelected={new Date(selectedDate + 'T00:00:00')}
      />

      {/* 確定ボタン */}
      {totalDraft > 0 && (
        <PunyTouchable haptic="success" style={[styles.confirmBtn, { marginBottom: 12 }]} onPress={handleConfirm} disabled={saving}>
          {saving ? <ActivityIndicator color="#1a1200" /> : <Text style={styles.confirmBtnText}>📲 {totalDraft}件のシフトを確定</Text>}
        </PunyTouchable>
      )}

      {/* 選択日の詳細 */}
      <View style={styles.dateBlock}>
        <View style={[styles.dateRow, isToday && styles.dateRowToday, styles.dateRowSelected]}>
          <Text style={[styles.dateLabel, isToday && { color: Colors.gold }]}>{fmtFull(selectedDate)}</Text>
          {isToday && <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>今日</Text></View>}
          {pend.length > 0 && <Text style={styles.pendingBadge}>希望{pend.length}件</Text>}
        </View>

        <View style={styles.datePanel}>
          {/* 希望シフト */}
          {pend.length > 0 && (
            <View style={styles.panelSection}>
              <Text style={styles.panelSectionTitle}>📩 希望シフト</Text>
              {pend.map((req: any) => {
                const ci = casts.findIndex((c: any) => String(c.id) === String(req.cast_id));
                const color = getCastColor(ci);
                return (
                  <View key={req.id} style={[styles.reqRow, { backgroundColor: color + '', borderColor: color + '' }]}>
                    <Text style={[styles.reqCastName, { color }]}>{req.casts?.name}</Text>
                    <Text style={styles.reqTime}>{req.start_time?.slice(0,5)}〜{req.end_time?.slice(0,5)}</Text>
                    {req.note ? <Text style={styles.reqNote}>📝{req.note}</Text> : null}
                    <PunyTouchable style={styles.approveBtn} onPress={() => addToDraft(selectedDate, String(req.cast_id))}>
                      <Text style={styles.approveBtnText}>確定へ</Text>
                    </PunyTouchable>
                    <PunyTouchable onPress={() => handleDeleteRequest(req.id)} style={styles.deleteReqBtn}>
                      <Ionicons name="trash-outline" size={14} color={Colors.red} />
                    </PunyTouchable>
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
                const selected = isInDraft(selectedDate, String(cast.id));
                const hasReq = requests.some((r: any) => String(r.cast_id) === String(cast.id) && r.date === selectedDate);
                const color = getCastColor(ci);
                return (
                  <PunyTouchable key={cast.id}
                    onPress={() => selected ? removeFromDraft(selectedDate, String(cast.id)) : addToDraft(selectedDate, String(cast.id))}
                    style={[styles.castSelectBtn, {
                      backgroundColor: selected ? color : Colors.surface2,
                      borderColor: selected ? color : hasReq ? color + '' : Colors.border,
                    }]}>
                    <Text style={[styles.castSelectBtnText, { color: selected ? '#fff' : hasReq ? color : Colors.text2 }]}>
                      {selected ? '✓ ' : ''}{cast.name}{hasReq && !selected ? ' 📩' : ''}
                    </Text>
                  </PunyTouchable>
                );
              })}
            </View>
          </View>

          {/* 時間設定 */}
          {draftEntries.map(entry => {
            const cast = casts.find((c: any) => String(c.id) === entry.cast_id);
            const ci = casts.findIndex((c: any) => String(c.id) === entry.cast_id);
            const color = getCastColor(ci);
            return (
              <View key={entry.cast_id} style={[styles.timeSetBlock, { backgroundColor: color + '', borderColor: color + '' }]}>
                <Text style={[styles.timeSetName, { color }]}>{cast?.name}</Text>
                <View style={{ gap: 8 }}>
                  <TimeSelector value={entry.start_time} onChange={v => updateDraftTime(selectedDate, entry.cast_id, 'start_time', v)} label="開始" maxHour={23} />
                  <TimeSelector
                    value={entry.end_time}
                    onChange={v => updateDraftTime(selectedDate, entry.cast_id, 'end_time', v)}
                    label="終了"
                    minHour={(() => {
                      const sh = parseInt(entry.start_time.split(':')[0], 10);
                      return HOURS.indexOf(sh);
                    })()}
                  />
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
                    <PunyTouchable style={styles.changeTimeBtn} onPress={() => addToDraft(selectedDate, String(s.cast_id))}>
                      <Text style={styles.changeTimeBtnText}>時間変更</Text>
                    </PunyTouchable>
                    <PunyTouchable onPress={() => Alert.alert('削除確認', `${s.casts?.name}のシフトを削除しますか？`, [
                      { text: 'キャンセル', style: 'cancel' },
                      { text: '削除', style: 'destructive', onPress: () => handleDeleteConfirmed(String(s.cast_id), selectedDate) },
                    ])} style={styles.deleteConfBtn}>
                      <Ionicons name="trash-outline" size={14} color={Colors.red} />
                    </PunyTouchable>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {totalDraft > 0 && (
        <PunyTouchable style={[styles.confirmBtn, { marginTop: 16 }]} onPress={handleConfirm} disabled={saving} scaleTo={0.95} haptic="light">
          {saving ? <ActivityIndicator color="#1a1200" /> : <Text style={styles.confirmBtnText}>📲 {totalDraft}件のシフトを確定</Text>}
        </PunyTouchable>
      )}
    </View>
  );
}

// ── キャスト向けシフト希望提出 ──────────────────────────────────
function CastShiftView({ castId, shopId }: { castId: string; shopId: string }) {
  const Colors = useColors();
  const router = useRouter();
  const [view, setView] = useState<'me' | 'shop'>('me'); // タブ切り替え
  const [shifts, setShifts] = useState<any[]>([]);
  const [confirmedShifts, setConfirmedShifts] = useState<any[]>([]);
  const [allConfirmed, setAllConfirmed] = useState<any[]>([]); // 店舗全体の確定シフト
  const [casts, setCasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selDate, setSelDate] = useState(getDateStr(new Date()));
  const [startTime, setStartTime] = useState('20:00');
  const [endTime, setEndTime] = useState('24:00');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);

  // 初回のみ: 静的データ（希望シフト・キャスト）
  useEffect(() => {
    if (!castId || !shopId) return;
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/cast-shift-request?cast_id=${castId}&shop_id=${shopId}`),
      fetch(`${API_BASE}/casts?shop_id=${shopId}`),
    ]).then(async ([reqRes, castsRes]) => {
      const reqData = await reqRes.json();
      const reqArray = Array.isArray(reqData) ? reqData : (reqData?.requests || []);
      setShifts(reqArray);
      const castData = await castsRes.json();
      setCasts(Array.isArray(castData) ? castData : []);
    }).catch(() => { setShifts([]); }).finally(() => setLoading(false));
  }, [castId, shopId]);

  // 月切替時: 確定シフトのみバックグラウンドで再フェッチ（loading は維持）
  useEffect(() => {
    if (!shopId || !castId) return;
    fetch(`${API_BASE}/confirm-shift?shop_id=${shopId}&year=${calYear}&month=${calMonth}`)
      .then(r => r.json())
      .then(confData => {
        const confirmed = Array.isArray(confData) ? confData : (confData?.confirmed || []);
        setAllConfirmed(confirmed);
        setConfirmedShifts(confirmed.filter((s: any) => String(s.cast_id) === castId));
      }).catch(() => { setAllConfirmed([]); setConfirmedShifts([]); });
  }, [castId, shopId, calYear, calMonth]);

  // 希望シフト提出後などに手動再ロード用
  const load = useCallback(async () => {
    if (!castId || !shopId) return;
    try {
      const [reqRes, confRes] = await Promise.all([
        fetch(`${API_BASE}/cast-shift-request?cast_id=${castId}&shop_id=${shopId}`),
        fetch(`${API_BASE}/confirm-shift?shop_id=${shopId}&year=${calYear}&month=${calMonth}`),
      ]);
      const reqData = await reqRes.json();
      setShifts(Array.isArray(reqData) ? reqData : (reqData?.requests || []));
      const confData = await confRes.json();
      const confirmed = Array.isArray(confData) ? confData : (confData?.confirmed || []);
      setAllConfirmed(confirmed);
      setConfirmedShifts(confirmed.filter((s: any) => String(s.cast_id) === castId));
    } catch {}
  }, [castId, shopId, calYear, calMonth]);

  const handleSubmit = async () => {
    // 過去日は提出不可
    const todayStr2 = getDateStr(new Date());
    if (selDate < todayStr2) {
      Alert.alert('提出できません', '過去の日にはシフト希望を出せません');
      return;
    }
    // 確定シフトと重複する日はブロック
    if (confirmedShifts.some((s: any) => s.date === selDate)) {
      Alert.alert('提出できません', 'この日はすでに確定シフトがあります');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/cast-shift-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cast_id: castId,
          shop_id: shopId,
          requests: [{ date: selDate, start_time: startTime, end_time: endTime, note }],
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        Alert.alert('エラー', data.error || '提出に失敗しました');
        return;
      }
      Alert.alert('提出しました');
      setModalVisible(false);
      load();
    } catch {
      Alert.alert('エラー', '提出に失敗しました');
    } finally { setSubmitting(false); }
  };

  // カレンダー用イベント生成
  const calendarEvents = useMemo(() => {
    const evts: { date: string; color: string }[] = [];
    confirmedShifts.forEach(s => evts.push({ date: s.date, color: Colors.green }));
    shifts.forEach(s => {
      if (!confirmedShifts.some(c => c.date === s.date)) {
        evts.push({ date: s.date, color: Colors.gold });
      }
    });
    return evts;
  }, [confirmedShifts, shifts]);
  const confirmedDates = confirmedShifts.map(s => s.date);

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;

  return (
    <View>
      {/* サブタブ：自分 / 店舗全体 */}
      <View style={styles.subTabRow}>
        <PunyTouchable haptic="light" style={[styles.subTab, view === 'me' && styles.subTabActive]} onPress={() => setView('me')}>
          <Text style={[styles.subTabText, view === 'me' && styles.subTabTextActive]}>📅 自分のシフト</Text>
        </PunyTouchable>
        <PunyTouchable haptic="light" style={[styles.subTab, view === 'shop' && styles.subTabActive]} onPress={() => setView('shop')}>
          <Text style={[styles.subTabText, view === 'shop' && styles.subTabTextActive]}>🏪 店舗全体</Text>
        </PunyTouchable>
      </View>

      {view === 'shop' ? (
        <ShopShiftView allConfirmed={allConfirmed} casts={casts} calYear={calYear} calMonth={calMonth}
          onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m + 1); }} />
      ) : (
        <>
      {/* 凡例 */}
      <View style={{ flexDirection: 'row', gap: 14, marginBottom: 8, paddingHorizontal: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green }} />
          <Text style={{ fontSize: 11, color: Colors.text3 }}>確定</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.gold }} />
          <Text style={{ fontSize: 11, color: Colors.text3 }}>提出中</Text>
        </View>
      </View>

      {/* 月カレンダー */}
      <MonthCalendar
        events={calendarEvents}
        year={calYear}
        month={calMonth - 1}
        onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m + 1); }}
        onDayPress={(d) => {
          const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          const todayStr = getDateStr(new Date());
          if (dateStr < todayStr) {
            Alert.alert('過去の日付', '過去の日にはシフト希望を出せません');
            return;
          }
          if (confirmedDates.includes(dateStr)) {
            Alert.alert('確定済み', 'この日はすでに確定シフトがあります');
            return;
          }
          setSelDate(dateStr);
          setModalVisible(true);
        }}
      />

      <PunyTouchable haptic="medium" style={styles.addShiftBtn} onPress={() => setModalVisible(true)}>
        <Ionicons name="add-circle-outline" size={18} color={Colors.gold} />
        <Text style={styles.addShiftBtnText}>シフト希望を追加</Text>
      </PunyTouchable>

      {/* 確定シフト */}
      {confirmedShifts.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.listSectionTitle}>📌 確定シフト（タップで給与確認）</Text>
          {confirmedShifts.sort((a, b) => a.date.localeCompare(b.date)).map((s: any) => (
            <PunyTouchable key={s.id} scaleTo={0.97} haptic="light"
              onPress={() => router.push({ pathname: '/(tabs)/results', params: { date: s.date } })}>
              <View style={[styles.shiftItem, { borderLeftWidth: 3, borderLeftColor: Colors.green }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shiftDate}>{s.date}</Text>
                  <Text style={styles.shiftTime}>{s.start_time?.slice(0,5)}〜{s.end_time?.slice(0,5)}</Text>
                </View>
                <View style={{ backgroundColor: 'rgba(78,203,138,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginRight: 4 }}>
                  <Text style={{ fontSize: 12, color: Colors.green, fontWeight: '600' }}>確定済み</Text>
                </View>
                <Text style={{ fontSize: 16, color: Colors.text3 }}>›</Text>
              </View>
            </PunyTouchable>
          ))}
        </View>
      )}

      {/* 提出中シフト */}
      {shifts.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.listSectionTitle}>📩 提出中のシフト希望</Text>
          {shifts.sort((a, b) => a.date.localeCompare(b.date)).map((s: any) => (
            <View key={s.id} style={[styles.shiftItem, { borderLeftWidth: 3, borderLeftColor: Colors.gold }]}>
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
        </View>
      )}

      {confirmedShifts.length === 0 && shifts.length === 0 && (
        <Text style={{ fontSize: 13, color: Colors.text3, textAlign: 'center', paddingVertical: 20 }}>
          この月のシフトはありません
        </Text>
      )}

      {/* 希望提出モーダル */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <PunyTouchable onPress={() => setModalVisible(false)} style={styles.modalClose}>
              <Ionicons name="close" size={22} color={Colors.text2} />
            </PunyTouchable>
            <Text style={styles.modalTitle}>シフト希望を提出</Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView style={{ padding: 20 }}>
            <Text style={styles.modalLabel}>日付</Text>
            <MonthCalendar
              year={calYear}
              month={calMonth - 1}
              onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m + 1); }}
              onDayPress={(d) => {
                const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                const todayStr = getDateStr(new Date());
                if (ds < todayStr) {
                  Alert.alert('過去の日付', '過去の日にはシフト希望を出せません');
                  return;
                }
                if (confirmedShifts.some((s: any) => s.date === ds)) {
                  Alert.alert('確定済み', 'この日はすでに確定シフトがあります');
                  return;
                }
                setSelDate(ds);
              }}
              initialSelected={new Date(selDate + 'T00:00:00')}
              events={calendarEvents}
            />
            <Text style={[styles.modalLabel, { marginTop: 8 }]}>選択日: <Text style={{ color: Colors.gold }}>{selDate}</Text></Text>

            <Text style={[styles.modalLabel, { marginTop: 16 }]}>開始時間</Text>
            <TimeSelector value={startTime} onChange={setStartTime} label="開始" maxHour={23} />

            <Text style={[styles.modalLabel, { marginTop: 16 }]}>終了時間</Text>
            <TimeSelector
              value={endTime}
              onChange={setEndTime}
              label="終了"
              minHour={(() => {
                // startTime "20:00" → HOURSの中で20のindexを返す
                const sh = parseInt(startTime.split(':')[0], 10);
                return HOURS.indexOf(sh);
              })()}
              minMinute={(() => {
                const sm = startTime.split(':')[1] || '';
                return MINUTES.indexOf(sm);
              })()}
            />

            <PunyTouchable style={styles.submitBtn} onPress={handleSubmit} disabled={submitting} scaleTo={0.95} haptic="light">
              {submitting ? <ActivityIndicator color="#1a1200" /> : <Text style={styles.submitBtnText}>提出する</Text>}
            </PunyTouchable>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
      </>
      )}
    </View>
  );
}

// ── 店舗全体シフト表示（キャスト向け閲覧専用） ─────────────────
function ShopShiftView({ allConfirmed, casts, calYear, calMonth, onMonthChange }: {
  allConfirmed: any[];
  casts: any[];
  calYear: number;
  calMonth: number;
  onMonthChange: (y: number, m: number) => void;
}) {
  const Colors = useColors();
  const [selDate, setSelDate] = useState(getDateStr(new Date()));

  // 各キャストに固定の色
  const events: { date: string; color: string }[] = allConfirmed.map((s: any) => {
    const ci = casts.findIndex((c: any) => String(c.id) === String(s.cast_id));
    return { date: s.date, color: ci >= 0 ? CAST_COLORS[ci % CAST_COLORS.length] : Colors.gold };
  });

  // 選択日の確定シフト
  const dayShifts = allConfirmed.filter((s: any) => s.date === selDate);

  return (
    <View>
      <Text style={{ fontSize: 12, color: Colors.text3, marginBottom: 8, paddingHorizontal: 4 }}>
        店舗全体の確定シフト（タップで詳細）
      </Text>

      <MonthCalendar
        events={events}
        year={calYear}
        month={calMonth - 1}
        onMonthChange={onMonthChange}
        onDayPress={(d) => setSelDate(getDateStr(d))}
        initialSelected={new Date(selDate + 'T00:00:00')}
        maxDots={4}
      />

      <View style={styles.shopDayCard}>
        <Text style={styles.shopDayDate}>{fmtFull(selDate)}</Text>
        {dayShifts.length === 0 ? (
          <Text style={styles.shopDayEmpty}>この日は出勤予定がありません</Text>
        ) : (
          dayShifts.sort((a: any, b: any) => (a.start_time || '').localeCompare(b.start_time || ''))
            .map((s: any) => {
              const ci = casts.findIndex((c: any) => String(c.id) === String(s.cast_id));
              const color = ci >= 0 ? CAST_COLORS[ci % CAST_COLORS.length] : Colors.gold;
              const castName = casts.find((c: any) => String(c.id) === String(s.cast_id))?.name || s.casts?.name || 'キャスト';
              return (
                <View key={s.id} style={[styles.shopShiftRow, { borderLeftColor: color }]}>
                  <View style={[styles.shopCastDot, { backgroundColor: color }]} />
                  <Text style={[styles.shopCastName, { color }]}>{castName}さん</Text>
                  <Text style={styles.shopShiftTime}>{(s.start_time || '').slice(0,5)} 〜 {(s.end_time || '').slice(0,5)}</Text>
                </View>
              );
            })
        )}
      </View>
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
  btn:            { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.18)', paddingHorizontal: 12, paddingVertical: 10 },
  btnLabel:       { fontSize: 11, color: '#eeeeff', marginRight: 4 },
  btnValue:       { fontSize: 14, color: '#ff88cc', fontWeight: '600', flex: 1 },
  overlay:        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet:          { backgroundColor: '#0c0c1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 34 },
  sheetHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(200,180,255,0.18)' },
  sheetCancel:    { fontSize: 15, color: '#eeeeff' },
  sheetTitle:     { fontSize: 15, fontWeight: '600', color: '#eeeeff' },
  sheetDone:      { fontSize: 15, color: '#ff88cc', fontWeight: '600' },
  drumRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0c0c1a' },
  drumItem:       { height: ITEM_H, justifyContent: 'center', alignItems: 'center' },
  drumItemActive: { backgroundColor: 'rgba(255,136,204,0.15)' },
  drumText:       { fontSize: 18, color: '#eeeeff' },
  drumTextActive: { fontSize: 20, color: '#ff88cc', fontWeight: '600' },
  drumSep:        { fontSize: 22, color: '#eeeeff', fontWeight: '600', paddingHorizontal: 4, marginBottom: 4 },
  selectorLine:   { position: 'absolute', left: 0, right: 0, top: ITEM_H * Math.floor(VISIBLE / 2), height: ITEM_H, borderTopWidth: 0.5, borderBottomWidth: 0, borderColor: 'rgba(200,180,255,0.18)', backgroundColor: 'rgba(255,255,255,0.05)', zIndex: 0 },
});

const styles = StyleSheet.create({
  // サブタブ
  subTabRow:        { flexDirection: 'row', gap: 8, marginBottom: 14 },
  subTab:           { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.18)' },
  subTabActive:     { backgroundColor: 'rgba(170,136,255,0.15)', borderColor: '#aa88ff' },
  subTabText:       { fontSize: 13, color: '#eeeeff', fontWeight: '500' },
  subTabTextActive: { color: '#aa88ff', fontWeight: '600' },

  // 店舗全体ビュー
  shopDayCard:      { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.18)', padding: 14, marginTop: 4 },
  shopDayDate:      { fontSize: 14, fontWeight: '600', color: '#eeeeff', marginBottom: 10 },
  shopDayEmpty:     { fontSize: 12, color: '#eeeeff', textAlign: 'center', paddingVertical: 12 },
  shopShiftRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderLeftWidth: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, marginBottom: 6 },
  shopCastDot:      { width: 8, height: 8, borderRadius: 4 },
  shopCastName:     { fontSize: 13, fontWeight: '600', flex: 1 },
  shopShiftTime:    { fontSize: 12, color: '#eeeeff', fontWeight: '500' },
  safe:              { flex: 1, backgroundColor: '#0c0c1a' },
  summaryCard:       { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.18)', padding: 12 },
  summaryLabel:      { fontSize: 11, color: '#eeeeff', marginBottom: 4 },
  summaryValue:      { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  summaryDetail:     { fontSize: 11, color: '#eeeeff', marginTop: 2 },
  screenTitle:       { fontSize: 20, fontWeight: '500', color: '#eeeeff', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  scroll:            { paddingHorizontal: 16, paddingBottom: 108 },
  weekNav:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  weekBtn:           { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  weekBtnText:       { fontSize: 13, color: '#eeeeff' },
  weekLabel:         { fontSize: 14, fontWeight: '600', color: '#eeeeff' },
  todayBtn:          { alignSelf: 'flex-end', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 12 },
  todayBtnText:      { fontSize: 12, color: '#eeeeff' },
  confirmBtn:        { backgroundColor: '#ff88cc', borderRadius: 12, height: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  confirmBtnText:    { color: '#1a1200', fontSize: 15, fontWeight: '600' },
  dateBlock:         { borderBottomWidth: 0.5, borderBottomColor: 'rgba(200,180,255,0.18)' },
  dateRow:           { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: 12 },
  dateRowToday:      { backgroundColor: 'rgba(201,168,76,0.05)' },
  dateRowSelected:   { backgroundColor: 'rgba(155,127,232,0.08)' },
  dateLabel:         { fontSize: 14, fontWeight: '600', color: '#eeeeff', minWidth: 100 },
  todayBadge:        { backgroundColor: 'rgba(255,136,204,0.15)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  todayBadgeText:    { fontSize: 10, color: '#ff88cc', fontWeight: '600' },
  pendingBadge:      { backgroundColor: 'rgba(155,127,232,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, color: '#aa88ff' } as any,
  castChip:          { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  castChipText:      { fontSize: 12, fontWeight: '600' },
  datePanel:         { backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, gap: 12 },
  panelSection:      { gap: 8 },
  panelSectionTitle: { fontSize: 11, fontWeight: '600', color: '#eeeeff', textTransform: 'uppercase', letterSpacing: 0.5 },
  reqRow:            { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 0.5, flexWrap: 'wrap' },
  reqCastName:       { fontSize: 13, fontWeight: '600', minWidth: 48 },
  reqTime:           { fontSize: 12, color: '#eeeeff' },
  reqNote:           { fontSize: 11, color: '#eeeeff', flex: 1 },
  approveBtn:        { backgroundColor: 'rgba(78,203,138,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 0.5, borderColor: '#80d8b0' },
  approveBtnText:    { fontSize: 12, color: '#80d8b0', fontWeight: '600' },
  deleteReqBtn:      { padding: 4 },
  castSelectRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  castSelectBtn:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  castSelectBtnText: { fontSize: 13, fontWeight: '600' },
  timeSetBlock:      { borderRadius: 12, borderWidth: 0.5, padding: 12, gap: 8 },
  timeSetName:       { fontSize: 14, fontWeight: '600' },
  timeSetRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeSetLabel:      { fontSize: 11, color: '#eeeeff', marginBottom: 4 },
  timeSetSep:        { color: '#eeeeff', fontSize: 16, marginTop: 16 },
  confirmedRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  confirmedName:     { fontSize: 13, fontWeight: '600', minWidth: 48 },
  confirmedTime:     { fontSize: 12, color: '#eeeeff', flex: 1 },
  changeTimeBtn:     { backgroundColor: 'rgba(255,136,204,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 0.5, borderColor: '#ff88cc' },
  changeTimeBtnText: { fontSize: 12, color: '#ff88cc' },
  deleteConfBtn:     { padding: 4 },
  // キャスト向けカレンダー
  calCard:           { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.18)', padding: 14, marginBottom: 16 },
  calHeader:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calTitle:          { fontSize: 15, fontWeight: '600', color: '#eeeeff' },
  calDayRow:         { flexDirection: 'row', marginBottom: 8 },
  calDayLabel:       { flex: 1, textAlign: 'center', fontSize: 11, color: '#eeeeff', fontWeight: '600' },
  calGrid:           { flexDirection: 'row', flexWrap: 'wrap' },
  calCell:           { width: '.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  calCellShift:      { backgroundColor: 'rgba(255,136,204,0.15)' },
  calCellToday:      { backgroundColor: 'rgba(170,136,255,0.15)' },
  calCellSelected:   { backgroundColor: '#ff88cc' },
  calDayNum:         { fontSize: 13, color: '#eeeeff' },
  calDayNumShift:    { color: '#ff88cc', fontWeight: '600' },
  calDayNumToday:    { color: '#aa88ff', fontWeight: '600' },
  addShiftBtn:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,136,204,0.15)', borderRadius: 12, borderWidth: 0.5, borderColor: '#ff88cc', padding: 14, marginBottom: 16 },
  addShiftBtnText:   { fontSize: 14, color: '#ff88cc', fontWeight: '600' },
  listSectionTitle:  { fontSize: 12, color: '#eeeeff', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 4 },
  shiftItem:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(200,180,255,0.18)' },
  shiftDate:         { fontSize: 14, fontWeight: '600', color: '#eeeeff' },
  shiftTime:         { fontSize: 12, color: '#eeeeff', marginTop: 2 },
  statusBadge:       { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  statusText:        { fontSize: 12, fontWeight: '600' },
  // モーダル
  modalContainer:    { flex: 1, backgroundColor: '#0c0c1a' },
  modalHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(200,180,255,0.18)' },
  modalClose:        { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  modalTitle:        { fontSize: 16, fontWeight: '600', color: '#eeeeff' },
  modalLabel:        { fontSize: 12, color: '#eeeeff', marginBottom: 8 },
  miniCalWrap:       { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.18)', padding: 12 },
  submitBtn:         { backgroundColor: '#ff88cc', borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  submitBtnText:     { color: '#1a1200', fontSize: 15, fontWeight: '600' },
});
