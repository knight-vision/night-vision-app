import { useThemeStore, ThemeId } from '../store/theme';

// ── 各テーマのカラー定義 ─────────────────────────────────────

const defaultColors = {
  bg:           '#0d0d18',
  surface:      'rgba(255,255,255,0.07)',
  surface2:     'rgba(255,255,255,0.04)',
  surfaceSolid: '#161625',
  border:       'rgba(200,180,255,0.18)',
  borderGlow:   'rgba(220,180,255,0.35)',

  gold:         '#e8b4c8',
  goldDim:      'rgba(232,180,200,0.18)',
  goldBright:   '#f5cfe0',
  purple:       '#c4a8f0',
  purpleDim:    'rgba(196,168,240,0.15)',
  purpleBright: '#dcc8ff',
  teal:         '#a8e8d8',

  text:         '#f8f4ff',
  text2:        '#b8b0cc',
  text3:        '#7a7490',

  red:          '#f08098',
  green:        '#80d8b0',

  grad1:        '#1a0a2e',
  grad2:        '#0a1a2e',
};

// 案A: 深夜の宇宙 × 星屑
const starryColors = {
  ...defaultColors,
  bg:           '#0a0018',          // 深紫ベース
  surfaceSolid: '#100820',
  surface:      'rgba(180,140,255,0.07)',
  surface2:     'rgba(180,140,255,0.04)',
  border:       'rgba(200,160,255,0.25)',
  borderGlow:   'rgba(220,180,255,0.45)',

  gold:         '#f0a8d8',          // よりピンクに
  goldDim:      'rgba(240,168,216,0.20)',
  goldBright:   '#f8c8e8',
  purple:       '#b89af0',
  purpleDim:    'rgba(184,154,240,0.18)',
  purpleBright: '#d4bcff',

  text:         '#f8f0ff',
  text2:        '#c0b0d8',
  text3:        '#806898',

  grad1:        '#1a0030',
  grad2:        '#08001a',
};

// 案B: ネオンパープル × サイバー
const neonColors = {
  ...defaultColors,
  bg:           '#0c0c1a',
  surfaceSolid: '#111128',
  surface:      'rgba(255,255,255,0.05)',
  surface2:     'rgba(255,255,255,0.03)',
  border:       'rgba(100,80,200,0.35)',
  borderGlow:   'rgba(255,70,170,0.40)',

  gold:         '#ff88cc',          // ネオンピンク
  goldDim:      'rgba(255,136,204,0.15)',
  goldBright:   '#ffaade',
  purple:       '#aa88ff',          // 鮮やかラベンダー
  purpleDim:    'rgba(170,136,255,0.15)',
  purpleBright: '#ccbbff',
  teal:         '#00d4ff',          // サイバーシアン

  text:         '#eeeeff',
  text2:        '#aaaacc',
  text3:        '#666688',

  grad1:        '#1a003a',
  grad2:        '#001a3a',
};

export const THEMES: Record<ThemeId, typeof defaultColors> = {
  default: defaultColors,
  starry:  starryColors,
  neon:    neonColors,
};

// 静的フォールバック（コンポーネント外で Colors.xxx が使われている場合）
export let Colors = defaultColors;

// React hook — コンポーネント内でテーマを取得
export function useColors() {
  const themeId = useThemeStore((s) => s.themeId);
  return THEMES[themeId];
}

// テーマ変更時に Colors シングルトンも更新するためのヘルパー
// _layout.tsx で useThemeStore.subscribe を呼んで同期させる
export function syncColors(themeId: ThemeId) {
  Colors = THEMES[themeId];
}

export const fmtYen = (n: number): string =>
  `¥${Math.round(n).toLocaleString('ja-JP')}`;
