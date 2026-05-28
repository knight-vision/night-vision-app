import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors, fmtYen } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { useAuthStore } from '../../store/auth';

export default function JobsScreen() {
  const { shopId } = useAuthStore();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // フォーム
  const [title, setTitle] = useState('');
  const [wageMin, setWageMin] = useState('');
  const [wageMax, setWageMax] = useState('');
  const [workDays, setWorkDays] = useState('');
  const [conditions, setConditions] = useState('');
  const [benefits, setBenefits] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/jobs?shop_id=${shopId}`);
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch { setJobs([]); } finally { setLoading(false); }
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditTarget(null);
    setTitle(''); setWageMin(''); setWageMax('');
    setWorkDays(''); setConditions(''); setBenefits(''); setIsPublic(true);
    setModalVisible(true);
  };

  const openEdit = (job: any) => {
    setEditTarget(job);
    setTitle(job.title || '');
    setWageMin(String(job.wage_min || ''));
    setWageMax(String(job.wage_max || ''));
    setWorkDays(job.work_days || '');
    setConditions(job.conditions || '');
    setBenefits(job.benefits || '');
    setIsPublic(job.is_public !== false);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title) { Alert.alert('エラー', 'タイトルを入力してください'); return; }
    setSaving(true);
    try {
      const body = {
        shop_id: shopId,
        title,
        wage_min: Number(wageMin) || null,
        wage_max: Number(wageMax) || null,
        work_days: workDays,
        conditions,
        benefits,
        is_public: isPublic,
      };
      const method = editTarget ? 'PATCH' : 'POST';
      await fetch(`${API_BASE}/jobs`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editTarget ? { ...body, id: editTarget.id } : body),
      });
      Alert.alert(editTarget ? '更新しました' : '求人を作成しました');
      setModalVisible(false);
      load();
    } catch { Alert.alert('エラー', '保存に失敗しました'); } finally { setSaving(false); }
  };

  const handleDelete = (id: string, jobTitle: string) => {
    Alert.alert('削除確認', `「${jobTitle}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => {
        try {
          await fetch(`${API_BASE}/jobs`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          });
          load();
        } catch { Alert.alert('エラー', '削除に失敗しました'); }
      }},
    ]);
  };

  const togglePublic = async (job: any) => {
    try {
      await fetch(`${API_BASE}/jobs`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: job.id, is_public: !job.is_public }),
      });
      load();
    } catch { Alert.alert('エラー', '更新に失敗しました'); }
  };

  if (!shopId) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>求人管理</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={18} color="#1a1200" />
          <Text style={styles.addBtnText}>求人を追加</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading && <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />}

        {!loading && jobs.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="briefcase-outline" size={48} color={Colors.text3} />
            <Text style={styles.emptyText}>求人が登録されていません</Text>
            <Text style={styles.emptySubText}>「求人を追加」から作成してください</Text>
          </View>
        )}

        {jobs.map((job: any) => (
          <View key={job.id} style={styles.jobCard}>
            <View style={styles.jobCardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.jobTitle}>{job.title}</Text>
                {(job.wage_min || job.wage_max) && (
                  <Text style={styles.jobWage}>
                    時給 {job.wage_min ? fmtYen(job.wage_min) : '?'} 〜 {job.wage_max ? fmtYen(job.wage_max) : '?'}
                  </Text>
                )}
              </View>
              <View style={[styles.publicBadge, { backgroundColor: job.is_public ? 'rgba(78,203,138,0.15)' : Colors.surface2 }]}>
                <Text style={[styles.publicBadgeText, { color: job.is_public ? Colors.green : Colors.text3 }]}>
                  {job.is_public ? '公開中' : '非公開'}
                </Text>
              </View>
            </View>

            {job.work_days && (
              <View style={styles.jobInfoRow}>
                <Ionicons name="calendar-outline" size={13} color={Colors.text3} />
                <Text style={styles.jobInfoText}>{job.work_days}</Text>
              </View>
            )}
            {job.conditions && (
              <View style={styles.jobInfoRow}>
                <Ionicons name="person-outline" size={13} color={Colors.text3} />
                <Text style={styles.jobInfoText}>{job.conditions}</Text>
              </View>
            )}
            {job.benefits && (
              <View style={styles.jobInfoRow}>
                <Ionicons name="gift-outline" size={13} color={Colors.text3} />
                <Text style={styles.jobInfoText}>{job.benefits}</Text>
              </View>
            )}

            <View style={styles.jobActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => togglePublic(job)}>
                <Ionicons name={job.is_public ? 'eye-off-outline' : 'eye-outline'} size={14} color={Colors.text2} />
                <Text style={styles.actionBtnText}>{job.is_public ? '非公開にする' : '公開する'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(job)}>
                <Ionicons name="create-outline" size={14} color={Colors.text2} />
                <Text style={styles.actionBtnText}>編集</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(job.id, job.title)}>
                <Ionicons name="trash-outline" size={14} color={Colors.red} />
                <Text style={[styles.actionBtnText, { color: Colors.red }]}>削除</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={modal.container}>
          <View style={modal.header}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={modal.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.text2} />
            </TouchableOpacity>
            <Text style={modal.title}>{editTarget ? '求人を編集' : '求人を作成'}</Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView style={{ padding: 20 }}>
            <Text style={modal.label}>タイトル *</Text>
            <TextInput style={modal.input} value={title} onChangeText={setTitle} placeholder="例: ホステス・キャスト募集" placeholderTextColor={Colors.text3} />

            <Text style={modal.label}>時給（下限・円）</Text>
            <TextInput style={modal.input} value={wageMin} onChangeText={setWageMin} placeholder="例: 3000" placeholderTextColor={Colors.text3} keyboardType="number-pad" />

            <Text style={modal.label}>時給（上限・円）</Text>
            <TextInput style={modal.input} value={wageMax} onChangeText={setWageMax} placeholder="例: 8000" placeholderTextColor={Colors.text3} keyboardType="number-pad" />

            <Text style={modal.label}>勤務日</Text>
            <TextInput style={modal.input} value={workDays} onChangeText={setWorkDays} placeholder="例: 週2日〜OK、シフト制" placeholderTextColor={Colors.text3} />

            <Text style={modal.label}>応募条件</Text>
            <TextInput style={[modal.input, { height: 80, textAlignVertical: 'top' }]} value={conditions} onChangeText={setConditions} placeholder="例: 18歳以上（高校生不可）、未経験歓迎" placeholderTextColor={Colors.text3} multiline />

            <Text style={modal.label}>待遇・福利厚生</Text>
            <TextInput style={[modal.input, { height: 80, textAlignVertical: 'top' }]} value={benefits} onChangeText={setBenefits} placeholder="例: 交通費支給、日払いOK、制服貸与" placeholderTextColor={Colors.text3} multiline />

            <View style={modal.switchRow}>
              <Text style={modal.label}>公開する</Text>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: Colors.surface2, true: Colors.goldDim }}
                thumbColor={isPublic ? Colors.gold : Colors.text3}
              />
            </View>

            <TouchableOpacity style={modal.submitBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#1a1200" /> : <Text style={modal.submitText}>保存する</Text>}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const modal = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  closeBtn:   { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:      { fontSize: 16, fontWeight: '500', color: Colors.text },
  label:      { fontSize: 12, color: Colors.text2, marginBottom: 6 },
  input:      { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14, marginBottom: 12 },
  switchRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  submitBtn:  { backgroundColor: Colors.gold, borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitText: { color: '#1a1200', fontSize: 15, fontWeight: '600' },
});

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: Colors.bg },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  screenTitle:    { fontSize: 20, fontWeight: '500', color: Colors.text },
  addBtn:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.gold, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText:     { color: '#1a1200', fontWeight: '600', fontSize: 13 },
  scroll:         { paddingHorizontal: 16, paddingBottom: 40 },
  empty:          { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText:      { fontSize: 15, color: Colors.text2, fontWeight: '500' },
  emptySubText:   { fontSize: 13, color: Colors.text3 },
  jobCard:        { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 0.5, borderColor: Colors.border, padding: 14, marginBottom: 10, marginTop: 6 },
  jobCardHeader:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  jobTitle:       { fontSize: 15, fontWeight: '500', color: Colors.text, lineHeight: 20 },
  jobWage:        { fontSize: 12, color: Colors.gold, marginTop: 4 },
  publicBadge:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  publicBadgeText:{ fontSize: 11, fontWeight: '600' },
  jobInfoRow:     { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginBottom: 4 },
  jobInfoText:    { fontSize: 12, color: Colors.text2, flex: 1, lineHeight: 18 },
  jobActions:     { flexDirection: 'row', gap: 4, marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: Colors.border },
  actionBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 6, backgroundColor: Colors.surface2 },
  actionBtnText:  { fontSize: 12, color: Colors.text2 },
});
