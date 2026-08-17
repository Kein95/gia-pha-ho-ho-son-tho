/**
 * Chọn những nút sẽ xếp đàn con thành cột dọc thay vì trải ngang.
 *
 * Cây trải ngang hoàn toàn rộng ~17.800px mà chỉ cao ~1.600px (11:1), không khổ
 * giấy nào chứa nổi. Phôi phả đồ in sẵn giải quyết bằng cách: mấy đời trên trải
 * ngang cho thấy rõ các chi, mấy đời dưới xếp con thành cột dọc ngay dưới cha.
 * Bề ngang co lại rất nhiều mà cây vẫn liền một mạch, không phải cắt rời.
 *
 * Đo trên gia phả hiện tại (200 người, 9 đời):
 *   trải ngang hết          17.796 x  1.630 px   11,0:1
 *   xếp dọc khi sâu <= 3    10.396 x  2.594 px    4,0:1
 *   xếp dọc khi sâu <= 4     5.972 x  4.600 px    1,3:1   <- vừa khổ A0
 *   xếp dọc hết                566 x 17.574 px    0,03:1
 */

/** Xếp dọc khi cây con tính từ nút đó sâu không quá ngần này đời. */
export const DEFAULT_MAX_STACK_DEPTH = 4;

/**
 * Trả về tập id những nút nên xếp con theo cột dọc.
 *
 * `getChildIds` lấy con đã qua bộ lọc của giao diện, nhờ vậy khi người dùng ẩn
 * bớt dâu/rể thì độ sâu tính lại và bố cục bám theo đúng những gì đang hiện.
 */
export function pickVerticallyStackedNodes(
  rootIds: string[],
  getChildIds: (id: string) => string[],
  maxStackDepth: number = DEFAULT_MAX_STACK_DEPTH,
): Set<string> {
  const stacked = new Set<string>();
  const depthCache = new Map<string, number>();

  /** Số đời của cây con tính cả nút hiện tại; nút lá là 1. */
  const depth = (id: string, ancestors: Set<string>): number => {
    if (ancestors.has(id)) return 0; // chặn vòng lặp do quan hệ vòng tròn
    const cached = depthCache.get(id);
    if (cached !== undefined) return cached;

    const nextAncestors = new Set(ancestors).add(id);
    const children = getChildIds(id);
    const result =
      1 +
      children.reduce((max, child) => Math.max(max, depth(child, nextAncestors)), 0);

    depthCache.set(id, result);
    return result;
  };

  const visit = (id: string, ancestors: Set<string>) => {
    if (ancestors.has(id)) return;
    const children = getChildIds(id);
    if (children.length > 0 && depth(id, ancestors) <= maxStackDepth) {
      stacked.add(id);
    }
    const nextAncestors = new Set(ancestors).add(id);
    for (const child of children) visit(child, nextAncestors);
  };

  for (const rootId of rootIds) visit(rootId, new Set());

  return stacked;
}
