import { ScrollView, View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors, fmtYen } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { useAuthStore } from '../../store/auth';

const SHIMEI_TYPES = [
  { key: 'free', label: 'フリー' },
  { key: 'baai', label: '場内指名' },
  { key: 'honshimei', label: '本指名' },
];

const PAYMENT_TYPES = [
  { key: 'cash', label: '現金' },
  { key: 'card', label: 'カード' },
];

export default function SlipScreen() {
  const { shopId } = useAuthStore();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [payment, setPayment] = useState('cash');
  const [casts, setCasts] = useState<any[]>([]);
  const [menus, setMenus] = useState<any[]>([]);
  const [selectedCast, setSelectedCast] = useState<any>(null);
  const [shimei, setShimei] = useState('free');
  const [items, setItems] = useState<{ menu_id: string; name: string; price: number; qty: number }[]>([]);
  const [memo, setMemo] = useState('');
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [castModalVisible, setCastModalVisible] = useState(false);
  const [menuModalVisible, setMenuModalVisible] = useState(false);

  useEffect(() => {
    if (!shopId) return;
    Promise.all([
      fetch(`${API_BASE}/cast-sales?shop_id=${shopId}&type=casts`).then(r => r.json()).catch(() => []),
      fetch(`${API_BASE}/shop-menus?shop_id=${shopId}`).then(r => r.json()).catch(() => []),
      loadSlips(),
    ]).then(([c, m]) => {
      // キャスト一覧はcast-wageから取得
      fetch(`${API_BASE}/confirm-shift?shop_id=${shopId}&year=${new Date().getFullYear()}&month=${new Date().getMonth()+1}`)
        .then(r => r.json())
        .then(shifts => {
          const uniqueCasts = Object.values(
            (Array.isArray(shifts) ? shifts : []).reduce((acc: any, s: any) => {
              if (s.cast_id && s.casts) acc[s.cast_id] = { id: s.cast_id, name: s.casts.name };
              return acc;
            }, {})
          );
          setCasts(uniqueCasts as any[]);
        }).catch(() => {});
      setMenus(Array.isArray(m) ? m : []);
    });
  }, [shopId]);

  const loadSlips = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/slips?shop_id=${shopId}&date=${date}`);
      const data = await res.json();
      setSlips(Array.isArray(data) ? data : []);
    } catch {
      setSlips([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSlips(); }, [date, shopId]);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tax = Math.floor(subtotal * 0.1);
  const total = subtotal + tax;

  const addItem = (menu: any) => {
    const existing = items.find(i => i.menu_id === String(menu.id));
    if (existing) {
      setItems(items.map(i => i.menu_id === String(menu.id) ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setItems([...items, { menu_id: String(menu.id), name: menu.name, price: menu.price, qty: 1 }]);
    }
    setMenuModalVisible(false);
  };

  const removeItem = (menu_id: string) => {
    setItems(items.filter(i => i.menu_id !== menu_id));
  };

  const updateQty = (menu_id: string, qty: number) => {
    if (qty <= 0) { removeItem(menu_id); return; }
    setItems(items.map(i => i.menu_id === menu_id ? { ...i, qty } : i));
  };

  const handleSubmit = async () => {
    if (items.length === 0) { Alert.alert('エラー', '品目を追加してください'); return; }
    setSubmitting(true);
    try {
      const castEntries = selectedCast ? [{ cast_id: selectedCast.id, shimei_type: shimei }] : [];
      const res = await fetch(`${API_BASE}/slips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: shopId, date, payment,
          subtotal, tax, total,
          items: items.map(i => ({ menu_id: i.menu_id, name: i.name, price: i.price, qty: i.qty, amount: i.price * i.qty })),
          cast_entries: castEntries,
          memo,
        }),
      });
      if (res.ok) {
        Alert.alert('保存しました');
        setItems([]); setSelectedCast(null); setShimei('free'); setMemo(''); setPayment('cash');
        loadSlips();
      } else {
        Alert.alert('エラー', '保存に失敗しました');
      }
    } catch {
      Alert.alert('エラー', '通信エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>伝票入力</Text>

        {/* 日付・支払方法 */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>日付</Text>
            <TextInput style={styles.dateInput} value={date} onChangeText={setDate}
              placeholder="2026-05-25" placeholderTextColor={Colors.text3} />
          </View>
          <View style={[styles.row, { marginTop: 12 }]}>
            <Text style={styles.label}>支払方法</Text>
            <View style={styles.segRow}>
              {PAYMENT_TYPES.map(p => (
                <TouchableOpacity key={p.key}
                  style={[styles.seg, payment === p.key && styles.segActive]}
                  onPress={() => setPayment(p.key)}>
                  <Text style={[styles.segText, payment === p.key && styles.segTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* キャスト選択 */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>キャスト（任意）</Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setCastModalVisible(true)}>
            <Ionicons name="person-outline" size={16} color={Colors.text3} />
            <Text style={[styles.selectBtnText, selectedCast && { color: Colors.text }]}>
              {selectedCast ? selectedCast.name : 'キャストを選択'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={Colors.text3} />
          </TouchableOpacity>
          {selectedCast && (
            <View style={[styles.segRow, { marginTop: 10 }]}>
              {SHIMEI_TYPES.map(s => (
                <TouchableOpacity key={s.key}
                  style={[styles.seg, shimei === s.key && styles.segActive]}
                  onPress={() => setShimei(s.key)}>
                  <Text style={[styles.segText, shimei === s.key && styles.segTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 品目 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionLabel}>品目</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setMenuModalVisible(true)}>
              <Ionicons name="add" size={16} color={Colors.gold} />
              <Text style={styles.addBtnText}>追加</Text>
            </TouchableOpacity>
          </View>
          {items.length === 0 ? (
            <Text style={styles.emptyText}>品目を追加してください</Text>
          ) : items.map(item => (
            <View key={item.menu_id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>{fmtYen(item.price)} × {item.qty}</Text>
              </View>
              <View style={styles.qtyRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.menu_id, item.qty - 1)}>
                  <Ionicons name="remove" size={14} color={Colors.text2} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.qty}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.menu_id, item.qty + 1)}>
                  <Ionicons name="add" size={14} color={Colors.text2} />
                </TouchableOpacity>
              </View>
              <Text style={styles.itemTotal}>{fmtYen(item.price * item.qty)}</Text>
            </View>
          ))}
          {items.length > 0 && (
            <View style={styles.totalBlock}>
              <View style={styles.totalRow}><Text style={styles.totalLabel}>小計</Text><Text style={styles.totalValue}>{fmtYen(subtotal)}</Text></View>
              <View style={styles.totalRow}><Text style={styles.totalLabel}>消費税（10%）</Text><Text style={styles.totalValue}>{fmtYen(tax)}</Text></View>
              <View style={[styles.totalRow, { borderTopWidth: 0.5, borderTopColor: Colors.border, paddingTop: 8, marginTop: 4 }]}>
                <Text style={[styles.totalLabel, { color: Colors.text, fontWeight: '500' }]}>合計</Text>
                <Text style={[styles.totalValue, { color: Colors.gold, fontSize: 16, fontWeight: '500' }]}>{fmtYen(total)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* メモ */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>メモ（任意）</Text>
          <TextInput style={styles.memoInput} value={memo} onChangeText={setMemo}
            placeholder="備考を入力" placeholderTextColor={Colors.text3} multiline />
        </View>

        {/* 保存ボタン */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}>
          {submitting ? <ActivityIndicator color="#1a1200" /> : <Text style={styles.submitText}>伝票を保存</Text>}
        </TouchableOpacity>

        {/* 本日の伝票一覧 */}
        <Text style={styles.sectionTitle}>本日の伝票（{slips.length}件）</Text>
        {loading ? <ActivityIndicator color={Colors.gold} /> : slips.length === 0 ? (
          <Text style={styles.emptyText}>本日の伝票はありません</Text>
        ) : slips.map((slip: any, i: number) => (
          <View key={slip.id || i} style={styles.slipCard}>
            <View style={styles.slipHeader}>
              <Text style={styles.slipTotal}>{fmtYen(slip.total)}</Text>
              <View style={[styles.payBadge, { backgroundColor: slip.payment === 'cash' ? Colors.goldDim : Colors.purpleDim }]}>
                <Text style={[styles.payBadgeText, { color: slip.payment === 'cash' ? Colors.gold : Colors.purple }]}>
                  {slip.payment === 'cash' ? '現金' : 'カード'}
                </Text>
              </View>
            </View>
            {slip.cast_entries?.length > 0 && (
              <Text style={styles.slipCast}>
                {slip.cast_entries.map((c: any) => c.cast_name || 'キャスト').join(', ')}
              </Text>
            )}
            {slip.items?.map((item: any, j: number) => (
              <Text key={j} style={styles.slipItem}>{item.name} × {item.qty}　{fmtYen(item.amount)}</Text>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* キャスト選択モーダル */}
      <Modal visible={castModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCastModalVisible(false)}>
        <View style={modal.container}>
          <View style={modal.header}>
            <TouchableOpacity onPress={() => setCastModalVisible(false)} style={modal.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.text2} />
            </TouchableOpacity>
            <Text style={modal.title}>キャストを選択</Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView>
            <TouchableOpacity style={modal.item} onPress={() => { setSelectedCast(null); setCastModalVisible(false); }}>
              <Text style={modal.itemText}>なし（フリー）</Text>
            </TouchableOpacity>
            {casts.map((c: any) => (
              <TouchableOpacity key={c.id} style={modal.item} onPress={() => { setSelectedCast(c); setCastModalVisible(false); }}>
                <Text style={modal.itemText}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* 品名選択モーダル */}
      <Modal visible={menuModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setMenuModalVisible(false)}>
        <View style={modal.container}>
          <View style={modal.header}>
            <TouchableOpacity onPress={() => setMenuModalVisible(false)} style={modal.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.text2} />
            </TouchableOpacity>
            <Text style={modal.title}>品名を選択</Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView>
            {menus.length === 0 ? (
              <Text style={[styles.emptyText, { padding: 20 }]}>品名が登録されていません</Text>
            ) : menus.map((m: any) => (
              <TouchableOpacity key={m.id} style={modal.item} onPress={() => addItem(m)}>
                <Text style={modal.itemText}>{m.name}</Text>
                <Text style={modal.itemPrice}>{fmtYen(m.price)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  closeBtn:  { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:     { fontSize: 16, fontWeight: '500', color: Colors.text },
  item:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  itemText:  { fontSize: 15, color: Colors.text },
  itemPrice: { fontSize: 14, color: Colors.gold },
});

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.bg },
  scroll:      { paddingHorizontal: 16, paddingBottom: 40 },
  screenTitle: { fontSize: 20, fontWeight: '500', color: Colors.text, paddingVertical: 16 },
  sectionTitle:{ fontSize: 15, fontWeight: '500', color: Colors.text, marginTop: 20, marginBottom: 10 },
  card:        { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 0.5, borderColor: Colors.border, padding: 14, marginBottom: 12 },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionLabel:{ fontSize: 11, color: Colors.text2, marginBottom: 8 },
  label:       { fontSize: 13, color: Colors.text2, width: 70 },
  row:         { flexDirection: 'row', alignItems: 'center' },
  dateInput:   { flex: 1, backgroundColor: Colors.surface2, borderRadius: 8, borderWidth: 0.5, borderColor: Colors.border, padding: 8, color: Colors.text, fontSize: 14 },
  segRow:      { flex: 1, flexDirection: 'row', gap: 6 },
  seg:         { flex: 1, paddingVertical: 6, borderRadius: 8, borderWidth: 0.5, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.surface2 },
  segActive:   { backgroundColor: Colors.goldDim, borderColor: Colors.gold },
  segText:     { fontSize: 12, color: Colors.text3 },
  segTextActive:{ fontSize: 12, color: Colors.gold, fontWeight: '500' },
  selectBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface2, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.border, padding: 12 },
  selectBtnText:{ flex: 1, fontSize: 14, color: Colors.text3 },
  addBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.goldDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 0.5, borderColor: Colors.gold },
  addBtnText:  { fontSize: 12, color: Colors.gold, fontWeight: '500' },
  emptyText:   { fontSize: 12, color: Colors.text3, paddingVertical: 8 },
  itemRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.border, gap: 8 },
  itemName:    { fontSize: 13, color: Colors.text, fontWeight: '500' },
  itemPrice:   { fontSize: 11, color: Colors.text3, marginTop: 2 },
  itemTotal:   { fontSize: 13, color: Colors.text, fontWeight: '500', width: 70, textAlign: 'right' },
  qtyRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn:      { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.surface2, justifyContent: 'center', alignItems: 'center' },
  qtyText:     { fontSize: 14, color: Colors.text, width: 20, textAlign: 'center' },
  totalBlock:  { marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: Colors.border },
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLabel:  { fontSize: 12, color: Colors.text2 },
  totalValue:  { fontSize: 12, color: Colors.text },
  memoInput:   { backgroundColor: Colors.surface2, borderRadius: 8, borderWidth: 0.5, borderColor: Colors.border, padding: 10, color: Colors.text, fontSize: 14, height: 72, textAlignVertical: 'top' },
  submitBtn:   { backgroundColor: Colors.gold, borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  submitText:  { color: '#1a1200', fontSize: 16, fontWeight: '600' },
  slipCard:    { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.border, padding: 12, marginBottom: 8 },
  slipHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  slipTotal:   { fontSize: 16, fontWeight: '500', color: Colors.gold },
  payBadge:    { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  payBadgeText:{ fontSize: 11 },
  slipCast:    { fontSize: 12, color: Colors.purple, marginBottom: 4 },
  slipItem:    { fontSize: 11, color: Colors.text2, marginTop: 2 },
});
