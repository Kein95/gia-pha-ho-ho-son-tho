/**
 * Cắt cây gia phả thành nhiều khối để bản in không kéo dài thành một dải.
 *
 * Cây vẽ liền một mạch rộng ~16.700px trong khi chỉ cao ~1.700px (tỉ lệ 10:1),
 * không khổ giấy nào chứa nổi. Cách làm của phả đồ treo tường: giữ thân chính ở
 * khối đầu, mỗi chi lớn tách ra một khối riêng, chỗ cắt để lại dấu dẫn
 * "xem khối N". Các khối xếp cuộn nhiều tầng nên tỉ lệ về gần khổ giấy thật.
 *
 * Bề rộng ở đây là ước tính (số ô × bề ngang thẻ), không đo DOM — đủ chính xác
 * để chia khối vì mọi thẻ đều cùng bề ngang.
 */

/** Đệm trái/phải của mỗi `li` trong `.css-tree` (padding: 30px 5px 0 5px). */
const LI_PADDING = 10;

/** Bề ngang ô dấu dẫn "xem khối N" thay chỗ cây con đã cắt. */
export const STUB_WIDTH = 150;

export interface TreeNodeShape {
  spouseCount: number;
  childIds: string[];
}

export interface TreeBlock {
  rootId: string;
  /** Số thứ tự khối, bắt đầu từ 1. */
  index: number;
  /** Số người của cả chi (tính cả vợ/chồng và các khối cắt tiếp phía dưới). */
  personCount: number;
  /** Khối chứa người cha — để bản in tra ngược được. Khối gốc không có. */
  fromBlockIndex?: number;
}

export interface TreeBlockLayout {
  blocks: TreeBlock[];
  /** id nút bị cắt → khối chứa nó. Dùng để vẽ ô dấu dẫn ở chỗ cắt. */
  blockOfCutNode: Map<string, TreeBlock>;
}

export interface SplitOptions {
  /** Bề ngang tối đa của một khối, tính bằng px. */
  maxBlockWidth: number;
  /** Bề ngang một thẻ người, tính bằng px. */
  cardWidth: number;
}

/**
 * Chọn các điểm cắt rồi đánh số khối theo thứ tự đọc.
 *
 * `getNode` trả về hình dạng nút đã qua bộ lọc của giao diện, nhờ vậy việc chia
 * khối ăn khớp với đúng những gì đang hiển thị.
 */
export function splitTreeIntoBlocks(
  rootIds: string[],
  getNode: (id: string) => TreeNodeShape,
  { maxBlockWidth, cardWidth }: SplitOptions,
): TreeBlockLayout {
  const cut = new Set<string>();

  /**
   * Duyệt hậu thứ tự: con được cắt gọn trước, nên bề rộng trả về của mỗi con
   * đã nằm trong giới hạn. Sau đó mới cắt tiếp các con to nhất nếu tổng vẫn quá.
   */
  const measure = (id: string, seen: Set<string>): number => {
    if (seen.has(id)) return 0;
    const node = getNode(id);
    const cell = (1 + node.spouseCount) * cardWidth + LI_PADDING;

    const kids = node.childIds
      .map((k) => ({ id: k, width: measure(k, new Set(seen).add(id)) }))
      .filter((k) => k.width > 0);

    let total = kids.reduce((sum, k) => sum + k.width, 0);
    for (const kid of [...kids].sort((a, b) => b.width - a.width)) {
      if (Math.max(cell, total) <= maxBlockWidth) break;
      // Cây con đã nhỏ hơn ô dấu dẫn thì cắt cũng không hẹp thêm được.
      if (kid.width <= STUB_WIDTH) break;
      cut.add(kid.id);
      total -= kid.width - STUB_WIDTH;
    }

    return Math.max(cell, total);
  };

  for (const rootId of rootIds) measure(rootId, new Set());

  const countPeople = (id: string, seen: Set<string>): number => {
    if (seen.has(id)) return 0;
    const node = getNode(id);
    const next = new Set(seen).add(id);
    return (
      1 +
      node.spouseCount +
      node.childIds.reduce((sum, k) => sum + countPeople(k, next), 0)
    );
  };

  // Đánh số theo thứ tự đọc: khối gốc trước, rồi lần lượt các nút bị cắt gặp
  // được khi duyệt từng khối từ trên xuống, trái sang phải.
  const blocks: TreeBlock[] = [];
  const blockOfCutNode = new Map<string, TreeBlock>();
  const queued = new Set<string>();
  const queue: string[] = [];

  const enqueue = (id: string, fromBlockIndex?: number): TreeBlock => {
    const block: TreeBlock = {
      rootId: id,
      index: blocks.length + 1,
      personCount: countPeople(id, new Set()),
      fromBlockIndex,
    };
    blocks.push(block);
    queued.add(id);
    queue.push(id);
    return block;
  };

  for (const rootId of rootIds) if (!queued.has(rootId)) enqueue(rootId);

  while (queue.length > 0) {
    const blockRoot = queue.shift()!;
    const currentIndex = blocks.find((b) => b.rootId === blockRoot)!.index;
    const stack = [blockRoot];
    const seen = new Set<string>();
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (seen.has(current)) continue;
      seen.add(current);
      // Đẩy ngược để lấy ra theo thứ tự trái sang phải.
      for (const childId of [...getNode(current).childIds].reverse()) {
        if (cut.has(childId)) {
          if (!queued.has(childId))
            blockOfCutNode.set(childId, enqueue(childId, currentIndex));
        } else {
          stack.push(childId);
        }
      }
    }
  }

  return { blocks, blockOfCutNode };
}
