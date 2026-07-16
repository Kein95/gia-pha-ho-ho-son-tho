"use server";

import { db } from "@/lib/db";
import { persons, relationships, personDetailsPrivate } from "@/lib/db/schema";
import {
  requireEditor,
  requireAdmin,
  getCurrentUser,
  canSeeSensitive,
} from "@/lib/auth/permissions";
import { sanitizePerson } from "@/lib/person-visibility";
import { eq, ilike, ne, desc, or, and, inArray, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Person } from "@/types";

// ─── Read helpers ─────────────────────────────────────────────────────────────

/** Fetch all relationships for a person (both sides) with target person data joined */
export async function getPersonRelationships(personId: string) {
  // Alias tables for self-join
  const personsA = persons;
  const personsB = persons;

  // Rels where this person is A → target is B
  const relsAsA = await db
    .select({
      id: relationships.id,
      type: relationships.type,
      note: relationships.note,
      target: {
        id: personsB.id,
        full_name: personsB.fullName,
        gender: personsB.gender,
        birth_year: personsB.birthYear,
        birth_month: personsB.birthMonth,
        birth_day: personsB.birthDay,
        death_year: personsB.deathYear,
        death_month: personsB.deathMonth,
        death_day: personsB.deathDay,
        death_lunar_year: personsB.deathLunarYear,
        death_lunar_month: personsB.deathLunarMonth,
        death_lunar_day: personsB.deathLunarDay,
        is_deceased: personsB.isDeceased,
        is_in_law: personsB.isInLaw,
        birth_order: personsB.birthOrder,
        generation: personsB.generation,
        other_names: personsB.otherNames,
        avatar_url: personsB.avatarUrl,
        note: personsB.note,
        created_at: personsB.createdAt,
        updated_at: personsB.updatedAt,
      },
    })
    .from(relationships)
    .innerJoin(personsB, eq(relationships.personB, personsB.id))
    .where(eq(relationships.personA, personId));

  // Rels where this person is B → target is A
  const relsAsB = await db
    .select({
      id: relationships.id,
      type: relationships.type,
      note: relationships.note,
      target: {
        id: personsA.id,
        full_name: personsA.fullName,
        gender: personsA.gender,
        birth_year: personsA.birthYear,
        birth_month: personsA.birthMonth,
        birth_day: personsA.birthDay,
        death_year: personsA.deathYear,
        death_month: personsA.deathMonth,
        death_day: personsA.deathDay,
        death_lunar_year: personsA.deathLunarYear,
        death_lunar_month: personsA.deathLunarMonth,
        death_lunar_day: personsA.deathLunarDay,
        is_deceased: personsA.isDeceased,
        is_in_law: personsA.isInLaw,
        birth_order: personsA.birthOrder,
        generation: personsA.generation,
        other_names: personsA.otherNames,
        avatar_url: personsA.avatarUrl,
        note: personsA.note,
        created_at: personsA.createdAt,
        updated_at: personsA.updatedAt,
      },
    })
    .from(relationships)
    .innerJoin(personsA, eq(relationships.personA, personsA.id))
    .where(eq(relationships.personB, personId));

  const toIso = (d: Date | string | null | undefined) =>
    d instanceof Date ? d.toISOString() : (d ?? null);

  const canSee = await canSeeSensitive();
  const mapTarget = (t: (typeof relsAsA)[number]["target"]) =>
    sanitizePerson(
      {
        ...t,
        created_at: toIso(t.created_at),
        updated_at: toIso(t.updated_at),
      } as Person,
      canSee,
    );

  return {
    relsAsA: relsAsA.map((r) => ({ ...r, target: mapTarget(r.target) })),
    relsAsB: relsAsB.map((r) => ({ ...r, target: mapTarget(r.target) })),
  };
}

/** Fetch marriages of a list of children for child_in_law display */
export async function getChildrenMarriages(childrenIds: string[]) {
  if (childrenIds.length === 0) return [];

  // We need both sides joined — fetch raw rows then resolve person data separately
  const rawMarriages = await db
    .select()
    .from(relationships)
    .where(
      and(
        eq(relationships.type, "marriage"),
        or(
          inArray(relationships.personA, childrenIds),
          inArray(relationships.personB, childrenIds),
        ),
      ),
    );

  if (rawMarriages.length === 0) return [];

  // Collect all person IDs referenced
  const allIds = new Set<string>();
  rawMarriages.forEach((r) => {
    allIds.add(r.personA);
    allIds.add(r.personB);
  });

  const personRows = await db
    .select()
    .from(persons)
    .where(inArray(persons.id, Array.from(allIds)));

  const personMap = new Map(personRows.map((p) => [p.id, p]));
  const canSee = await canSeeSensitive();

  return rawMarriages.map((r) => {
    const aRow = personMap.get(r.personA);
    const bRow = personMap.get(r.personB);
    return {
      id: r.id,
      type: r.type,
      note: r.note,
      person_a: r.personA,
      person_b: r.personB,
      person_a_data: aRow ? sanitizePerson(mapPersonRow(aRow), canSee) : null,
      person_b_data: bRow ? sanitizePerson(mapPersonRow(bRow), canSee) : null,
    };
  });
}

/** Search persons by name (excluding self) */
export async function searchPersons(
  searchTerm: string,
  excludeId: string,
): Promise<Person[]> {
  if (searchTerm.length < 2) return [];
  const rows = await db
    .select()
    .from(persons)
    .where(
      and(
        ilike(persons.fullName, `%${searchTerm}%`),
        ne(persons.id, excludeId),
      ),
    )
    .limit(5);

  const canSee = await canSeeSensitive();
  return rows.map((r) => sanitizePerson(mapPersonRow(r), canSee));
}

/** Fetch recently created persons (excluding self) */
export async function getRecentPersons(excludeId: string): Promise<Person[]> {
  const rows = await db
    .select()
    .from(persons)
    .where(ne(persons.id, excludeId))
    .orderBy(desc(persons.createdAt))
    .limit(10);
  const canSee = await canSeeSensitive();
  return rows.map((r) => sanitizePerson(mapPersonRow(r), canSee));
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function addRelationship(input: {
  personA: string;
  personB: string;
  type: "marriage" | "biological_child" | "adopted_child";
  note?: string | null;
}) {
  await requireEditor();
  try {
    await db.insert(relationships).values({
      personA: input.personA,
      personB: input.personB,
      type: input.type,
      note: input.note ?? null,
    });
    revalidatePath("/dashboard/members");
    return { success: true };
  } catch (e) {
    console.error("Error adding relationship:", e);
    return { error: "Không thể thêm mối quan hệ: " + (e as Error).message };
  }
}

export async function deleteRelationship(relId: string) {
  await requireEditor();
  try {
    await db.delete(relationships).where(eq(relationships.id, relId));
    revalidatePath("/dashboard/members");
    return { success: true };
  } catch (e) {
    console.error("Error deleting relationship:", e);
    return { error: "Không thể xóa mối quan hệ: " + (e as Error).message };
  }
}

/** Create a new person then link via relationship — used by quick-add spouse and bulk-add children */
export async function createPersonWithRelationship(input: {
  fullName: string;
  gender: "male" | "female" | "other";
  birthYear?: number | null;
  /** The existing person this new person links to */
  existingPersonId: string;
  /** true = existing person is personA, new person is personB */
  existingIsA: boolean;
  type: "marriage" | "biological_child" | "adopted_child";
  note?: string | null;
  /** Optional second parent for bulk-add child */
  secondParentId?: string | null;
}) {
  await requireEditor();
  try {
    const [newPerson] = await db
      .insert(persons)
      .values({
        fullName: input.fullName.trim(),
        gender: input.gender,
        birthYear: input.birthYear ?? null,
      })
      .returning({ id: persons.id });

    if (!newPerson) throw new Error("Không tạo được thành viên mới.");

    const newId = newPerson.id;
    const pA = input.existingIsA ? input.existingPersonId : newId;
    const pB = input.existingIsA ? newId : input.existingPersonId;

    await db.insert(relationships).values({
      personA: pA,
      personB: pB,
      type: input.type,
      note: input.note ?? null,
    });

    if (input.secondParentId && input.type !== "marriage") {
      await db.insert(relationships).values({
        personA: input.secondParentId,
        personB: newId,
        type: input.type,
      });
    }

    revalidatePath("/dashboard/members");
    return { success: true, newPersonId: newId };
  } catch (e) {
    console.error("Error in createPersonWithRelationship:", e);
    return { error: (e as Error).message };
  }
}

// ─── Person CRUD ──────────────────────────────────────────────────────────────

export async function upsertPerson(input: {
  id?: string;
  fullName: string;
  gender: "male" | "female" | "other";
  birthYear?: number | null;
  birthMonth?: number | null;
  birthDay?: number | null;
  deathYear?: number | null;
  deathMonth?: number | null;
  deathDay?: number | null;
  deathLunarYear?: number | null;
  deathLunarMonth?: number | null;
  deathLunarDay?: number | null;
  isDeceased: boolean;
  isInLaw: boolean;
  birthOrder?: number | null;
  generation?: number | null;
  otherNames?: string | null;
  avatarUrl?: string | null;
  note?: string | null;
  phoneNumber?: string | null;
  occupation?: string | null;
  currentResidence?: string | null;
}) {
  await requireEditor();

  const { id, phoneNumber, occupation, currentResidence, ...personFields } =
    input;

  try {
    let personId: string;

    if (id) {
      await db.update(persons).set(personFields).where(eq(persons.id, id));
      personId = id;
    } else {
      const [created] = await db
        .insert(persons)
        .values(personFields)
        .returning({ id: persons.id });
      if (!created) throw new Error("Không tạo được hồ sơ.");
      personId = created.id;
    }

    // Upsert private data for admins
    const hasPrivate =
      phoneNumber !== undefined ||
      occupation !== undefined ||
      currentResidence !== undefined;

    if (hasPrivate) {
      const user = await getCurrentUser();
      if (user?.role === "admin") {
        await db
          .insert(personDetailsPrivate)
          .values({
            personId,
            phoneNumber: phoneNumber ?? null,
            occupation: occupation ?? null,
            currentResidence: currentResidence ?? null,
          })
          .onConflictDoUpdate({
            target: personDetailsPrivate.personId,
            set: {
              phoneNumber: phoneNumber ?? null,
              occupation: occupation ?? null,
              currentResidence: currentResidence ?? null,
            },
          });
      }
    }

    revalidatePath("/dashboard/members");
    revalidatePath(`/dashboard/members/${personId}`);
    return { success: true, personId };
  } catch (e) {
    console.error("Error upserting person:", e);
    return { error: (e as Error).message ?? "Không thể lưu hồ sơ thành viên." };
  }
}

/** Apply computed generation + birth_order bulk updates */
export async function applyLineageUpdates(
  updates: {
    id: string;
    generation: number | null;
    birthOrder: number | null;
  }[],
) {
  await requireAdmin();
  try {
    const CHUNK = 20;
    for (let i = 0; i < updates.length; i += CHUNK) {
      const chunk = updates.slice(i, i + CHUNK);
      await Promise.all(
        chunk.map((u) =>
          db
            .update(persons)
            .set({ generation: u.generation, birthOrder: u.birthOrder })
            .where(eq(persons.id, u.id)),
        ),
      );
    }
    revalidatePath("/dashboard/lineage");
    revalidatePath("/dashboard/members");
    return { success: true };
  } catch (e) {
    console.error("Error applying lineage updates:", e);
    return { error: (e as Error).message ?? "Lỗi khi cập nhật dữ liệu." };
  }
}

/** Fetch a single person by ID */
export async function getPersonById(id: string): Promise<Person | null> {
  const [row] = await db
    .select()
    .from(persons)
    .where(eq(persons.id, id))
    .limit(1);
  if (!row) return null;
  return sanitizePerson(mapPersonRow(row), await canSeeSensitive());
}

/** Fetch private details for a person (admin only) */
export async function getPersonPrivateDetails(personId: string) {
  await requireAdmin();
  const [data] = await db
    .select()
    .from(personDetailsPrivate)
    .where(eq(personDetailsPrivate.personId, personId))
    .limit(1);
  return data ?? null;
}

// ─── Custom events ────────────────────────────────────────────────────────────

import { customEvents } from "@/lib/db/schema";

export async function upsertCustomEvent(input: {
  id?: string;
  name: string;
  eventDate: string;
  location?: string | null;
  content?: string | null;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Không có quyền truy cập.");

  try {
    if (input.id) {
      // Allow update only if owner or admin
      const [existing] = await db
        .select({ createdBy: customEvents.createdBy })
        .from(customEvents)
        .where(eq(customEvents.id, input.id))
        .limit(1);

      if (existing?.createdBy !== user.id && user.role !== "admin") {
        return { error: "Bạn không có quyền chỉnh sửa sự kiện này." };
      }

      await db
        .update(customEvents)
        .set({
          name: input.name,
          eventDate: input.eventDate,
          location: input.location ?? null,
          content: input.content ?? null,
        })
        .where(eq(customEvents.id, input.id));
    } else {
      await db.insert(customEvents).values({
        name: input.name,
        eventDate: input.eventDate,
        location: input.location ?? null,
        content: input.content ?? null,
        createdBy: user.id,
      });
    }

    revalidatePath("/dashboard/events");
    return { success: true };
  } catch (e) {
    console.error("Error upserting custom event:", e);
    return { error: (e as Error).message ?? "Đã xảy ra lỗi khi lưu sự kiện." };
  }
}

export async function deleteCustomEvent(eventId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Không có quyền truy cập.");

  try {
    const [existing] = await db
      .select({ createdBy: customEvents.createdBy })
      .from(customEvents)
      .where(eq(customEvents.id, eventId))
      .limit(1);

    if (existing?.createdBy !== user.id && user.role !== "admin") {
      return { error: "Bạn không có quyền xoá sự kiện này." };
    }

    await db.delete(customEvents).where(eq(customEvents.id, eventId));
    revalidatePath("/dashboard/events");
    return { success: true };
  } catch (e) {
    console.error("Error deleting custom event:", e);
    return { error: (e as Error).message ?? "Đã xảy ra lỗi khi xoá sự kiện." };
  }
}

// ─── Internal mapper: Drizzle row → Person (snake_case for UI compat) ─────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPersonRow(p: any): Person {
  return {
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
    created_at:
      p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    updated_at:
      p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
  };
}
