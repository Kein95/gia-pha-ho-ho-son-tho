"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import { usePanZoom } from "@/hooks/usePanZoom";
import { Person, Relationship } from "@/types";
import { useDashboard } from "./DashboardContext";
import FamilyNodeCard from "./FamilyNodeCard";
import TreeToolbar from "./TreeToolbar";

import { buildAdjacencyLists, getFilteredTreeData } from "@/utils/treeHelpers";
import {
  splitTreeIntoBlocks,
  type TreeBlock,
} from "@/utils/tree-block-split";

/** Bề ngang tối đa của một khối khi xếp nhiều tầng, tính bằng px. */
const MAX_BLOCK_WIDTH = 3200;
/** Bề ngang một thẻ người, tuỳ theo có hiện ảnh đại diện hay không. */
const CARD_WIDTH_WITH_AVATAR = 132;
const CARD_WIDTH_TEXT_ONLY = 96;

export default function FamilyTree({
  personsMap,
  relationships,
  roots,
  canEdit,
}: {
  personsMap: Map<string, Person>;
  relationships: Relationship[];
  roots: Person[];
  canEdit?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hideDaughtersInLaw, setHideDaughtersInLaw] = useState(false);
  const [hideSonsInLaw, setHideSonsInLaw] = useState(false);
  const [hideDaughters, setHideDaughters] = useState(false);
  const [hideSons, setHideSons] = useState(false);
  const [hideMales, setHideMales] = useState(false);
  const [hideFemales, setHideFemales] = useState(false);
  const [blockLayout, setBlockLayout] = useState(false);

  const { showAvatar } = useDashboard();

  const {
    scale,
    setScale,
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

  // Fit-to-screen: co/giãn toàn bộ cây cho vừa khung nhìn khi lần đầu render
  // hoặc khi số người/quan hệ thay đổi. Người dùng vẫn zoom thủ công sau đó.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const content = el.querySelector<HTMLDivElement>("#export-container");
    if (!content) return;

    const fit = () => {
      const availW = el.clientWidth - 32;
      const availH = el.clientHeight - 32;
      const contentW = content.scrollWidth;
      const contentH = content.scrollHeight;
      if (contentW <= 0 || contentH <= 0) return;

      const s = Math.min(availW / contentW, availH / contentH, 1);
      setScale(Math.max(s, 0.15));
    };

    // Chờ cây render đủ node rồi mới đo (float layout cần một frame)
    const t = setTimeout(fit, 100);
    window.addEventListener("resize", fit);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", fit);
    };
  }, [personsMap, relationships, roots, setScale, blockLayout]);

  useEffect(() => {
    // Center the scroll area horizontally on initial render
    if (containerRef.current) {
      const el = containerRef.current;
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    }
  }, [roots]);

  useEffect(() => {
    const equalizeHeights = () => {
      if (!containerRef.current) return;
      const nodes = containerRef.current.querySelectorAll(".node-container");
      const levelMap: Record<string, HTMLElement[]> = {};

      nodes.forEach((node) => {
        const level = node.getAttribute("data-level");
        if (level != null) {
          if (!levelMap[level]) levelMap[level] = [];
          levelMap[level].push(node as HTMLElement);
        }
      });

      Object.values(levelMap).forEach((levelNodes) => {
        // Reset min-height first to get natural height
        levelNodes.forEach((node) => {
          const innerFlex = node.firstElementChild as HTMLElement;
          if (innerFlex) innerFlex.style.minHeight = "0px";
        });

        let maxHeight = 0;
        // Find the maximum height in this level
        levelNodes.forEach((node) => {
          const innerFlex = node.firstElementChild as HTMLElement;
          if (innerFlex) {
            maxHeight = Math.max(maxHeight, innerFlex.offsetHeight);
          }
        });

        // Apply max height to all nodes in this level
        levelNodes.forEach((node) => {
          const innerFlex = node.firstElementChild as HTMLElement;
          if (innerFlex && maxHeight > 0) {
            innerFlex.style.minHeight = `${maxHeight}px`;
          }
        });
      });
    };

    const timeoutId = setTimeout(equalizeHeights, 50);
    window.addEventListener("resize", equalizeHeights);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", equalizeHeights);
    };
  }, [
    roots,
    personsMap,
    relationships,
    showAvatar,
    scale,
    hideDaughtersInLaw,
    hideSonsInLaw,
    hideDaughters,
    hideSons,
    hideMales,
    hideFemales,
    blockLayout,
  ]);

  const adj = useMemo(
    () => buildAdjacencyLists(relationships, personsMap),
    [relationships, personsMap],
  );

  const getTreeData = (personId: string) =>
    getFilteredTreeData(personId, personsMap, adj, {
      hideDaughtersInLaw,
      hideSonsInLaw,
      hideDaughters,
      hideSons,
      hideMales,
      hideFemales,
    });

  // Chia cây thành các khối in được. Chỉ tính khi bật chế độ xếp nhiều tầng.
  const blocks = useMemo(() => {
    if (!blockLayout) return null;
    return splitTreeIntoBlocks(
      roots.map((r) => r.id),
      (id) => {
        const data = getTreeData(id);
        return {
          spouseCount: data.spouses.length,
          childIds: data.children.map((c) => c.id),
        };
      },
      {
        maxBlockWidth: MAX_BLOCK_WIDTH,
        cardWidth: showAvatar ? CARD_WIDTH_WITH_AVATAR : CARD_WIDTH_TEXT_ONLY,
      },
    );
    // getTreeData đọc từ adj + các cờ lọc, nên phụ thuộc đúng vào chúng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    blockLayout,
    roots,
    personsMap,
    adj,
    showAvatar,
    hideDaughtersInLaw,
    hideSonsInLaw,
    hideDaughters,
    hideSons,
    hideMales,
    hideFemales,
  ]);

  /** Ô dấu dẫn thay chỗ một chi đã tách sang khối khác. */
  const renderBlockStub = (block: TreeBlock, name: string, level: number) => (
    <li key={block.rootId}>
      <div
        className="node-container inline-flex flex-col items-center"
        data-level={level}
      >
        <div className="flex relative z-10 items-stretch h-full">
          <div className="w-[140px] px-2 py-3 rounded-2xl border-2 border-dashed border-amber-400/70 bg-amber-50/60 text-center">
            <div className="text-[11px] font-semibold text-stone-700 leading-tight">
              {name}
            </div>
            <div className="mt-1 text-[10px] font-medium text-amber-700">
              ▼ xem khối {block.index}
            </div>
            <div className="text-[9px] text-stone-500">
              {block.personCount} người
            </div>
          </div>
        </div>
      </div>
    </li>
  );

  // Recursive function for rendering nodes
  // Tracks visited IDs to prevent infinite loops from circular relationships
  const renderTreeNode = (
    personId: string,
    visited: Set<string> = new Set(),
    level: number = 0,
  ): React.ReactNode => {
    if (visited.has(personId)) return null; // cycle guard
    visited.add(personId);

    const data = getTreeData(personId);
    if (!data.person) return null;

    return (
      <li>
        <div
          className="node-container inline-flex flex-col items-center"
          data-level={level}
        >
          {/* Main Person & Spouses Row */}
          <div
            className={`flex relative z-10 items-stretch h-full${showAvatar ? " bg-white rounded-2xl shadow-md border border-stone-200/80 transition-opacity" : ""}`}
          >
            <FamilyNodeCard person={data.person} />

            {data.spouses.length > 0 &&
              data.spouses.map((spouseData, idx) => (
                <div key={spouseData.person.id} className="flex relative">
                  <FamilyNodeCard
                    isRingVisible={idx === 0}
                    isPlusVisible={idx > 0}
                    person={spouseData.person}
                  />
                </div>
              ))}
          </div>
        </div>

        {/* Render Children (if any) */}
        {data.children.length > 0 && (
          <ul>
            {data.children.map((child) => {
              const cutTo = blocks?.blockOfCutNode.get(child.id);
              if (cutTo)
                return renderBlockStub(cutTo, child.full_name, level + 1);
              return (
                <React.Fragment key={child.id}>
                  {renderTreeNode(child.id, new Set(visited), level + 1)}
                </React.Fragment>
              );
            })}
          </ul>
        )}
      </li>
    );
  };

  if (roots.length === 0)
    return (
      <div className="text-center p-10 text-stone-500">
        Không tìm thấy dữ liệu.
      </div>
    );

  return (
    <div className="w-full h-full relative">
      <TreeToolbar
        scale={scale}
        handleZoomIn={handleZoomIn}
        handleZoomOut={handleZoomOut}
        handleResetZoom={handleResetZoom}
        blockLayout={blockLayout}
        setBlockLayout={setBlockLayout}
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
        canEdit={canEdit}
      />

      <div
        ref={containerRef}
        className={`w-full h-full overflow-auto bg-stone-50 tree-pan-container ${isPressed ? "cursor-grabbing" : "cursor-grab"}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onClickCapture={handleClickCapture}
        onDragStart={(e) => e.preventDefault()}
      >
        {/* We use a style block to inject the CSS logic for the family tree lines */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
        .css-tree ul {
          padding-top: 30px; 
          position: relative;
          padding-left: 0;
          user-select: none;
        }

        .css-tree ul::after {
          content: "";
          display: table;
          clear: both;
        }

        .css-tree li {
          float: left; text-align: center;
          list-style-type: none;
          position: relative;
          padding: 30px 5px 0 5px;
        }

        /* Connecting lines */
        .css-tree li::before, .css-tree li::after {
          content: '';
          position: absolute; top: 0; right: 50%;
          border-top: 2px solid #d6d3d1;
          width: 50%; height: 30px;
        }
        .css-tree li::after {
          right: auto; left: 50%;
          border-left: 2px solid #d6d3d1;
        }

        /* Remove left-right connectors from elements without siblings */
        .css-tree li:only-child::after {
          display: none;
        }
        .css-tree li:only-child::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          border-left: 2px solid #d6d3d1;
          width: 0;
          height: 30px;
        }

        /* Remove top connector from first child.
           Dùng class thay :first-child vì ở chế độ xếp khối, mỗi khối có tiêu đề
           đứng trước <ul> nên <ul> không còn là con đầu tiên. */
        .css-tree ul.tree-root > li {
          padding-top: 0px;
        }
        .css-tree ul.tree-root > li::before {
          display: none;
        }

        /* Remove left connector from first child and right connector from last child */
        .css-tree li:first-child::before, .css-tree li:last-child::after {
          border: 0 none;
        }

        /* Add back the vertical connector to the last nodes */
        .css-tree li:last-child::before {
          border-right: 2px solid #d6d3d1;
          border-radius: 0 12px 0 0;
        }
        .css-tree li:first-child::after {
          border-radius: 12px 0 0 0;
        }

        /* Downward connectors from parents */
        .css-tree ul ul::before {
          content: '';
          position: absolute; top: 0; left: 50%;
          border-left: 2px solid #d6d3d1;
          width: 0; height: 30px;
        }
      `,
          }}
        />

        {/* 
        Use w-max to prevent wrapping and allow scrolling. 
        mx-auto centers it if smaller than screen. 
        p-8 adds padding inside scroll area.
      */}
        <div
          id="export-container"
          className={`w-max min-w-full mx-auto p-4 css-tree transition-all duration-200 ${isDragging ? "opacity-90" : ""}`}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top center",
          }}
        >
          {blocks ? (
            <div
              className="flex flex-wrap items-start justify-center gap-x-16 gap-y-12"
              style={{ maxWidth: MAX_BLOCK_WIDTH * 2 }}
            >
              {blocks.blocks.map((block) => (
                <section
                  key={block.rootId}
                  className="rounded-3xl border border-stone-300/70 bg-white/40 px-8 pt-5 pb-8"
                >
                  <h3 className="mb-5 text-center font-serif text-xl font-bold text-stone-700">
                    Khối {block.index}
                    {block.index === 1 ? (
                      " — Thân chính"
                    ) : (
                      <>
                        {` — Chi ${personsMap.get(block.rootId)?.full_name ?? ""}`}
                        {/* Cùng con số với ô dấu dẫn ở khối trên: cả chi, kể cả
                            phần còn chảy tiếp xuống các khối sau. */}
                        <span className="ml-2 font-sans text-sm font-normal text-stone-500">
                          ({block.personCount} người)
                        </span>
                      </>
                    )}
                    {block.fromBlockIndex != null && (
                      <span className="ml-3 font-sans text-sm font-medium text-amber-700">
                        ▲ nối từ khối {block.fromBlockIndex}
                      </span>
                    )}
                  </h3>
                  <ul className="tree-root">{renderTreeNode(block.rootId)}</ul>
                </section>
              ))}
            </div>
          ) : (
            <ul className="tree-root">
              {roots.map((root) => (
                <React.Fragment key={root.id}>
                  {renderTreeNode(root.id)}
                </React.Fragment>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
