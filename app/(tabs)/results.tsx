import {
  ScrollView, View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors, fmtYen } from '../../constants/theme';
import { API_BASE } from '../../constants/api';
import { useAuthStore } from '../../store/auth';
import { StatCard } from '../../components/StatCard';
import { SectionCard } from '../../components/SectionCard';

// ── オーナー向け ──────────────────────────────────────────────
function OwnerResultsView({ shopId }: { shopId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/owner/dashboard-summary?shop_id=${shopId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [shopId]);

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;
  if (!data) return <Text style={styles.emptyText}>データを取得できませんでした</Text>;

  const maxSales = Math.max(...(data.week_sales || []).map((s: any) => s.total), 1);

  return (
    <>
      <View style={styles.statGrid}>
        <StatCard label="今月売上" value={fmtYen(data.monthly_sales)}
          sub={data.sales_growth !== null ? `${data.sales_growth >= 0 ? '↑' : '↓'} 前月比 ${data.sales_growth > 0 ? '+' : ''}${data.sales_growth}%` : ''}
          subColor={(data.sales_growth ?? 0) >= 0 ? Colors.green : Colors.red}
          valueColor={Colors.gold} />
        <StatCard label="本日出勤" value={`${data.today_staff_count}名`} />
      </View>

      <SectionCard title="今月キャスト売上ランキング">
        {(data.cast_ranking || []).map((c: any, i: number) => (
          <View key={c.cast_id} style={[styles.rankRow, i === (data.cast_ranking.length - 1) && { borderBottomWidth: 0 }]}>
            <Text style={[styles.rankNum, i === 0 && { color: Colors.gold }]}>#{i + 1}</Text>
            <View style={[styles.castAvatar, { backgroundColor: i === 0 ? Colors.goldDim : Colors.purpleDim }]}>
              <Text style={[styles.castAvatarText, { color: i === 0 ? Colors.gold : Colors.purple }]}>{c.name[0]}</Text>
            </View>
            <Text style={[styles.rankName, { flex: 1 }]}>{c.name}</Text>
            <Text style={[styles.rankSales, i === 0 && { color: Colors.gold }]}>{fmtYen(c.total)}</Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="今週の日別売上">
        {(data.week_sales || []).map(({ day, total }: any) => (
          <View key={day} style={styles.barRow}>
            <Text style={styles.barLabel}>{day}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.max((total / maxSales) * 100, total > 0 ? 2 : 0)}%` as any }]} />
            </View>
            <Text style={[styles.barVal, total === 0 && { opacity: 0.4 }]}>{total > 0 ? fmtYen(total) : '—'}</Text>
          </View>
        ))}
      </SectionCard>
    </>
  );
}

// ── キャスト向け：実績タブ ────────────────────────────────────
function CastPerformanceTab({ castId, shopId }: { castId: string; shopId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/cast/performance-summary?cast_id=${castId}&shop_id=${shopId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [castId, shopId]);

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;
  if (!data) return <Text style={styles.emptyText}>データを取得できませんでした</Text>;

  const maxSales = Math.max(...(data.monthly_sales_trend || []).map((m: any) => m.total), 1);

  return (
    <>
      <View style={styles.statGrid}>
        <StatCard label="今月売上" value={fmtYen(data.monthly_sales)}
          sub={data.sales_growth !== null ? `${data.sales_growth >= 0 ? '↑' : '↓'} 前月比 ${data.sales_growth > 0 ? '+' : ''}${data.sales_growth}%` : ''}
          subColor={data.sales_growth !== null && data.sales_growth >= 0 ? Colors.green : Colors.red}
          valueColor={Colors.gold} />
        <StatCard label="出勤日数" value={`${data.shift_count}日`} sub="今月確定" />
      </View>
      <View style={[styles.statGrid, { marginTop: 8, marginBottom: 16 }]}>
        <StatCard label="ドリンクバック" value={fmtYen(data.drink_back)} />
        <StatCard label="店内ランキング" value={data.shop_rank ? `${data.shop_rank}位` : '-'}
          sub="今月" valueColor={data.shop_rank === 1 ? Colors.gold : Colors.text} />
      </View>

      <SectionCard title="月別売上推移">
        {(data.monthly_sales_trend || []).map(({ month, total }: any) => (
          <View key={month} style={styles.barRow}>
            <Text style={styles.barLabel}>{month}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${(total / maxSales) * 100}%` as any }]} />
            </View>
            <Text style={styles.barVal}>{fmtYen(total)}</Text>
          </View>
        ))}
      </SectionCard>
    </>
  );
}

// ── キャスト向け：給与タブ（日/週/月） ───────────────────────
type PayPeriod = 'daily' | 'weekly' | 'monthly';

function getDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getWeekDates(base: string) {
  const b = new Date(base + 'T00:00:00');
  const day = b.getDay();
  const mon = new Date(b); mon.setDate(b.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return getDateStr(d); });
}

function CastPayTab({ castId, shopId }: { castId: string; shopId: string }) {
  const now = new Date();
  const [period, setPeriod] = useState<PayPeriod>('monthly');
  const [refDate, setRefDate] = useState(getDateStr(now)); // 日/週の基準日
  const [refMonth, setRefMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);
  const [shifts, setShifts] = useState<any[]>([]);
  const [allowances, setAllowances] = useState<any[]>([]);
  const [castInfo, setCastInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const addDay = (ds: string, n: number) => {
    const d = new Date(ds + 'T00:00:00'); d.setDate(d.getDate() + n); return getDateStr(d);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [castRes, shiftRes, allowRes] = await Promise.all([
        fetch(`${API_BASE}/casts?shop_id=${shopId}`),
        fetch(`${API_BASE}/confirm-shift?shop_id=${shopId}&year=${refMonth.slice(0,4)}&month=${refMonth.slice(5,7)}`),
        fetch(`${API_BASE}/cast-allowances?cast_id=${castId}&shop_id=${shopId}&month=${refMonth}`),
      ]);
      const castData = await castRes.json();
      const me = Array.isArray(castData) ? castData.find((c: any) => String(c.id) === castId) : null;
      setCastInfo(me);
      const sd = await shiftRes.json();
      const confirmed = Array.isArray(sd) ? sd : (sd?.confirmed || []);
      setShifts(confirmed.filter((s: any) => String(s.cast_id) === castId));
      const ad = await allowRes.json();
      setAllowances(Array.isArray(ad) ? ad.filter((a: any) => String(a.cast_id) === castId) : []);
    } catch { } finally { setLoading(false); }
  }, [castId, shopId, refMonth]);

  useEffect(() => { load(); }, [load]);

  // 期間内のシフトを絞り込んでhours/pay計算
  const calcPay = () => {
    let targetShifts: any[] = [];
    let targetAllows: any[] = [];

    if (period === 'daily') {
      targetShifts = shifts.filter((s: any) => s.date === refDate);
      targetAllows = allowances.filter((a: any) => a.date === refDate);
    } else if (period === 'weekly') {
      const week = getWeekDates(refDate);
      targetShifts = shifts.filter((s: any) => week.includes(s.date));
      targetAllows = allowances.filter((a: any) => week.includes(a.date));
    } else {
      targetShifts = shifts;
      targetAllows = allowances;
    }

    const hourlyWage = castInfo?.hourly_wage || 0;
    const totalHours = targetShifts.reduce((sum: number, s: any) => {
      const parseTime = (t: string) => {
        const parts = (t || '00:00').split(':').map(Number);
        return parts[0] * 60 + (parts[1] || 0);
      };
      const startMin = parseTime(s.start_time);
      const endMin   = parseTime(s.end_time);
      // 終了が開始より小さい場合は翌日扱い（例：20:00〜02:00 → +24h）
      const diff = endMin >= startMin ? endMin - startMin : endMin + 24 * 60 - startMin;
      return sum + Math.max(0, diff / 60);
    }, 0);
    const basePay = Math.round(totalHours * hourlyWage);
    const allowTotal = targetAllows.filter((a: any) => a.amount > 0).reduce((s: number, a: any) => s + a.amount, 0);
    const deductTotal = targetAllows.filter((a: any) => a.amount < 0).reduce((s: number, a: any) => s + Math.abs(a.amount), 0);
    const total = basePay + allowTotal - deductTotal;

    return { targetShifts, targetAllows, totalHours, basePay, allowTotal, deductTotal, total };
  };

  const { targetShifts, targetAllows, totalHours, basePay, allowTotal, deductTotal, total } = calcPay();

  const PERIODS: { key: PayPeriod; label: string }[] = [
    { key: 'daily', label: '日払い' },
    { key: 'weekly', label: '週払い' },
    { key: 'monthly', label: '月払い' },
  ];

  const weekDates = period === 'weekly' ? getWeekDates(refDate) : [];

  return (
    <>
      {/* 期間切替 */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {PERIODS.map(p => (
          <TouchableOpacity key={p.key} onPress={() => setPeriod(p.key)}
            style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}>
            <Text style={[styles.periodBtnText, period === p.key && styles.periodBtnTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ナビゲーション */}
      {period === 'daily' && (
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => setRefDate(addDay(refDate, -1))} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={18} color={Colors.text2} />
          </TouchableOpacity>
          <Text style={styles.navLabel}>{refDate}</Text>
          <TouchableOpacity onPress={() => setRefDate(addDay(refDate, 1))} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={18} color={Colors.text2} />
          </TouchableOpacity>
        </View>
      )}
      {period === 'weekly' && (
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => setRefDate(addDay(refDate, -7))} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={18} color={Colors.text2} />
          </TouchableOpacity>
          <Text style={styles.navLabel}>{weekDates[0]?.slice(5).replace('-','/')} 〜 {weekDates[6]?.slice(5).replace('-','/')}</Text>
          <TouchableOpacity onPress={() => setRefDate(addDay(refDate, 7))} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={18} color={Colors.text2} />
          </TouchableOpacity>
        </View>
      )}
      {period === 'monthly' && (
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => { const d = new Date(refMonth+'-01'); d.setMonth(d.getMonth()-1); setRefMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); }} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={18} color={Colors.text2} />
          </TouchableOpacity>
          <Text style={styles.navLabel}>{refMonth}</Text>
          <TouchableOpacity onPress={() => { const d = new Date(refMonth+'-01'); d.setMonth(d.getMonth()+1); setRefMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); }} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={18} color={Colors.text2} />
          </TouchableOpacity>
        </View>
      )}

      {loading ? <ActivityIndicator color={Colors.gold} style={{ marginTop: 20 }} /> : (
        <>
          {/* 給与サマリー */}
          <View style={styles.payCard}>
            <View style={styles.payRow}>
              <Text style={styles.payLabel}>勤務時間</Text>
              <Text style={styles.payValue}>{totalHours.toFixed(1)}時間</Text>
            </View>
            <View style={styles.payRow}>
              <Text style={styles.payLabel}>基本給（時給 {fmtYen(castInfo?.hourly_wage || 0)}）</Text>
              <Text style={styles.payValue}>{fmtYen(basePay)}</Text>
            </View>
            {allowTotal > 0 && (
              <View style={styles.payRow}>
                <Text style={styles.payLabel}>手当合計</Text>
                <Text style={[styles.payValue, { color: Colors.green }]}>+{fmtYen(allowTotal)}</Text>
              </View>
            )}
            {deductTotal > 0 && (
              <View style={styles.payRow}>
                <Text style={styles.payLabel}>控除合計</Text>
                <Text style={[styles.payValue, { color: Colors.red }]}>-{fmtYen(deductTotal)}</Text>
              </View>
            )}
            <View style={[styles.payRow, styles.payTotalRow]}>
              <Text style={styles.payTotalLabel}>合計</Text>
              <Text style={styles.payTotalValue}>{fmtYen(total)}</Text>
            </View>
          </View>

          {/* シフト明細 */}
          {targetShifts.length > 0 && (
            <SectionCard title="シフト明細">
              {targetShifts.sort((a, b) => a.date.localeCompare(b.date)).map((s: any) => {
                const pt = (t: string) => { const p = (t||'00:00').split(':').map(Number); return p[0]*60+(p[1]||0); };
                const sm2 = pt(s.start_time), em2 = pt(s.end_time);
                const hrs = Math.max(0, (em2 >= sm2 ? em2 - sm2 : em2 + 1440 - sm2) / 60);
                return (
                  <View key={s.id} style={styles.shiftDetailRow}>
                    <Text style={styles.shiftDetailDate}>{s.date}</Text>
                    <Text style={styles.shiftDetailTime}>{s.start_time?.slice(0,5)}〜{s.end_time?.slice(0,5)}</Text>
                    <Text style={styles.shiftDetailHrs}>{hrs.toFixed(1)}h</Text>
                    <Text style={[styles.shiftDetailPay, { color: Colors.gold }]}>{fmtYen(Math.round(hrs * (castInfo?.hourly_wage || 0)))}</Text>
                  </View>
                );
              })}
            </SectionCard>
          )}

          {/* 手当・控除明細 */}
          {targetAllows.length > 0 && (
            <SectionCard title="手当・控除明細">
              {targetAllows.map((a: any) => (
                <View key={a.id} style={styles.payRow}>
                  <Text style={[styles.payLabel, { flex: 1 }]}>{a.label}{a.date ? ` (${a.date})` : ''}</Text>
                  <Text style={[styles.payValue, { color: a.amount >= 0 ? Colors.green : Colors.red }]}>
                    {a.amount >= 0 ? '+' : ''}{fmtYen(a.amount)}
                  </Text>
                </View>
              ))}
            </SectionCard>
          )}

          {targetShifts.length === 0 && targetAllows.length === 0 && (
            <Text style={styles.emptyText}>この期間のデータがありません</Text>
          )}
        </>
      )}
    </>
  );
}

// ── キャスト向けメインビュー（給与 / 実績タブ） ─────────────
function CastResultsView({ castId, shopId }: { castId: string; shopId: string }) {
  const [tab, setTab] = useState<'pay' | 'perf'>('pay');

  return (
    <>
      <View style={styles.innerTabRow}>
        <TouchableOpacity onPress={() => setTab('pay')}
          style={[styles.innerTab, tab === 'pay' && styles.innerTabActive]}>
          <Ionicons name="wallet-outline" size={14} color={tab === 'pay' ? Colors.gold : Colors.text3} />
          <Text style={[styles.innerTabText, tab === 'pay' && styles.innerTabTextActive]}>給与</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('perf')}
          style={[styles.innerTab, tab === 'perf' && styles.innerTabActive]}>
          <Ionicons name="trophy-outline" size={14} color={tab === 'perf' ? Colors.gold : Colors.text3} />
          <Text style={[styles.innerTabText, tab === 'perf' && styles.innerTabTextActive]}>実績</Text>
        </TouchableOpacity>
      </View>
      {tab === 'pay'  && <CastPayTab  castId={castId} shopId={shopId} />}
      {tab === 'perf' && <CastPerformanceTab castId={castId} shopId={shopId} />}
    </>
  );
}

// ── メイン ──────────────────────────────────────────────────
export default function ResultsScreen() {
  const { role, shopId, castId } = useAuthStore();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.screenTitle}>給与・実績</Text>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {role === 'owner' && shopId
          ? <OwnerResultsView shopId={shopId} />
          : role === 'cast' && castId && shopId
          ? <CastResultsView castId={castId} shopId={shopId} />
          : <Text style={styles.emptyText}>データを取得できませんでした</Text>
        }
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: Colors.bg },
  screenTitle:       { fontSize: 20, fontWeight: '500', color: Colors.text, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  scroll:            { paddingHorizontal: 16, paddingBottom: 40 },
  emptyText:         { color: Colors.text2, textAlign: 'center', marginTop: 40 },
  statGrid:          { flexDirection: 'row', gap: 10, marginBottom: 0 },
  rankRow:           { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  rankNum:           { fontSize: 13, fontWeight: '700', color: Colors.text2, width: 24 },
  castAvatar:        { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  castAvatarText:    { fontSize: 12, fontWeight: '600' },
  rankName:          { fontSize: 13, color: Colors.text },
  rankSales:         { fontSize: 13, fontWeight: '600', color: Colors.text },
  barRow:            { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  barLabel:          { width: 32, fontSize: 11, color: Colors.text2 },
  barTrack:          { flex: 1, height: 6, backgroundColor: Colors.surface2, borderRadius: 3, overflow: 'hidden' },
  barFill:           { height: '100%', backgroundColor: Colors.gold, borderRadius: 3 },
  barVal:            { width: 72, fontSize: 11, color: Colors.text2, textAlign: 'right' },
  // 内部タブ
  innerTabRow:       { flexDirection: 'row', gap: 8, marginBottom: 16 },
  innerTab:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 0.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  innerTabActive:    { backgroundColor: Colors.goldDim, borderColor: Colors.gold },
  innerTabText:      { fontSize: 13, color: Colors.text3, fontWeight: '500' },
  innerTabTextActive:{ color: Colors.gold, fontWeight: '600' },
  // 期間切替
  periodBtn:         { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.surface },
  periodBtnActive:   { backgroundColor: Colors.goldDim, borderColor: Colors.gold },
  periodBtnText:     { fontSize: 12, color: Colors.text3 },
  periodBtnTextActive:{ color: Colors.gold, fontWeight: '600' },
  // ナビ
  navRow:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12 },
  navBtn:            { padding: 6 },
  navLabel:          { fontSize: 14, color: Colors.text, fontWeight: '500', minWidth: 140, textAlign: 'center' },
  // 給与カード
  payCard:           { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 0.5, borderColor: Colors.border, padding: 16, marginBottom: 16 },
  payRow:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  payLabel:          { fontSize: 13, color: Colors.text2 },
  payValue:          { fontSize: 13, color: Colors.text, fontWeight: '500' },
  payTotalRow:       { borderBottomWidth: 0, marginTop: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  payTotalLabel:     { fontSize: 15, fontWeight: '700', color: Colors.text },
  payTotalValue:     { fontSize: 22, fontWeight: '900', color: Colors.gold },
  // シフト明細
  shiftDetailRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.border, gap: 8 },
  shiftDetailDate:   { fontSize: 12, color: Colors.text2, width: 72 },
  shiftDetailTime:   { fontSize: 12, color: Colors.text, flex: 1 },
  shiftDetailHrs:    { fontSize: 12, color: Colors.text3, width: 36, textAlign: 'right' },
  shiftDetailPay:    { fontSize: 13, fontWeight: '600', width: 64, textAlign: 'right' },
});
