/**
 * CLI backup: xuất `persons` + `relationships` từ database ra file JSON
 * format export v2 (cùng format app xuất & `seed-from-xlsx.ts` nạp lại được).
 *
 * Cách dùng:
 *   bun scripts/backup-db.ts                       # -> backups/giapha-backup-YYMMDD-HHMM.json
 *   bun scripts/backup-db.ts --out path/to.json
 *
 * Phục hồi:
 *   bun scripts/seed-from-xlsx.ts --input backups/<file>.json --reset
 *
 * Lưu ý bảo mật: file backup chứa dữ liệu cá nhân — thư mục `backups/` đã nằm
 * trong .gitignore (repo public).
 */

import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";

config({ path: ".env.local" });

import { asc } from "drizzle-orm";
import { db } from "../lib/db";
import { persons, relationships } from "../lib/db/schema";

function timestampSlug(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

async function main() {
  const now = new Date();
  const outFlag = process.argv.indexOf("--out");
  const out =
    outFlag !== -1 && process.argv[outFlag + 1]
      ? resolve(process.argv[outFlag + 1])
      : resolve(process.cwd(), "backups", `giapha-backup-${timestampSlug(now)}.json`);

  const allPersons = await db.select().from(persons).orderBy(asc(persons.createdAt));
  const allRels = await db.select().from(relationships).orderBy(asc(relationships.createdAt));

  // camelCase (Drizzle) -> snake_case (format export v2)
  const payload = {
    version: 2,
    timestamp: now.toISOString(),
    persons: allPersons.map((p) => ({
      id: p.id,
      full_name: p.fullName,
      gender: p.gender,
      birth_year: p.birthYear,
      birth_month: p.birthMonth,
      birth_day: p.birthDay,
      death_year: p.deathYear,
      death_month: p.deathMonth,
      death_day: p.deathDay,
      death_lunar_year: p.deathLunarYear,
      death_lunar_month: p.deathLunarMonth,
      death_lunar_day: p.deathLunarDay,
      is_deceased: p.isDeceased,
      is_in_law: p.isInLaw,
      birth_order: p.birthOrder,
      generation: p.generation,
      other_names: p.otherNames,
      avatar_url: p.avatarUrl,
      note: p.note,
    })),
    relationships: allRels.map((r) => ({
      type: r.type,
      person_a: r.personA,
      person_b: r.personB,
      note: r.note,
    })),
  };

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(payload, null, 2), "utf-8");

  console.log(`✅ Backup: ${out}`);
  console.log(`   persons: ${payload.persons.length}  relationships: ${payload.relationships.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Backup thất bại:", e);
    process.exit(1);
  });
