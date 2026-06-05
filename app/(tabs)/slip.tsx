import { GlassCard } from '../../components/GlassCard';
import { PunyTouchable } from '../../components/PunyTouchable';
import {
  ScrollView, View, Text, StyleSheet,
  TextInput, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors, fmtYen , useColors } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { useAuthStore } from '../../store/auth';
import { MonthCalendar } from '../../components/MonthCalendar';

type SlipTab = 'input' | 'sales' | 'menus';

const SHIMEI_TYPES = ['フリー', '場内指名', '本指名'];
const PAYMENT_TYPES = ['現金', 'カード'];
const TAX_RATE = 0.1;
const CAL_DAYS = ['月', '火', '水', '木', '金', '土', '日'];

function getDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmtDateLabel(ds: string) {
  const d = new Date(ds + 'T00:00:00');
  return `${d.getMonth()+1}/${d.getDate()}(${CAL_DAYS[d.getDay() === 0 ? 6 : d.getDay()-1]})`;
}

// ── ミニカレンダー（MonthCalendarラッパー） ─────────────────
function DatePicker({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const initDate = new Date(value + 'T00:00:00');
  const [year, setYear] = useState(initDate.getFullYear());
  const [month, setMonth] = useState(initDate.getMonth());

  return (
    <MonthCalendar
      year={year}
      month={month}
      onMonthChange={(y, m) => { setYear(y); setMonth(m); }}
      onDayPress={(d) => {
        const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        onChange(ds);
      }}
      initialSelected={initDate}
      events={[{ date: value, color: Colors.gold }]}
    />
  );
}

// ── 伝票入力 ──────────────────────────────────────────────────
function SlipInput({ shopId }: { shopId: string }) {
  const [date, setDate] = useState(getDateStr(new Date()));
  const [payment, setPayment] = useState('現金');
  const [casts, setCasts] = useState<any[]>([]);
  const [menus, setMenus] = useState<any[]>([]);
  const [slipCasts, setSlipCasts] = useState<{ cast_id: string; type: string }[]>([{ cast_id: '', type: 'フリー' }]);
  const [slipItems, setSlipItems] = useState<{ name: string; qty: number; price: number }[]>([{ name: '', qty: 1, price: 0 }]);
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [todaySlips, setTodaySlips] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(true);

  const subtotal = slipItems.reduce((s, i) => s + i.qty * i.price, 0);
  const tax = Math.floor(subtotal * TAX_RATE);
  const total = subtotal + tax;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [castRes, menuRes] = await Promise.all([
        fetch(`${API_BASE}/casts?shop_id=${shopId}`),
        fetch(`${API_BASE}/shop-menus?shop_id=${shopId}`),
      ]);
      const c = await castRes.json(); setCasts(Array.isArray(c) ? c : []);
      const m = await menuRes.json(); setMenus(Array.isArray(m) ? m : []);
    } catch { } finally { setLoading(false); }
  }, [shopId]);

  const loadSlips = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/slips?shop_id=${shopId}&date=${date}`);
      const data = await res.json();
      setTodaySlips(Array.isArray(data) ? data : []);
    } catch { setTodaySlips([]); }
  }, [shopId, date]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadSlips(); }, [loadSlips]);

  const resetForm = () => {
    setSlipItems([{ name: '', qty: 1, price: 0 }]);
    setSlipCasts([{ cast_id: '', type: 'フリー' }]);
    setPayment('現金'); setMemo(''); setEditingId(null);
  };

  const startEdit = (slip: any) => {
    setSlipItems(slip.items || [{ name: '', qty: 1, price: 0 }]);
    setSlipCasts(slip.cast_entries || [{ cast_id: '', type: 'フリー' }]);
    setPayment(slip.payment || '現金');
    setMemo(slip.memo || '');
    setEditingId(slip.id);
    setDate(slip.date);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editingId ? 'PATCH' : 'POST';
      const body: any = {
        shop_id: shopId, date, payment,
        subtotal, tax, total,
        items: slipItems.filter(i => i.name),
        cast_entries: slipCasts,
        memo,
      };
      if (editingId) body.id = editingId;

      await fetch(`${API_BASE}/slips`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // daily_salesを更新
      const m = date.slice(0, 7);
      const dsRes = await fetch(`${API_BASE}/daily-sales?shop_id=${shopId}&month=${m}`);
      const dsData = await dsRes.json();
      const existing = Array.isArray(dsData) ? dsData.find((d: any) => d.date === date) : null;
      await fetch(`${API_BASE}/daily-sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: shopId, date,
          cash_sales: (existing?.cash_sales || 0) + (payment === '現金' ? total : 0),
          card_sales: (existing?.card_sales || 0) + (payment === 'カード' ? total : 0),
          cost: existing?.cost || 0,
        }),
      });

      Alert.alert(editingId ? '更新しました' : `保存しました（${fmtYen(total)}）`);
      resetForm();
      loadSlips();
    } catch { Alert.alert('エラー', '保存に失敗しました'); } finally { setSaving(false); }
  };

  const handleDelete = (slip: any) => {
    Alert.alert('削除確認', 'この伝票を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => {
        try {
          await fetch(`${API_BASE}/slips`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: slip.id }),
          });
          loadSlips();
        } catch { Alert.alert('エラー', '削除に失敗しました'); }
      }},
    ]);
  };

  const updateItem = (i: number, field: string, val: any) => {
    setSlipItems(prev => prev.map((x, idx) => idx === i ? { ...x, [field]: val } : x));
  };
  const updateCastEntry = (i: number, field: string, val: string) => {
    setSlipCasts(prev => prev.map((x, idx) => idx === i ? { ...x, [field]: val } : x));
  };

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;

  return (
    <View>
      {editingId && (
        <View style={s.editBanner}>
          <Text style={s.editBannerText}>✏️ 伝票を編集中</Text>
          <PunyTouchable onPress={resetForm} style={s.editCancelBtn} scaleTo={0.95} haptic="light">
            <Text style={{ fontSize: 12, color: Colors.gold }}>キャンセル</Text>
          </PunyTouchable>
        </View>
      )}

      {/* 日付 */}
      <Text style={s.sectionTitle}>日付を選択</Text>
      <DatePicker value={date} onChange={setDate} />
      <Text style={s.selectedDate}>選択日：{date}</Text>

      {/* 支払方法 */}
      <Text style={s.sectionTitle}>支払方法</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
        {PAYMENT_TYPES.map(p => (
          <PunyTouchable key={p} onPress={() => setPayment(p)} scaleTo={0.94} haptic="light"
            style={[s.payBtn, payment === p && s.payBtnActive]}>
            <Text style={[s.payBtnText, payment === p && s.payBtnTextActive]}>{p}</Text>
          </PunyTouchable>
        ))}
      </View>

      {/* キャスト */}
      <Text style={s.sectionTitle}>キャスト</Text>
      {slipCasts.map((c, i) => (
        <View key={i} style={s.castEntryRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>キャスト名</Text>
            <View style={s.picker}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <PunyTouchable style={[s.pickerOption, c.cast_id === '' && s.pickerOptionActive]} scaleTo={0.94} haptic="light"
                  onPress={() => updateCastEntry(i, 'cast_id', '')}>
                  <Text style={[s.pickerOptionText, c.cast_id === '' && s.pickerOptionTextActive]}>選択なし</Text>
                </PunyTouchable>
                {casts.map((cast: any) => (
                  <PunyTouchable key={cast.id} onPress={() => updateCastEntry(i, 'cast_id', String(cast.id))} scaleTo={0.94} haptic="light"
                    style={[s.pickerOption, c.cast_id === String(cast.id) && s.pickerOptionActive]}>
                    <Text style={[s.pickerOptionText, c.cast_id === String(cast.id) && s.pickerOptionTextActive]}>{cast.name}</Text>
                  </PunyTouchable>
                ))}
              </ScrollView>
            </View>
          </View>
          <View style={{ width: 110 }}>
            <Text style={s.fieldLabel}>指名種別</Text>
            <View style={s.picker}>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 80 }}>
                {SHIMEI_TYPES.map(t => (
                  <PunyTouchable key={t} onPress={() => updateCastEntry(i, 'type', t)} scaleTo={0.94} haptic="light"
                    style={[s.pickerOption, c.type === t && s.pickerOptionActive]}>
                    <Text style={[s.pickerOptionText, c.type === t && s.pickerOptionTextActive]}>{t}</Text>
                  </PunyTouchable>
                ))}
              </ScrollView>
            </View>
          </View>
          {slipCasts.length > 1 && (
            <PunyTouchable onPress={() => setSlipCasts(prev => prev.filter((_, idx) => idx !== i))} style={{ padding: 8, marginTop: 16 }} scaleTo={0.88} haptic="medium">
              <Ionicons name="close-circle" size={20} color={Colors.red} />
            </PunyTouchable>
          )}
        </View>
      ))}
      <PunyTouchable style={s.addRowBtn} onPress={() => setSlipCasts(prev => [...prev, { cast_id: '', type: 'フリー' }])}>
        <Ionicons name="add" size={16} color={Colors.purple} />
        <Text style={[s.addRowBtnText, { color: Colors.purple }]}>キャストを追加</Text>
      </PunyTouchable>

      {/* 品目 */}
      <Text style={s.sectionTitle}>注文品目</Text>
      {slipItems.map((item, i) => (
        <View key={i} style={s.itemBlock}>
          {/* プリセット */}
          {menus.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {menus.map((m: any) => (
                <PunyTouchable key={m.id} onPress={() => { updateItem(i, 'name', m.name); updateItem(i, 'price', m.price); }}
                  style={s.presetChip}>
                  <Text style={s.presetChipText}>{m.name}</Text>
                </PunyTouchable>
              ))}
            </ScrollView>
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 2 }}>
              <Text style={s.fieldLabel}>品目名</Text>
              <TextInput style={s.input} value={item.name} onChangeText={v => updateItem(i, 'name', v)}
                placeholder="品目を入力" placeholderTextColor={Colors.text3} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>数量</Text>
              <TextInput style={s.input} value={String(item.qty)} onChangeText={v => updateItem(i, 'qty', Number(v) || 1)}
                keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1.5 }}>
              <Text style={s.fieldLabel}>単価（¥）</Text>
              <TextInput style={s.input} value={item.price ? String(item.price) : ''}
                onChangeText={v => updateItem(i, 'price', Number(v) || 0)}
                placeholder="0" placeholderTextColor={Colors.text3} keyboardType="number-pad" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={[s.fieldLabel, { color: Colors.gold }]}>小計: {fmtYen(item.qty * item.price)}</Text>
            {slipItems.length > 1 && (
              <PunyTouchable onPress={() => setSlipItems(prev => prev.filter((_, idx) => idx !== i))}>
                <Text style={{ fontSize: 12, color: Colors.red }}>削除</Text>
              </PunyTouchable>
            )}
          </View>
        </View>
      ))}
      <PunyTouchable style={s.addRowBtn} onPress={() => setSlipItems(prev => [...prev, { name: '', qty: 1, price: 0 }])}>
        <Ionicons name="add" size={16} color={Colors.gold} />
        <Text style={s.addRowBtnText}>品目を追加</Text>
      </PunyTouchable>

      {/* 合計 */}
      <View style={s.totalBlock}>
        <View style={s.totalRow}><Text style={s.totalLabel}>小計</Text><Text style={s.totalValue}>{fmtYen(subtotal)}</Text></View>
        <View style={s.totalRow}><Text style={s.totalLabel}>消費税（10%）</Text><Text style={s.totalValue}>{fmtYen(tax)}</Text></View>
        <View style={[s.totalRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: Colors.border }]}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.text }}>合計</Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: Colors.gold }}>{fmtYen(total)}</Text>
        </View>
      </View>

      {/* メモ */}
      <Text style={s.sectionTitle}>メモ（任意）</Text>
      <TextInput style={s.input} value={memo} onChangeText={setMemo}
        placeholder="客名・備考など" placeholderTextColor={Colors.text3} />

      <PunyTouchable style={s.saveBtn} onPress={handleSave} disabled={saving} scaleTo={0.95} haptic="light">
        {saving ? <ActivityIndicator color="#1a1200" /> : <Text style={s.saveBtnText}>{editingId ? '✏️ 更新する' : '伝票を保存する'}</Text>}
      </PunyTouchable>

      {/* 本日の伝票履歴 */}
      <PunyTouchable style={s.historyHeader} onPress={() => setShowHistory(v => !v)}>
        <Text style={s.historyHeaderText}>
          📋 {date}の伝票
          {todaySlips.length > 0 && <Text style={{ color: Colors.gold }}> {todaySlips.length}件 {fmtYen(todaySlips.reduce((a: number, b: any) => a + b.total, 0))}</Text>}
        </Text>
        <Ionicons name={showHistory ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.text3} />
      </PunyTouchable>

      {showHistory && todaySlips.map((slip: any, idx: number) => {
        const castNames = (slip.cast_entries || []).map((c: any) => {
          const cast = casts.find((x: any) => String(x.id) === String(c.cast_id));
          return cast ? `${cast.name}(${c.type})` : null;
        }).filter(Boolean).join('・');
        return (
          <View key={slip.id} style={[s.slipCard, editingId === slip.id && { borderColor: Colors.gold }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: Colors.text3 }}>#{todaySlips.length - idx}</Text>
                <View style={s.payBadge}><Text style={s.payBadgeText}>{slip.payment}</Text></View>
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.gold }}>{fmtYen(slip.total)}</Text>
            </View>
            {castNames ? <Text style={s.slipCastText}>👤 {castNames}</Text> : null}
            <Text style={s.slipItemText}>{(slip.items || []).map((i: any) => `${i.name}×${i.qty}`).join('　')}</Text>
            {slip.memo ? <Text style={s.slipMemoText}>📝 {slip.memo}</Text> : null}
            <View style={s.slipActions}>
              <PunyTouchable style={s.slipEditBtn} onPress={() => startEdit(slip)}>
                <Text style={s.slipEditBtnText}>✏️ 修正</Text>
              </PunyTouchable>
              <PunyTouchable style={s.slipDeleteBtn} onPress={() => handleDelete(slip)}>
                <Text style={s.slipDeleteBtnText}>削除</Text>
              </PunyTouchable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── 店舗売上（日次/週次/月次/年次） ──────────────────────────
type SalesPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

function ShopSales({ shopId }: { shopId: string }) {
  const now = new Date();
  const [period, setPeriod] = useState<SalesPeriod>('monthly');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [weekBase, setWeekBase] = useState(getDateStr(now));
  const [dailyDate, setDailyDate] = useState(getDateStr(now));
  const [allSales, setAllSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 年次は12ヶ月分まとめて取得
      if (period === 'yearly') {
        const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
        const results = await Promise.all(months.map(m => fetch(`${API_BASE}/daily-sales?shop_id=${shopId}&month=${m}`).then(r => r.json())));
        setAllSales(results.flat().filter(Array.isArray(results[0]) ? Boolean : Boolean));
      } else {
        const res = await fetch(`${API_BASE}/daily-sales?shop_id=${shopId}&month=${monthStr}`);
        const data = await res.json();
        setAllSales(Array.isArray(data) ? data : []);
      }
    } catch { setAllSales([]); } finally { setLoading(false); }
  }, [shopId, period, monthStr, year]);

  useEffect(() => { load(); }, [load]);

  // 週の7日
  const getWeekDates = (base: string) => {
    const b = new Date(base + 'T00:00:00');
    const day = b.getDay();
    const mon = new Date(b); mon.setDate(b.getDate() - (day === 0 ? 6 : day - 1));
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return getDateStr(d); });
  };

  // 期間別データ
  const getDisplayData = () => {
    if (period === 'daily') {
      const d = allSales.find((s: any) => s.date === dailyDate);
      return d ? [d] : [];
    }
    if (period === 'weekly') {
      const week = getWeekDates(weekBase);
      return allSales.filter((s: any) => week.includes(s.date));
    }
    if (period === 'monthly') return allSales;
    // yearly: 月別集計
    return Array.from({ length: 12 }, (_, i) => {
      const m = `${year}-${String(i + 1).padStart(2, '0')}`;
      const monthData = allSales.filter((s: any) => s.date?.startsWith(m));
      return {
        date: m,
        cash_sales: monthData.reduce((a: number, b: any) => a + (b.cash_sales || 0), 0),
        card_sales: monthData.reduce((a: number, b: any) => a + (b.card_sales || 0), 0),
        cost: monthData.reduce((a: number, b: any) => a + (b.cost || 0), 0),
      };
    }).filter((d: any) => (d.cash_sales + d.card_sales) > 0);
  };

  const displayData = getDisplayData();
  const total = displayData.reduce((s: number, d: any) => s + (d.cash_sales || 0) + (d.card_sales || 0), 0);
  const totalCost = displayData.reduce((s: number, d: any) => s + (d.cost || 0), 0);

  const addDay = (ds: string, n: number) => { const d = new Date(ds + 'T00:00:00'); d.setDate(d.getDate() + n); return getDateStr(d); };

  const PERIODS: { key: SalesPeriod; label: string }[] = [
    { key: 'daily', label: '日次' },
    { key: 'weekly', label: '週次' },
    { key: 'monthly', label: '月次' },
    { key: 'yearly', label: '年次' },
  ];

  return (
    <View>
      {/* 期間切替 */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
        {PERIODS.map(p => (
          <PunyTouchable key={p.key} onPress={() => setPeriod(p.key)}
            style={[s.periodBtn, period === p.key && s.periodBtnActive]}>
            <Text style={[s.periodBtnText, period === p.key && s.periodBtnTextActive]}>{p.label}</Text>
          </PunyTouchable>
        ))}
      </View>

      {/* ナビゲーション */}
      {period === 'daily' && (
        <View style={s.monthNav}>
          <PunyTouchable onPress={() => setDailyDate(addDay(dailyDate, -1))} style={s.monthBtn}><Ionicons name="chevron-back" size={18} color={Colors.text2} /></PunyTouchable>
          <Text style={s.monthLabel}>{fmtDateLabel(dailyDate)}</Text>
          <PunyTouchable onPress={() => setDailyDate(addDay(dailyDate, 1))} style={s.monthBtn}><Ionicons name="chevron-forward" size={18} color={Colors.text2} /></PunyTouchable>
        </View>
      )}
      {period === 'weekly' && (
        <View style={s.monthNav}>
          <PunyTouchable onPress={() => setWeekBase(addDay(weekBase, -7))} style={s.monthBtn}><Ionicons name="chevron-back" size={18} color={Colors.text2} /></PunyTouchable>
          <Text style={s.monthLabel}>{(() => { const w = getWeekDates(weekBase); return `${w[0].slice(5).replace('-','/')} 〜 ${w[6].slice(5).replace('-','/')}`; })()}</Text>
          <PunyTouchable onPress={() => setWeekBase(addDay(weekBase, 7))} style={s.monthBtn}><Ionicons name="chevron-forward" size={18} color={Colors.text2} /></PunyTouchable>
        </View>
      )}
      {period === 'monthly' && (
        <View style={s.monthNav}>
          <PunyTouchable onPress={() => { const d = new Date(year, month - 2, 1); setYear(d.getFullYear()); setMonth(d.getMonth() + 1); }} style={s.monthBtn}><Ionicons name="chevron-back" size={18} color={Colors.text2} /></PunyTouchable>
          <Text style={s.monthLabel}>{monthStr}</Text>
          <PunyTouchable onPress={() => { const d = new Date(year, month, 1); setYear(d.getFullYear()); setMonth(d.getMonth() + 1); }} style={s.monthBtn}><Ionicons name="chevron-forward" size={18} color={Colors.text2} /></PunyTouchable>
        </View>
      )}
      {period === 'yearly' && (
        <View style={s.monthNav}>
          <PunyTouchable onPress={() => setYear(y => y - 1)} style={s.monthBtn}><Ionicons name="chevron-back" size={18} color={Colors.text2} /></PunyTouchable>
          <Text style={s.monthLabel}>{year}年</Text>
          <PunyTouchable onPress={() => setYear(y => y + 1)} style={s.monthBtn}><Ionicons name="chevron-forward" size={18} color={Colors.text2} /></PunyTouchable>
        </View>
      )}

      {/* サマリー */}
      <View style={s.summaryRow}>
        {[
          { label: '売上', value: fmtYen(total), color: Colors.gold },
          { label: 'コスト', value: fmtYen(totalCost), color: Colors.red },
          { label: '純利益', value: fmtYen(total - totalCost), color: total - totalCost >= 0 ? Colors.green : Colors.red },
        ].map(({ label, value, color }) => (
          <View key={label} style={s.summaryCard}>
            <Text style={s.summaryLabel}>{label}</Text>
            <Text style={[s.summaryValue, { color }]}>{value}</Text>
          </View>
        ))}
      </View>

      {loading && <ActivityIndicator color={Colors.gold} style={{ marginTop: 20 }} />}

      {/* 一覧 */}
      {!loading && displayData.length === 0 && <Text style={s.empty}>この期間の売上データがありません</Text>}
      {!loading && displayData.sort((a: any, b: any) => b.date.localeCompare(a.date)).map((d: any) => (
        <View key={d.id || d.date} style={s.dailyRow}>
          <Text style={s.dailyDate}>{period === 'yearly' ? d.date.slice(0, 7) : fmtDateLabel(d.date)}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.dailyTotal}>{fmtYen((d.cash_sales || 0) + (d.card_sales || 0))}</Text>
            <Text style={s.dailySub}>現金 {fmtYen(d.cash_sales || 0)} / カード {fmtYen(d.card_sales || 0)}</Text>
          </View>
          {(d.cost || 0) > 0 && <Text style={[s.dailyCost, { color: Colors.red }]}>-{fmtYen(d.cost)}</Text>}
        </View>
      ))}
    </View>
  );
}

// ── 品名管理 ──────────────────────────────────────────────────
function MenuManagement({ shopId }: { shopId: string }) {
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [editTarget, setEditTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/shop-menus?shop_id=${shopId}`);
      const data = await res.json();
      setMenus(Array.isArray(data) ? data : []);
    } catch { setMenus([]); } finally { setLoading(false); }
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!name) { Alert.alert('エラー', '品名を入力してください'); return; }
    setSaving(true);
    try {
      const method = editTarget ? 'PATCH' : 'POST';
      await fetch(`${API_BASE}/shop-menus`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editTarget
          ? { id: editTarget.id, name, price: Number(price) || 0 }
          : { shop_id: shopId, name, price: Number(price) || 0 }),
      });
      setName(''); setPrice(''); setEditTarget(null);
      load();
    } catch { Alert.alert('エラー', '保存に失敗しました'); } finally { setSaving(false); }
  };

  const handleDelete = (id: string, menuName: string) => {
    Alert.alert('削除確認', `「${menuName}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => {
        await fetch(`${API_BASE}/shop-menus`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        load();
      }},
    ]);
  };

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;

  return (
    <View>
      <View style={s.menuForm}>
        <Text style={s.sectionTitle}>{editTarget ? '品名を編集' : '品名を追加'}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput style={[s.input, { flex: 2 }]} value={name} onChangeText={setName}
            placeholder="例: シャンパン" placeholderTextColor={Colors.text3} />
          <TextInput style={[s.input, { flex: 1 }]} value={price} onChangeText={setPrice}
            placeholder="¥" placeholderTextColor={Colors.text3} keyboardType="number-pad" />
          <PunyTouchable style={[s.saveBtn, { flex: 1, height: 44, marginTop: 0 }]} onPress={handleSave} disabled={saving} scaleTo={0.95} haptic="light">
            {saving ? <ActivityIndicator color="#1a1200" size="small" /> : <Text style={s.saveBtnText}>{editTarget ? '更新' : '追加'}</Text>}
          </PunyTouchable>
        </View>
        {editTarget && (
          <PunyTouchable onPress={() => { setEditTarget(null); setName(''); setPrice(''); }} style={{ marginTop: 6 }}>
            <Text style={{ fontSize: 12, color: Colors.text3, textAlign: 'center' }}>キャンセル</Text>
          </PunyTouchable>
        )}
      </View>

      <Text style={s.sectionTitle}>品名一覧</Text>
      {menus.map((m: any) => (
        <View key={m.id} style={s.menuItem}>
          <Text style={s.menuName}>{m.name}</Text>
          <Text style={s.menuPrice}>{fmtYen(m.price || 0)}</Text>
          <PunyTouchable onPress={() => { setEditTarget(m); setName(m.name); setPrice(String(m.price || 0)); }} style={{ padding: 6 }}>
            <Ionicons name="create-outline" size={16} color={Colors.text2} />
          </PunyTouchable>
          <PunyTouchable onPress={() => handleDelete(m.id, m.name)} style={{ padding: 6 }}>
            <Ionicons name="trash-outline" size={16} color={Colors.red} />
          </PunyTouchable>
        </View>
      ))}
      {menus.length === 0 && <Text style={s.empty}>品名が登録されていません</Text>}
    </View>
  );
}

// ── メイン ──────────────────────────────────────────────────────
export default function SlipScreen() {
  const Colors = useColors();
  const { shopId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SlipTab>('input');

  const TABS: { key: SlipTab; label: string; icon: string }[] = [
    { key: 'input', label: '伝票入力', icon: 'create-outline' },
    { key: 'sales', label: '店舗売上', icon: 'bar-chart-outline' },
    { key: 'menus', label: '品名管理', icon: 'list-outline' },
  ];

  if (!shopId) return null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Text style={s.screenTitle}>売上管理</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll} contentContainerStyle={s.tabContent}>
        {TABS.map(tab => (
          <PunyTouchable key={tab.key} style={[s.tab, activeTab === tab.key && s.tabActive]}
            onPress={() => setActiveTab(tab.key)}>
            <Ionicons name={tab.icon as any} size={14} color={activeTab === tab.key ? Colors.gold : Colors.text3} />
            <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>{tab.label}</Text>
          </PunyTouchable>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {activeTab === 'input' && <SlipInput shopId={shopId} />}
        {activeTab === 'sales' && <ShopSales shopId={shopId} />}
        {activeTab === 'menus' && <MenuManagement shopId={shopId} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const cal = StyleSheet.create({
  wrap:           { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.18)', padding: 14, marginBottom: 8 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title:          { fontSize: 15, fontWeight: '600', color: '#eeeeff' },
  dayRow:         { flexDirection: 'row', marginBottom: 8 },
  dayLabel:       { flex: 1, textAlign: 'center', fontSize: 11, color: '#eeeeff'3, fontWeight: '600' },
  grid:           { flexDirection: 'row', flexWrap: 'wrap' },
  cell:           { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  cellSelected:   { backgroundColor: '#ff88cc' },
  cellToday:      { backgroundColor: '#aa88ff'Dim },
  dayNum:         { fontSize: 14, color: '#eeeeff' },
  dayNumSelected: { color: '#1a1200', fontWeight: '700' },
  dayNumToday:    { color: '#aa88ff', fontWeight: '600' },
});

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#0c0c1a' },
  screenTitle:      { fontSize: 20, fontWeight: '500', color: '#eeeeff', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  scroll:           { paddingHorizontal: 16, paddingBottom: 108 },
  tabScroll:        { maxHeight: 48, borderBottomWidth: 0.5, borderBottomColor: 'rgba(200,180,255,0.18)' },
  tabContent:       { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tab:              { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.18)' },
  tabActive:        { backgroundColor: 'rgba(255,136,204,0.15)', borderColor: '#ff88cc' },
  tabText:          { fontSize: 12, color: '#eeeeff'3 },
  tabTextActive:    { fontSize: 12, color: '#ff88cc', fontWeight: '500' },
  sectionTitle:     { fontSize: 13, color: '#eeeeff'2, fontWeight: '600', marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  selectedDate:     { fontSize: 14, color: '#ff88cc', fontWeight: '600', marginBottom: 4 },
  fieldLabel:       { fontSize: 11, color: '#eeeeff'3, marginBottom: 4 },
  input:            { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.18)', padding: 12, color: '#eeeeff', fontSize: 14, marginBottom: 8 },
  payBtn:           { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.18)', backgroundColor: 'rgba(255,255,255,0.05)' },
  payBtnActive:     { backgroundColor: 'rgba(255,136,204,0.15)', borderColor: '#ff88cc' },
  payBtnText:       { fontSize: 14, color: '#eeeeff'2, fontWeight: '500' },
  payBtnTextActive: { color: '#ff88cc', fontWeight: '700' },
  castEntryRow:     { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' },
  picker:           { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.18)', padding: 4 },
  pickerOption:     { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 4 },
  pickerOptionActive:{ backgroundColor: 'rgba(255,136,204,0.15)' },
  pickerOptionText: { fontSize: 13, color: '#eeeeff'2 },
  pickerOptionTextActive: { color: '#ff88cc', fontWeight: '600' },
  addRowBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)'2, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.18)', padding: 10, marginBottom: 12 },
  addRowBtnText:    { fontSize: 13, color: '#ff88cc' },
  itemBlock:        { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.18)', padding: 12, marginBottom: 8 },
  presetChip:       { backgroundColor: 'rgba(255,255,255,0.05)'2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.18)' },
  presetChipText:   { fontSize: 12, color: '#eeeeff'2 },
  totalBlock:       { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.18)', padding: 16, marginVertical: 12 },
  totalRow:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLabel:       { fontSize: 13, color: '#eeeeff'2 },
  totalValue:       { fontSize: 13, color: '#eeeeff', fontWeight: '500' },
  saveBtn:          { backgroundColor: '#ff88cc', borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 8, marginBottom: 8 },
  saveBtnText:      { color: '#1a1200', fontSize: 15, fontWeight: '600' },
  editBanner:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(201,168,76,0.1)', borderRadius: 10, borderWidth: 0.5, borderColor: '#ff88cc', padding: 12, marginBottom: 12 },
  editBannerText:   { fontSize: 13, color: '#ff88cc', fontWeight: '600' },
  editCancelBtn:    { backgroundColor: 'rgba(255,136,204,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  historyHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.18)', padding: 12, marginTop: 16, marginBottom: 8 },
  historyHeaderText:{ fontSize: 13, fontWeight: '600', color: '#eeeeff' },
  slipCard:         { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.18)', padding: 12, marginBottom: 8 },
  payBadge:         { backgroundColor: 'rgba(255,255,255,0.05)'2, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  payBadgeText:     { fontSize: 11, color: '#eeeeff'2 },
  slipCastText:     { fontSize: 12, color: '#eeeeff'2, marginBottom: 3 },
  slipItemText:     { fontSize: 12, color: '#eeeeff'3, marginBottom: 3 },
  slipMemoText:     { fontSize: 11, color: '#eeeeff'3, marginBottom: 6 },
  slipActions:      { flexDirection: 'row', gap: 8, marginTop: 8 },
  slipEditBtn:      { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)'2, borderRadius: 8, padding: 7, alignItems: 'center' },
  slipEditBtnText:  { fontSize: 12, color: '#eeeeff'2 },
  slipDeleteBtn:    { backgroundColor: 'rgba(224,92,106,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  slipDeleteBtnText:{ fontSize: 12, color: '#f08098' },
  monthNav:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 12 },
  monthBtn:         { padding: 6 },
  monthLabel:       { fontSize: 15, color: '#eeeeff', fontWeight: '500', minWidth: 90, textAlign: 'center' },
  summaryRow:       { flexDirection: 'row', gap: 8, marginBottom: 8 },
  summaryCard:      { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.18)', padding: 12, alignItems: 'center' },
  summaryLabel:     { fontSize: 11, color: '#eeeeff'3, marginBottom: 4 },
  summaryValue:     { fontSize: 13, fontWeight: '600' },
  dailyRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(200,180,255,0.18)' },
  dailyDate:        { fontSize: 12, color: '#eeeeff'2, width: 56 },
  dailyTotal:       { fontSize: 14, fontWeight: '500', color: '#eeeeff' },
  dailySub:         { fontSize: 11, color: '#eeeeff'3, marginTop: 2 },
  dailyCost:        { fontSize: 13, fontWeight: '500' },
  menuForm:         { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.18)', padding: 12, marginBottom: 8 },
  menuItem:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(200,180,255,0.18)' },
  menuName:         { flex: 1, fontSize: 14, color: '#eeeeff' },
  menuPrice:        { fontSize: 13, color: '#ff88cc', fontWeight: '500', marginRight: 8 },
  empty:            { fontSize: 13, color: '#eeeeff'3, paddingVertical: 20, textAlign: 'center' },
  periodBtn:        { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(200,180,255,0.18)', alignItems: 'center' },
  periodBtnActive:  { backgroundColor: 'rgba(255,136,204,0.15)', borderColor: '#ff88cc' },
  periodBtnText:    { fontSize: 12, color: '#eeeeff'3 },
  periodBtnTextActive: { color: '#ff88cc', fontWeight: '600' },
});
