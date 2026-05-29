export const Colors = {
  // 背景：深い藍紫ではなく、少し明るいネイビー寄りのダーク
  bg:          '#0d0d18',
  surface:     'rgba(255,255,255,0.07)',   // グラスモーフィズム
  surface2:    'rgba(255,255,255,0.04)',
  surfaceSolid:'#161625',                  // 不透明が必要な場所
  border:      'rgba(200,180,255,0.18)',
  borderGlow:  'rgba(220,180,255,0.35)',

  // アクセント：ローズゴールド + ラベンダー
  gold:        '#e8b4c8',   // ローズゴールド（ピンクがかった）
  goldDim:     'rgba(232,180,200,0.18)',
  goldBright:  '#f5cfe0',   // ハイライト

  purple:      '#c4a8f0',   // ラベンダー
  purpleDim:   'rgba(196,168,240,0.15)',
  purpleBright:'#dcc8ff',

  teal:        '#a8e8d8',   // ミントグリーン

  // テキスト
  text:        '#f8f4ff',   // ほんのり紫がかった白
  text2:       '#b8b0cc',
  text3:       '#7a7490',

  red:         '#f08098',   // ソフトレッド
  green:       '#80d8b0',   // ミントグリーン

  // グラデーション用
  grad1:       '#1a0a2e',   // 紫の深み
  grad2:       '#0a1a2e',   // 青の深み
};

export const fmtYen = (n: number): string =>
  `¥${Math.round(n).toLocaleString('ja-JP')}`;
