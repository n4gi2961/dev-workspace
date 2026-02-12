/**
 * ルーティンタイトルから分数を抽出するユーティリティ。
 * 「N分」パターンを優先し、フォールバックとして最初の数字を使用。
 */

/**
 * タイトルから分数 (1-180) を抽出する。
 * @example parseTimerMinutes("30分ランニング") → 30
 * @example parseTimerMinutes("ランニング45分") → 45
 * @example parseTimerMinutes("毎日歩く") → null
 * @example parseTimerMinutes("200分マラソン") → null
 */
export function parseTimerMinutes(title: string): number | null {
  // 優先: 「N分」パターン
  const minuteMatch = title.match(/(\d+)\s*分/);
  if (minuteMatch) {
    const num = parseInt(minuteMatch[1], 10);
    if (num >= 1 && num <= 180) return num;
  }
  // フォールバック: 最初の数字
  const numMatch = title.match(/(\d+)/);
  if (!numMatch) return null;
  const num = parseInt(numMatch[1], 10);
  if (num < 1 || num > 180) return null;
  return num;
}

/**
 * タイトルを数字部分とそれ以外に分割する（Focus画面の青リンク表示用）。
 * parseTimerMinutes と同じロジックでマッチした数字部分を分割。
 * @example parseTimerParts("30分ランニング") → { before: "", number: "30", after: "分ランニング" }
 * @example parseTimerParts("毎日歩く") → null
 */
export function parseTimerParts(
  title: string,
): { before: string; number: string; after: string } | null {
  // 優先: 「N分」パターンの数字部分
  const minuteMatch = title.match(/(\d+)\s*分/);
  if (minuteMatch) {
    const num = parseInt(minuteMatch[1], 10);
    if (num >= 1 && num <= 180) {
      const idx = title.indexOf(minuteMatch[1]);
      return {
        before: title.slice(0, idx),
        number: minuteMatch[1],
        after: title.slice(idx + minuteMatch[1].length),
      };
    }
  }
  // フォールバック: 最初の数字
  const numMatch = title.match(/(\d+)/);
  if (!numMatch) return null;
  const num = parseInt(numMatch[1], 10);
  if (num < 1 || num > 180) return null;
  const idx = title.indexOf(numMatch[1]);
  return {
    before: title.slice(0, idx),
    number: numMatch[1],
    after: title.slice(idx + numMatch[1].length),
  };
}
