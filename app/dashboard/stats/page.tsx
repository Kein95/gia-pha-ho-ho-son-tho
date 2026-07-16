import FamilyStats from "@/components/FamilyStats";
import { db } from "@/lib/db";
import { persons, relationships } from "@/lib/db/schema";
import { canSeeSensitive } from "@/lib/auth/permissions";
import { sanitizePersons } from "@/lib/person-visibility";
import { Person, Relationship } from "@/types";

export const metadata = {
  title: "Thống kê gia phả",
};

export default async function StatsPage() {
  const [personsRows, relsRows] = await Promise.all([
    db.select().from(persons),
    db.select().from(relationships),
  ]);

  // Lọc ngay tại nguồn: không để tồn tại mảng chưa lọc nào ở dưới
  const personsData: Person[] = sanitizePersons(
    personsRows.map((p) => ({
      id: p.id,
      full_name: p.fullName,
      gender: p.gender,
      birth_year: p.birthYear ?? null,
      birth_month: p.birthMonth ?? null,
      birth_day: p.birthDay ?? null,
      death_year: p.deathYear ?? null,
      death_month: p.deathMonth ?? null,
      death_day: p.deathDay ?? null,
      death_lunar_year: p.deathLunarYear ?? null,
      death_lunar_month: p.deathLunarMonth ?? null,
      death_lunar_day: p.deathLunarDay ?? null,
      is_deceased: p.isDeceased,
      is_in_law: p.isInLaw,
      birth_order: p.birthOrder ?? null,
      generation: p.generation ?? null,
      other_names: p.otherNames ?? null,
      avatar_url: p.avatarUrl ?? null,
      note: p.note ?? null,
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
    })),
    await canSeeSensitive(),
  );

  const relationshipsData: Relationship[] = relsRows.map((r) => ({
    id: r.id,
    type: r.type,
    person_a: r.personA,
    person_b: r.personB,
    note: r.note ?? null,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  }));

  return (
    <div className="flex-1 w-full relative flex flex-col pb-12">
      <div className="w-full relative z-20 py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <h1 className="title">Thống kê gia phả</h1>
        <p className="text-stone-500 mt-1 text-sm">
          Tổng quan số liệu về các thành viên trong dòng họ
        </p>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        <FamilyStats persons={personsData} relationships={relationshipsData} />
      </main>
    </div>
  );
}
