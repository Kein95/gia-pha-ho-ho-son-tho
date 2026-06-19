"use server";

import { db } from "@/lib/db";
import { persons, relationships } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/permissions";
import { Relationship } from "@/types";
import { asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PersonExport {
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
  created_at?: string;
  updated_at?: string;
}

interface RelationshipExport {
  id?: string;
  type: string;
  person_a: string;
  person_b: string;
  created_at?: string;
  updated_at?: string;
}

interface BackupPayload {
  version: number;
  timestamp: string;
  persons: PersonExport[];
  relationships: RelationshipExport[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitizePerson(
  p: PersonExport,
): Omit<PersonExport, "created_at" | "updated_at"> {
  return {
    id: p.id,
    full_name: p.full_name,
    gender: p.gender,
    birth_year: p.birth_year ?? null,
    birth_month: p.birth_month ?? null,
    birth_day: p.birth_day ?? null,
    death_year: p.death_year ?? null,
    death_month: p.death_month ?? null,
    death_day: p.death_day ?? null,
    death_lunar_year: p.death_lunar_year ?? null,
    death_lunar_month: p.death_lunar_month ?? null,
    death_lunar_day: p.death_lunar_day ?? null,
    is_deceased: p.is_deceased ?? false,
    is_in_law: p.is_in_law ?? false,
    birth_order: p.birth_order ?? null,
    generation: p.generation ?? null,
    other_names: p.other_names ?? null,
    avatar_url: p.avatar_url ?? null,
    note: p.note ?? null,
  };
}

function sanitizeRelationship(
  r: RelationshipExport,
): Omit<RelationshipExport, "id" | "created_at" | "updated_at"> {
  return {
    type: r.type,
    person_a: r.person_a,
    person_b: r.person_b,
  };
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportData(
  exportRootId?: string,
): Promise<BackupPayload | { error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Từ chối truy cập. Chỉ admin mới có quyền này." };
  }

  try {
    const allPersonsRaw = await db
      .select()
      .from(persons)
      .orderBy(asc(persons.createdAt));

    const allRelsRaw = await db
      .select()
      .from(relationships)
      .orderBy(asc(relationships.createdAt));

    // Map Drizzle camelCase → snake_case for export format (matches legacy backup schema)
    let exportPersons: PersonExport[] = allPersonsRaw.map((p) => ({
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
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
    }));

    let exportRels: RelationshipExport[] = allRelsRaw.map((r) => ({
      id: r.id,
      type: r.type,
      person_a: r.personA,
      person_b: r.personB,
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
    }));

    // Optional subtree filter
    if (exportRootId && exportPersons.some((p) => p.id === exportRootId)) {
      const includedIds = new Set<string>([exportRootId]);

      const findDescendants = (parentId: string) => {
        exportRels
          .filter(
            (r) =>
              (r.type === "biological_child" || r.type === "adopted_child") &&
              r.person_a === parentId,
          )
          .forEach((r) => {
            if (!includedIds.has(r.person_b)) {
              includedIds.add(r.person_b);
              findDescendants(r.person_b);
            }
          });
      };
      findDescendants(exportRootId);

      // Add spouses of everyone in tree
      Array.from(includedIds).forEach((pid) => {
        exportRels
          .filter(
            (r) =>
              r.type === "marriage" &&
              (r.person_a === pid || r.person_b === pid),
          )
          .forEach((r) => {
            includedIds.add(r.person_a === pid ? r.person_b : r.person_a);
          });
      });

      exportPersons = exportPersons.filter((p) => includedIds.has(p.id));
      exportRels = exportRels.filter(
        (r) => includedIds.has(r.person_a) && includedIds.has(r.person_b),
      );
    }

    return {
      version: 2,
      timestamp: new Date().toISOString(),
      persons: exportPersons,
      relationships: exportRels,
    };
  } catch (e) {
    console.error("Export error:", e);
    return { error: "Lỗi khi xuất dữ liệu: " + (e as Error).message };
  }
}

// ─── Import ───────────────────────────────────────────────────────────────────

export async function importData(importPayload: {
  persons: PersonExport[];
  relationships: Relationship[] | RelationshipExport[];
}) {
  try {
    await requireAdmin();
  } catch {
    return { error: "Từ chối truy cập. Chỉ admin mới có quyền này." };
  }

  if (!importPayload?.persons || !importPayload?.relationships) {
    return { error: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại file JSON." };
  }

  if (importPayload.persons.length === 0) {
    return { error: "File backup trống — không có thành viên nào để phục hồi." };
  }

  try {
    // 1. Delete relationships first (FK constraint)
    await db.delete(relationships);

    // 2. Delete persons
    await db.delete(persons);

    // 3. Insert persons in chunks (Drizzle values() accepts array)
    const CHUNK = 200;
    const sanitizedPersons = importPayload.persons.map(sanitizePerson);

    for (let i = 0; i < sanitizedPersons.length; i += CHUNK) {
      const chunk = sanitizedPersons.slice(i, i + CHUNK);
      // Map snake_case export format → Drizzle camelCase schema fields
      await db.insert(persons).values(
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
      );
    }

    // 4. Insert relationships in chunks
    const sanitizedRels = importPayload.relationships.map(sanitizeRelationship);

    for (let i = 0; i < sanitizedRels.length; i += CHUNK) {
      const chunk = sanitizedRels.slice(i, i + CHUNK);
      await db.insert(relationships).values(
        chunk.map((r) => ({
          type: r.type as "marriage" | "biological_child" | "adopted_child",
          personA: r.person_a,
          personB: r.person_b,
        })),
      );
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/members");
    revalidatePath("/dashboard/data");

    return {
      success: true,
      imported: {
        persons: sanitizedPersons.length,
        relationships: sanitizedRels.length,
      },
    };
  } catch (e) {
    console.error("Import error:", e);
    return { error: "Lỗi khi import dữ liệu: " + (e as Error).message };
  }
}
