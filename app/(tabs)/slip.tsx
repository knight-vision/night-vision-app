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

type SlipTab = 'input' | 'sales' | 'cast';

const SALES_TYPES = [
  { key: 'honshimei', label: '本指名' },
  { key: 'baai',      label: '場内指名' },
  { key: 'douhan',    label: '同伴' },
  { key: 'bottle',    label: 'ボトルバック' },
  { key: 'other',     label: 'その他' },
];

// ── 伝票入力 ──────────────────────────────────────────────────
function SlipInput({ shopId }: { shopId: string }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [casts, setCasts] = useState<any[]>([]);
  const [castSales, setCastSales] = useState<Record<string, Record<string, string>>>({});
  const [cash, setCash] = useState('');
  const [card, setCard] = useState('');
  const [cost, setCost] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/cast-wage?shop_id=${shopId}`);
      const data = await res.json();
      const castList = Array.isArray(data) ? data : [];
      setCasts(castList);
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

      await Promise.all([
        fetch(`${API_BASE}/slip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shop_id: shopId, date,
            cash_sales: Number(cash) || 0,
            card_sales: Number(card) || 0,
            cost: Number(cost) || 0,
            cast_sales: sales,
          }),
        }),
      ]);

      Alert.alert('保存しました');
      setCash(''); setCard(''); setCost('');
      const reset: Record<string, Record<string, string>> = {};
      casts.forEach((c: any) => {
        reset[c.id] = { honshimei: '', baai: '', douhan: '', bottle: '', other: '' };
      });
      setCastSales(reset);
    } catch { Alert.alert('エラー', '保存に失敗しました'); } finally { setSaving(false); }
  };

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;

  return (
    <View>
      <Text style={s.sectionTitle}>日付</Text>
      <TextInput style={s.input} value={date} onChangeText={setDate} placeholder="2026-05-28" placeholderTextColor={Colors.text3} />

      <Text style={s.sectionTitle}>日次売上</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={s.fieldLabel}>現金</Text>
          <TextInput style={s.input} value={cash} onChangeText={setCash} placeholder="0" placeholderTextColor={Colors.text3} keyboardType="number-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.fieldLabel}>カード</Text>
          <TextInput style={s.input} value={card} onChangeText={setCard} placeholder="0" placeholderTextColor={Colors.text3} keyboardType="number-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.fieldLabel}>コスト</Text>
          <TextInput style={s.input} value={cost} onChangeText={setCost} placeholder="0" placeholderTextColor={Colors.text3} keyboardType="number-pad" />
        </View>
      </View>

      <Text style={s.sectionTitle}>キャスト別売上</Text>
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
                <TextInput
                  style={s.input}
                  value={castSales[cast.id]?.[type.key] || ''}
                  onChangeText={v => updateCastSale(cast.id, type.key, v)}
                  placeholder="0"
                  placeholderTextColor={Colors.text3}
                  keyboardType="number-pad"
                />
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/daily-sales?shop_id=${shopId}&month=${month}`);
      const data = await res.json();
      setDailySales(Array.isArray(data) ? data : []);
    } catch { setDailySales([]); } finally { setLoading(false); }
  }, [shopId, month]);

  useEffect(() => { load(); }, [load]);

  const changeMonth = (delta: number) => {
    const d = new Date(month + '-01');
    d.setMonth(d.getMonth() + delta);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const total = dailySales.reduce((sum, d) => sum + (d.cash_sales || 0) + (d.card_sales || 0), 0);
  const totalCost = dailySales.reduce((sum, d) => sum + (d.cost || 0), 0);

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;

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
        <SummaryCard label="月間売上" value={fmtYen(total)} color={Colors.gold} />
        <SummaryCard label="コスト" value={fmtYen(totalCost)} color={Colors.red} />
        <SummaryCard label="純利益" value={fmtYen(total - totalCost)} color={Colors.green} />
      </View>

      <Text style={s.sectionTitle}>日次一覧</Text>
      {dailySales.length === 0 && <Text style={s.empty}>この月の売上データがありません</Text>}
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

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={s.summaryCard}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={[s.summaryValue, { color }]}>{value}</Text>
    </View>
  );
}

// ── キャスト売上 ──────────────────────────────────────────────
function CastSales({ shopId }: { shopId: string }) {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [data, setData] = useState<any[]>([]);
  const [casts, setCasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const changeMonth = (delta: number) => {
    const d = new Date(month + '-01');
    d.setMonth(d.getMonth() + delta);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, castRes] = await Promise.all([
        fetch(`${API_BASE}/cast-sales?shop_id=${shopId}&month=${month}`),
        fetch(`${API_BASE}/cast-wage?shop_id=${shopId}`),
      ]);
      const sales = await salesRes.json();
      const castList = await castRes.json();
      setData(Array.isArray(sales) ? sales : []);
      setCasts(Array.isArray(castList) ? castList : []);
    } catch { } finally { setLoading(false); }
  }, [shopId, month]);

  useEffect(() => { load(); }, [load]);

  const castTotals = casts.map((cast: any) => {
    const castData = data.filter((d: any) => d.cast_id === cast.id);
    const byType: Record<string, number> = {};
    SALES_TYPES.forEach(t => {
      byType[t.key] = castData.filter((d: any) => d.sales_type === t.key).reduce((sum: number, d: any) => sum + d.amount, 0);
    });
    const total = Object.values(byType).reduce((a, b) => a + b, 0);
    return { ...cast, byType, total };
  }).sort((a, b) => b.total - a.total);

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;

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

      {castTotals.map((cast: any, i: number) => (
        <View key={cast.id} style={s.castSalesCard}>
          <View style={s.castSalesHeader}>
            <Text style={s.rankBadge}>#{i + 1}</Text>
            <View style={s.castAvatar}>
              <Text style={s.castAvatarText}>{cast.name?.[0] || '?'}</Text>
            </View>
            <Text style={s.castName}>{cast.name}</Text>
            <Text style={s.castTotal}>{fmtYen(cast.total)}</Text>
          </View>
          <View style={s.castSalesTypes}>
            {SALES_TYPES.map(type => cast.byType[type.key] > 0 && (
              <View key={type.key} style={s.castSalesType}>
                <Text style={s.castSalesTypeLabel}>{type.label}</Text>
                <Text style={s.castSalesTypeValue}>{fmtYen(cast.byType[type.key])}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
      {castTotals.length === 0 && <Text style={s.empty}>売上データがありません</Text>}
    </View>
  );
}

// ── メイン ──────────────────────────────────────────────────────
export default function SlipScreen() {
  const { shopId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SlipTab>('input');

  const TABS: { key: SlipTab; label: string; icon: string }[] = [
    { key: 'input', label: '伝票入力',   icon: 'create-outline' },
    { key: 'sales', label: '店舗売上',   icon: 'bar-chart-outline' },
    { key: 'cast',  label: 'キャスト売上', icon: 'people-outline' },
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
        {activeTab === 'cast'  && <CastSales shopId={shopId} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: Colors.bg },
  screenTitle:     { fontSize: 20, fontWeight: '500', color: Colors.text, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  scroll:          { paddingHorizontal: 16, paddingBottom: 40 },
  tabScroll:       { maxHeight: 48, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  tabContent:      { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tab:             { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 0.5, borderColor: Colors.border },
  tabActive:       { backgroundColor: Colors.goldDim, borderColor: Colors.gold },
  tabText:         { fontSize: 12, color: Colors.text3 },
  tabTextActive:   { fontSize: 12, color: Colors.gold, fontWeight: '500' },
  sectionTitle:    { fontSize: 13, color: Colors.text2, fontWeight: '600', marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldLabel:      { fontSize: 12, color: Colors.text3, marginBottom: 4 },
  input:           { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14, marginBottom: 8 },
  saveBtn:         { backgroundColor: Colors.gold, borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  saveBtnText:     { color: '#1a1200', fontSize: 15, fontWeight: '600' },
  castBlock:       { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 0.5, borderColor: Colors.border, padding: 12, marginBottom: 10 },
  castBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  castAvatar:      { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.purpleDim, justifyContent: 'center', alignItems: 'center' },
  castAvatarText:  { fontSize: 12, fontWeight: '500', color: Colors.purple },
  castName:        { fontSize: 14, fontWeight: '500', color: Colors.text, flex: 1 },
  monthNav:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 12 },
  monthBtn:        { padding: 6 },
  monthLabel:      { fontSize: 15, color: Colors.text, fontWeight: '500', minWidth: 90, textAlign: 'center' },
  summaryRow:      { flexDirection: 'row', gap: 8, marginBottom: 8 },
  summaryCard:     { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 0.5, borderColor: Colors.border, padding: 12, alignItems: 'center' },
  summaryLabel:    { fontSize: 11, color: Colors.text3, marginBottom: 4 },
  summaryValue:    { fontSize: 14, fontWeight: '600' },
  dailyRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  dailyDate:       { fontSize: 13, color: Colors.text2, width: 36 },
  dailyTotal:      { fontSize: 14, fontWeight: '500', color: Colors.text },
  dailySub:        { fontSize: 11, color: Colors.text3, marginTop: 2 },
  dailyCost:       { fontSize: 13, fontWeight: '500' },
  castSalesCard:   { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 0.5, borderColor: Colors.border, padding: 12, marginBottom: 10 },
  castSalesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  rankBadge:       { fontSize: 12, color: Colors.gold, fontWeight: '600', width: 24 },
  castTotal:       { fontSize: 15, fontWeight: '600', color: Colors.gold },
  castSalesTypes:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  castSalesType:   { backgroundColor: Colors.surface2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  castSalesTypeLabel:{ fontSize: 10, color: Colors.text3 },
  castSalesTypeValue:{ fontSize: 12, color: Colors.text, fontWeight: '500' },
  empty:           { fontSize: 13, color: Colors.text3, paddingVertical: 20, textAlign: 'center' },
});
