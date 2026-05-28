import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors, fmtYen } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { useAuthStore } from '../../store/auth';

type SalaryTab = 'summary' | 'allowance' | 'presets';

// ── 月次サマリー ──────────────────────────────────────────────
function SalarySummary({ shopId, month }: { shopId: string; month: string }) {
  const [data, setData] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [allowances, setAllowances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [castRes, shiftRes, allowRes] = await Promise.all([
        fetch(`${API_BASE}/cast-wage?shop_id=${shopId}`),
        fetch(`${API_BASE}/confirm-shift?shop_id=${shopId}&year=${month.slice(0,4)}&month=${month.slice(5,7)}`),
        fetch(`${API_BASE}/cast-allowances?shop_id=${shopId}&month=${month}`),
      ]);
      const casts = await castRes.json();
      const shiftData = await shiftRes.json();
      const allowData = await allowRes.json();
      setData(Array.isArray(casts) ? casts : []);
      setShifts(Array.isArray(shiftData) ? shiftData : []);
      setAllowances(Array.isArray(allowData) ? allowData : []);
    } catch { } finally { setLoading(false); }
  }, [shopId, month]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;

  return (
    <View>
      {data.map((cast: any) => {
        const castShifts = shifts.filter((s: any) => s.cast_id === cast.id);
        const totalHours = castShifts.reduce((sum: number, s: any) => {
          if (!s.start_time || !s.end_time) return sum;
          const [sh, sm] = s.start_time.split(':').map(Number);
          const [eh, em] = s.end_time.split(':').map(Number);
          return sum + ((eh * 60 + em) - (sh * 60 + sm)) / 60;
        }, 0);
        const basePay = Math.round(totalHours * (cast.hourly_wage || 0));
        const castAllows = allowances.filter((a: any) => a.cast_id === cast.id);
        const allowTotal = castAllows.filter((a: any) => a.sign === '+').reduce((s: number, a: any) => s + a.amount, 0);
        const deductTotal = castAllows.filter((a: any) => a.sign === '-').reduce((s: number, a: any) => s + a.amount, 0);
        const total = basePay + allowTotal - deductTotal;

        return (
          <View key={cast.id} style={styles.salaryCard}>
            <View style={styles.salaryHeader}>
              <View style={styles.castAvatar}>
                <Text style={styles.castAvatarText}>{cast.name?.[0] || '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.castName}>{cast.name}</Text>
                <Text style={styles.castSub}>時給 {fmtYen(cast.hourly_wage || 0)}</Text>
              </View>
              <Text style={styles.totalPay}>{fmtYen(total)}</Text>
            </View>
            <View style={styles.salaryRows}>
              <SalaryRow label="勤務時間" value={`${totalHours.toFixed(1)}h`} />
              <SalaryRow label="基本給" value={fmtYen(basePay)} />
              {allowTotal > 0 && <SalaryRow label="手当合計" value={`+${fmtYen(allowTotal)}`} color={Colors.green} />}
              {deductTotal > 0 && <SalaryRow label="控除合計" value={`-${fmtYen(deductTotal)}`} color={Colors.red} />}
            </View>
          </View>
        );
      })}
      {data.length === 0 && <Text style={styles.empty}>キャストが登録されていません</Text>}
    </View>
  );
}

function SalaryRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.salaryRow}>
      <Text style={styles.salaryRowLabel}>{label}</Text>
      <Text style={[styles.salaryRowValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

// ── 手当・控除管理 ──────────────────────────────────────────────
function AllowanceManagement({ shopId, month }: { shopId: string; month: string }) {
  const [allowances, setAllowances] = useState<any[]>([]);
  const [casts, setCasts] = useState<any[]>([]);
  const [presets, setPresets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [castId, setCastId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [label, setLabel] = useState('');
  const [sign, setSign] = useState<'+' | '-'>('+');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, cRes, pRes] = await Promise.all([
        fetch(`${API_BASE}/cast-allowances?shop_id=${shopId}&month=${month}`),
        fetch(`${API_BASE}/cast-wage?shop_id=${shopId}`),
        fetch(`${API_BASE}/allowance-presets?shop_id=${shopId}`),
      ]);
      const a = await aRes.json(); setAllowances(Array.isArray(a) ? a : []);
      const c = await cRes.json(); setCasts(Array.isArray(c) ? c : []);
      const p = await pRes.json(); setPresets(Array.isArray(p) ? p : []);
    } catch { } finally { setLoading(false); }
  }, [shopId, month]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setCastId(casts[0]?.id || '');
    setDate(new Date().toISOString().slice(0, 10));
    setLabel(''); setSign('+'); setAmount('');
    setModalVisible(true);
  };

  const applyPreset = (preset: any) => {
    setLabel(preset.name);
    setSign(preset.sign);
    setAmount(String(preset.amount));
  };

  const handleSave = async () => {
    if (!castId || !label || !amount) { Alert.alert('エラー', '必須項目を入力してください'); return; }
    setSaving(true);
    try {
      await fetch(`${API_BASE}/cast-allowances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: shopId, cast_id: castId, date, label, sign, amount: Number(amount) }),
      });
      setModalVisible(false);
      load();
    } catch { Alert.alert('エラー', '保存に失敗しました'); } finally { setSaving(false); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('削除確認', 'この手当・控除を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => {
        try {
          await fetch(`${API_BASE}/cast-allowances`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          });
          load();
        } catch { Alert.alert('エラー', '削除に失敗しました'); }
      }},
    ]);
  };

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;

  return (
    <View>
      <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
        <Ionicons name="add-circle-outline" size={16} color={Colors.gold} />
        <Text style={styles.addBtnText}>手当・控除を追加</Text>
      </TouchableOpacity>

      {allowances.map((a: any) => {
        const cast = casts.find((c: any) => c.id === a.cast_id);
        return (
          <View key={a.id} style={styles.allowanceItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.allowanceLabel}>{a.label}</Text>
              <Text style={styles.allowanceSub}>{cast?.name || ''} · {a.date}</Text>
            </View>
            <Text style={[styles.allowanceAmount, { color: a.sign === '+' ? Colors.green : Colors.red }]}>
              {a.sign === '+' ? '+' : '-'}{fmtYen(a.amount)}
            </Text>
            <TouchableOpacity onPress={() => handleDelete(a.id)} style={{ padding: 6 }}>
              <Ionicons name="trash-outline" size={16} color={Colors.red} />
            </TouchableOpacity>
          </View>
        );
      })}
      {allowances.length === 0 && <Text style={styles.empty}>手当・控除の記録がありません</Text>}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={modal.container}>
          <View style={modal.header}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={modal.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.text2} />
            </TouchableOpacity>
            <Text style={modal.title}>手当・控除を追加</Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView style={{ padding: 20 }}>
            {/* キャスト選択 */}
            <Text style={modal.label}>キャスト *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {casts.map((c: any) => (
                <TouchableOpacity key={c.id} onPress={() => setCastId(c.id)}
                  style={[modal.chip, castId === c.id && modal.chipActive]}>
                  <Text style={[modal.chipText, castId === c.id && modal.chipTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* プリセット */}
            {presets.length > 0 && (
              <>
                <Text style={modal.label}>プリセットから選択</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {presets.map((p: any) => (
                    <TouchableOpacity key={p.id} onPress={() => applyPreset(p)}
                      style={[modal.chip, { borderColor: p.sign === '+' ? Colors.green : Colors.red }]}>
                      <Text style={[modal.chipText, { color: p.sign === '+' ? Colors.green : Colors.red }]}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={modal.label}>日付 *</Text>
            <TextInput style={modal.input} value={date} onChangeText={setDate} placeholder="2026-05-28" placeholderTextColor={Colors.text3} />

            <Text style={modal.label}>項目名 *</Text>
            <TextInput style={modal.input} value={label} onChangeText={setLabel} placeholder="例: 交通費" placeholderTextColor={Colors.text3} />

            <Text style={modal.label}>種別 *</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {(['+', '-'] as const).map(s => (
                <TouchableOpacity key={s} onPress={() => setSign(s)}
                  style={[modal.chip, sign === s && { backgroundColor: s === '+' ? 'rgba(78,203,138,0.15)' : 'rgba(224,92,106,0.15)', borderColor: s === '+' ? Colors.green : Colors.red }]}>
                  <Text style={[modal.chipText, sign === s && { color: s === '+' ? Colors.green : Colors.red }]}>
                    {s === '+' ? '手当' : '控除'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={modal.label}>金額（円）*</Text>
            <TextInput style={modal.input} value={amount} onChangeText={setAmount} placeholder="例: 1000" placeholderTextColor={Colors.text3} keyboardType="number-pad" />

            <TouchableOpacity style={modal.submitBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#1a1200" /> : <Text style={modal.submitText}>保存する</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ── プリセット管理 ──────────────────────────────────────────────
function PresetManagement({ shopId }: { shopId: string }) {
  const [presets, setPresets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [name, setName] = useState('');
  const [sign, setSign] = useState<'+' | '-'>('+');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/allowance-presets?shop_id=${shopId}`);
      const data = await res.json();
      setPresets(Array.isArray(data) ? data : []);
    } catch { } finally { setLoading(false); }
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditTarget(null); setName(''); setSign('+'); setAmount(''); setModalVisible(true); };
  const openEdit = (p: any) => { setEditTarget(p); setName(p.name); setSign(p.sign); setAmount(String(p.amount)); setModalVisible(true); };

  const handleSave = async () => {
    if (!name || !amount) { Alert.alert('エラー', '名前と金額を入力してください'); return; }
    setSaving(true);
    try {
      const method = editTarget ? 'PATCH' : 'POST';
      await fetch(`${API_BASE}/allowance-presets`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editTarget
          ? { id: editTarget.id, name, sign, amount: Number(amount) }
          : { shop_id: shopId, name, sign, amount: Number(amount) }),
      });
      setModalVisible(false);
      load();
    } catch { Alert.alert('エラー', '保存に失敗しました'); } finally { setSaving(false); }
  };

  const handleDelete = (id: string, pName: string) => {
    Alert.alert('削除確認', `「${pName}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => {
        try {
          await fetch(`${API_BASE}/allowance-presets`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          });
          load();
        } catch { Alert.alert('エラー', '削除に失敗しました'); }
      }},
    ]);
  };

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;

  return (
    <View>
      <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
        <Ionicons name="add-circle-outline" size={16} color={Colors.gold} />
        <Text style={styles.addBtnText}>プリセットを追加</Text>
      </TouchableOpacity>

      {presets.map((p: any) => (
        <View key={p.id} style={styles.allowanceItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.allowanceLabel}>{p.name}</Text>
            <Text style={[styles.allowanceSub, { color: p.sign === '+' ? Colors.green : Colors.red }]}>
              {p.sign === '+' ? '手当' : '控除'}
            </Text>
          </View>
          <Text style={[styles.allowanceAmount, { color: p.sign === '+' ? Colors.green : Colors.red }]}>
            {p.sign === '+' ? '+' : '-'}{fmtYen(p.amount)}
          </Text>
          <TouchableOpacity onPress={() => openEdit(p)} style={{ padding: 6 }}>
            <Ionicons name="create-outline" size={16} color={Colors.text2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(p.id, p.name)} style={{ padding: 6 }}>
            <Ionicons name="trash-outline" size={16} color={Colors.red} />
          </TouchableOpacity>
        </View>
      ))}
      {presets.length === 0 && <Text style={styles.empty}>プリセットがありません</Text>}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={modal.container}>
          <View style={modal.header}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={modal.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.text2} />
            </TouchableOpacity>
            <Text style={modal.title}>{editTarget ? 'プリセット編集' : 'プリセット追加'}</Text>
            <View style={{ width: 36 }} />
          </View>
          <View style={{ padding: 20, gap: 12 }}>
            <Text style={modal.label}>項目名 *</Text>
            <TextInput style={modal.input} value={name} onChangeText={setName} placeholder="例: 交通費" placeholderTextColor={Colors.text3} />
            <Text style={modal.label}>種別 *</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['+', '-'] as const).map(s => (
                <TouchableOpacity key={s} onPress={() => setSign(s)}
                  style={[modal.chip, sign === s && { backgroundColor: s === '+' ? 'rgba(78,203,138,0.15)' : 'rgba(224,92,106,0.15)', borderColor: s === '+' ? Colors.green : Colors.red }]}>
                  <Text style={[modal.chipText, sign === s && { color: s === '+' ? Colors.green : Colors.red }]}>
                    {s === '+' ? '手当' : '控除'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={modal.label}>金額（円）*</Text>
            <TextInput style={modal.input} value={amount} onChangeText={setAmount} placeholder="例: 1000" placeholderTextColor={Colors.text3} keyboardType="number-pad" />
            <TouchableOpacity style={modal.submitBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#1a1200" /> : <Text style={modal.submitText}>保存する</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── メイン ──────────────────────────────────────────────────────
export default function SalaryScreen() {
  const { shopId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SalaryTab>('summary');
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  const TABS: { key: SalaryTab; label: string; icon: string }[] = [
    { key: 'summary',   label: '月次サマリー', icon: 'wallet-outline' },
    { key: 'allowance', label: '手当・控除',   icon: 'cash-outline' },
    { key: 'presets',   label: 'プリセット',   icon: 'bookmark-outline' },
  ];

  const changeMonth = (delta: number) => {
    const d = new Date(month + '-01');
    d.setMonth(d.getMonth() + delta);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  if (!shopId) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topRow}>
        <Text style={styles.screenTitle}>給与管理</Text>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthBtn}>
            <Ionicons name="chevron-back" size={18} color={Colors.text2} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{month}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthBtn}>
            <Ionicons name="chevron-forward" size={18} color={Colors.text2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}>
            <Ionicons name={tab.icon as any} size={14} color={activeTab === tab.key ? Colors.gold : Colors.text3} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {activeTab === 'summary'   && <SalarySummary shopId={shopId} month={month} />}
        {activeTab === 'allowance' && <AllowanceManagement shopId={shopId} month={month} />}
        {activeTab === 'presets'   && <PresetManagement shopId={shopId} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const modal = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  closeBtn:     { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:        { fontSize: 16, fontWeight: '500', color: Colors.text },
  label:        { fontSize: 12, color: Colors.text2, marginBottom: 6 },
  input:        { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14, marginBottom: 4 },
  chip:         { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 0.5, borderColor: Colors.border, marginRight: 8 },
  chipActive:   { backgroundColor: Colors.goldDim, borderColor: Colors.gold },
  chipText:     { fontSize: 13, color: Colors.text3 },
  chipTextActive:{ color: Colors.gold },
  submitBtn:    { backgroundColor: Colors.gold, borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  submitText:   { color: '#1a1200', fontSize: 15, fontWeight: '600' },
});

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: Colors.bg },
  topRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  screenTitle:   { fontSize: 20, fontWeight: '500', color: Colors.text },
  monthNav:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  monthBtn:      { padding: 6 },
  monthLabel:    { fontSize: 14, color: Colors.text, fontWeight: '500', minWidth: 80, textAlign: 'center' },
  scroll:        { paddingHorizontal: 16, paddingBottom: 40 },
  tabScroll:     { maxHeight: 48, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  tabContent:    { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tab:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 0.5, borderColor: Colors.border },
  tabActive:     { backgroundColor: Colors.goldDim, borderColor: Colors.gold },
  tabText:       { fontSize: 12, color: Colors.text3 },
  tabTextActive: { fontSize: 12, color: Colors.gold, fontWeight: '500' },
  addBtn:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.goldDim, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.gold, padding: 12, marginTop: 12, marginBottom: 8 },
  addBtnText:    { fontSize: 14, color: Colors.gold, fontWeight: '500' },
  salaryCard:    { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 0.5, borderColor: Colors.border, padding: 14, marginBottom: 10, marginTop: 8 },
  salaryHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  castAvatar:    { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.purpleDim, justifyContent: 'center', alignItems: 'center' },
  castAvatarText:{ fontSize: 14, fontWeight: '500', color: Colors.purple },
  castName:      { fontSize: 14, fontWeight: '500', color: Colors.text },
  castSub:       { fontSize: 11, color: Colors.text3, marginTop: 2 },
  totalPay:      { fontSize: 16, fontWeight: '600', color: Colors.gold },
  salaryRows:    { gap: 5, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: Colors.border },
  salaryRow:     { flexDirection: 'row', justifyContent: 'space-between' },
  salaryRowLabel:{ fontSize: 12, color: Colors.text3 },
  salaryRowValue:{ fontSize: 12, color: Colors.text, fontWeight: '500' },
  allowanceItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  allowanceLabel:{ fontSize: 13, fontWeight: '500', color: Colors.text },
  allowanceSub:  { fontSize: 11, color: Colors.text3, marginTop: 2 },
  allowanceAmount:{ fontSize: 14, fontWeight: '600' },
  empty:         { fontSize: 13, color: Colors.text3, paddingVertical: 20, textAlign: 'center' },
});
