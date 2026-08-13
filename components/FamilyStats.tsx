"use client";

import { Person, Relationship } from "@/types";
import { motion } from "framer-motion";
import {
  Crown,
  Flower2,
  Heart,
  HeartOff,
  Mars,
  Skull,
  Users,
  Venus,
} from "lucide-react";
import { useMemo } from "react";

interface FamilyStatsProps {
  persons: Person[];
  relationships: Relationship[];
}

interface StatCardProps {
  label: string;
  value: number;
  total: number;
  icon: React.ReactNode;
  color: string;
  delay?: number;
}

function StatCard({
  label,
  value,
  total,
  icon,
  color,
  delay = 0,
}: StatCardProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-white/80 border border-stone-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
    >
      {/* Background glow */}
      <div
        className={`absolute -top-6 -right-6 size-24 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity ${color}`}
      />

      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className={`p-2.5 rounded-xl ${color} bg-opacity-10`}>{icon}</div>
        <span className="text-xs font-semibold text-stone-400 bg-stone-100 px-2 py-1 rounded-full">
          {pct}%
        </span>
      </div>

      <p className="text-3xl font-bold text-stone-800 relative z-10">{value}</p>
      <p className="text-sm font-medium text-stone-500 mt-0.5 relative z-10">
        {label}
      </p>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 bg-stone-100 rounded-full overflow-hidden relative z-10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, delay: delay + 0.2, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </motion.div>
  );
}

// Generation breakdown row with gender-stacked bar
function GenerationRow({
  gen,
  total,
  male,
  female,
  max,
  delay,
}: {
  gen: number;
  total: number;
  male: number;
  female: number;
  max: number;
  delay: number;
}) {
  const malePct = total > 0 ? (male / total) * 100 : 0;
  const femalePct = total > 0 ? (female / total) * 100 : 0;
  const maleBarPct = max > 0 ? (male / max) * 100 : 0;
  const femaleBarPct = max > 0 ? (female / max) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold text-stone-500 w-12 sm:w-14 shrink-0">
        Đời {gen}
      </span>
      <div className="flex-1 min-w-0 h-3 bg-stone-100 rounded-full overflow-hidden flex">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${maleBarPct}%` }}
          transition={{ duration: 0.6, delay, ease: "easeOut" }}
          className="h-full bg-blue-400"
          title={`Nam: ${male}`}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${femaleBarPct}%` }}
          transition={{ duration: 0.6, delay: delay + 0.1, ease: "easeOut" }}
          className="h-full bg-pink-400"
          title={`Nữ: ${female}`}
        />
      </div>
      <span
        className="text-xs text-stone-500 w-20 sm:w-24 text-right shrink-0"
        title={`Tổng: ${total} | Nam: ${male} (${Math.round(malePct)}%) | Nữ: ${female} (${Math.round(femalePct)}%)`}
      >
        <span className="font-bold text-sm text-stone-700">{total}</span>
        {" "}
        <span className="text-blue-500">{male}♂</span>
        {" "}
        <span className="text-pink-500">{female}♀</span>
      </span>
    </div>
  );
}

export default function FamilyStats({
  persons,
  relationships,
}: FamilyStatsProps) {
  const stats = useMemo(() => {
    const total = persons.length;

    // Gender
    const male = persons.filter((p) => p.gender === "male").length;
    const female = persons.filter((p) => p.gender === "female").length;

    // In-laws
    const daughtersInLaw = persons.filter(
      (p) => p.is_in_law && p.gender === "female",
    ).length;
    const sonsInLaw = persons.filter(
      (p) => p.is_in_law && p.gender === "male",
    ).length;

    // Deceased
    const deceased = persons.filter((p) => p.is_deceased).length;

    // First-born (con trưởng)
    const firstBorn = persons.filter((p) => p.birth_order === 1).length;

    // Married / unmarried (based on marriage relationships)
    const marriedIds = new Set<string>();
    relationships
      .filter((r) => r.type === "marriage")
      .forEach((r) => {
        marriedIds.add(r.person_a);
        marriedIds.add(r.person_b);
      });
    const married = persons.filter((p) => marriedIds.has(p.id)).length;
    const unmarried = total - married;

    // Generation breakdown (total + by gender)
    const genMap = new Map<
      number,
      { total: number; male: number; female: number }
    >();
    persons.forEach((p) => {
      if (p.generation != null) {
        const entry = genMap.get(p.generation) ?? {
          total: 0,
          male: 0,
          female: 0,
        };
        entry.total++;
        if (p.gender === "male") entry.male++;
        else if (p.gender === "female") entry.female++;
        genMap.set(p.generation, entry);
      }
    });
    const generationBreakdown = Array.from(genMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([gen, data]) => ({ gen, ...data }));

    return {
      total,
      male,
      female,
      daughtersInLaw,
      sonsInLaw,
      deceased,
      firstBorn,
      married,
      unmarried,
      generationBreakdown,
    };
  }, [persons, relationships]);

  const cards = [
    {
      label: "Tổng thành viên",
      value: stats.total,
      icon: <Users className="size-5 text-stone-600" />,
      color: "bg-stone-400",
    },
    {
      label: "Nam",
      value: stats.male,
      icon: <Mars className="size-5 text-blue-600" />,
      color: "bg-blue-400",
    },
    {
      label: "Nữ",
      value: stats.female,
      icon: <Venus className="size-5 text-pink-500" />,
      color: "bg-pink-400",
    },
    {
      label: "Con dâu",
      value: stats.daughtersInLaw,
      icon: <Flower2 className="size-5 text-rose-500" />,
      color: "bg-rose-400",
    },
    {
      label: "Con rể",
      value: stats.sonsInLaw,
      icon: <Users className="size-5 text-indigo-500" />,
      color: "bg-indigo-400",
    },
    {
      label: "Đã kết hôn",
      value: stats.married,
      icon: <Heart className="size-5 text-red-500" />,
      color: "bg-red-400",
    },
    {
      label: "Chưa kết hôn",
      value: stats.unmarried,
      icon: <HeartOff className="size-5 text-stone-400" />,
      color: "bg-stone-300",
    },
    {
      label: "Đã mất",
      value: stats.deceased,
      icon: <Skull className="size-5 text-stone-500" />,
      color: "bg-stone-400",
    },
    {
      label: "Con trưởng",
      value: stats.firstBorn,
      icon: <Crown className="size-5 text-amber-500" />,
      color: "bg-amber-400",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            total={stats.total}
            icon={card.icon}
            color={card.color}
            delay={i * 0.06}
          />
        ))}
      </div>

      {/* Generation Breakdown */}
      {stats.generationBreakdown.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="bg-white/80 border border-stone-200/60 rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-base font-bold text-stone-700 mb-5 flex items-center gap-2">
            <Crown className="size-4 text-amber-500" />
            Phân bố theo thế hệ
          </h2>
          {/* Gender legend for generation bars */}
          <div className="flex gap-4 mb-4 text-xs text-stone-500">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-blue-400 inline-block" />
              Nam
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-pink-400 inline-block" />
              Nữ
            </span>
          </div>
          <div className="space-y-3">
            {stats.generationBreakdown.map(({ gen, total, male, female }, i) => (
              <GenerationRow
                key={gen}
                gen={gen}
                total={total}
                male={male}
                female={female}
                max={stats.total}
                delay={0.55 + i * 0.07}
              />
            ))}
          </div>
          <p className="text-xs text-stone-400 mt-4 italic">
            * Chỉ tính các thành viên đã được gán số thế hệ
          </p>
        </motion.div>
      )}

      {/* Gender ratio visual */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.65 }}
        className="bg-white/80 border border-stone-200/60 rounded-2xl p-6 shadow-sm"
      >
        <h2 className="text-base font-bold text-stone-700 mb-5 flex items-center gap-2">
          <Users className="size-4 text-stone-500" />
          Tỉ lệ giới tính
        </h2>
        <div className="flex h-5 rounded-full overflow-hidden gap-px">
          {stats.total > 0 && (
            <>
              <motion.div
                initial={{ flex: 0 }}
                animate={{ flex: stats.male }}
                transition={{ duration: 0.7, delay: 0.7 }}
                className="bg-blue-400 flex items-center justify-center"
                title={`Nam: ${stats.male}`}
              />
              <motion.div
                initial={{ flex: 0 }}
                animate={{ flex: stats.female }}
                transition={{ duration: 0.7, delay: 0.7 }}
                className="bg-pink-400 flex items-center justify-center"
                title={`Nữ: ${stats.female}`}
              />
            </>
          )}
        </div>
        <div className="flex gap-6 mt-3 text-sm">
          <span className="flex items-center gap-2 text-stone-600">
            <span className="size-3 rounded-full bg-blue-400 inline-block" />
            Nam — {stats.male} người (
            {stats.total > 0 ? Math.round((stats.male / stats.total) * 100) : 0}
            %)
          </span>
          <span className="flex items-center gap-2 text-stone-600">
            <span className="size-3 rounded-full bg-pink-400 inline-block" />
            Nữ — {stats.female} người (
            {stats.total > 0
              ? Math.round((stats.female / stats.total) * 100)
              : 0}
            %)
          </span>
        </div>
      </motion.div>
    </div>
  );
}
