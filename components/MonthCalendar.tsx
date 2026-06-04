import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  Dimensions, PanResponder,
} from 'react-native';
import { Colors } from '../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

// ── 祝日計算 ─────────────────────────────────────────────────
function nthMonday(year: number, month: number, n: number): number {
  const first = new Date(year, month - 1, 1);
  const firstMon = ((8 - first.getDay()) % 7) + 1;
  return firstMon + (n - 1) * 7;
}

function vernalEquinox(year: number): number {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function autumnalEquinox(year: number): number {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function buildHolidays(year: number): Map<string, string> {
  const h = new Map<string, string>();
  const add = (m: number, d: number, name: string) =>
    h.set(`${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, name);

  add(1, 1, '元日');
  add(1, nthMonday(year, 1, 2), '成人の日');
  add(2, 11, '建国記念日');
  add(2, 23, '天皇誕生日');
  add(3, vernalEquinox(year), '春分の日');
  add(4, 29, '昭和の日');
  add(5, 3, '憲法記念日');
  add(5, 4, 'みどりの日');
  add(5, 5, 'こどもの日');
  add(7, nthMonday(year, 7, 3), '海の日');
  add(8, 11, '山の日');
  add(9, nthMonday(year, 9, 3), '敬老の日');
  add(9, autumnalEquinox(year), '秋分の日');
  add(10, nthMonday(year, 10, 2), 'スポーツの日');
  add(11, 3, '文化の日');
  add(11, 23, '勤労感謝の日');

  for (const k of [...h.keys()]) {
    const d = new Date(k);
    if (d.getDay() === 0) {
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const nk = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
      if (!h.has(nk)) h.set(nk, '振替休日');
    }
  }

  for (const k of [...h.keys()].sort()) {
    const d = new Date(k);
    if (d.getDay() === 0) continue;
    const prev = new Date(d); prev.setDate(d.getDate() - 1);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    const pk = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
    const nk = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
    if (h.has(pk) && h.has(nk) && !h.has(k)) h.set(k, '国民の休日');
  }
  return h;
}

const holidayCache = new Map<number, Map<string, string>>();
export function getHoliday(date: Date): string | undefined {
  const y = date.getFullYear();
  if (!holidayCache.has(y)) holidayCache.set(y, buildHolidays(y));
  const k = `${y}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return holidayCache.get(y)!.get(k);
}

function buildCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export interface CalendarEvent {
  date: string;
  color: string;
  title?: string;
}

export interface MonthCalendarProps {
  events?: CalendarEvent[];
  onDayPress?: (date: Date) => void;
  showHolidays?: boolean;
  maxDots?: number;
  initialSelected?: Date;
  year?: number;
  month?: number; // 0-indexed
  onMonthChange?: (year: number, month: number) => void;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function MonthCalendar({
  events = [],
  onDayPress,
  showHolidays = true,
  maxDots = 3,
  initialSelected,
  year: ctrlYear,
  month: ctrlMonth,
  onMonthChange,
}: MonthCalendarProps) {
  const today = new Date();
  const [intYear, setIntYear] = useState(today.getFullYear());
  const [intMonth, setIntMonth] = useState(today.getMonth());
  const year = ctrlYear ?? intYear;
  const month = ctrlMonth ?? intMonth;
  const [selected, setSelected] = useState<Date>(initialSelected ?? today);

  const goToMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    if (onMonthChange) onMonthChange(d.getFullYear(), d.getMonth());
    if (ctrlYear === undefined) { setIntYear(d.getFullYear()); setIntMonth(d.getMonth()); }
  };

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderRelease: (_, g) => { if (g.dx < -40) goToMonth(1); else if (g.dx > 40) goToMonth(-1); },
  }), [year, month]);

  const days = useMemo(() => buildCalendarDays(year, month), [year, month]);
  const eventMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const ev of events) {
      const colors = map.get(ev.date) ?? [];
      colors.push(ev.color);
      map.set(ev.date, colors);
    }
    return map;
  }, [events]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => goToMonth(-1)} style={styles.navBtn}><Text style={styles.navBtnText}>‹</Text></Pressable>
        <Text style={styles.monthLabel}>{year}年 {month + 1}月</Text>
        <Pressable onPress={() => goToMonth(1)} style={styles.navBtn}><Text style={styles.navBtnText}>›</Text></Pressable>
      </View>

      <View {...panResponder.panHandlers}>
        <View style={styles.weekRow}>
          {WEEKDAYS.map((w, i) => (
            <Text key={w} style={[styles.weekday, i === 0 && styles.sun, i === 6 && styles.sat]}>{w}</Text>
          ))}
        </View>

        <View style={styles.grid}>
          {Array.from({ length: days.length / 7 }, (_, w) => (
            <View key={w} style={styles.gridRow}>
              {days.slice(w * 7, w * 7 + 7).map((day, i) => {
                if (!day) return <View key={i} style={styles.cell} />;
                const isToday = sameDay(day, today);
                const isSel = sameDay(day, selected);
                const isSun = i === 0;
                const isSat = i === 6;
                const dateKey = toDateKey(day);
                const holiday = showHolidays ? getHoliday(day) : undefined;
                const isHoliday = !!holiday;
                const dots = (eventMap.get(dateKey) ?? []).slice(0, maxDots);

                return (
                  <Pressable key={i} style={styles.cell} onPress={() => { setSelected(day); onDayPress?.(day); }}>
                    {holiday ? (
                      <Text style={styles.holidayText} numberOfLines={1}>{holiday}</Text>
                    ) : (
                      <View style={styles.holidayPlaceholder} />
                    )}
                    <View style={[
                      styles.dayCircle,
                      isToday && !isSel && styles.todayCircle,
                      isSel && styles.selCircle,
                    ]}>
                      <Text style={[
                        styles.dayNum,
                        (isSun || isHoliday) && !isSel && !isToday && styles.sunText,
                        isSat && !isSel && !isToday && !isHoliday && styles.satText,
                        isToday && !isSel && styles.todayText,
                        isSel && styles.selText,
                      ]}>
                        {day.getDate()}
                      </Text>
                    </View>
                    <View style={styles.dots}>
                      {dots.map((color, j) => (
                        <View key={j} style={[styles.dot, { backgroundColor: color }]} />
                      ))}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const CELL_W = (SCREEN_W - 16) / 7;

const styles = StyleSheet.create({
  container:           { paddingHorizontal: 8, paddingBottom: 8, backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 0.5, borderColor: Colors.border, marginBottom: 12 },
  header:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 4 },
  monthLabel:          { fontSize: 16, fontWeight: '600', color: Colors.text, letterSpacing: 0.5 },
  navBtn:              { padding: 8, borderRadius: 20 },
  navBtnText:          { fontSize: 22, color: Colors.text2, lineHeight: 24 },
  weekRow:             { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  weekday:             { width: CELL_W, textAlign: 'center', fontSize: 11, color: Colors.text3, fontWeight: '500' },
  sun:                 { color: '#f08098' },
  sat:                 { color: '#a8c4f0' },
  grid:                { paddingTop: 2 },
  gridRow:             { flexDirection: 'row' },
  cell:                { width: CELL_W, alignItems: 'center', paddingVertical: 4 },
  holidayText:         { fontSize: 7, color: '#f08098', fontWeight: '500', width: CELL_W - 2, textAlign: 'center', height: 10 },
  holidayPlaceholder:  { height: 10 },
  dayCircle:           { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
  todayCircle:         { backgroundColor: Colors.gold },
  selCircle:           { backgroundColor: Colors.purpleDim, borderWidth: 1, borderColor: Colors.purple },
  dayNum:              { fontSize: 13, color: Colors.text, fontWeight: '400' },
  sunText:             { color: '#f08098' },
  satText:             { color: '#a8c4f0' },
  todayText:           { color: '#1a1200', fontWeight: '700' },
  selText:             { color: Colors.purple, fontWeight: '700' },
  dots:                { flexDirection: 'row', gap: 2, marginTop: 3, height: 5, alignItems: 'center' },
  dot:                 { width: 4, height: 4, borderRadius: 2 },
});
