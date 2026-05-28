import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Switch, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors, fmtYen } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { useAuthStore } from '../../store/auth';

type ShopTab = 'info' | 'jobs';

const DAYS = ['月', '火', '水', '木', '金', '土', '日'];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 店舗情報
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ShopInfo({ shopId }: { shopId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shopSlug, setShopSlug] = useState('');
  const [shopName, setShopName] = useState('');
  const [tel, setTel] = useState('');
  const [area, setArea] = useState('');
  const [seats, setSeats] = useState('');
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [system, setSystem] = useState('');
  const [openTime, setOpenTime] = useState('20:00');
  const [closeTime, setCloseTime] = useState('03:00');
  const [instagram, setInstagram] = useState('');
  const [xAccount, setXAccount] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [weeklyHours, setWeeklyHours] = useState<Record<string, any>>({});

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/shop-info?shop_id=${shopId}`);
      const data = await res.json();
      if (data) {
        setShopSlug(data.slug || '');
        setShopName(data.name || '');
        setTel(data.tel || '');
        setArea(data.area || '');
        setSeats(String(data.seats || ''));
        setBudget(String(data.budget || ''));
        setDescription(data.description || '');
        setSystem(data.system || '');
        setOpenTime(data.open_time || '20:00');
        setCloseTime(data.close_time || '03:00');
        setInstagram(data.instagram || '');
        setXAccount(data.x_account || '');
        setTiktok(data.tiktok_account || '');
        const defaultWeekly: Record<string, any> = {};
        DAYS.forEach(d => { defaultWeekly[d] = { open: '20:00', close: '03:00', closed: false }; });
        setWeeklyHours({ ...defaultWeekly, ...(data.weekly_hours || {}) });
      }
    } catch { } finally { setLoading(false); }
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/shop-info`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: shopId, name: shopName, tel, area,
          seats: Number(seats) || null, budget: Number(budget) || null,
          description, system, open_time: openTime, close_time: closeTime,
          instagram, x_account: xAccount, tiktok_account: tiktok,
          weekly_hours: weeklyHours,
        }),
      });
      Alert.alert('保存しました');
    } catch { Alert.alert('エラー', '保存に失敗しました'); } finally { setSaving(false); }
  };

  const updateDay = (day: string, field: string, value: any) => {
    setWeeklyHours(prev => ({ ...prev, [day]: { ...(prev[day] || {}), [field]: value } }));
  };



  const openWebsite = () => {
    const url = shopSlug
      ? `https://www.night-vision.jp/shops/${shopSlug}`
      : 'https://www.night-vision.jp';
    Linking.openURL(url);
  };

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;

  return (
    <View>
      {/* Webサイトリンク */}
      <TouchableOpacity style={styles.webLinkBtn} onPress={openWebsite}>
        <Ionicons name="globe-outline" size={18} color={Colors.gold} />
        <Text style={styles.webLinkText}>Webサイトで店舗ページを確認</Text>
        <Ionicons name="open-outline" size={16} color={Colors.gold} />
      </TouchableOpacity>


      <Text style={styles.sectionTitle}>基本情報</Text>
      <Field label="店舗名" value={shopName} onChange={setShopName} placeholder="例: Club NIGHT" />
      <Field label="電話番号" value={tel} onChange={setTel} placeholder="例: 090-1234-5678" keyboardType="phone-pad" />
      <Field label="エリア" value={area} onChange={setArea} placeholder="例: 釧路" />
      <Field label="席数" value={seats} onChange={setSeats} placeholder="例: 20" keyboardType="number-pad" />
      <Field label="予算目安（円）" value={budget} onChange={setBudget} placeholder="例: 10000" keyboardType="number-pad" />
      <Field label="説明文" value={description} onChange={setDescription} placeholder="店舗の特徴など" multiline />
      <Field label="システム料" value={system} onChange={setSystem} placeholder="例: 席料3,000円・指名料2,000円" multiline />

      <Text style={styles.sectionTitle}>通常営業時間</Text>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>開店</Text>
          <TextInput style={styles.input} value={openTime} onChangeText={setOpenTime} placeholder="20:00" placeholderTextColor={Colors.text3} />
        </View>
        <Text style={{ color: Colors.text3, paddingTop: 28 }}>〜</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>閉店</Text>
          <TextInput style={styles.input} value={closeTime} onChangeText={setCloseTime} placeholder="03:00" placeholderTextColor={Colors.text3} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>曜日別営業時間</Text>
      {DAYS.map(day => (
        <View key={day} style={styles.dayRow}>
          <Text style={styles.dayLabel}>{day}</Text>
          <Switch
            value={!(weeklyHours[day]?.closed)}
            onValueChange={v => updateDay(day, 'closed', !v)}
            trackColor={{ false: Colors.surface2, true: Colors.goldDim }}
            thumbColor={!weeklyHours[day]?.closed ? Colors.gold : Colors.text3}
          />
          {!weeklyHours[day]?.closed ? (
            <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
              <TextInput style={[styles.input, { flex: 1 }]} value={weeklyHours[day]?.open || '20:00'}
                onChangeText={v => updateDay(day, 'open', v)} placeholder="20:00" placeholderTextColor={Colors.text3} />
              <Text style={{ color: Colors.text3, alignSelf: 'center' }}>〜</Text>
              <TextInput style={[styles.input, { flex: 1 }]} value={weeklyHours[day]?.close || '03:00'}
                onChangeText={v => updateDay(day, 'close', v)} placeholder="03:00" placeholderTextColor={Colors.text3} />
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: Colors.text3, flex: 1, paddingLeft: 8 }}>定休日</Text>
          )}
        </View>
      ))}

      <Text style={styles.sectionTitle}>SNS</Text>
      <Field label="Instagram (@なし)" value={instagram} onChange={setInstagram} placeholder="例: clubnight_kushiro" />
      <Field label="X（@なし）" value={xAccount} onChange={setXAccount} placeholder="例: clubnight_kr" />
      <Field label="TikTok（@なし）" value={tiktok} onChange={setTiktok} placeholder="例: clubnight_kushiro" />

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#1a1200" size="small" /> : <Text style={styles.saveBtnText}>保存する</Text>}
      </TouchableOpacity>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, multiline, keyboardType }: any) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={Colors.text3} multiline={multiline} keyboardType={keyboardType || 'default'}
      />
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 求人管理
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function JobsSection({ shopId }: { shopId: string }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [wageMin, setWageMin] = useState('');
  const [wageMax, setWageMax] = useState('');
  const [workDays, setWorkDays] = useState('');
  const [conditions, setConditions] = useState('');
  const [benefits, setBenefits] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/job-postings?shop_id=${shopId}`);
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch { setJobs([]); } finally { setLoading(false); }
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditTarget(null);
    setTitle(''); setWageMin(''); setWageMax(''); setWorkDays(''); setConditions(''); setBenefits(''); setIsPublic(true);
    setModalVisible(true);
  };

  const openEdit = (job: any) => {
    setEditTarget(job);
    setTitle(job.title || ''); setWageMin(String(job.hourly_wage_min || '')); setWageMax(String(job.hourly_wage_max || ''));
    setWorkDays(job.work_days || ''); setConditions(job.requirements || ''); setBenefits(job.benefits || '');
    setIsPublic(job.is_active !== false);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title) { Alert.alert('エラー', 'タイトルを入力してください'); return; }
    setSaving(true);
    try {
      const body = { shop_id: shopId, title, hourly_wage_min: Number(wageMin) || null, hourly_wage_max: Number(wageMax) || null, work_days: workDays, conditions, benefits, is_active: isPublic };
      await fetch(`${API_BASE}/job-postings`, {
        method: editTarget ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editTarget ? { ...body, id: editTarget.id } : body),
      });
      setModalVisible(false);
      load();
    } catch { Alert.alert('エラー', '保存に失敗しました'); } finally { setSaving(false); }
  };

  const handleDelete = (id: string, jobTitle: string) => {
    Alert.alert('削除確認', `「${jobTitle}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => {
        await fetch(`${API_BASE}/job-postings`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        load();
      }},
    ]);
  };

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;

  return (
    <View>
      <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
        <Ionicons name="add-circle-outline" size={16} color={Colors.gold} />
        <Text style={styles.addBtnText}>求人を追加</Text>
      </TouchableOpacity>

      {jobs.length === 0 && <Text style={styles.empty}>求人が登録されていません</Text>}

      {jobs.map((job: any) => (
        <View key={job.id} style={styles.jobCard}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              {(job.hourly_wage_min || job.hourly_wage_max) && (
                <Text style={{ fontSize: 12, color: Colors.gold, marginTop: 2 }}>
                  時給 {job.hourly_wage_min ? fmtYen(job.hourly_wage_min) : '?'} 〜 {job.hourly_wage_max ? fmtYen(job.hourly_wage_max) : '?'}
                </Text>
              )}
            </View>
            <View style={[styles.publicBadge, { backgroundColor: job.is_active ? 'rgba(78,203,138,0.15)' : Colors.surface2 }]}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: job.is_active ? Colors.green : Colors.text3 }}>
                {job.is_active ? '公開中' : '非公開'}
              </Text>
            </View>
          </View>
          {job.work_days && <Text style={styles.jobInfo}>📅 {job.work_days}</Text>}
          {job.conditions && <Text style={styles.jobInfo}>👤 {job.conditions}</Text>}
          <View style={styles.jobActions}>
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
            <Text style={modal.label}>時給下限（円）</Text>
            <TextInput style={modal.input} value={wageMin} onChangeText={setWageMin} placeholder="例: 3000" placeholderTextColor={Colors.text3} keyboardType="number-pad" />
            <Text style={modal.label}>時給上限（円）</Text>
            <TextInput style={modal.input} value={wageMax} onChangeText={setWageMax} placeholder="例: 8000" placeholderTextColor={Colors.text3} keyboardType="number-pad" />
            <Text style={modal.label}>勤務日</Text>
            <TextInput style={modal.input} value={workDays} onChangeText={setWorkDays} placeholder="例: 週2日〜OK" placeholderTextColor={Colors.text3} />
            <Text style={modal.label}>応募条件</Text>
            <TextInput style={[modal.input, { height: 80, textAlignVertical: 'top' }]} value={conditions} onChangeText={setConditions} placeholder="例: 18歳以上、未経験歓迎" placeholderTextColor={Colors.text3} multiline />
            <Text style={modal.label}>待遇・福利厚生</Text>
            <TextInput style={[modal.input, { height: 80, textAlignVertical: 'top' }]} value={benefits} onChangeText={setBenefits} placeholder="例: 交通費支給、日払いOK" placeholderTextColor={Colors.text3} multiline />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={modal.label}>公開する</Text>
              <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ false: Colors.surface2, true: Colors.goldDim }} thumbColor={isPublic ? Colors.gold : Colors.text3} />
            </View>
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
// メイン
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function ShopManageScreen() {
  const { shopId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ShopTab>('info');

  const TABS: { key: ShopTab; label: string; icon: string }[] = [
    { key: 'info', label: '店舗情報', icon: 'storefront-outline' },
    { key: 'jobs', label: '求人管理', icon: 'briefcase-outline' },
  ];

  if (!shopId) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.screenTitle}>店舗管理</Text>
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
        {activeTab === 'info' && <ShopInfo shopId={shopId} />}
        {activeTab === 'jobs' && <JobsSection shopId={shopId} />}
      </ScrollView>
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
  submitBtn:  { backgroundColor: Colors.gold, borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitText: { color: '#1a1200', fontSize: 15, fontWeight: '600' },
});

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: Colors.bg },
  screenTitle:   { fontSize: 20, fontWeight: '500', color: Colors.text, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  scroll:        { paddingHorizontal: 16, paddingBottom: 40 },
  tabScroll:     { maxHeight: 48, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  tabContent:    { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tab:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 0.5, borderColor: Colors.border },
  tabActive:     { backgroundColor: Colors.goldDim, borderColor: Colors.gold },
  tabText:       { fontSize: 12, color: Colors.text3 },
  tabTextActive: { fontSize: 12, color: Colors.gold, fontWeight: '500' },
  webLinkBtn:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.goldDim, borderRadius: 12, borderWidth: 0.5, borderColor: Colors.gold, padding: 14, marginTop: 12, marginBottom: 4 },
  webLinkText:   { flex: 1, fontSize: 14, color: Colors.gold, fontWeight: '500' },
  sectionTitle:  { fontSize: 13, color: Colors.text2, fontWeight: '600', marginTop: 20, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldLabel:    { fontSize: 12, color: Colors.text2, marginBottom: 5 },
  input:         { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14 },
  dayRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  dayLabel:      { fontSize: 14, color: Colors.text, width: 20 },
  saveBtn:       { backgroundColor: Colors.gold, borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 20, marginBottom: 8 },
  saveBtnText:   { color: '#1a1200', fontWeight: '600', fontSize: 15 },
  addBtn:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.goldDim, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.gold, padding: 12, marginTop: 12, marginBottom: 8 },
  addBtnText:    { fontSize: 14, color: Colors.gold, fontWeight: '500' },
  empty:         { fontSize: 13, color: Colors.text3, paddingVertical: 20, textAlign: 'center' },
  jobCard:       { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 0.5, borderColor: Colors.border, padding: 12, marginBottom: 8 },
  jobTitle:      { fontSize: 14, fontWeight: '500', color: Colors.text },
  jobInfo:       { fontSize: 12, color: Colors.text2, marginBottom: 4 },
  publicBadge:   { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  jobActions:    { flexDirection: 'row', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: Colors.border },
  actionBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 6, backgroundColor: Colors.surface2 },
  actionBtnText: { fontSize: 12, color: Colors.text2 },
});
