/**
 * CLI seed: nạp dữ liệu cây gia phả từ file JSON (tạo bởi build-from-xlsx.py)
 * vào database. Script này CHỈ thao tác trên bảng `persons` + `relationships`,
 * KHÔNG đụng tới bảng `users`.
 *
 * Cách dùng:
 *   bun scripts/seed-from-xlsx.ts                          # import thêm (upsert theo id)
 *   bun scripts/seed-from-xlsx.ts --input path/to.json     # file JSON khác
 *   bun scripts/seed-from-xlsx.ts --dry-run                # chạy thử, không ghi DB
 *   bun scripts/seed-from-xlsx.ts --reset                  # xoá sạch persons/relationships cũ trước khi nạp
 *
 * Lưu ý bảo mật: file JSON chứa dữ liệu cá nhân — đã nằm trong .gitignore.
 */

import { config } from "dotenv";
import { readFileSync } from "fs";
import { resolve } from "path";

config({ path: ".env.local" });

import { db } from "../lib/db";
import { persons, relationships } from "../lib/db/schema";

// ─── Đọc args ─────────────────────────────────────────────────────────────────
function parseArgs(argv: string[]) {
  const has = (flag: string) => argv.includes(flag);
  const valueOf = (flag: string) => {
    const i = argv.indexOf(flag);
    return i !== -1 && argv[i + 1] ? resolve(argv[i + 1]) : undefined;
  };
  return {
    input: valueOf("--input") ?? resolve(process.cwd(), "plans/260619-1933-digitize-genealogy/giapha-from-xlsx.json"),
    dryRun: has("--dry-run"),
    reset: has("--reset"),
  };
}

// ─── Types (đúng format file export v2 của app) ──────────────────────────────
interface PersonRow {
  id: string;
  full_name: string;
  gender: "male" | "female" | "other";
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  death_year: number | null;
  death_month: number | null;
  death_day: number | null;
  death_lunar_year: number | null;
  death_lunar_month: number | null;
  death_lunar_day: number | null;
  is_deceased: boolean;
  is_in_law: boolean;
  birth_order: number | null;
  generation: number | null;
  other_names: string | null;
  avatar_url: string | null;
  note: string | null;
}

interface RelationshipRow {
  type: "marriage" | "biological_child" | "adopted_child";
  person_a: string;
  person_b: string;
}

interface BackupPayload {
  version: number;
  timestamp: string;
  persons: PersonRow[];
  relationships: RelationshipRow[];
}

function loadPayload(inputPath: string): BackupPayload {
  const raw = readFileSync(inputPath, "utf-8");
  const json = JSON.parse(raw) as BackupPayload;
  if (json.version !== 2) {
    throw new Error(`Chưa hỗ trợ version=${json.version} (cần 2)`);
  }
  return json;
}

// ─── Seed logic ───────────────────────────────────────────────────────────────

async function main() {
  const { input, dryRun, reset } = parseArgs(process.argv.slice(2));
  const payload = loadPayload(input);

  console.log(`📄 File:        ${input}`);
  console.log(`   Người:       ${payload.persons.length}`);
  console.log(`   Quan hệ:     ${payload.relationships.length}`);
  console.log(`   Timestamp:   ${payload.timestamp}`);
  console.log(`   Chế độ:      ${dryRun ? "DRY-RUN (không ghi DB)" : reset ? "RESET + UPDATE" : "UPSERT thêm mới"}`);

  if (dryRun) {
    console.log("\n✅ Không có gửi gì lên DB (--dry-run). Done.");
    return;
  }

  if (reset) {
    console.log("\n🗑  Đang xoá toàn bộ dữ liệu cũ (persons, relationships)...");
    // Xoá theo thứ tự FK (relationships trước, persons sau)
    await db.delete(relationships);
    await db.delete(persons);
    console.log("   ✓ Đã xoá sạch dữ liệu cũ.");
  }

  // ── Bước 1: nạp persons ─────────────────────────────────────────────────
  console.log("\n⏳ Đang nạp persons...");
  let insertedPersons = 0;
  const CHUNK = 100;

  for (let i = 0; i < payload.persons.length; i += CHUNK) {
    const chunk = payload.persons.slice(i, i + CHUNK);
    await db
      .insert(persons)
      .values(
        chunk.map((p) => ({
          id: p.id,
          fullName: p.full_name,
          gender: p.gender,
          birthYear: p.birth_year,
          birthMonth: p.birth_month,
          birthDay: p.birth_day,
          deathYear: p.death_year,
          deathMonth: p.death_month,
          deathDay: p.death_day,
          deathLunarYear: p.death_lunar_year,
          deathLunarMonth: p.death_lunar_month,
          deathLunarDay: p.death_lunar_day,
          isDeceased: p.is_deceased,
          isInLaw: p.is_in_law,
          birthOrder: p.birth_order,
          generation: p.generation,
          otherNames: p.other_names,
          avatarUrl: p.avatar_url,
          note: p.note,
        })),
      )
      .onConflictDoNothing();
    insertedPersons += chunk.length;
  }
  console.log(`   ✓ Đã ghi nhận ${insertedPersons} persons (đã tồn tại sẽ bỏ qua).`);

  // ── Bước 2: nạp relationships ───────────────────────────────────────────
  console.log("⏳ Đang nạp relationships...");
  // Bỏ các quan hệ trùng lặp (cùng type + cặp id CÓ HƯỚNG cha→con, vợ→chồng)
  const seenRels = new Set<string>();
  const uniqueRels = payload.relationships.filter((r) => {
    const key = `${r.type}|${r.person_a}|${r.person_b}`;
    if (seenRels.has(key)) return false;
    seenRels.add(key);
    return true;
  });

  let insertedRels = 0;
  for (let i = 0; i < uniqueRels.length; i += CHUNK) {
    const chunk = uniqueRels.slice(i, i + CHUNK);
    await db
      .insert(relationships)
      .values(
        chunk.map((r) => ({
          type: r.type,
          personA: r.person_a,
          personB: r.person_b,
        })),
      )
      .onConflictDoNothing();
    insertedRels += chunk.length;
  }
  console.log(`   ✓ Đã ghi nhận ${insertedRels} relationships.`);

  console.log("\n🎉 Hoàn tất!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Lỗi khi seed:", err);
    process.exit(1);
  });

