"use client";

import MemberDetailContent from "@/components/MemberDetailContent";
import MemberForm from "@/components/MemberForm";
import {
  getPersonById,
  getPersonPrivateDetails,
} from "@/app/actions/relationship";
import { Person } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Edit2,
  ExternalLink,
  GitBranch,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "./DashboardContext";
import { useUser } from "./UserProvider";

export default function MemberDetailModal() {
  const {
    memberModalId: memberId,
    setMemberModalId,
    showCreateMember,
    setShowCreateMember,
    rootId,
    setRootId,
  } = useDashboard();
  const { isAdmin, isEditor: canEdit } = useUser();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [person, setPerson] = useState<Person | null>(null);
  const [privateData, setPrivateData] = useState<Record<
    string,
    unknown
  > | null>(null);

  const closeModal = () => {
    setMemberModalId(null);
    setShowCreateMember(false);
    setIsEditing(false);
  };

  const fetchData = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const personData = await getPersonById(id);
        if (!personData) throw new Error("Không thể tải thông tin thành viên.");
        setPerson(personData);

        if (isAdmin) {
          try {
            const privData = await getPersonPrivateDetails(id);
            setPrivateData(
              privData
                ? {
                    phone_number: privData.phoneNumber,
                    occupation: privData.occupation,
                    current_residence: privData.currentResidence,
                  }
                : {},
            );
          } catch {
            // Non-critical: private data fetch may fail if not admin
            setPrivateData(null);
          }
        } else {
          setPrivateData(null);
        }
      } catch (err) {
        console.error("Error fetching member details:", err);
        setError((err as Error)?.message || "Đã xảy ra lỗi hệ thống.");
      } finally {
        setLoading(false);
      }
    },
    [isAdmin],
  );

  useEffect(() => {
    if (memberId) {
      setIsOpen(true);
      setIsEditing(false);
      fetchData(memberId);
    } else if (showCreateMember) {
      setIsOpen(true);
      setIsEditing(false);
      setPerson(null);
      setPrivateData(null);
      setError(null);
    } else {
      setIsOpen(false);
      setTimeout(() => {
        setPerson(null);
        setPrivateData(null);
        setError(null);
        setIsEditing(false);
      }, 300);
    }
  }, [memberId, showCreateMember, fetchData]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleEditSuccess = (savedPersonId: string) => {
    setIsEditing(false);
    setPerson(null);
    setPrivateData(null);
    fetchData(savedPersonId);
    router.refresh();
  };

  const handleCreateSuccess = (savedPersonId: string) => {
    setShowCreateMember(false);
    setMemberModalId(savedPersonId);
    setTimeout(() => router.refresh(), 100);
  };

  const formInitialData = person
    ? { ...person, ...(privateData ?? {}) }
    : undefined;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-sm"
        >
          {!isEditing && !showCreateMember && (
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={closeModal}
            />
          )}

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="relative bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-stone-200"
          >
            {/* Header actions */}
            <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20 flex items-center gap-2">
              {isEditing ? (
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-stone-100/80 text-stone-700 rounded-full hover:bg-stone-200 font-semibold text-sm shadow-sm border border-stone-200/50 transition-colors"
                >
                  <ArrowLeft className="size-4" />
                  <span className="hidden sm:inline">Quay lại</span>
                </button>
              ) : (
                person && (
                  <>
                    {/* Đổi gốc sơ đồ sang người này — hành vi xem, nên khách
                        chưa đăng nhập cũng dùng được. Ẩn khi đã là gốc. */}
                    {rootId !== person.id && (
                      <button
                        onClick={() => {
                          setRootId(person.id);
                          setMemberModalId(null);
                        }}
                        title="Lấy người này làm gốc sơ đồ"
                        className="flex items-center gap-1.5 px-4 py-2 bg-stone-100/80 text-stone-700 rounded-full hover:bg-stone-200 font-semibold text-sm shadow-sm border border-stone-200/50 transition-colors"
                      >
                        <GitBranch className="size-4" />
                        <span className="hidden sm:inline">Xem nhánh này</span>
                      </button>
                    )}
                    {canEdit && (
                      <>
                        <Link
                          href={`/dashboard/members/${person.id}`}
                          className="flex items-center gap-1.5 px-4 py-2 bg-amber-100/80 text-amber-800 rounded-full hover:bg-amber-200 font-semibold text-sm shadow-sm border border-amber-200/50 transition-colors"
                        >
                          <ExternalLink className="size-4" />
                          <span className="hidden sm:inline">Xem</span>
                        </Link>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-amber-100/80 text-amber-800 rounded-full hover:bg-amber-200 font-semibold text-sm shadow-sm border border-amber-200/50 transition-colors"
                        >
                          <Edit2 className="size-4" />
                          <span className="hidden sm:inline">Chỉnh sửa</span>
                        </button>
                      </>
                    )}
                  </>
                )
              )}
              <button
                onClick={closeModal}
                className="size-10 flex items-center justify-center bg-stone-100/80 text-stone-600 rounded-full hover:bg-stone-200 hover:text-stone-900 shadow-sm border border-stone-200/50 transition-colors"
                aria-label="Đóng"
              >
                <X className="size-5" />
              </button>
            </div>

            {loading ? (
              <div className="flex-1 min-h-[400px] flex items-center justify-center flex-col gap-4">
                <div className="size-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-stone-500 font-medium">Đang tải...</p>
              </div>
            ) : error ? (
              <div className="flex-1 min-h-[400px] flex items-center justify-center flex-col gap-4 p-8 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2 shadow-inner">
                  <AlertCircle className="size-8" />
                </div>
                <p className="text-red-600 font-medium text-lg">{error}</p>
                <button
                  onClick={closeModal}
                  className="mt-2 px-6 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-full transition-colors"
                >
                  Đóng
                </button>
              </div>
            ) : isEditing && formInitialData ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 pt-16 pb-8">
                <h2 className="text-xl font-serif font-bold text-stone-800 mb-6">
                  Chỉnh sửa thành viên
                </h2>
                <MemberForm
                  initialData={
                    formInitialData as Parameters<
                      typeof MemberForm
                    >[0]["initialData"]
                  }
                  isEditing={true}
                  isAdmin={isAdmin}
                  onSuccess={handleEditSuccess}
                  onCancel={() => setIsEditing(false)}
                />
              </div>
            ) : showCreateMember ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 pt-16 pb-8">
                <h2 className="text-xl font-serif font-bold text-stone-800 mb-6">
                  Thêm thành viên mới
                </h2>
                <MemberForm
                  isAdmin={isAdmin}
                  onSuccess={handleCreateSuccess}
                  onCancel={closeModal}
                />
              </div>
            ) : person ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <MemberDetailContent
                  person={person}
                  privateData={privateData}
                  isAdmin={isAdmin}
                  canEdit={canEdit}
                />
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
