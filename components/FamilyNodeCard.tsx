"use client";

import { Person } from "@/types";
import Image from "next/image";
import { useDashboard } from "./DashboardContext";
import DefaultAvatar from "./DefaultAvatar";

interface FamilyNodeCardProps {
  person: Person;
  isRingVisible?: boolean;
  isPlusVisible?: boolean;
}

export default function FamilyNodeCard({
  person,
  isRingVisible = false,
  isPlusVisible = false,
}: FamilyNodeCardProps) {
  const { showAvatar, setMemberModalId } = useDashboard();

  const nameWords = person.full_name.split(" ");
  const isDeceased = person.is_deceased;
  const birthYear = person.birth_year;
  const deathYear = person.death_lunar_year || person.death_year;

  const genderIcon =
    person.gender === "male" ? "♂" : person.gender === "female" ? "♀" : "⚧";
  const genderColor =
    person.gender === "male"
      ? "text-sky-600"
      : person.gender === "female"
        ? "text-rose-600"
        : "text-stone-500";

  const content = (
    <div
      className={`
        gp-card group py-2 px-1.5 flex flex-col items-center justify-start transition-all duration-300 hover:-translate-y-1 rounded-2xl relative h-full
        ${isDeceased ? "grayscale-[0.4] opacity-80" : ""}
        ${isRingVisible || isPlusVisible ? "gp-card--has-ring" : ""}
        ${showAvatar ? "w-20 sm:w-28 md:w-32 bg-white/70 hover:shadow-xl" : "px-3"}
      `}
    >
      {isRingVisible && (
        <div
          className={`
            gp-ring absolute top-[15%] -left-2.5 sm:-left-3.5 size-5 sm:size-6 rounded-full z-10 flex items-center justify-center text-[10px] sm:text-sm font-medium text-stone-500
            ${showAvatar ? "shadow-sm bg-white" : ""}
          `}
        >
          <span className="leading-none">💍</span>
        </div>
      )}
      {isPlusVisible && (
        <div
          className={`
            gp-ring absolute top-[15%] -left-2.5 sm:-left-3.5 size-5 sm:size-6 rounded-full z-10 flex items-center justify-center text-[10px] sm:text-sm font-medium text-stone-500
            ${showAvatar ? "shadow-sm bg-white" : ""}
          `}
        >
          <span className="leading-none">+</span>
        </div>
      )}

      {/* 1. Avatar */}
      {showAvatar && (
        <div className="gp-avatar relative z-10 mb-1.5 sm:mb-2">
          <div
            className={`
              h-10 w-10 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-full flex items-center justify-center text-[10px] sm:text-xs md:text-sm text-white overflow-hidden shrink-0 shadow-lg ring-2 ring-white transition-transform duration-300 group-hover:scale-105
              ${
                person.gender === "male"
                  ? "bg-linear-to-br from-sky-400 to-sky-700"
                  : person.gender === "female"
                    ? "bg-linear-to-br from-rose-400 to-rose-700"
                    : "bg-linear-to-br from-stone-400 to-stone-600"
              }
            `}
          >
            {person.avatar_url ? (
              <Image
                unoptimized
                src={person.avatar_url}
                alt={person.full_name}
                className="w-full h-full object-cover"
                width={64}
                height={64}
              />
            ) : (
              <DefaultAvatar gender={person.gender} />
            )}
          </div>
        </div>
      )}

      {/* 2. Name */}
      <div className="gp-name flex flex-col items-center justify-center gap-0.5 w-full px-0.5 sm:px-1 relative z-10">
        <div
          className="text-[10px] sm:text-[11px] md:text-xs font-bold text-center leading-tight transition-colors cursor-pointer text-stone-800 group-hover:text-amber-800 max-w-full"
          title={person.full_name}
        >
          {/* Tên luôn tách sẵn từng chữ. Ở chế độ có ảnh chúng nằm liền nhau như
              một dòng bình thường; chế độ tối giản và bản in cho mỗi chữ xuống
              một dòng để thẻ chỉ rộng bằng chữ dài nhất. */}
          {nameWords.map((word, i) => (
            <span
              key={i}
              className={`gp-name-word${showAvatar ? "" : " block"}`}
            >
              {word}
              {i < nameWords.length - 1 ? " " : ""}
            </span>
          ))}
        </div>

        {/* Generation + Gender */}
        {(person.generation != null || person.gender !== "other") && (
          <div className="flex items-center justify-center gap-1 flex-wrap mt-0.5">
            {person.generation != null && (
              <span className="text-[8px] sm:text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 rounded px-1 py-px leading-tight">
                Đ.{person.generation}
              </span>
            )}
            <span
              className={`text-[9px] sm:text-[10px] font-bold leading-none ${genderColor}`}
              title={person.gender === "male" ? "Nam" : person.gender === "female" ? "Nữ" : "Khác"}
            >
              {genderIcon}
            </span>
          </div>
        )}

        {/* Birth → Death */}
        {(birthYear || deathYear) && (
          <span className="text-[8px] sm:text-[9px] text-stone-500 font-medium leading-tight mt-0.5">
            {birthYear ?? "…"}
            {isDeceased ? ` → ${deathYear ?? "…"}` : ""}
          </span>
        )}

        {/* Other names */}
        {person.other_names && (
          <span
            className="text-[8px] sm:text-[9px] text-stone-400 italic leading-tight mt-0.5 truncate max-w-full"
            title={person.other_names}
          >
            {person.other_names}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <button onClick={() => setMemberModalId(person.id)} className="block w-fit">
      {content}
    </button>
  );
}
