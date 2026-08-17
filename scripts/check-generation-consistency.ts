/**
 * Soát số đời so với vị trí thật trong cây, đọc thẳng từ database.
 *
 *   bun scripts/check-generation-consistency.ts
 *
 * Sơ đồ cây xếp người theo số bậc cha–con tính từ cụ tổ, còn thẻ lại in số đời
 * ghi trong hồ sơ. Hai con số này lệch nhau thì trên bản in sẽ có người ngồi
 * nhầm hàng — cùng một hàng mà thẻ ghi hai đời khác nhau.
 *
 * Chỉ đọc, không sửa gì. Chạy lại sau mỗi đợt sửa dữ liệu bằng tay.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../lib/db";
import { persons, relationships } from "../lib/db/schema";

async function main() {
  const [allPersons, allRels] = await Promise.all([
    db.select().from(persons),
    db.select().from(relationships),
  ]);

  const byId = new Map(allPersons.map((p) => [p.id, p]));
  const childrenOf = new Map<string, string[]>();
  const parentOf = new Map<string, string>();

  for (const r of allRels) {
    if (r.type !== "biological_child" && r.type !== "adopted_child") continue;
    if (!childrenOf.has(r.personA)) childrenOf.set(r.personA, []);
    childrenOf.get(r.personA)!.push(r.personB);
    parentOf.set(r.personB, r.personA);
  }

  const name = (id: string) => byId.get(id)?.fullName ?? "(không rõ)";

  // ── 1. Cha và con ghi cùng đời, hoặc con ghi đời nhỏ hơn cha ───────────────
  const badPairs: string[] = [];
  for (const [childId, parentId] of parentOf) {
    const childGen = byId.get(childId)?.generation;
    const parentGen = byId.get(parentId)?.generation;
    if (childGen == null || parentGen == null) continue;
    if (childGen <= parentGen) {
      badPairs.push(
        `  ${name(parentId)} (đời ${parentGen}) -> con ${name(childId)} (đời ${childGen})`,
      );
    }
  }

  // ── 2. Đời ghi khác số bậc thật trong cây ──────────────────────────────────
  const roots = allPersons.filter(
    (p) => !parentOf.has(p.id) && (childrenOf.get(p.id)?.length ?? 0) > 0,
  );

  const rowOf = new Map<string, number>();
  const walk = (id: string, row: number, seen: Set<string>) => {
    if (seen.has(id)) return; // chặn vòng lặp do quan hệ vòng tròn
    rowOf.set(id, row);
    const next = new Set(seen).add(id);
    for (const c of childrenOf.get(id) ?? []) walk(c, row + 1, next);
  };
  for (const r of roots) walk(r.id, r.generation ?? 0, new Set());

  const misplaced: string[] = [];
  for (const [id, row] of rowOf) {
    const gen = byId.get(id)?.generation;
    if (gen != null && gen !== row) {
      const parentId = parentOf.get(id);
      misplaced.push(
        `  ${name(id)}: ghi đời ${gen} nhưng nằm ở hàng ${row}` +
          (parentId
            ? `  <- cha: ${name(parentId)} (đời ${byId.get(parentId)?.generation})`
            : ""),
      );
    }
  }

  console.log(`Đã soát ${allPersons.length} người, ${allRels.length} quan hệ.`);
  console.log(`Gốc cây: ${roots.map((r) => r.fullName).join(", ") || "(không có)"}`);

  console.log(`\n1) Cha con cùng đời hoặc ngược đời: ${badPairs.length}`);
  badPairs.forEach((l) => console.log(l));

  console.log(`\n2) Đời ghi lệch với hàng trong cây: ${misplaced.length}`);
  misplaced.forEach((l) => console.log(l));

  const clean = badPairs.length === 0 && misplaced.length === 0;
  console.log(
    clean
      ? "\n✅ Mọi người đều đúng hàng đúng đời."
      : "\n⚠️  Có người ngồi nhầm hàng trên bản in.",
  );
  process.exit(clean ? 0 : 1);
}

main().catch((e) => {
  console.error("❌ Soát thất bại:", e);
  process.exit(2);
});
