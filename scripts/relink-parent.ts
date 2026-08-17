/**
 * Chuyển một hoặc nhiều người sang làm con của người cha khác.
 *
 * Dùng khi phát hiện gắn nhầm cha — hay gặp nhất là hai người trùng tên, bảng
 * gốc chỉ ghi tên nên khó phân biệt.
 *
 *   bun scripts/relink-parent.ts --to "Hồ (Công) Mân" --child "Hồ Lĩnh" --child "Hồ Đạt"
 *   bun scripts/relink-parent.ts ... --apply     # thật sự ghi vào database
 *
 * Mặc định chỉ chạy thử và in ra những gì sẽ đổi. Nhớ chạy
 * `bun scripts/backup-db.ts` trước khi dùng --apply.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq, inArray } from "drizzle-orm";
import { db } from "../lib/db";
import { persons, relationships } from "../lib/db/schema";

function readArgs() {
  const argv = process.argv.slice(2);
  const children: string[] = [];
  let parent = "";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--child" && argv[i + 1]) children.push(argv[++i]);
    else if (argv[i] === "--to" && argv[i + 1]) parent = argv[++i];
  }
  return { children, parent, apply: argv.includes("--apply") };
}

async function main() {
  const { children, parent, apply } = readArgs();
  if (!parent || children.length === 0) {
    console.error('Thiếu tham số. Ví dụ: --to "Hồ (Công) Mân" --child "Hồ Lĩnh"');
    process.exit(1);
  }

  const names = [parent, ...children];
  const found = await db
    .select()
    .from(persons)
    .where(inArray(persons.fullName, names));

  // Tên trùng thì không tự đoán — đây đúng là loại lỗi script này đi sửa.
  for (const n of names) {
    const hits = found.filter((p) => p.fullName === n);
    if (hits.length === 0) {
      console.error(`❌ Không có ai tên "${n}".`);
      process.exit(1);
    }
    if (hits.length > 1) {
      console.error(`❌ Có ${hits.length} người tên "${n}", không rõ chọn ai.`);
      process.exit(1);
    }
  }

  const newParent = found.find((p) => p.fullName === parent)!;
  const childRows = children.map((n) => found.find((p) => p.fullName === n)!);

  const links = await db
    .select()
    .from(relationships)
    .where(
      and(
        inArray(
          relationships.personB,
          childRows.map((c) => c.id),
        ),
        inArray(relationships.type, ["biological_child", "adopted_child"]),
      ),
    );

  // Lấy thêm hồ sơ cha cũ để in ra tên chứ không phải mã định danh.
  const oldParentIds = [...new Set(links.map((l) => l.personA))];
  const oldParents = oldParentIds.length
    ? await db.select().from(persons).where(inArray(persons.id, oldParentIds))
    : [];
  const personById = new Map(
    [...found, ...oldParents].map((p) => [p.id, p]),
  );

  console.log(`Cha mới: ${newParent.fullName} (đời ${newParent.generation})\n`);

  let changes = 0;
  for (const child of childRows) {
    const link = links.find((l) => l.personB === child.id);
    if (!link) {
      console.log(`  ${child.fullName}: chưa có cha, sẽ thêm mới`);
      changes++;
      continue;
    }
    if (link.personA === newParent.id) {
      console.log(`  ${child.fullName}: đã đúng cha rồi, bỏ qua`);
      continue;
    }
    const old = personById.get(link.personA);
    const oldName = old
      ? `${old.fullName} (đời ${old.generation})`
      : link.personA;
    console.log(
      `  ${child.fullName} (đời ${child.generation}): ${oldName} -> ${newParent.fullName}`,
    );
    changes++;
  }

  if (!apply) {
    console.log(`\nChạy thử — chưa ghi gì. ${changes} thay đổi đang chờ.`);
    console.log("Thêm --apply để ghi thật (nhớ backup trước).");
    process.exit(0);
  }

  for (const child of childRows) {
    const link = links.find((l) => l.personB === child.id);
    if (link) {
      if (link.personA === newParent.id) continue;
      await db
        .update(relationships)
        .set({ personA: newParent.id, updatedAt: new Date() })
        .where(eq(relationships.id, link.id));
    } else {
      await db.insert(relationships).values({
        type: "biological_child",
        personA: newParent.id,
        personB: child.id,
      });
    }
  }

  console.log(`\n✅ Đã ghi ${changes} thay đổi.`);
  console.log("Soát lại: bun scripts/check-generation-consistency.ts");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Thất bại:", e);
    process.exit(1);
  });
