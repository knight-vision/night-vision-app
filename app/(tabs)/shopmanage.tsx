import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { useAuthStore } from '../../store/auth';

const DAYS = ['月', '火', '水', '木', '金', '土', '日'];
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = value ? value.split(':') : ['00', '00'];
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
      <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
        {HOURS.map(hh => (
          <TouchableOpacity key={hh} onPress={() => onChange(`${hh}:${m}`)}
            style={[styles.timeItem, h === hh && styles.timeItemActive]}>
            <Text style={[styles.timeText, h === hh && styles.timeTextActive]}>{hh}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={{ color: Colors.text2 }}>:</Text>
      <ScrollView style={[styles.timeScroll, { width: 44 }]} showsVerticalScrollIndicator={false}>
        {MINUTES.map(mm => (
          <TouchableOpacity key={mm} onPress={() => onChange(`${h}:${mm}`)}
            style={[styles.timeItem, m === mm && styles.timeItemActive]}>
            <Text style={[styles.timeText, m === mm && styles.timeTextActive]}>{mm}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export default function ShopManageScreen() {
  const { shopId } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 基本情報
  const [shopName, setShopName] = useState('');
  const [tel, setTel] = useState('');
  const [area, setArea] = useState('');
  const [seats, setSeats] = useState('');
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [system, setSystem] = useState('');
  const [openTime, setOpenTime] = useState('20:00');
  const [closeTime, setCloseTime] = useState('03:00');

  // SNS
  const [instagram, setInstagram] = useState('');
  const [xAccount, setXAccount] = useState('');
  const [tiktok, setTiktok] = useState('');

  // 曜日別営業時間
  const [weeklyHours, setWeeklyHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>({
    月: { open: '20:00', close: '03:00', closed: false },
    火: { open: '20:00', close: '03:00', closed: false },
    水: { open: '20:00', close: '03:00', closed: false },
    木: { open: '20:00', close: '03:00', closed: false },
    金: { open: '20:00', close: '03:00', closed: false },
    土: { open: '20:00', close: '03:00', closed: false },
    日: { open: '20:00', close: '03:00', closed: false },
  });

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/shop-info?shop_id=${shopId}`);
      const data = await res.json();
      if (data) {
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
        if (data.weekly_hours) {
          setWeeklyHours({ ...weeklyHours, ...data.weekly_hours });
        }
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
          shop_id: shopId,
          name: shopName,
          tel,
          area,
          seats: Number(seats) || null,
          budget: Number(budget) || null,
          description,
          system,
          open_time: openTime,
          close_time: closeTime,
          instagram,
          x_account: xAccount,
          tiktok_account: tiktok,
          weekly_hours: weeklyHours,
        }),
      });
      Alert.alert('保存しました');
    } catch { Alert.alert('エラー', '保存に失敗しました'); } finally { setSaving(false); }
  };

  const updateWeeklyDay = (day: string, field: 'open' | 'close' | 'closed', value: any) => {
    setWeeklyHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  if (loading) return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ActivityIndicator color={Colors.gold} style={{ marginTop: 60 }} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>店舗管理</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#1a1200" size="small" /> : <Text style={styles.saveBtnText}>保存</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 基本情報 */}
        <Text style={styles.sectionTitle}>基本情報</Text>
        <Field label="店舗名" value={shopName} onChange={setShopName} placeholder="例: Club NIGHT" />
        <Field label="電話番号" value={tel} onChange={setTel} placeholder="例: 090-1234-5678" keyboardType="phone-pad" />
        <Field label="エリア" value={area} onChange={setArea} placeholder="例: 釧路" />
        <Field label="席数" value={seats} onChange={setSeats} placeholder="例: 20" keyboardType="number-pad" />
        <Field label="予算目安（円）" value={budget} onChange={setBudget} placeholder="例: 10000" keyboardType="number-pad" />
        <Field label="説明文" value={description} onChange={setDescription} placeholder="店舗の特徴など" multiline />
        <Field label="システム料" value={system} onChange={setSystem} placeholder="例: 席料3,000円・指名料2,000円" multiline />

        {/* 通常営業時間 */}
        <Text style={styles.sectionTitle}>通常営業時間</Text>
        <View style={styles.timeRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>開店</Text>
            <TextInput style={styles.input} value={openTime} onChangeText={setOpenTime} placeholder="20:00" placeholderTextColor={Colors.text3} />
          </View>
          <Text style={{ color: Colors.text3, paddingTop: 24 }}>〜</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>閉店</Text>
            <TextInput style={styles.input} value={closeTime} onChangeText={setCloseTime} placeholder="03:00" placeholderTextColor={Colors.text3} />
          </View>
        </View>

        {/* 曜日別営業時間 */}
        <Text style={styles.sectionTitle}>曜日別営業時間</Text>
        {DAYS.map(day => (
          <View key={day} style={styles.dayRow}>
            <Text style={styles.dayLabel}>{day}</Text>
            <Switch
              value={!weeklyHours[day]?.closed}
              onValueChange={v => updateWeeklyDay(day, 'closed', !v)}
              trackColor={{ false: Colors.surface2, true: Colors.goldDim }}
              thumbColor={!weeklyHours[day]?.closed ? Colors.text3 : Colors.gold}
            />
            {!weeklyHours[day]?.closed ? (
              <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
                <TextInput style={[styles.input, { flex: 1 }]} value={weeklyHours[day]?.open || '20:00'}
                  onChangeText={v => updateWeeklyDay(day, 'open', v)} placeholder="20:00" placeholderTextColor={Colors.text3} />
                <Text style={{ color: Colors.text3, alignSelf: 'center' }}>〜</Text>
                <TextInput style={[styles.input, { flex: 1 }]} value={weeklyHours[day]?.close || '03:00'}
                  onChangeText={v => updateWeeklyDay(day, 'close', v)} placeholder="03:00" placeholderTextColor={Colors.text3} />
              </View>
            ) : (
              <Text style={styles.closedText}>定休日</Text>
            )}
          </View>
        ))}

        {/* SNS */}
        <Text style={styles.sectionTitle}>SNS</Text>
        <Field label="Instagram (@なし)" value={instagram} onChange={setInstagram} placeholder="例: clubnight_kushiro" />
        <Field label="X（旧Twitter）(@なし)" value={xAccount} onChange={setXAccount} placeholder="例: clubnight_kr" />
        <Field label="TikTok (@なし)" value={tiktok} onChange={setTiktok} placeholder="例: clubnight_kushiro" />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, placeholder, multiline, keyboardType }: any) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.text3}
        multiline={multiline}
        keyboardType={keyboardType || 'default'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: Colors.bg },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  screenTitle:   { fontSize: 20, fontWeight: '500', color: Colors.text },
  saveBtn:       { backgroundColor: Colors.gold, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnText:   { color: '#1a1200', fontWeight: '600', fontSize: 14 },
  scroll:        { paddingHorizontal: 16, paddingBottom: 40 },
  sectionTitle:  { fontSize: 13, color: Colors.text2, fontWeight: '600', marginTop: 20, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldWrap:     { marginBottom: 12 },
  fieldLabel:    { fontSize: 12, color: Colors.text2, marginBottom: 5 },
  input:         { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14 },
  timeRow:       { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 12 },
  dayRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  dayLabel:      { fontSize: 14, color: Colors.text, width: 20 },
  closedText:    { fontSize: 13, color: Colors.text3, flex: 1, paddingLeft: 8 },
  timeScroll:    { width: 36, height: 120, backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 0.5, borderColor: Colors.border },
  timeItem:      { padding: 6, alignItems: 'center' },
  timeItemActive:{ backgroundColor: Colors.goldDim },
  timeText:      { fontSize: 12, color: Colors.text3 },
  timeTextActive:{ color: Colors.gold, fontWeight: '600' },
});
