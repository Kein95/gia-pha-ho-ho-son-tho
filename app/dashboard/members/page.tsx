import { DashboardProvider } from "@/components/DashboardContext";
import DashboardViews from "@/components/DashboardViews";
import MemberDetailModal from "@/components/MemberDetailModal";
import ViewToggle from "@/components/ViewToggle";
import { db } from "@/lib/db";
import { persons, relationships } from "@/lib/db/schema";
import { getProfile } from "@/lib/auth/queries";
import { canSeeSensitive } from "@/lib/auth/permissions";
import { sanitizePersons } from "@/lib/person-visibility";
import { asc } from "drizzle-orm";
import { Person, Relationship } from "@/types";

interface PageProps {
  searchParams: Promise<{ view?: string; rootId?: string }>;
}

export default async function FamilyTreePage({ searchParams }: PageProps) {
  const { rootId } = await searchParams;

  const profile = await getProfile();
  const canEdit = profile?.role === "admin" || profile?.role === "editor";

  const [personsRows, relsRows] = await Promise.all([
    db.select().from(persons).orderBy(asc(persons.birthYear)),
    db.select().from(relationships),
  ]);

  // Map Drizzle camelCase → snake_case Person type for UI compatibility
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

  // Determine tree root
  const personsMap = new Map(personsData.map((p) => [p.id, p]));
  const childIds = new Set(
    relationshipsData
      .filter(
        (r) => r.type === "biological_child" || r.type === "adopted_child",
      )
      .map((r) => r.person_b),
  );

  let finalRootId = rootId;
  if (!finalRootId || !personsMap.has(finalRootId)) {
    const roots = personsData.filter((p) => !childIds.has(p.id));
    finalRootId = roots[0]?.id ?? personsData[0]?.id;
  }

  return (
    <DashboardProvider>
      <ViewToggle />
      <DashboardViews
        persons={personsData}
        relationships={relationshipsData}
        canEdit={canEdit}
      />
      <MemberDetailModal />
    </DashboardProvider>
  );
}
