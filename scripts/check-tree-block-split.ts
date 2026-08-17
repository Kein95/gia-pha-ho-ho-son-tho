/**
 * Tự kiểm tra thuật toán cắt cây thành khối (`utils/tree-block-split`).
 *
 *   bun scripts/check-tree-block-split.ts
 *
 * Phần assert chạy trên cây dựng sẵn nên không cần database. Nếu trong
 * `backups/` có bản dump thì in thêm bảng khối của gia phả thật để soi bằng mắt.
 */

import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { splitTreeIntoBlocks, type TreeNodeShape } from "../utils/tree-block-split";

const CARD = 132;
const LI_PADDING = 10;
const STUB = 150;

/** Bề rộng thật của một khối sau khi đã cắt — dùng để đối chiếu với giới hạn. */
function blockWidth(
  rootId: string,
  getNode: (id: string) => TreeNodeShape,
  isCut: (id: string) => boolean,
): number {
  const node = getNode(rootId);
  const cell = (1 + node.spouseCount) * CARD + LI_PADDING;
  const childrenWidth = node.childIds.reduce(
    (sum, id) => sum + (isCut(id) ? STUB : blockWidth(id, getNode, isCut)),
    0,
  );
  return Math.max(cell, childrenWidth);
}

function check(name: string, condition: boolean) {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.log(`  ok  ${name}`);
}

// ── Cây dựng sẵn: gốc -> 1 con (chuỗi) -> 2 chi rộng + 1 nhánh lẻ ────────────
/** Chi gồm `branches` người con, mỗi người lại có `leaves` người con. */
const chi = (
  prefix: string,
  branches: number,
  leaves: number,
): Record<string, TreeNodeShape> => {
  const nodes: Record<string, TreeNodeShape> = {
    [prefix]: { spouseCount: 1, childIds: [] },
  };
  for (let b = 0; b < branches; b++) {
    const branchId = `${prefix}-${b}`;
    nodes[prefix].childIds.push(branchId);
    nodes[branchId] = { spouseCount: 1, childIds: [] };
    for (let l = 0; l < leaves; l++) {
      const leafId = `${branchId}-${l}`;
      nodes[branchId].childIds.push(leafId);
      nodes[leafId] = { spouseCount: 0, childIds: [] };
    }
  }
  return nodes;
};

const nodes: Record<string, TreeNodeShape> = {
  root: { spouseCount: 0, childIds: ["chain"] },
  chain: { spouseCount: 1, childIds: ["chiA", "chiB", "le"] },
  le: { spouseCount: 0, childIds: [] },
  ...chi("chiA", 5, 8),
  ...chi("chiB", 4, 6),
};

const getNode = (id: string) => nodes[id] ?? { spouseCount: 0, childIds: [] };
const maxBlockWidth = 3200;
const layout = splitTreeIntoBlocks(["root"], getNode, {
  maxBlockWidth,
  cardWidth: CARD,
});
const isCut = (id: string) => layout.blockOfCutNode.has(id);

console.log("Cây dựng sẵn:");
check("cắt ra nhiều hơn một khối", layout.blocks.length > 1);
check("khối 1 là gốc cây", layout.blocks[0].rootId === "root");
check(
  "chuỗi một con không bị cắt (khối 1 không chỉ có mỗi cụ tổ)",
  !isCut("chain"),
);
check("chi rộng nhất được tách thành khối riêng", isCut("chiA"));
check(
  "cắt cả bên trong chi, không chỉ ở tầng trên",
  ["chiA-0", "chiA-1", "chiB-0"].some(isCut),
);
check("nhánh lẻ vẫn nằm trong thân chính", !isCut("le"));
check(
  "chi đã vừa khổ thì để nguyên, không cắt thừa",
  !isCut("chiB") && blockWidth("chiB", getNode, isCut) <= maxBlockWidth,
);
check(
  "số khối khớp số điểm cắt cộng gốc",
  layout.blocks.length === layout.blockOfCutNode.size + 1,
);
check(
  "số thứ tự khối liên tục từ 1",
  layout.blocks.every((b, i) => b.index === i + 1),
);
check(
  "chiA đếm đủ người (2 + 5 con và vợ + 40 cháu)",
  layout.blocks.find((b) => b.rootId === "chiA")!.personCount === 52,
);
for (const block of layout.blocks) {
  check(
    `khối ${block.index} vừa giới hạn ${maxBlockWidth}px`,
    blockWidth(block.rootId, getNode, isCut) <= maxBlockWidth,
  );
}

// Giới hạn đã biết: một người có quá nhiều con ruột thì hàng con đó không tách
// nhỏ hơn được, khối đành rộng quá khổ. Gia phả này fanout tối đa 7 nên không
// vướng; test giữ lại để nếu sau này chạm phải thì biết ngay nguyên nhân.
const flat: Record<string, TreeNodeShape> = { many: { spouseCount: 0, childIds: [] } };
for (let i = 0; i < 40; i++) {
  flat.many.childIds.push(`leaf-${i}`);
  flat[`leaf-${i}`] = { spouseCount: 0, childIds: [] };
}
const flatGet = (id: string) => flat[id] ?? { spouseCount: 0, childIds: [] };
const flatLayout = splitTreeIntoBlocks(["many"], flatGet, {
  maxBlockWidth,
  cardWidth: CARD,
});
check(
  "hàng 40 con ruột không tách được nên vẫn quá khổ (giới hạn đã biết)",
  flatLayout.blocks.length === 1 &&
    blockWidth("many", flatGet, () => false) > maxBlockWidth,
);

// ── Gia phả thật, nếu có bản dump ────────────────────────────────────────────
const backupDir = join(process.cwd(), "backups");
const dump = existsSync(backupDir)
  ? readdirSync(backupDir).filter((f) => f.endsWith(".json")).sort().pop()
  : undefined;

if (!dump) {
  console.log("\n(bỏ qua phần gia phả thật: không có file trong backups/)");
} else {
  const data = JSON.parse(readFileSync(join(backupDir, dump), "utf-8"));
  const names = new Map<string, string>(
    data.persons.map((p: { id: string; full_name: string }) => [p.id, p.full_name]),
  );
  const real = new Map<string, TreeNodeShape>();
  const ensure = (id: string) => {
    if (!real.has(id)) real.set(id, { spouseCount: 0, childIds: [] });
    return real.get(id)!;
  };
  const hasParent = new Set<string>();
  for (const r of data.relationships) {
    if (r.type === "marriage") {
      ensure(r.person_a).spouseCount++;
      ensure(r.person_b).spouseCount++;
    } else {
      ensure(r.person_a).childIds.push(r.person_b);
      ensure(r.person_b);
      hasParent.add(r.person_b);
    }
  }
  const rootId = [...real.keys()].find(
    (id) => !hasParent.has(id) && real.get(id)!.childIds.length > 0,
  )!;
  const realGet = (id: string) => real.get(id) ?? { spouseCount: 0, childIds: [] };
  const realLayout = splitTreeIntoBlocks([rootId], realGet, {
    maxBlockWidth,
    cardWidth: CARD,
  });
  const realIsCut = (id: string) => realLayout.blockOfCutNode.has(id);

  console.log(`\nGia phả thật (${dump}) — ${realLayout.blocks.length} khối:`);
  let widest = 0;
  for (const block of realLayout.blocks) {
    const w = blockWidth(block.rootId, realGet, realIsCut);
    widest = Math.max(widest, w);
    console.log(
      `  khối ${String(block.index).padStart(2)}  ${String(Math.round(w)).padStart(5)}px  ` +
        `${String(block.personCount).padStart(3)} người  ${names.get(block.rootId)}`,
    );
  }
  check(`khối rộng nhất (${Math.round(widest)}px) vừa giới hạn`, widest <= maxBlockWidth);
}

console.log("\nTất cả kiểm tra đều đạt.");
