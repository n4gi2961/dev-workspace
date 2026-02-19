/**
 * 流星抽選システム（Daily Meteor Lottery）
 * 毎日0時にボードごとに決定論的にルーティンを抽選し、
 * 当選ルーティンのチェック時に確定で流星が降る。
 */

/**
 * djb2 ハッシュ関数
 */
function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0; // unsigned 32-bit
}

/**
 * mulberry32 — シード付き32bit PRNG
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 決定論的流星抽選
 *
 * @param dateString - 日付文字列 (YYYY-MM-DD)
 * @param boardId - ボードID
 * @param routineIds - ソート済みルーティンIDの配列
 * @returns 当選ルーティンIDのSet
 */
export function computeMeteorLottery(
  dateString: string,
  boardId: string,
  routineIds: string[],
): Set<string> {
  const count = routineIds.length;
  // スロット数: 0-4個→0枠、5-14個→1枠、15-24個→2枠...
  const slots = Math.max(0, Math.floor((count + 5) / 10));
  if (slots === 0 || count === 0) return new Set();

  // シード生成: 日付+ボードIDのdjb2ハッシュ
  const seed = djb2(`${dateString}:${boardId}`);
  const rng = mulberry32(seed);

  // Fisher-Yatesシャッフルで当選者選出
  const indices = routineIds.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const winners = new Set<string>();
  const winnerCount = Math.min(slots, count);
  for (let i = 0; i < winnerCount; i++) {
    winners.add(routineIds[indices[i]]);
  }

  return winners;
}
