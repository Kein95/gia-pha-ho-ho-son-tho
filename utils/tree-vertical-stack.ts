/**
 * Chọn những nút sẽ xếp đàn con thành cột dọc thay vì trải ngang.
 *
 * Cây trải ngang hoàn toàn rộng ~17.800px mà chỉ cao ~1.600px (11:1), không khổ
 * giấy nào chứa nổi. Phôi phả đồ in sẵn giải quyết bằng cách: mấy đời trên trải
 * ngang cho thấy rõ các chi, mấy đời dưới xếp con thành cột dọc ngay dưới cha.
 * Bề ngang co lại rất nhiều mà cây vẫn liền một mạch, không phải cắt rời.
 *
 * Ngưỡng tính theo số người của chi, vì đó là thước đo mịn: đổi ngưỡng một chút
 * là tỉ lệ đổi theo, chọn được con số khớp khung phả đồ in sẵn (1,45:1). Đo trên
 * gia phả hiện tại (200 người, 9 đời):
 *
 *   không xếp dọc         17.796 x  1.630 px   10,9:1
 *   chi <= 10 người       11.643 x  2.672 px    4,4:1
 *   chi <= 20 người        7.736 x  3.791 px    2,0:1
 *   chi <= 26 người        6.309 x  4.453 px    1,4:1   <- khớp khung phả đồ
 *   chi <= 34 người        5.010 x  5.603 px    0,9:1
 *   xếp dọc hết              637 x 21.406 px    0,03:1
 */

/** Xếp dọc khi chi tính từ nút đó có không quá ngần này người. */
export const DEFAULT_MAX_STACK_SIZE = 26;

/**
 * Trả về tập id những nút nên xếp con theo cột dọc.
 *
 * `getChildIds` lấy con đã qua bộ lọc của giao diện, nhờ vậy khi người dùng ẩn
 * bớt dâu/rể thì số người tính lại và bố cục bám theo đúng những gì đang hiện.
 */
export function pickVerticallyStackedNodes(
  rootIds: string[],
  getChildIds: (id: string) => string[],
  maxStackSize: number = DEFAULT_MAX_STACK_SIZE,
): Set<string> {
  const stacked = new Set<string>();
  const sizeCache = new Map<string, number>();

  /** Số người của chi tính cả nút hiện tại; nút lá là 1. */
  const size = (id: string, ancestors: Set<string>): number => {
    if (ancestors.has(id)) return 0; // chặn vòng lặp do quan hệ vòng tròn
    const cached = sizeCache.get(id);
    if (cached !== undefined) return cached;

    const nextAncestors = new Set(ancestors).add(id);
    const result =
      1 +
      getChildIds(id).reduce(
        (sum, child) => sum + size(child, nextAncestors),
        0,
      );

    sizeCache.set(id, result);
    return result;
  };

  const visit = (id: string, ancestors: Set<string>) => {
    if (ancestors.has(id)) return;
    const children = getChildIds(id);
    if (children.length > 0 && size(id, ancestors) <= maxStackSize) {
      stacked.add(id);
    }
    const nextAncestors = new Set(ancestors).add(id);
    for (const child of children) visit(child, nextAncestors);
  };

  for (const rootId of rootIds) visit(rootId, new Set());

  return stacked;
}
