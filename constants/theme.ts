export const Colors = {
  bg:          '#0a0a0f',
  surface:     '#13131a',
  surface2:    '#1c1c26',
  border:      'rgba(180,160,255,0.12)',
  gold:        '#c9a84c',
  goldDim:     'rgba(201,168,76,0.15)',
  purple:      '#9b7fe8',
  purpleDim:   'rgba(155,127,232,0.12)',
  teal:        '#3dcfb8',
  text:        '#f0eef8',
  text2:       '#8a8899',
  text3:       '#5a5868',
  red:         '#e05c6a',
  green:       '#4ecb8a',
};

// 金額を¥1,234,567形式で表示（略式なし）
export const fmtYen = (n: number): string => `¥${Math.round(n).toLocaleString('ja-JP')}`;
