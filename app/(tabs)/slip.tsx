import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors, fmtYen } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { useAuthStore } from '../../store/auth';

type SlipTab = 'input' | 'sales';

const SALES_TYPES = [
  { key: 'honshimei', label: '本指名' },
  { key: 'baai',      label: '場内指名' },
  { key: 'douhan',    label: '同伴' },
  { key: 'bottle',    label: 'ボトルバック' },
  { key: 'other',     label: 'その他' },
];

const CAL_DAYS = ['月', '火', '水', '木', '金', '土', '日'];

function getDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── ミニカレンダー ──────────────────────────────────────────────
function DatePicker({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const [calYear, setCalYear] = useState(new Date(value).getFullYear());
  const [calMonth, setCalMonth] = useState(new Date(value).getMonth() + 1);

  const firstDay = new Date(calYear, calMonth - 1, 1);
  const lastDay = new Date(calYear, calMonth, 0);
  const startPad = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const days: (number | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: lastDay.getDate() }, (_, i) => i + 1)];

  return (
    <View style={cal.wrap}>
      <View style={cal.header}>
        <TouchableOpacity onPress={() => { const d = new Date(calYear, calMonth-2, 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()+1); }}>
          <Ionicons name="chevron-back" size={18} color={Colors.text2} />
        </TouchableOpacity>
        <Text style={cal.title}>{calYear}年{calMonth}月</Text>
        <TouchableOpacity onPress={() => { const d = new Date(calYear, calMonth, 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()+1); }}>
          <Ionicons name="chevron-forward" size={18} color={Colors.text2} />
        </TouchableOpacity>
      </View>
      <View style={cal.dayRow}>
        {CAL_DAYS.map(d => <Text key={d} style={cal.dayLabel}>{d}</Text>)}
      </View>
      <View style={cal.grid}>
        {days.map((day, i) => {
          if (!day) return <View key={`p${i}`} style={cal.cell} />;
          const dateStr = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isSelected = dateStr === value;
          const isToday = dateStr === getDateStr(new Date());
          return (
            <TouchableOpacity key={dateStr} onPress={() => onChange(dateStr)}
              style={[cal.cell, isSelected && cal.cellSelected, isToday && !isSelected && cal.cellToday]}>
              <Text style={[cal.dayNum, isSelected && cal.dayNumSelected, isToday && !isSelected && cal.dayNumToday]}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── 伝票入力 ──────────────────────────────────────────────────
function SlipInput({ shopId }: { shopId: string }) {
  const [date, setDate] = useState(getDateStr(new Date()));
  const [casts, setCasts] = useState<any[]>([]);
  const [menus, setMenus] = useState<any[]>([]);
  const [castSales, setCastSales] = useState<Record<string, Record<string, string>>>({});
  const [cash, setCash] = useState('');
  const [card, setCard] = useState('');
  const [cost, setCost] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [castRes, menuRes] = await Promise.all([
        fetch(`${API_BASE}/cast-wage?shop_id=${shopId}`),
        fetch(`${API_BASE}/shop-menus?shop_id=${shopId}`),
      ]);
      const castData = await castRes.json();
      const menuData = await menuRes.json();
      const castList = Array.isArray(castData) ? castData : [];
      setCasts(castList);
      setMenus(Array.isArray(menuData) ? menuData : []);
      const init: Record<string, Record<string, string>> = {};
      castList.forEach((c: any) => {
        init[c.id] = { honshimei: '', baai: '', douhan: '', bottle: '', other: '' };
      });
      setCastSales(init);
    } catch { } finally { setLoading(false); }
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const updateCastSale = (castId: string, type: string, value: string) => {
    setCastSales(prev => ({ ...prev, [castId]: { ...prev[castId], [type]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const sales: any[] = [];
      Object.entries(castSales).forEach(([castId, types]) => {
        Object.entries(types).forEach(([type, amount]) => {
          if (amount && Number(amount) > 0) {
            sales.push({ shop_id: shopId, cast_id: castId, date, sales_type: type, amount: Number(amount) });
          }
        });
      });
      await fetch(`${API_BASE}/slip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: shopId, date,
          cash_sales: Number(cash) || 0,
          card_sales: Number(card) || 0,
          cost: Number(cost) || 0,
          cast_sales: sales,
        }),
      });
      Alert.alert('保存しました');
      setCash(''); setCard(''); setCost('');
      const reset: Record<string, Record<string, string>> = {};
      casts.forEach((c: any) => { reset[c.id] = { honshimei: '', baai: '', douhan: '', bottle: '', other: '' }; });
      setCastSales(reset);
    } catch { Alert.alert('エラー', '保存に失敗しました'); } finally { setSaving(false); }
  };

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;

  return (
    <View>
      {/* 日付カレンダー */}
      <Text style={s.sectionTitle}>日付を選択</Text>
      <DatePicker value={date} onChange={setDate} />
      <Text style={s.selectedDate}>選択日：{date}</Text>

      {/* 日次売上 */}
      <Text style={s.sectionTitle}>日次売上</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          { label: '現金', value: cash, onChange: setCash },
          { label: 'カード', value: card, onChange: setCard },
          { label: 'コスト', value: cost, onChange: setCost },
        ].map(({ label, value, onChange }) => (
          <View key={label} style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>{label}</Text>
            <TextInput style={s.input} value={value} onChangeText={onChange} placeholder="0"
              placeholderTextColor={Colors.text3} keyboardType="number-pad" />
          </View>
        ))}
      </View>

      {/* キャスト別売上 */}
      <Text style={s.sectionTitle}>キャスト別売上</Text>
      {casts.length === 0 && <Text style={s.empty}>キャストが登録されていません</Text>}
      {casts.map((cast: any) => (
        <View key={cast.id} style={s.castBlock}>
          <View style={s.castBlockHeader}>
            <View style={s.castAvatar}>
              <Text style={s.castAvatarText}>{cast.name?.[0] || '?'}</Text>
            </View>
            <Text style={s.castName}>{cast.name}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SALES_TYPES.map(type => (
              <View key={type.key} style={{ width: '46%' }}>
                <Text style={s.fieldLabel}>{type.label}</Text>
                <TextInput style={s.input}
                  value={castSales[cast.id]?.[type.key] || ''}
                  onChangeText={v => updateCastSale(String(cast.id), type.key, v)}
                  placeholder="0" placeholderTextColor={Colors.text3} keyboardType="number-pad" />
              </View>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#1a1200" /> : <Text style={s.saveBtnText}>保存する</Text>}
      </TouchableOpacity>
    </View>
  );
}

// ── 店舗売上 ──────────────────────────────────────────────────
function ShopSales({ shopId }: { shopId: string }) {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const changeMonth = (delta: number) => {
    const d = new Date(month + '-01');
    d.setMonth(d.getMonth() + delta);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/daily-sales?shop_id=${shopId}&month=${month}`);
      const data = await res.json();
      setDailySales(Array.isArray(data) ? data : []);
    } catch { setDailySales([]); } finally { setLoading(false); }
  }, [shopId, month]);

  useEffect(() => { load(); }, [load]);

  const total = dailySales.reduce((sum, d) => sum + (d.cash_sales || 0) + (d.card_sales || 0), 0);
  const totalCost = dailySales.reduce((sum, d) => sum + (d.cost || 0), 0);

  return (
    <View>
      <View style={s.monthNav}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={s.monthBtn}>
          <Ionicons name="chevron-back" size={18} color={Colors.text2} />
        </TouchableOpacity>
        <Text style={s.monthLabel}>{month}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={s.monthBtn}>
          <Ionicons name="chevron-forward" size={18} color={Colors.text2} />
        </TouchableOpacity>
      </View>

      <View style={s.summaryRow}>
        {[
          { label: '月間売上', value: fmtYen(total), color: Colors.gold },
          { label: 'コスト', value: fmtYen(totalCost), color: Colors.red },
          { label: '純利益', value: fmtYen(total - totalCost), color: Colors.green },
        ].map(({ label, value, color }) => (
          <View key={label} style={s.summaryCard}>
            <Text style={s.summaryLabel}>{label}</Text>
            <Text style={[s.summaryValue, { color }]}>{value}</Text>
          </View>
        ))}
      </View>

      {loading && <ActivityIndicator color={Colors.gold} style={{ marginTop: 20 }} />}

      <Text style={s.sectionTitle}>日次一覧</Text>
      {!loading && dailySales.length === 0 && <Text style={s.empty}>この月の売上データがありません</Text>}
      {dailySales.sort((a, b) => b.date.localeCompare(a.date)).map((d: any) => (
        <View key={d.id || d.date} style={s.dailyRow}>
          <Text style={s.dailyDate}>{d.date.slice(5)}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.dailyTotal}>{fmtYen((d.cash_sales || 0) + (d.card_sales || 0))}</Text>
            <Text style={s.dailySub}>現金 {fmtYen(d.cash_sales || 0)} / カード {fmtYen(d.card_sales || 0)}</Text>
          </View>
          <Text style={[s.dailyCost, { color: Colors.red }]}>-{fmtYen(d.cost || 0)}</Text>
        </View>
      ))}
    </View>
  );
}

// ── メイン ──────────────────────────────────────────────────────
export default function SlipScreen() {
  const { shopId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SlipTab>('input');

  const TABS: { key: SlipTab; label: string; icon: string }[] = [
    { key: 'input', label: '伝票入力', icon: 'create-outline' },
    { key: 'sales', label: '店舗売上', icon: 'bar-chart-outline' },
  ];

  if (!shopId) return null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Text style={s.screenTitle}>売上管理</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll} contentContainerStyle={s.tabContent}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab.key} style={[s.tab, activeTab === tab.key && s.tabActive]}
            onPress={() => setActiveTab(tab.key)}>
            <Ionicons name={tab.icon as any} size={14} color={activeTab === tab.key ? Colors.gold : Colors.text3} />
            <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {activeTab === 'input' && <SlipInput shopId={shopId} />}
        {activeTab === 'sales' && <ShopSales shopId={shopId} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const cal = StyleSheet.create({
  wrap:           { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 0.5, borderColor: Colors.border, padding: 14, marginBottom: 8 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title:          { fontSize: 15, fontWeight: '600', color: Colors.text },
  dayRow:         { flexDirection: 'row', marginBottom: 8 },
  dayLabel:       { flex: 1, textAlign: 'center', fontSize: 11, color: Colors.text3, fontWeight: '600' },
  grid:           { flexDirection: 'row', flexWrap: 'wrap' },
  cell:           { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  cellSelected:   { backgroundColor: Colors.gold },
  cellToday:      { backgroundColor: Colors.purpleDim },
  dayNum:         { fontSize: 14, color: Colors.text },
  dayNumSelected: { color: '#1a1200', fontWeight: '700' },
  dayNumToday:    { color: Colors.purple, fontWeight: '600' },
});

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: Colors.bg },
  screenTitle:    { fontSize: 20, fontWeight: '500', color: Colors.text, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  scroll:         { paddingHorizontal: 16, paddingBottom: 40 },
  tabScroll:      { maxHeight: 48, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  tabContent:     { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tab:            { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 0.5, borderColor: Colors.border },
  tabActive:      { backgroundColor: Colors.goldDim, borderColor: Colors.gold },
  tabText:        { fontSize: 12, color: Colors.text3 },
  tabTextActive:  { fontSize: 12, color: Colors.gold, fontWeight: '500' },
  sectionTitle:   { fontSize: 13, color: Colors.text2, fontWeight: '600', marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  selectedDate:   { fontSize: 14, color: Colors.gold, fontWeight: '600', marginBottom: 8 },
  fieldLabel:     { fontSize: 11, color: Colors.text3, marginBottom: 4 },
  input:          { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14, marginBottom: 8 },
  saveBtn:        { backgroundColor: Colors.gold, borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  saveBtnText:    { color: '#1a1200', fontSize: 15, fontWeight: '600' },
  castBlock:      { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 0.5, borderColor: Colors.border, padding: 12, marginBottom: 10 },
  castBlockHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  castAvatar:     { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.purpleDim, justifyContent: 'center', alignItems: 'center' },
  castAvatarText: { fontSize: 12, fontWeight: '500', color: Colors.purple },
  castName:       { fontSize: 14, fontWeight: '500', color: Colors.text },
  monthNav:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 12 },
  monthBtn:       { padding: 6 },
  monthLabel:     { fontSize: 15, color: Colors.text, fontWeight: '500', minWidth: 90, textAlign: 'center' },
  summaryRow:     { flexDirection: 'row', gap: 8, marginBottom: 8 },
  summaryCard:    { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 0.5, borderColor: Colors.border, padding: 12, alignItems: 'center' },
  summaryLabel:   { fontSize: 11, color: Colors.text3, marginBottom: 4 },
  summaryValue:   { fontSize: 13, fontWeight: '600' },
  dailyRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  dailyDate:      { fontSize: 13, color: Colors.text2, width: 36 },
  dailyTotal:     { fontSize: 14, fontWeight: '500', color: Colors.text },
  dailySub:       { fontSize: 11, color: Colors.text3, marginTop: 2 },
  dailyCost:      { fontSize: 13, fontWeight: '500' },
  empty:          { fontSize: 13, color: Colors.text3, paddingVertical: 20, textAlign: 'center' },
});
