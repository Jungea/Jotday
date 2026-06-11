// 하루 시간대별 색상 키프레임 [hour, R, G, B]
const STOPS: [number, number, number, number][] = [
  [  0,  30,  58, 138],  // 자정   — 남색
  [  5,  49,  46, 129],  // 새벽 5 — 인디고
  [  7, 249, 115,  22],  // 오전 7 — 주황 (해돋이)
  [ 10, 251, 191,  36],  // 오전 10 — 노랑
  [ 13,   6, 182, 212],  // 오후 1 — 하늘
  [ 17,  59, 130, 246],  // 오후 5 — 파랑
  [ 19, 168,  85, 247],  // 오후 7 — 보라 (일몰)
  [ 22,  99,  30, 120],  // 밤 10  — 짙은 보라
  [ 24,  30,  58, 138],  // 자정   — 남색 (순환)
];

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function hourToColor(hour: number): string {
  const h = Math.max(0, Math.min(24, hour));
  const i = STOPS.findIndex(([h0], idx) => idx < STOPS.length - 1 && h >= h0 && h <= STOPS[idx + 1][0]);
  if (i === -1) return `rgb(${STOPS[0][1]},${STOPS[0][2]},${STOPS[0][3]})`;
  const [h0, r0, g0, b0] = STOPS[i];
  const [h1, r1, g1, b1] = STOPS[i + 1];
  const t = (h - h0) / (h1 - h0);
  return `rgb(${lerp(r0, r1, t)},${lerp(g0, g1, t)},${lerp(b0, b1, t)})`;
}

/** 카드 시간(시.분)에서 다음 카드 시간까지 흐르는 그라데이션 CSS 값 반환 */
export function cardBarGradient(fromHour: number, toHour: number): string {
  const from = hourToColor(fromHour);
  const to = hourToColor(toHour);
  if (from === to) return from;
  return `linear-gradient(180deg, ${from}, ${to})`;
}
