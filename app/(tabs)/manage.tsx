import { ScrollView, View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors, fmtYen } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { useAuthStore } from '../../store/auth';

type ManageTab = 'casts' | 'menus' | 'tweets' | 'jobs' | 'feedback' | 'csv';

// キャスト管理
function CastManagement({ shopId }: { shopId: string }) {
  const [casts, setCasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [hourlyWage, setHourlyWage] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/cast-wage?shop_id=${shopId}`);
      const data = await res.json();
      setCasts(Array.isArray(data) ? data : []);
    } catch { setCasts([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [shopId]);

  const openAdd = () => { setEditTarget(null); setName(''); setAge(''); setHourlyWage(''); setComment(''); setModalVisible(true); };
  const openEdit = (cast: any) => { setEditTarget(cast); setName(cast.name || ''); setAge(String(cast.age || '')); setHourlyWage(String(cast.hourly_wage || '')); setComment(cast.comment || ''); setModalVisible(true); };

  const handleSave = async () => {
    if (!name) { Alert.alert('エラー', '名前を入力してください'); return; }
    setSaving(true);
    try {
      const body = { shop_id: shopId, name, age: Number(age) || null, hourly_wage: Number(hourlyWage) || 0, comment };
      const method = editTarget ? 'PATCH' : 'POST';
      const url = editTarget ? `${API_BASE}/cast-account-update` : `${API_BASE}/issue-cast-account`;
      // キャスト情報の更新はcast-sales APIに相当する処理 - シンプルにSupabaseへ直接
      const res = await fetch(`${API_BASE}/cast-wage`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editTarget ? { ...body, id: editTarget.id } : body),
      });
      Alert.alert(editTarget ? '更新しました' : '追加しました');
      setModalVisible(false);
      load();
    } catch { Alert.alert('エラー', '保存に失敗しました'); } finally { setSaving(false); }
  };

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 20 }} />;

  return (
    <View>
      <TouchableOpacity style={styles.addRowBtn} onPress={openAdd}>
        <Ionicons name="person-add-outline" size={16} color={Colors.gold} />
        <Text style={styles.addRowBtnText}>キャストを追加</Text>
      </TouchableOpacity>

      {casts.map((c: any, i: number) => (
        <View key={c.id || i} style={styles.listItem}>
          <View style={[styles.castAvatar, { backgroundColor: Colors.purpleDim }]}>
            <Text style={[styles.castAvatarText, { color: Colors.purple }]}>{c.name?.[0] || '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.listItemTitle}>{c.name}</Text>
            <Text style={styles.listItemSub}>時給 {fmtYen(c.hourly_wage || 0)}　{c.age ? `${c.age}歳` : ''}</Text>
          </View>
          <TouchableOpacity onPress={() => openEdit(c)} style={styles.editBtn}>
            <Ionicons name="create-outline" size={18} color={Colors.text2} />
          </TouchableOpacity>
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
            <Text style={modal.label}>時給（円）</Text>
            <TextInput style={modal.input} value={hourlyWage} onChangeText={setHourlyWage} placeholder="例: 3000" placeholderTextColor={Colors.text3} keyboardType="number-pad" />
            <Text style={modal.label}>コメント</Text>
            <TextInput style={[modal.input, { height: 80, textAlignVertical: 'top' }]} value={comment} onChangeText={setComment} placeholder="自己紹介など" placeholderTextColor={Colors.text3} multiline />
            <TouchableOpacity style={modal.submitBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#1a1200" /> : <Text style={modal.submitText}>保存する</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// 品名管理
function MenuManagement({ shopId }: { shopId: string }) {
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/shop-menus?shop_id=${shopId}`);
      const data = await res.json();
      setMenus(Array.isArray(data) ? data : []);
    } catch { setMenus([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [shopId]);

  const openAdd = () => { setEditTarget(null); setName(''); setPrice(''); setModalVisible(true); };
  const openEdit = (m: any) => { setEditTarget(m); setName(m.name); setPrice(String(m.price)); setModalVisible(true); };

  const handleSave = async () => {
    if (!name || !price) { Alert.alert('エラー', '名前と価格を入力してください'); return; }
    setSaving(true);
    try {
      const method = editTarget ? 'PATCH' : 'POST';
      await fetch(`${API_BASE}/shop-menus`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editTarget
          ? { id: editTarget.id, shop_id: shopId, name, price: Number(price) }
          : { shop_id: shopId, name, price: Number(price) }),
      });
      Alert.alert(editTarget ? '更新しました' : '追加しました');
      setModalVisible(false);
      load();
    } catch { Alert.alert('エラー', '保存に失敗しました'); } finally { setSaving(false); }
  };

  const handleDelete = (id: string, itemName: string) => {
    Alert.alert('削除確認', `「${itemName}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => {
        try {
          await fetch(`${API_BASE}/shop-menus`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
          load();
        } catch { Alert.alert('エラー', '削除に失敗しました'); }
      }},
    ]);
  };

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 20 }} />;

  return (
    <View>
      <TouchableOpacity style={styles.addRowBtn} onPress={openAdd}>
        <Ionicons name="add-circle-outline" size={16} color={Colors.gold} />
        <Text style={styles.addRowBtnText}>品名を追加</Text>
      </TouchableOpacity>
      {menus.map((m: any, i: number) => (
        <View key={m.id || i} style={styles.listItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.listItemTitle}>{m.name}</Text>
            <Text style={styles.listItemSub}>{fmtYen(m.price)}</Text>
          </View>
          <TouchableOpacity onPress={() => openEdit(m)} style={styles.editBtn}>
            <Ionicons name="create-outline" size={18} color={Colors.text2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(m.id, m.name)} style={styles.editBtn}>
            <Ionicons name="trash-outline" size={18} color={Colors.red} />
          </TouchableOpacity>
        </View>
      ))}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={modal.container}>
          <View style={modal.header}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={modal.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.text2} />
            </TouchableOpacity>
            <Text style={modal.title}>{editTarget ? '品名編集' : '品名追加'}</Text>
            <View style={{ width: 36 }} />
          </View>
          <View style={{ padding: 20, gap: 12 }}>
            <Text style={modal.label}>品名 *</Text>
            <TextInput style={modal.input} value={name} onChangeText={setName} placeholder="例: ボトルシャンパン" placeholderTextColor={Colors.text3} />
            <Text style={modal.label}>価格（円）*</Text>
            <TextInput style={modal.input} value={price} onChangeText={setPrice} placeholder="例: 5000" placeholderTextColor={Colors.text3} keyboardType="number-pad" />
            <TouchableOpacity style={modal.submitBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#1a1200" /> : <Text style={modal.submitText}>保存する</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// つぶやき
function TweetManagement({ shopId }: { shopId: string }) {
  const [tweets, setTweets] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tweet?shop_id=${shopId}`);
      const data = await res.json();
      setTweets(Array.isArray(data) ? data : []);
    } catch { setTweets([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [shopId]);

  const handlePost = async () => {
    if (!message.trim()) { Alert.alert('エラー', 'メッセージを入力してください'); return; }
    setPosting(true);
    try {
      await fetch(`${API_BASE}/tweet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: shopId, message }),
      });
      setMessage('');
      load();
    } catch { Alert.alert('エラー', '投稿に失敗しました'); } finally { setPosting(false); }
  };

  return (
    <View>
      <TextInput style={[styles.memoInput, { marginBottom: 10 }]} value={message} onChangeText={setMessage}
        placeholder="店舗からのお知らせを入力..." placeholderTextColor={Colors.text3} multiline />
      <TouchableOpacity style={styles.postBtn} onPress={handlePost} disabled={posting}>
        {posting ? <ActivityIndicator color="#1a1200" /> : <Text style={styles.postBtnText}>投稿する</Text>}
      </TouchableOpacity>
      {loading ? <ActivityIndicator color={Colors.gold} style={{ marginTop: 12 }} /> :
        tweets.map((t: any, i: number) => (
          <View key={i} style={styles.tweetCard}>
            <Text style={styles.tweetMsg}>{t.message}</Text>
            <Text style={styles.tweetDate}>{new Date(t.created_at).toLocaleDateString('ja-JP')}</Text>
          </View>
        ))
      }
    </View>
  );
}

// フィードバック
function FeedbackView({ shopId }: { shopId: string }) {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/feedback?shop_id=${shopId}`)
      .then(r => r.json())
      .then(d => { setFeedbacks(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [shopId]);

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 20 }} />;

  return (
    <View>
      {feedbacks.length === 0 ? <Text style={styles.emptyText}>フィードバックはありません</Text> :
        feedbacks.map((f: any, i: number) => (
          <View key={i} style={styles.feedbackCard}>
            <Text style={styles.feedbackMsg}>{f.message}</Text>
            <Text style={styles.feedbackSub}>{f.casts?.name || 'キャスト'} · {new Date(f.created_at).toLocaleDateString('ja-JP')}</Text>
          </View>
        ))
      }
    </View>
  );
}

// CSV出力
function CsvExport({ shopId }: { shopId: string }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [exporting, setExporting] = useState(false);

  const handleExport = async (type: string) => {
    setExporting(true);
    try {
      const url = type === 'sales'
        ? `${API_BASE}/cast-sales?shop_id=${shopId}&month=${month}`
        : `${API_BASE}/slips?shop_id=${shopId}&month=${month}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!Array.isArray(data)) { Alert.alert('エラー', 'データを取得できませんでした'); return; }

      // CSV作成
      let csv = '';
      if (type === 'sales') {
        csv = 'キャスト,日付,種別,金額\n' +
          data.map((r: any) => `${r.casts?.name || ''},${r.date},${r.sales_type},${r.amount}`).join('\n');
      } else {
        csv = '日付,支払方法,小計,税,合計\n' +
          data.map((r: any) => `${r.date},${r.payment},${r.subtotal},${r.tax},${r.total}`).join('\n');
      }

      Alert.alert('CSVデータ', csv.slice(0, 500) + (csv.length > 500 ? '...' : ''), [
        { text: 'コピー', onPress: () => { /* clipboard copy */ } },
        { text: '閉じる' },
      ]);
    } catch { Alert.alert('エラー', 'エクスポートに失敗しました'); } finally { setExporting(false); }
  };

  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.csvLabel}>対象月</Text>
      <TextInput style={styles.memoInput} value={month} onChangeText={setMonth}
        placeholder="2026-05" placeholderTextColor={Colors.text3} keyboardType="numbers-and-punctuation" />
      <TouchableOpacity style={styles.csvBtn} onPress={() => handleExport('sales')} disabled={exporting}>
        <Ionicons name="download-outline" size={18} color={Colors.gold} />
        <Text style={styles.csvBtnText}>キャスト売上CSV</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.csvBtn} onPress={() => handleExport('slips')} disabled={exporting}>
        <Ionicons name="download-outline" size={18} color={Colors.gold} />
        <Text style={styles.csvBtnText}>伝票CSVエクスポート</Text>
      </TouchableOpacity>
      <Text style={styles.csvNote}>※ CSVデータはコピーしてメモ帳などに貼り付けて保存できます</Text>
    </View>
  );
}

export default function ManageScreen() {
  const { shopId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ManageTab>('casts');

  const TABS: { key: ManageTab; label: string; icon: string }[] = [
    { key: 'casts',    label: 'キャスト', icon: 'people-outline' },
    { key: 'menus',    label: '品名',     icon: 'list-outline' },
    { key: 'tweets',   label: 'つぶやき', icon: 'chatbubble-outline' },
    { key: 'feedback', label: '意見',     icon: 'heart-outline' },
    { key: 'csv',      label: 'CSV',      icon: 'download-outline' },
  ];

  if (!shopId) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={[styles.screenTitle, { paddingHorizontal: 16 }]}>管理</Text>
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
        {activeTab === 'casts'    && <CastManagement shopId={shopId} />}
        {activeTab === 'menus'    && <MenuManagement shopId={shopId} />}
        {activeTab === 'tweets'   && <TweetManagement shopId={shopId} />}
        {activeTab === 'feedback' && <FeedbackView shopId={shopId} />}
        {activeTab === 'csv'      && <CsvExport shopId={shopId} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  closeBtn:  { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:     { fontSize: 16, fontWeight: '500', color: Colors.text },
  label:     { fontSize: 12, color: Colors.text2, marginBottom: 6 },
  input:     { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14, marginBottom: 4 },
  submitBtn: { backgroundColor: Colors.gold, borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  submitText:{ color: '#1a1200', fontSize: 15, fontWeight: '600' },
});

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: Colors.bg },
  scroll:       { paddingHorizontal: 16, paddingBottom: 40 },
  screenTitle:  { fontSize: 20, fontWeight: '500', color: Colors.text, paddingVertical: 16 },
  tabScroll:    { maxHeight: 48, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  tabContent:   { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tab:          { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 0.5, borderColor: Colors.border },
  tabActive:    { backgroundColor: Colors.goldDim, borderColor: Colors.gold },
  tabText:      { fontSize: 12, color: Colors.text3 },
  tabTextActive:{ fontSize: 12, color: Colors.gold, fontWeight: '500' },
  addRowBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.goldDim, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.gold, padding: 12, marginTop: 12, marginBottom: 8 },
  addRowBtnText:{ fontSize: 14, color: Colors.gold, fontWeight: '500' },
  listItem:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  listItemTitle:{ fontSize: 13, fontWeight: '500', color: Colors.text },
  listItemSub:  { fontSize: 11, color: Colors.text3, marginTop: 2 },
  editBtn:      { padding: 6 },
  castAvatar:   { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  castAvatarText:{ fontSize: 13, fontWeight: '500' },
  emptyText:    { fontSize: 12, color: Colors.text3, paddingVertical: 12 },
  memoInput:    { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14, height: 100, textAlignVertical: 'top' },
  postBtn:      { backgroundColor: Colors.gold, borderRadius: 10, height: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  postBtnText:  { color: '#1a1200', fontSize: 14, fontWeight: '600' },
  tweetCard:    { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.border, padding: 12, marginBottom: 8 },
  tweetMsg:     { fontSize: 14, color: Colors.text, lineHeight: 20 },
  tweetDate:    { fontSize: 11, color: Colors.text3, marginTop: 6 },
  feedbackCard: { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.border, padding: 12, marginBottom: 8 },
  feedbackMsg:  { fontSize: 14, color: Colors.text, lineHeight: 20 },
  feedbackSub:  { fontSize: 11, color: Colors.text3, marginTop: 6 },
  csvLabel:     { fontSize: 12, color: Colors.text2 },
  csvBtn:       { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 0.5, borderColor: Colors.border, padding: 14 },
  csvBtnText:   { fontSize: 14, color: Colors.gold, fontWeight: '500' },
  csvNote:      { fontSize: 11, color: Colors.text3, lineHeight: 16 },
});
