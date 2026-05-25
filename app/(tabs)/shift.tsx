import { ScrollView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { useAuthStore } from '../../store/auth';
import { SectionCard } from '../../components/SectionCard';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:  { label: '審査中',   color: Colors.gold,  bg: 'rgba(201,168,76,0.1)',  border: 'rgba(201,168,76,0.3)' },
  approved: { label: '承認済み', color: Colors.green, bg: 'rgba(78,203,138,0.1)',  border: 'rgba(78,203,138,0.3)' },
  rejected: { label: '否認',     color: Colors.red,   bg: 'rgba(224,92,106,0.1)',  border: 'rgba(224,92,106,0.3)' },
};

const CAL_DAYS = ['月','火','水','木','金','土','日'];

// シフト希望提出モーダル
function ShiftRequestModal({ visible, onClose, onSubmit }: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}) {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('20:00');
  const [endTime, setEndTime] = useState('03:00');
  const [note, setNote] = useState('');
  const [isOff, setIsOff] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!date) { Alert.alert('エラー', '日付を入力してください（例: 2026-06-01）'); return; }
    setSubmitting(true);
    await onSubmit({ date, start_time: isOff ? null : startTime, end_time: isOff ? null : endTime, note, is_off: isOff });
    setSubmitting(false);
    setDate(''); setStartTime('20:00'); setEndTime('03:00'); setNote(''); setIsOff(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modal.container}>
        <View style={modal.header}>
          <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.text2} />
          </TouchableOpacity>
          <Text style={modal.title}>シフト希望を提出</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={modal.body}>
          <Text style={modal.label}>日付</Text>
          <TextInput style={modal.input} placeholder="例: 2026-06-01" placeholderTextColor={Colors.text3}
            value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" />

          <TouchableOpacity style={[modal.toggleRow, isOff && { borderColor: Colors.gold }]} onPress={() => setIsOff(!isOff)}>
            <Ionicons name={isOff ? 'checkbox' : 'square-outline'} size={20} color={isOff ? Colors.gold : Colors.text3} />
            <Text style={[modal.toggleText, isOff && { color: Colors.gold }]}>休日希望</Text>
          </TouchableOpacity>

          {!isOff && (
            <>
              <Text style={modal.label}>出勤時間</Text>
              <TextInput style={modal.input} placeholder="20:00" placeholderTextColor={Colors.text3}
                value={startTime} onChangeText={setStartTime} keyboardType="numbers-and-punctuation" />
              <Text style={modal.label}>退勤時間</Text>
              <TextInput style={modal.input} placeholder="03:00" placeholderTextColor={Colors.text3}
                value={endTime} onChangeText={setEndTime} keyboardType="numbers-and-punctuation" />
            </>
          )}

          <Text style={modal.label}>メモ（任意）</Text>
          <TextInput style={[modal.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="備考があれば入力してください" placeholderTextColor={Colors.text3}
            value={note} onChangeText={setNote} multiline />

          <TouchableOpacity style={modal.submitBtn} onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}>
            {submitting ? <ActivityIndicator color="#1a1200" /> : <Text style={modal.submitText}>提出する</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// オーナー向けシフト画面
function OwnerShiftView({ shopId }: { shopId: string }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [confirmed, setConfirmed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();

  const load = async () => {
    setLoading(true);
    try {
      const [reqRes, confRes] = await Promise.all([
        fetch(`${API_BASE}/shift-request?shop_id=${shopId}`),
        fetch(`${API_BASE}/confirm-shift?shop_id=${shopId}&year=${now.getFullYear()}&month=${now.getMonth() + 1}`),
      ]);
      const req = await reqRes.json();
      const conf = await confRes.json();
      setRequests(Array.isArray(req) ? req : []);
      setConfirmed(Array.isArray(conf) ? conf : []);
    } catch (e) {
      console.log('Load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [shopId]);

  const handleApprove = async (requestId: string, castId: string, date: string, startTime: string, endTime: string) => {
    Alert.alert('シフトを承認', 'このシフトを承認しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '承認', onPress: async () => {
        try {
          // シフト希望をapprovedに更新
          await fetch(`${API_BASE}/shift-request`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: requestId, status: 'approved', shop_id: shopId }),
          });
          // 確定シフトに追加
          await fetch(`${API_BASE}/confirm-shift`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shop_id: shopId, cast_id: castId, date, start_time: startTime, end_time: endTime }),
          });
          Alert.alert('承認しました');
          load();
        } catch {
          Alert.alert('エラー', '処理に失敗しました');
        }
      }},
    ]);
  };

  const handleReject = async (requestId: string) => {
    Alert.alert('シフトを否認', 'このシフトを否認しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '否認', style: 'destructive', onPress: async () => {
        try {
          await fetch(`${API_BASE}/shift-request`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: requestId, status: 'rejected', shop_id: shopId }),
          });
          Alert.alert('否認しました');
          load();
        } catch {
          Alert.alert('エラー', '処理に失敗しました');
        }
      }},
    ]);
  };

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;

  const pending = requests.filter(r => r.status === 'pending');
  const approved = requests.filter(r => r.status === 'approved');

  return (
    <>
      {/* 承認待ち */}
      <SectionCard title={`承認待ち（${pending.length}件）`}>
        {pending.length === 0 ? (
          <Text style={styles.emptyText}>承認待ちのシフトはありません</Text>
        ) : pending.map((r: any, i: number) => (
          <View key={r.id || i} style={[styles.shiftRow, i === pending.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.shiftDay}>{r.casts?.name || r.cast_name || 'キャスト'}</Text>
              <Text style={styles.shiftTime}>
                {r.date}　{r.start_time && r.end_time ? `${r.start_time}〜${r.end_time}` : '休日希望'}
              </Text>
              {r.note ? <Text style={styles.shiftNote}>{r.note}</Text> : null}
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: Colors.green }]}
                onPress={() => handleApprove(r.id, r.cast_id, r.date, r.start_time, r.end_time)}
              >
                <Text style={[styles.actionBtnText, { color: Colors.green }]}>承認</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: Colors.red }]}
                onPress={() => handleReject(r.id)}
              >
                <Text style={[styles.actionBtnText, { color: Colors.red }]}>否認</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </SectionCard>

      {/* 今月の確定シフト */}
      <SectionCard title={`今月の確定シフト（${confirmed.length}件）`}>
        {confirmed.length === 0 ? (
          <Text style={styles.emptyText}>確定シフトはありません</Text>
        ) : confirmed.map((c: any, i: number) => (
          <View key={i} style={[styles.shiftRow, i === confirmed.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.shiftDay}>{c.casts?.name || c.cast_name || 'キャスト'}</Text>
              <Text style={styles.shiftTime}>{c.date}　{c.start_time}〜{c.end_time}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: 'rgba(78,203,138,0.1)', borderColor: 'rgba(78,203,138,0.3)' }]}>
              <Text style={[styles.badgeText, { color: Colors.green }]}>確定</Text>
            </View>
          </View>
        ))}
      </SectionCard>

      {/* 承認済み希望 */}
      {approved.length > 0 && (
        <SectionCard title={`承認済み（${approved.length}件）`}>
          {approved.map((r: any, i: number) => (
            <View key={i} style={[styles.shiftRow, i === approved.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.shiftDay}>{r.casts?.name || r.cast_name || 'キャスト'}</Text>
                <Text style={styles.shiftTime}>{r.date}　{r.start_time && r.end_time ? `${r.start_time}〜${r.end_time}` : '休日希望'}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: 'rgba(78,203,138,0.1)', borderColor: 'rgba(78,203,138,0.3)' }]}>
                <Text style={[styles.badgeText, { color: Colors.green }]}>承認済み</Text>
              </View>
            </View>
          ))}
        </SectionCard>
      )}
    </>
  );
}

// キャスト向けシフト画面
function CastShiftView({ castId, shopId }: { castId: string; shopId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const load = () => {
    fetch(`${API_BASE}/cast/performance-summary?cast_id=${castId}&shop_id=${shopId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [castId, shopId]);

  const handleSubmit = async (formData: any) => {
    try {
      const res = await fetch(`${API_BASE}/shift-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cast_id: castId, shop_id: shopId,
          date: formData.date,
          start_time: formData.is_off ? null : formData.start_time,
          end_time: formData.is_off ? null : formData.end_time,
          note: formData.is_off ? '休日希望' : formData.note,
          status: 'pending',
        }),
      });
      if (res.ok) {
        Alert.alert('提出しました', 'オーナーの承認をお待ちください');
        load();
      } else {
        Alert.alert('エラー', '提出に失敗しました');
      }
    } catch {
      Alert.alert('エラー', '通信エラーが発生しました');
    }
  };

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (firstDay + 6) % 7;
  const calCells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d);
  const confirmedDates = new Set((data?.confirmed_shifts || []).map((s: any) => new Date(s.date).getDate()));
  const today = now.getDate();

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;

  return (
    <>
      <ShiftRequestModal visible={modalVisible} onClose={() => setModalVisible(false)} onSubmit={handleSubmit} />

      <SectionCard title={`${year}年${month + 1}月`}>
        <View style={styles.calHeader}>
          {CAL_DAYS.map(d => <Text key={d} style={styles.calDayLabel}>{d}</Text>)}
        </View>
        <View style={styles.calGrid}>
          {calCells.map((day, i) => (
            <View key={i} style={[
              styles.calCell,
              day && confirmedDates.has(day) && styles.calShift,
              day === today && styles.calToday,
              !day && { backgroundColor: 'transparent' },
            ]}>
              <Text style={[
                styles.calNum,
                day && confirmedDates.has(day) && { color: Colors.gold },
                day === today && { color: Colors.purple },
                !day && { color: 'transparent' },
              ]}>{day ?? 0}</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="シフト希望" actionLabel="＋ 追加" onAction={() => setModalVisible(true)}>
        {(data?.shift_requests || []).length === 0 ? (
          <Text style={styles.emptyText}>シフト希望はありません</Text>
        ) : (data.shift_requests || []).map((s: any, i: number) => {
          const st = STATUS_MAP[s.status] || STATUS_MAP.pending;
          return (
            <View key={i} style={[styles.shiftRow, i === data.shift_requests.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.shiftDay}>{s.date}</Text>
                <Text style={styles.shiftTime}>
                  {s.start_time && s.end_time ? `${s.start_time}〜${s.end_time}` : s.note || '休日希望'}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: st.bg, borderColor: st.border }]}>
                <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
              </View>
            </View>
          );
        })}
      </SectionCard>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.goldDim, borderColor: 'rgba(201,168,76,0.3)' }]} />
          <Text style={styles.legendText}>出勤日</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.purpleDim, borderColor: 'rgba(155,127,232,0.4)' }]} />
          <Text style={styles.legendText}>今日</Text>
        </View>
      </View>
    </>
  );
}

export default function ShiftScreen() {
  const { role, shopId, castId } = useAuthStore();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>シフト</Text>
        {role === 'owner' && shopId
          ? <OwnerShiftView shopId={shopId} />
          : role === 'cast' && castId && shopId
          ? <CastShiftView castId={castId} shopId={shopId} />
          : <Text style={styles.emptyText}>データを取得できませんでした</Text>
        }
      </ScrollView>
    </SafeAreaView>
  );
}

const modal = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  closeBtn:   { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:      { fontSize: 16, fontWeight: '500', color: Colors.text },
  body:       { padding: 20, gap: 10 },
  label:      { fontSize: 12, color: Colors.text2, marginTop: 4 },
  input:      { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14 },
  toggleRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.border, padding: 12 },
  toggleText: { fontSize: 14, color: Colors.text2 },
  submitBtn:  { backgroundColor: Colors.gold, borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitText: { color: '#1a1200', fontSize: 15, fontWeight: '600' },
});

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.bg },
  scroll:      { paddingHorizontal: 16, paddingBottom: 32 },
  screenTitle: { fontSize: 20, fontWeight: '500', color: Colors.text, paddingVertical: 16 },
  emptyText:   { color: Colors.text3, fontSize: 12, paddingVertical: 8 },
  calHeader:   { flexDirection: 'row', marginBottom: 6 },
  calDayLabel: { flex: 1, textAlign: 'center', fontSize: 9, color: Colors.text3 },
  calGrid:     { flexDirection: 'row', flexWrap: 'wrap' },
  calCell:     { width: '14.28%', aspectRatio: 1, borderRadius: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface2, marginBottom: 3 },
  calShift:    { backgroundColor: Colors.goldDim, borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.3)' },
  calToday:    { backgroundColor: Colors.purpleDim, borderWidth: 0.5, borderColor: 'rgba(155,127,232,0.4)' },
  calNum:      { fontSize: 10, color: Colors.text3 },
  shiftRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.border, gap: 8 },
  shiftDay:    { fontSize: 12, fontWeight: '500', color: Colors.text },
  shiftTime:   { fontSize: 10, color: Colors.text2, marginTop: 2 },
  shiftNote:   { fontSize: 10, color: Colors.text3, marginTop: 1 },
  badge:       { borderRadius: 10, borderWidth: 0.5, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:   { fontSize: 10 },
  actionBtn:   { borderRadius: 8, borderWidth: 0.5, paddingHorizontal: 10, paddingVertical: 5 },
  actionBtnText: { fontSize: 11, fontWeight: '500' },
  legend:      { flexDirection: 'row', gap: 16, paddingHorizontal: 4 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:   { width: 10, height: 10, borderRadius: 2, borderWidth: 0.5 },
  legendText:  { fontSize: 11, color: Colors.text3 },
});
