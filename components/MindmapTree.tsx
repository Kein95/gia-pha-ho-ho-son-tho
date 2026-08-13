"use client";

import { Person, Relationship } from "@/types";
import { Share2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useDashboard } from "./DashboardContext";
import { MindmapContextData, MindmapNode } from "./MindmapNode";
import MindmapToolbar from "./MindmapToolbar";
import { usePanZoom } from "@/hooks/usePanZoom";

import { buildAdjacencyLists } from "@/utils/treeHelpers";

interface MindmapTreeProps {
  personsMap: Map<string, Person>;
  relationships: Relationship[];
  roots: Person[];
  canEdit?: boolean;
}

export default function MindmapTree({
  personsMap,
  relationships,
  roots,
  canEdit,
}: MindmapTreeProps) {
  const { showAvatar, setMemberModalId } = useDashboard();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hideDaughtersInLaw, setHideDaughtersInLaw] = useState(false);
  const [hideSonsInLaw, setHideSonsInLaw] = useState(false);
  const [hideDaughters, setHideDaughters] = useState(false);
  const [hideSons, setHideSons] = useState(false);
  const [hideMales, setHideMales] = useState(false);
  const [hideFemales, setHideFemales] = useState(false);
  const [expandSignal, setExpandSignal] = useState<{
    type: "expand" | "collapse";
    ts: number;
  } | null>(null);

  const {
    scale,
    isPressed,
    isDragging,
    handlers: {
      handleMouseDown,
      handleMouseMove,
      handleMouseUpOrLeave,
      handleClickCapture,
      handleZoomIn,
      handleZoomOut,
      handleResetZoom,
    },
  } = usePanZoom(containerRef);

  const ctx: MindmapContextData = useMemo(() => {
    const adj = buildAdjacencyLists(relationships, personsMap);

    return {
      personsMap,
      relationships,
      adj,
      hideDaughtersInLaw,
      hideSonsInLaw,
      hideDaughters,
      hideSons,
      hideMales,
      hideFemales,
      showAvatar,
      expandSignal,
      setMemberModalId,
    };
  }, [
    personsMap,
    relationships,
    hideDaughtersInLaw,
    hideSonsInLaw,
    hideDaughters,
    hideSons,
    hideMales,
    hideFemales,
    showAvatar,
    expandSignal,
    setMemberModalId,
  ]);

  if (roots.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-100 mb-4">
          <Share2 className="size-8 text-stone-300" />
        </div>
        <p className="text-stone-500 font-medium tracking-wide">
          Gia phả trống
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <MindmapToolbar
        scale={scale}
        handleZoomIn={handleZoomIn}
        handleZoomOut={handleZoomOut}
        handleResetZoom={handleResetZoom}
        hideDaughtersInLaw={hideDaughtersInLaw}
        setHideDaughtersInLaw={setHideDaughtersInLaw}
        hideSonsInLaw={hideSonsInLaw}
        setHideSonsInLaw={setHideSonsInLaw}
        hideDaughters={hideDaughters}
        setHideDaughters={setHideDaughters}
        hideSons={hideSons}
        setHideSons={setHideSons}
        hideMales={hideMales}
        setHideMales={setHideMales}
        hideFemales={hideFemales}
        setHideFemales={setHideFemales}
        setExpandSignal={setExpandSignal}
        canEdit={canEdit}
      />

      {/* Root Container */}
      <div
        ref={containerRef}
        className={`w-full h-full overflow-auto tree-pan-container ${isPressed ? "cursor-grabbing" : "cursor-grab"}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onClickCapture={handleClickCapture}
        onDragStart={(e) => e.preventDefault()}
      >
        <div
          id="export-container"
          className={`font-sans min-w-max p-10 px-0 sm:px-8 pb-20 transition-all duration-200 ${isDragging ? "opacity-90" : ""}`}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top center",
          }}
        >
          {roots.map((root, index) => (
            <MindmapNode
              key={root.id}
              personId={root.id}
              level={0}
              isLast={index === roots.length - 1}
              ctx={ctx}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
