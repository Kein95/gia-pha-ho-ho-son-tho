"use client";

import {
  getPersonRelationships,
  getChildrenMarriages,
  searchPersons,
  getRecentPersons,
  addRelationship,
  deleteRelationship,
  updateRelationship,
  createPersonWithRelationship,
} from "@/app/actions/relationship";
import { DashboardContext, useDashboard } from "@/components/DashboardContext";
import { Person, RelationshipType } from "@/types";
import { formatDisplayDate } from "@/utils/dateHelpers";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useContext, useEffect, useState } from "react";
import DefaultAvatar from "./DefaultAvatar";

interface RelationshipManagerProps {
  personId: string;
  isAdmin: boolean;
  canEdit?: boolean;
  personGender: string;
}

interface EnrichedRelationship {
  id: string;
  type: RelationshipType;
  direction: "parent" | "child" | "spouse" | "child_in_law";
  targetPerson: Person;
  note: string | null;
}

export default function RelationshipManager({
  personId,
  isAdmin,
  canEdit = false,
  personGender,
}: RelationshipManagerProps) {
  const dashboardContext = useContext(DashboardContext);
  const { setMemberModalId } = useDashboard();
  const router = useRouter();

  const handlePersonClick = (id: string) => {
    if (dashboardContext !== undefined) {
      setMemberModalId(id);
    } else {
      router.push(`/dashboard/members/${id}`);
    }
  };

  const [relationships, setRelationships] = useState<EnrichedRelationship[]>([]);
  const [loading, setLoading] = useState(true);

  // Add relationship state
  const [isAdding, setIsAdding] = useState(false);
  const [newRelType, setNewRelType] = useState<RelationshipType>("biological_child");
  const [newRelDirection, setNewRelDirection] = useState<"parent" | "child" | "spouse">("parent");
  const [newRelNote, setNewRelNote] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [recentMembers, setRecentMembers] = useState<Person[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit relationship state
  const [editingRel, setEditingRel] = useState<{
    id: string;
    type: RelationshipType;
    note: string;
  } | null>(null);

  // Bulk add state
  const [isAddingBulk, setIsAddingBulk] = useState(false);
  const [selectedSpouseId, setSelectedSpouseId] = useState<string>("");
  const [bulkChildren, setBulkChildren] = useState<
    { name: string; gender: "male" | "female" | "other"; birthYear: string; isProcessing: boolean }[]
  >([{ name: "", gender: "male", birthYear: "", isProcessing: false }]);

  // Quick add spouse state
  const [isAddingSpouse, setIsAddingSpouse] = useState(false);
  const [newSpouseName, setNewSpouseName] = useState("");
  const [newSpouseBirthYear, setNewSpouseBirthYear] = useState("");
  const [newSpouseNote, setNewSpouseNote] = useState("");

  // ─── Fetch relationships ───────────────────────────────────────────────────

  const fetchRelationships = useCallback(async () => {
    try {
      const { relsAsA, relsAsB } = await getPersonRelationships(personId);
      const formattedRels: EnrichedRelationship[] = [];

      // Rels where I am Person A
      relsAsA.forEach((r) => {
        const direction: "parent" | "child" | "spouse" =
          r.type === "marriage" ? "spouse" : "child"; // A is Parent, B is Child
        formattedRels.push({
          id: r.id,
          type: r.type as RelationshipType,
          direction,
          targetPerson: r.target as Person,
          note: r.note,
        });
      });

      // Rels where I am Person B
      relsAsB.forEach((r) => {
        const direction: "parent" | "child" | "spouse" =
          r.type === "marriage" ? "spouse" : "parent"; // B is Child, A is Parent
        formattedRels.push({
          id: r.id,
          type: r.type as RelationshipType,
          direction,
          targetPerson: r.target as Person,
          note: r.note,
        });
      });

      // Fetch in-laws (spouses of children)
      const childrenIds = formattedRels
        .filter((r) => r.direction === "child")
        .map((r) => r.targetPerson.id);

      if (childrenIds.length > 0) {
        const childrenMarriages = await getChildrenMarriages(childrenIds);
        childrenMarriages.forEach((m) => {
          const isAChild = childrenIds.includes(m.person_a);
          const childPerson = isAChild ? m.person_a_data : m.person_b_data;
          const spousePerson = isAChild ? m.person_b_data : m.person_a_data;

          if (spousePerson && childPerson) {
            const spouseGender = (spousePerson as Person).gender;
            let noteLabel = `Vợ/chồng của ${(childPerson as Person).full_name}`;
            if (spouseGender === "female")
              noteLabel = `Con dâu (vợ của ${(childPerson as Person).full_name})`;
            if (spouseGender === "male")
              noteLabel = `Con rể (chồng của ${(childPerson as Person).full_name})`;
            if (m.note) noteLabel += ` - ${m.note}`;

            formattedRels.push({
              id: m.id + "_inlaw",
              type: "marriage",
              direction: "child_in_law",
              targetPerson: spousePerson as Person,
              note: noteLabel,
            });
          }
        });
      }

      setRelationships(formattedRels);
    } catch (err) {
      console.error("Error fetching relationships:", err);
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => { fetchRelationships(); }, [fetchRelationships]);

  // ─── Search ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (searchTerm.length < 2) { setSearchResults([]); return; }
      const results = await searchPersons(searchTerm, personId);
      setSearchResults(results);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm, personId]);

  // Recent members when opening Add form
  useEffect(() => {
    if (isAdding && recentMembers.length === 0) {
      getRecentPersons(personId).then(setRecentMembers).catch(console.error);
    }
  }, [isAdding, personId, recentMembers.length]);

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const handleAddRelationship = async () => {
    if (!selectedTargetId) return;
    setProcessing(true);
    setError(null);

    try {
      let personA = personId;
      let personB = selectedTargetId;

      if (newRelDirection === "parent") {
        // Target is Parent (A), I am Child (B)
        personA = selectedTargetId;
        personB = personId;
      } else if (newRelDirection === "child") {
        // I am Parent (A), Target is Child (B)
        personA = personId;
        personB = selectedTargetId;
      }

      const type: RelationshipType =
        newRelDirection === "spouse" ? "marriage" : newRelType;

      const result = await addRelationship({
        personA,
        personB,
        type,
        note: newRelNote || null,
      });

      if (result && "error" in result) throw new Error(result.error);

      setIsAdding(false);
      setSearchTerm("");
      setSelectedTargetId(null);
      setNewRelNote("");
      fetchRelationships();
      router.refresh();
    } catch (err) {
      setError("Không thể thêm mối quan hệ: " + (err as Error).message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkAdd = async () => {
    const validChildren = bulkChildren.filter((c) => c.name.trim() !== "");
    if (validChildren.length === 0) {
      setError("Vui lòng nhập ít nhất tên của 1 người con.");
      setTimeout(() => setError(null), 5000);
      return;
    }

    setProcessing(true);
    setError(null);
    let successCount = 0;

    for (const child of validChildren) {
      const birthYear = child.birthYear.trim() !== "" ? parseInt(child.birthYear) : null;
      const result = await createPersonWithRelationship({
        fullName: child.name.trim(),
        gender: child.gender,
        birthYear: birthYear && !isNaN(birthYear) ? birthYear : null,
        existingPersonId: personId,
        existingIsA: true, // I (existing person) am the parent (A), new child is B
        type: "biological_child",
        secondParentId:
          selectedSpouseId && selectedSpouseId !== "unknown" ? selectedSpouseId : null,
      });

      if (result && "error" in result) {
        console.error("Error inserting child:", child.name, result.error);
        continue;
      }
      successCount++;
    }

    if (successCount === validChildren.length) {
      setIsAddingBulk(false);
      setBulkChildren([{ name: "", gender: "male", birthYear: "", isProcessing: false }]);
      setSelectedSpouseId("");
    } else {
      setError(`Đã xảy ra lỗi. Chỉ lưu thành công ${successCount}/${validChildren.length} người.`);
      setTimeout(() => setError(null), 5000);
    }
    setProcessing(false);
    fetchRelationships();
    router.refresh();
  };

  const handleQuickAddSpouse = async () => {
    if (!newSpouseName.trim()) {
      setError("Vui lòng nhập tên Vợ/Chồng.");
      setTimeout(() => setError(null), 5000);
      return;
    }

    setProcessing(true);
    setError(null);

    const newSpouseGender =
      personGender === "male" ? "female" : personGender === "female" ? "male" : "female";

    const birthYear = newSpouseBirthYear.trim() !== "" ? parseInt(newSpouseBirthYear) : null;

    const result = await createPersonWithRelationship({
      fullName: newSpouseName.trim(),
      gender: newSpouseGender,
      birthYear: birthYear && !isNaN(birthYear) ? birthYear : null,
      existingPersonId: personId,
      existingIsA: true,
      type: "marriage",
      note: newSpouseNote.trim() || null,
    });

    if (result && "error" in result) {
      setError("Không thể thêm vợ/chồng: " + result.error);
      setTimeout(() => setError(null), 5000);
    } else {
      setIsAddingSpouse(false);
      setNewSpouseName("");
      setNewSpouseBirthYear("");
      setNewSpouseNote("");
      fetchRelationships();
      router.refresh();
    }
    setProcessing(false);
  };

  const handleDelete = async (relId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa mối quan hệ này?")) return;
    const result = await deleteRelationship(relId);
    if (result && "error" in result) {
      setError("Không thể xóa: " + result.error);
      setTimeout(() => setError(null), 5000);
    } else {
      fetchRelationships();
      router.refresh();
    }
  };

  const handleUpdateRelationship = async () => {
    if (!editingRel) return;
    setProcessing(true);
    setError(null);

    const result = await updateRelationship({
      relId: editingRel.id,
      type: editingRel.type,
      note: editingRel.note.trim() || null,
    });

    if (result && "error" in result) {
      setError("Không thể sửa mối quan hệ: " + result.error);
      setTimeout(() => setError(null), 5000);
    } else {
      setEditingRel(null);
      fetchRelationships();
      router.refresh();
    }
    setProcessing(false);
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const groupByType = (type: string) =>
    relationships
      .filter((r) => r.direction === type)
      .sort((a, b) => {
        const yearA = a.targetPerson.birth_year;
        const yearB = b.targetPerson.birth_year;
        if (yearA == null && yearB == null) return 0;
        if (yearA == null) return 1;
        if (yearB == null) return -1;
        return yearA - yearB;
      });

  if (loading)
    return <div className="text-stone-500 text-sm">Đang tải thông tin gia đình...</div>;

  return (
    <div className="space-y-6">
      {/* Relationship list sections */}
      {["parent", "spouse", "child", "child_in_law"].map((group) => {
        const items = groupByType(group);
        let title = "";
        if (group === "parent") title = "Bố / Mẹ";
        if (group === "spouse") title = "Vợ / Chồng";
        if (group === "child") title = "Con cái";
        if (group === "child_in_law") title = "Con dâu / Con rể";

        if (items.length === 0 && !isAdmin) return null;

        return (
          <div key={group} className="border-b border-stone-100 pb-4 last:border-0">
            <h4 className="font-bold text-stone-700 mb-3 flex justify-between items-center text-sm uppercase tracking-wide">
              {title}
            </h4>
            {items.length > 0 ? (
              <ul className="space-y-3">
                {items.map((rel) => (
                  <li key={rel.id} className="flex items-center justify-between group">
                    <button
                      onClick={() => handlePersonClick(rel.targetPerson.id)}
                      className="flex items-center gap-3 hover:bg-stone-100 p-2.5 -mx-2.5 rounded-xl transition-all duration-200 flex-1 text-left"
                    >
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-xs text-white overflow-hidden
                          ${rel.targetPerson.gender === "male" ? "bg-sky-700" : rel.targetPerson.gender === "female" ? "bg-rose-700" : "bg-stone-500"}`}
                      >
                        {rel.targetPerson.avatar_url ? (
                          <Image
                            unoptimized
                            src={rel.targetPerson.avatar_url}
                            alt={rel.targetPerson.full_name}
                            className="h-full w-full object-cover"
                            width={32}
                            height={32}
                          />
                        ) : (
                          <DefaultAvatar gender={rel.targetPerson.gender} />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-stone-900 font-medium text-sm">
                          {rel.targetPerson.full_name}
                        </span>
                        {rel.note && (
                          <span className="text-xs text-amber-600 font-medium italic mt-0.5">
                            ({rel.note})
                          </span>
                        )}
                        {rel.type === "adopted_child" && (
                          <span className="text-xs text-stone-400 italic mt-0.5">(Con nuôi)</span>
                        )}
                      </div>
                    </button>
                    {canEdit && rel.direction !== "child_in_law" && (
                      <>
                        <button
                          onClick={() =>
                            setEditingRel({
                              id: rel.id,
                              type: rel.type,
                              note: rel.note ?? "",
                            })
                          }
                          className="text-stone-300 hover:text-amber-500 hover:bg-amber-50 p-2 sm:p-2.5 rounded-lg transition-colors flex items-center justify-center"
                          title="Sửa mối quan hệ"
                          aria-label="Sửa mối quan hệ"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(rel.id)}
                          className="text-stone-300 hover:text-red-500 hover:bg-red-50 p-2 sm:p-2.5 rounded-lg transition-colors flex items-center justify-center ml-1"
                          title="Xóa mối quan hệ"
                          aria-label="Xóa mối quan hệ"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            <line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" />
                          </svg>
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-stone-400 italic">Chưa có thông tin.</p>
            )}
          </div>
        );
      })}

      {/* Edit relationship form */}
      {canEdit && editingRel && (
        <div className="mt-4 bg-amber-50/50 p-4 sm:p-5 rounded-xl border border-amber-200 shadow-sm">
          <h4 className="font-bold text-amber-800 mb-3 text-sm">Sửa Mối Quan Hệ</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-amber-700 mb-1">Loại quan hệ</label>
              <select
                value={editingRel.type}
                onChange={(e) => setEditingRel({ ...editingRel, type: e.target.value as RelationshipType })}
                className="bg-white text-stone-900 block w-full text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 sm:p-2.5 border transition-colors"
              >
                <option value="marriage">Vợ / Chồng</option>
                <option value="biological_child">Con ruột</option>
                <option value="adopted_child">Con nuôi</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-amber-700 mb-1">Ghi chú (tuỳ chọn)</label>
              <input
                type="text"
                placeholder="VD: Vợ cả, Vợ hai..."
                value={editingRel.note}
                onChange={(e) => setEditingRel({ ...editingRel, note: e.target.value })}
                className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 sm:p-2.5 border transition-colors"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleUpdateRelationship}
                disabled={processing}
                className="flex-1 bg-amber-700 text-white py-2 sm:py-2.5 rounded-md sm:rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50 transition-colors"
              >
                {processing ? "Đang lưu..." : "Lưu"}
              </button>
              <button
                onClick={() => setEditingRel(null)}
                className="px-4 py-2 sm:py-2.5 bg-white border border-stone-300 text-stone-700 rounded-md sm:rounded-lg text-sm hover:bg-stone-50 transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add buttons */}
      {canEdit && !isAdding && !isAddingBulk && !isAddingSpouse && !editingRel && (
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <button onClick={() => setIsAdding(true)}
            className="flex-1 py-3 border-2 border-dashed border-stone-200 bg-stone-50/50 hover:bg-stone-50 rounded-xl sm:rounded-2xl text-stone-500 font-medium text-sm hover:border-amber-400 hover:text-amber-700 transition-all duration-200">
            + Thêm Quan Hệ
          </button>
          <button onClick={() => setIsAddingBulk(true)}
            className="flex-1 py-3 border-2 border-dashed border-stone-200 bg-stone-50/50 hover:bg-stone-50 rounded-xl sm:rounded-2xl text-stone-500 font-medium text-sm hover:border-sky-400 hover:text-sky-700 transition-all duration-200">
            + Thêm Con
          </button>
          <button onClick={() => setIsAddingSpouse(true)}
            className="flex-1 py-3 border-2 border-dashed border-stone-200 bg-stone-50/50 hover:bg-stone-50 rounded-xl sm:rounded-2xl text-stone-500 font-medium text-sm hover:border-rose-400 hover:text-rose-700 transition-all duration-200">
            + Thêm Vợ/Chồng
          </button>
        </div>
      )}

      {error && !isAdding && !isAddingBulk && !isAddingSpouse && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 transition-colors p-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Add relationship form */}
      {canEdit && isAdding && (
        <div className="mt-4 bg-stone-50/50 p-4 sm:p-5 rounded-xl border border-stone-200 shadow-sm">
          <h4 className="font-bold text-stone-800 mb-3 text-sm">Thêm Quan Hệ Mới</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Ghi chú mối quan hệ (tuỳ chọn)</label>
              <input type="text" placeholder="VD: Vợ cả, Vợ hai, Chồng trước..." value={newRelNote}
                onChange={(e) => setNewRelNote(e.target.value)}
                className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 sm:p-2.5 border mb-3 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Loại quan hệ</label>
              <select value={newRelDirection}
                onChange={(e) => setNewRelDirection(e.target.value as "parent" | "child" | "spouse")}
                className="bg-white text-stone-900 block w-full text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 sm:p-2.5 border transition-colors">
                <option value="parent">Người này là Con của...</option>
                <option value="spouse">Người này là Vợ/Chồng của...</option>
                <option value="child">Người này là Bố/Mẹ của...</option>
              </select>
            </div>
            {(newRelDirection === "child" || newRelDirection === "parent") && (
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Chi tiết</label>
                <select value={newRelType} onChange={(e) => setNewRelType(e.target.value as RelationshipType)}
                  className="bg-white text-stone-900 block w-full text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 sm:p-2.5 border transition-colors">
                  <option value="biological_child">Con ruột</option>
                  <option value="adopted_child">Con nuôi</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Tìm người thân</label>
              <input type="text" placeholder="Nhập tên để tìm..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 sm:p-2.5 border transition-colors" />
              {(searchResults.length > 0 || (searchTerm.length === 0 && !selectedTargetId && recentMembers.length > 0)) && (
                <div className="mt-2 bg-white border border-stone-200 rounded-md shadow-lg max-h-[250px] overflow-y-auto">
                  <div className="px-3 py-1.5 bg-stone-100 text-[10px] font-bold text-stone-500 uppercase tracking-wide border-b border-stone-200 sticky top-0 z-10">
                    {searchResults.length > 0 ? "Kết quả tìm kiếm" : "Thành viên vừa thêm gần đây"}
                  </div>
                  {(searchResults.length > 0 ? searchResults : recentMembers).map((p) => (
                    <button key={p.id} onClick={() => { setSelectedTargetId(p.id); setSearchTerm(p.full_name); setSearchResults([]); }}
                      className="px-3 py-2 hover:bg-amber-50 text-sm flex items-center justify-between border-b border-stone-100 last:border-0 w-full">
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center justify-center text-[8px] font-bold size-3 rounded-full text-white shrink-0
                          ${p.gender === "male" ? "bg-sky-500" : p.gender === "female" ? "bg-rose-500" : "bg-stone-400"}`}>
                          {p.gender === "male" ? "♂" : p.gender === "female" ? "♀" : "?"}
                        </span>
                        <span className="font-medium text-stone-800">{p.full_name}</span>
                      </div>
                      <span className="text-[10px] text-stone-400">
                        {formatDisplayDate(p.birth_year, p.birth_month, p.birth_day)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {selectedTargetId && <p className="text-xs text-green-600 mt-1">Đã chọn: {searchTerm}</p>}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleAddRelationship} disabled={!selectedTargetId || processing}
                className="flex-1 bg-amber-700 text-white py-2 sm:py-2.5 rounded-md sm:rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50 transition-colors">
                {processing ? "Đang lưu..." : "Lưu"}
              </button>
              <button onClick={() => { setIsAdding(false); setSelectedTargetId(null); setSearchTerm(""); setNewRelNote(""); }}
                className="px-4 py-2 sm:py-2.5 bg-white border border-stone-300 text-stone-700 rounded-md sm:rounded-lg text-sm hover:bg-stone-50 transition-colors">
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk add children form */}
      {canEdit && isAddingBulk && (
        <div className="mt-4 bg-sky-50/50 p-4 sm:p-5 rounded-xl border border-sky-200 shadow-sm">
          <h4 className="font-bold text-sky-800 mb-3 text-sm">Thêm Nhanh Nhiều Con</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Chọn người mẹ/cha còn lại</label>
              <select value={selectedSpouseId} onChange={(e) => setSelectedSpouseId(e.target.value)}
                className="flex-1 bg-white text-stone-900 text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-2 sm:p-2.5 border transition-colors">
                <option value="unknown">Không rõ (hoặc Vợ/Chồng khác chưa thêm)</option>
                {groupByType("spouse").map((rel) => (
                  <option key={rel.id} value={rel.targetPerson.id}>
                    {rel.targetPerson.full_name} {rel.note ? `(${rel.note})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-stone-500 mb-1">Danh sách các con</label>
              {bulkChildren.map((child, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <span className="text-stone-400 text-xs w-4">{index + 1}.</span>
                  <input type="text" placeholder="Họ và tên..." value={child.name}
                    onChange={(e) => { const nb = [...bulkChildren]; nb[index].name = e.target.value; setBulkChildren(nb); }}
                    className="flex-2 bg-white text-stone-900 placeholder-stone-400 text-sm rounded-md border-stone-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-2 border" />
                  <select value={child.gender}
                    onChange={(e) => { const nb = [...bulkChildren]; nb[index].gender = e.target.value as "male" | "female" | "other"; setBulkChildren(nb); }}
                    className="flex-1 bg-white text-stone-900 text-sm rounded-md border-stone-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-2 border">
                    <option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option>
                  </select>
                  <input type="number" placeholder="Năm sinh" value={child.birthYear}
                    onChange={(e) => { const nb = [...bulkChildren]; nb[index].birthYear = e.target.value; setBulkChildren(nb); }}
                    className="flex-1 bg-white text-stone-900 placeholder-stone-400 text-sm rounded-md border-stone-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-2 border w-24" />
                  <button onClick={() => { const nb = bulkChildren.filter((_, i) => i !== index); setBulkChildren(nb.length === 0 ? [{ name: "", gender: "male", birthYear: "", isProcessing: false }] : nb); }}
                    className="text-stone-400 hover:text-red-500 p-2">✕</button>
                </div>
              ))}
              <button onClick={() => setBulkChildren([...bulkChildren, { name: "", gender: "male", birthYear: "", isProcessing: false }])}
                className="text-sky-600 text-xs font-semibold hover:text-sky-800 mt-2 px-6">
                + Thêm dòng
              </button>
            </div>
            <div className="flex gap-2 pt-4 border-t border-stone-200">
              <button onClick={handleBulkAdd} disabled={processing || bulkChildren.every((c) => c.name.trim() === "")}
                className="flex-1 bg-sky-600 text-white py-2 sm:py-2.5 rounded-md sm:rounded-lg text-sm font-medium hover:bg-sky-700 disabled:opacity-50 transition-colors">
                {processing ? "Đang lưu..." : "Lưu Tất Cả"}
              </button>
              <button onClick={() => { setIsAddingBulk(false); setBulkChildren([{ name: "", gender: "male", birthYear: "", isProcessing: false }]); setSelectedSpouseId(""); }}
                className="px-4 py-2 sm:py-2.5 bg-white border border-stone-300 text-stone-700 rounded-md sm:rounded-lg text-sm hover:bg-stone-50 transition-colors">
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick add spouse form */}
      {canEdit && isAddingSpouse && (
        <div className="mt-4 bg-rose-50/50 p-4 sm:p-5 rounded-xl border border-rose-200 shadow-sm">
          <h4 className="font-bold text-rose-800 mb-3 text-sm">Thêm Nhanh Vợ/Chồng</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-rose-700 mb-1">Họ và Tên *</label>
              <input type="text" placeholder="Nhập họ và tên..." value={newSpouseName}
                onChange={(e) => setNewSpouseName(e.target.value)}
                className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 sm:p-2.5 border transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-rose-700 mb-1">Năm sinh (Tuỳ chọn)</label>
              <input type="number" placeholder="VD: 1980" value={newSpouseBirthYear}
                onChange={(e) => setNewSpouseBirthYear(e.target.value)}
                className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 sm:p-2.5 border transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-rose-700 mb-1">Ghi chú mối quan hệ (Ví dụ: Vợ cả, Chồng thứ...)</label>
              <input type="text" placeholder="Tuỳ chọn..." value={newSpouseNote}
                onChange={(e) => setNewSpouseNote(e.target.value)}
                className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 sm:p-2.5 border transition-colors" />
            </div>
            <p className="text-xs text-stone-500 italic mt-1">
              * Giới tính sẽ tự động gán là{" "}
              {personGender === "male" ? "Nữ" : personGender === "female" ? "Nam" : "Nữ"}{" "}
              (dựa theo giới tính người hiện tại).
            </p>
            <div className="flex gap-2 pt-2">
              <button onClick={handleQuickAddSpouse} disabled={!newSpouseName.trim() || processing}
                className="flex-1 bg-rose-600 text-white py-2 sm:py-2.5 rounded-md sm:rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors">
                {processing ? "Đang lưu..." : "Lưu"}
              </button>
              <button onClick={() => { setIsAddingSpouse(false); setNewSpouseName(""); setNewSpouseBirthYear(""); setNewSpouseNote(""); }}
                className="px-4 py-2 sm:py-2.5 bg-white border border-stone-300 text-stone-700 rounded-md sm:rounded-lg text-sm hover:bg-stone-50 transition-colors">
                Hủy
              </button>
            </div>
            {error && (
              <div className="mt-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
