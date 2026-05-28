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

type ManageTab = 'casts' | 'salary' | 'results';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// キャスト一覧
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CastManagement({ shopId }: { shopId: string }) {
  const [casts, setCasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [birthplace, setBirthplace] = useState('');
  const [hourlyWage, setHourlyWage] = useState('');
  const [comment, setComment] = useState('');
  const [instagram, setInstagram] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/casts?shop_id=${shopId}`);
      const data = await res.json();
      setCasts(Array.isArray(data) ? data : []);
    } catch { setCasts([]); } finally { setLoading(false); }
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditTarget(null);
    setName(''); setAge(''); setBirthplace(''); setHourlyWage(''); setComment(''); setInstagram('');
    setModalVisible(true);
  };

  const openEdit = (cast: any) => {
    setEditTarget(cast);
    setName(cast.name || '');
    setAge(String(cast.age || ''));
    setBirthplace(cast.birthplace || '');
    setHourlyWage(String(cast.hourly_wage || ''));
    setComment(cast.comment || '');
    setInstagram(cast.instagram || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name) { Alert.alert('エラー', '名前を入力してください'); return; }
    setSaving(true);
    try {
      const body = {
        shop_id: shopId,
        name,
        age: Number(age) || null,
        birthplace,
        hourly_wage: Number(hourlyWage) || 0,
        comment,
        instagram,
      };
      const method = editTarget ? 'PATCH' : 'POST';
      const url = editTarget ? `${API_BASE}/casts` : `${API_BASE}/casts`;
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editTarget ? { ...body, id: editTarget.id } : body),
      });
      Alert.alert(editTarget ? '更新しました' : '追加しました');
      setModalVisible(false);
      load();
    } catch { Alert.alert('エラー', '保存に失敗しました'); } finally { setSaving(false); }
  };

  const handleDelete = (id: string, castName: string) => {
    Alert.alert('削除確認', `「${castName}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => {
        try {
          await fetch(`${API_BASE}/casts`, {
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
        <Ionicons name="person-add-outline" size={16} color={Colors.gold} />
        <Text style={styles.addBtnText}>キャストを追加</Text>
      </TouchableOpacity>

      {casts.length === 0 && (
        <Text style={styles.empty}>キャストが登録されていません</Text>
      )}

      {casts.map((c: any) => (
        <View key={c.id} style={styles.castCard}>
          <View style={styles.castAvatar}>
            <Text style={styles.castAvatarText}>{c.name?.[0] || '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.castName}>{c.name}</Text>
            <Text style={styles.castSub}>
              {c.age ? `${c.age}歳` : ''}{c.birthplace ? `　${c.birthplace}出身` : ''}
            </Text>
            <Text style={styles.castWage}>時給 {fmtYen(c.hourly_wage || 0)}</Text>
            {c.comment ? <Text style={styles.castComment}>{c.comment}</Text> : null}
          </View>
          <View style={{ gap: 6 }}>
            <TouchableOpacity onPress={() => openEdit(c)} style={styles.iconBtn}>
              <Ionicons name="create-outline" size={18} color={Colors.text2} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(c.id, c.name)} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={18} color={Colors.red} />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={modal.container}>
          <View style={modal.header}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={modal.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.text2} />
            </TouchableOpacity>
            <Text style={modal.title}>{editTarget ? 'キャスト編集' : 'キャスト追加'}</Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView style={{ padding: 20 }}>
            <Text style={modal.label}>名前 *</Text>
            <TextInput style={modal.input} value={name} onChangeText={setName} placeholder="例: 桜 -Sakura-" placeholderTextColor={Colors.text3} />
            <Text style={modal.label}>年齢</Text>
            <TextInput style={modal.input} value={age} onChangeText={setAge} placeholder="例: 22" placeholderTextColor={Colors.text3} keyboardType="number-pad" />
            <Text style={modal.label}>出身地</Text>
            <TextInput style={modal.input} value={birthplace} onChangeText={setBirthplace} placeholder="例: 北海道" placeholderTextColor={Colors.text3} />
            <Text style={modal.label}>時給（円）</Text>
            <TextInput style={modal.input} value={hourlyWage} onChangeText={setHourlyWage} placeholder="例: 3000" placeholderTextColor={Colors.text3} keyboardType="number-pad" />
            <Text style={modal.label}>Instagram（@なし）</Text>
            <TextInput style={modal.input} value={instagram} onChangeText={setInstagram} placeholder="例: sakura_night" placeholderTextColor={Colors.text3} />
            <Text style={modal.label}>コメント</Text>
            <TextInput style={[modal.input, { height: 80, textAlignVertical: 'top' }]} value={comment} onChangeText={setComment} placeholder="自己紹介など" placeholderTextColor={Colors.text3} multiline />
            <TouchableOpacity style={modal.submitBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#1a1200" /> : <Text style={modal.submitText}>保存する</Text>}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 給与管理（salary.tsxの内容を統合）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
type SalarySubTab = 'summary' | 'allowance' | 'presets';

function SalarySection({ shopId }: { shopId: string }) {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [subTab, setSubTab] = useState<SalarySubTab>('summary');

  const changeMonth = (delta: number) => {
    const d = new Date(month + '-01');
    d.setMonth(d.getMonth() + delta);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const SUB_TABS: { key: SalarySubTab; label: string }[] = [
    { key: 'summary',   label: '月次サマリー' },
    { key: 'allowance', label: '手当・控除' },
    { key: 'presets',   label: 'プリセット' },
  ];

  return (
    <View>
      {/* 月選択 */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthBtn}>
          <Ionicons name="chevron-back" size={18} color={Colors.text2} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{month}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthBtn}>
          <Ionicons name="chevron-forward" size={18} color={Colors.text2} />
        </TouchableOpacity>
      </View>

      {/* サブタブ */}
      <View style={styles.subTabRow}>
        {SUB_TABS.map(t => (
          <TouchableOpacity key={t.key} onPress={() => setSubTab(t.key)}
            style={[styles.subTab, subTab === t.key && styles.subTabActive]}>
            <Text style={[styles.subTabText, subTab === t.key && styles.subTabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {subTab === 'summary'   && <SalarySummary shopId={shopId} month={month} />}
      {subTab === 'allowance' && <AllowanceManagement shopId={shopId} month={month} />}
      {subTab === 'presets'   && <PresetManagement shopId={shopId} />}
    </View>
  );
}

function SalarySummary({ shopId, month }: { shopId: string; month: string }) {
  const [casts, setCasts] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [allowances, setAllowances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [castRes, shiftRes, allowRes] = await Promise.all([
        fetch(`${API_BASE}/casts?shop_id=${shopId}`),
        fetch(`${API_BASE}/confirm-shift?shop_id=${shopId}&year=${month.slice(0,4)}&month=${month.slice(5,7)}`),
        fetch(`${API_BASE}/cast-allowances?shop_id=${shopId}&month=${month}`),
      ]);
      const c = await castRes.json(); setCasts(Array.isArray(c) ? c : []);
      const s = await shiftRes.json(); setShifts(Array.isArray(s) ? s : []);
      const a = await allowRes.json(); setAllowances(Array.isArray(a) ? a : []);
    } catch { } finally { setLoading(false); }
  }, [shopId, month]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 20 }} />;

  return (
    <View>
      {casts.map((cast: any) => {
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
              <View style={styles.castAvatar}><Text style={styles.castAvatarText}>{cast.name?.[0] || '?'}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.castName}>{cast.name}</Text>
                <Text style={styles.castSub}>時給 {fmtYen(cast.hourly_wage || 0)}</Text>
              </View>
              <Text style={styles.totalPay}>{fmtYen(total)}</Text>
            </View>
            <View style={styles.salaryRows}>
              <SalRow label="勤務時間" value={`${totalHours.toFixed(1)}h`} />
              <SalRow label="基本給" value={fmtYen(basePay)} />
              {allowTotal > 0 && <SalRow label="手当合計" value={`+${fmtYen(allowTotal)}`} color={Colors.green} />}
              {deductTotal > 0 && <SalRow label="控除合計" value={`-${fmtYen(deductTotal)}`} color={Colors.red} />}
            </View>
          </View>
        );
      })}
      {casts.length === 0 && <Text style={styles.empty}>キャストが登録されていません</Text>}
    </View>
  );
}

function SalRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
      <Text style={{ fontSize: 12, color: Colors.text3 }}>{label}</Text>
      <Text style={{ fontSize: 12, color: color || Colors.text, fontWeight: '500' }}>{value}</Text>
    </View>
  );
}

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
        fetch(`${API_BASE}/casts?shop_id=${shopId}`),
        fetch(`${API_BASE}/allowance-presets?shop_id=${shopId}`),
      ]);
      const a = await aRes.json(); setAllowances(Array.isArray(a) ? a : []);
      const c = await cRes.json(); setCasts(Array.isArray(c) ? c : []);
      const p = await pRes.json(); setPresets(Array.isArray(p) ? p : []);
    } catch { } finally { setLoading(false); }
  }, [shopId, month]);

  useEffect(() => { load(); }, [load]);

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
        await fetch(`${API_BASE}/cast-allowances`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        load();
      }},
    ]);
  };

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 20 }} />;

  return (
    <View>
      <TouchableOpacity style={styles.addBtn} onPress={() => { setCastId(casts[0]?.id || ''); setDate(new Date().toISOString().slice(0,10)); setLabel(''); setSign('+'); setAmount(''); setModalVisible(true); }}>
        <Ionicons name="add-circle-outline" size={16} color={Colors.gold} />
        <Text style={styles.addBtnText}>手当・控除を追加</Text>
      </TouchableOpacity>
      {allowances.map((a: any) => {
        const cast = casts.find((c: any) => c.id === a.cast_id);
        return (
          <View key={a.id} style={styles.allowanceItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.castName}>{a.label}</Text>
              <Text style={styles.castSub}>{cast?.name || ''} · {a.date}</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: a.sign === '+' ? Colors.green : Colors.red }}>
              {a.sign === '+' ? '+' : '-'}{fmtYen(a.amount)}
            </Text>
            <TouchableOpacity onPress={() => handleDelete(a.id)} style={styles.iconBtn}>
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
            <Text style={modal.label}>キャスト *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {casts.map((c: any) => (
                <TouchableOpacity key={c.id} onPress={() => setCastId(c.id)}
                  style={[modal.chip, castId === c.id && modal.chipActive]}>
                  <Text style={[modal.chipText, castId === c.id && modal.chipTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {presets.length > 0 && (
              <>
                <Text style={modal.label}>プリセット</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {presets.map((p: any) => (
                    <TouchableOpacity key={p.id} onPress={() => { setLabel(p.name); setSign(p.sign); setAmount(String(p.amount)); }}
                      style={[modal.chip, { borderColor: p.sign === '+' ? Colors.green : Colors.red }]}>
                      <Text style={{ fontSize: 13, color: p.sign === '+' ? Colors.green : Colors.red }}>{p.name}</Text>
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
                  <Text style={[modal.chipText, sign === s && { color: s === '+' ? Colors.green : Colors.red }]}>{s === '+' ? '手当' : '控除'}</Text>
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

  const handleSave = async () => {
    if (!name || !amount) { Alert.alert('エラー', '名前と金額を入力してください'); return; }
    setSaving(true);
    try {
      const method = editTarget ? 'PATCH' : 'POST';
      await fetch(`${API_BASE}/allowance-presets`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editTarget ? { id: editTarget.id, name, sign, amount: Number(amount) } : { shop_id: shopId, name, sign, amount: Number(amount) }),
      });
      setModalVisible(false);
      load();
    } catch { Alert.alert('エラー', '保存に失敗しました'); } finally { setSaving(false); }
  };

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 20 }} />;

  return (
    <View>
      <TouchableOpacity style={styles.addBtn} onPress={() => { setEditTarget(null); setName(''); setSign('+'); setAmount(''); setModalVisible(true); }}>
        <Ionicons name="add-circle-outline" size={16} color={Colors.gold} />
        <Text style={styles.addBtnText}>プリセットを追加</Text>
      </TouchableOpacity>
      {presets.map((p: any) => (
        <View key={p.id} style={styles.allowanceItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.castName}>{p.name}</Text>
            <Text style={[styles.castSub, { color: p.sign === '+' ? Colors.green : Colors.red }]}>{p.sign === '+' ? '手当' : '控除'}</Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: p.sign === '+' ? Colors.green : Colors.red }}>
            {p.sign === '+' ? '+' : '-'}{fmtYen(p.amount)}
          </Text>
          <TouchableOpacity onPress={() => { setEditTarget(p); setName(p.name); setSign(p.sign); setAmount(String(p.amount)); setModalVisible(true); }} style={styles.iconBtn}>
            <Ionicons name="create-outline" size={16} color={Colors.text2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            Alert.alert('削除', `「${p.name}」を削除しますか？`, [
              { text: 'キャンセル', style: 'cancel' },
              { text: '削除', style: 'destructive', onPress: async () => {
                await fetch(`${API_BASE}/allowance-presets`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id }) });
                load();
              }},
            ]);
          }} style={styles.iconBtn}>
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
                  <Text style={[modal.chipText, sign === s && { color: s === '+' ? Colors.green : Colors.red }]}>{s === '+' ? '手当' : '控除'}</Text>
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 成績（オーナー向けキャスト売上ランキング）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SALES_TYPES = [
  { key: 'honshimei', label: '本指名' },
  { key: 'baai',      label: '場内' },
  { key: 'douhan',    label: '同伴' },
  { key: 'bottle',    label: 'ボトル' },
  { key: 'other',     label: 'その他' },
];

function ResultsSection({ shopId }: { shopId: string }) {
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
        fetch(`${API_BASE}/casts?shop_id=${shopId}`),
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

  return (
    <View>
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthBtn}>
          <Ionicons name="chevron-back" size={18} color={Colors.text2} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{month}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthBtn}>
          <Ionicons name="chevron-forward" size={18} color={Colors.text2} />
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator color={Colors.gold} style={{ marginTop: 20 }} />}

      {!loading && castTotals.map((cast: any, i: number) => (
        <View key={cast.id} style={styles.salaryCard}>
          <View style={styles.salaryHeader}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: i === 0 ? Colors.gold : Colors.text2, width: 24 }}>#{i+1}</Text>
            <View style={styles.castAvatar}><Text style={styles.castAvatarText}>{cast.name?.[0] || '?'}</Text></View>
            <Text style={[styles.castName, { flex: 1 }]}>{cast.name}</Text>
            <Text style={styles.totalPay}>{fmtYen(cast.total)}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {SALES_TYPES.map(type => cast.byType[type.key] > 0 && (
              <View key={type.key} style={{ backgroundColor: Colors.surface2, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ fontSize: 10, color: Colors.text3 }}>{type.label}</Text>
                <Text style={{ fontSize: 12, color: Colors.text, fontWeight: '500' }}>{fmtYen(cast.byType[type.key])}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
      {!loading && castTotals.length === 0 && <Text style={styles.empty}>売上データがありません</Text>}
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// メイン
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function ManageScreen() {
  const { shopId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ManageTab>('casts');

  const TABS: { key: ManageTab; label: string; icon: string }[] = [
    { key: 'casts',   label: 'キャスト', icon: 'people-outline' },
    { key: 'salary',  label: '給与管理', icon: 'wallet-outline' },
    { key: 'results', label: '成績',     icon: 'trophy-outline' },
  ];

  if (!shopId) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.screenTitle}>キャスト管理</Text>
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
        {activeTab === 'casts'   && <CastManagement shopId={shopId} />}
        {activeTab === 'salary'  && <SalarySection shopId={shopId} />}
        {activeTab === 'results' && <ResultsSection shopId={shopId} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const modal = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.bg },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  closeBtn:      { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:         { fontSize: 16, fontWeight: '500', color: Colors.text },
  label:         { fontSize: 12, color: Colors.text2, marginBottom: 6 },
  input:         { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14, marginBottom: 12 },
  chip:          { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 0.5, borderColor: Colors.border, marginRight: 8 },
  chipActive:    { backgroundColor: Colors.goldDim, borderColor: Colors.gold },
  chipText:      { fontSize: 13, color: Colors.text3 },
  chipTextActive:{ color: Colors.gold },
  submitBtn:     { backgroundColor: Colors.gold, borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  submitText:    { color: '#1a1200', fontSize: 15, fontWeight: '600' },
});

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: Colors.bg },
  screenTitle:    { fontSize: 20, fontWeight: '500', color: Colors.text, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  scroll:         { paddingHorizontal: 16, paddingBottom: 40 },
  tabScroll:      { maxHeight: 48, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  tabContent:     { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tab:            { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 0.5, borderColor: Colors.border },
  tabActive:      { backgroundColor: Colors.goldDim, borderColor: Colors.gold },
  tabText:        { fontSize: 12, color: Colors.text3 },
  tabTextActive:  { fontSize: 12, color: Colors.gold, fontWeight: '500' },
  subTabRow:      { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 4 },
  subTab:         { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 0.5, borderColor: Colors.border },
  subTabActive:   { backgroundColor: Colors.surface2, borderColor: Colors.text2 },
  subTabText:     { fontSize: 11, color: Colors.text3 },
  subTabTextActive:{ fontSize: 11, color: Colors.text },
  addBtn:         { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.goldDim, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.gold, padding: 12, marginTop: 12, marginBottom: 8 },
  addBtnText:     { fontSize: 14, color: Colors.gold, fontWeight: '500' },
  castCard:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 0.5, borderColor: Colors.border, padding: 12, marginBottom: 8 },
  castAvatar:     { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.purpleDim, justifyContent: 'center', alignItems: 'center' },
  castAvatarText: { fontSize: 14, fontWeight: '500', color: Colors.purple },
  castName:       { fontSize: 14, fontWeight: '500', color: Colors.text },
  castSub:        { fontSize: 11, color: Colors.text3, marginTop: 2 },
  castWage:       { fontSize: 12, color: Colors.gold, marginTop: 3 },
  castComment:    { fontSize: 12, color: Colors.text2, marginTop: 4, lineHeight: 16 },
  iconBtn:        { padding: 4 },
  salaryCard:     { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 0.5, borderColor: Colors.border, padding: 12, marginBottom: 8 },
  salaryHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  salaryRows:     { marginTop: 10, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: Colors.border },
  totalPay:       { fontSize: 16, fontWeight: '600', color: Colors.gold },
  allowanceItem:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  monthNav:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 10 },
  monthBtn:       { padding: 6 },
  monthLabel:     { fontSize: 15, color: Colors.text, fontWeight: '500', minWidth: 90, textAlign: 'center' },
  empty:          { fontSize: 13, color: Colors.text3, paddingVertical: 20, textAlign: 'center' },
});
