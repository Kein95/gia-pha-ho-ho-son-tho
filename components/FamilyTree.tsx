"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import { usePanZoom } from "@/hooks/usePanZoom";
import { Person, Relationship } from "@/types";
import { useDashboard } from "./DashboardContext";
import FamilyNodeCard from "./FamilyNodeCard";
import GenerationRuler from "./GenerationRuler";
import PhaDoFrame from "./PhaDoFrame";
import TreeToolbar from "./TreeToolbar";

import { buildAdjacencyLists, getFilteredTreeData } from "@/utils/treeHelpers";
import { pickVerticallyStackedNodes } from "@/utils/tree-vertical-stack";

/** Lề trái/phải chừa cho nhãn "ĐỜI n" của thước đời, tính bằng px. */
const GENERATION_GUTTER = 190;

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
  const treeAreaRef = useRef<HTMLDivElement>(null);
  const [hideDaughtersInLaw, setHideDaughtersInLaw] = useState(false);
  const [hideSonsInLaw, setHideSonsInLaw] = useState(false);
  const [hideDaughters, setHideDaughters] = useState(false);
  const [hideSons, setHideSons] = useState(false);
  const [hideMales, setHideMales] = useState(false);
  const [hideFemales, setHideFemales] = useState(false);
  const [compactLayout, setCompactLayout] = useState(false);
  const [showFrame, setShowFrame] = useState(false);
  /** Vị trí từng hàng đời, đo sau khi cây dàn xong — dùng vẽ thước đời. */
  const [levelBands, setLevelBands] = useState<
    { level: number; top: number; height: number }[]
  >([]);

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
  }, [personsMap, relationships, roots, setScale, compactLayout]);

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

      // Đo vị trí từng hàng đời để vẽ thước đời dọc hai lề. Toạ độ lấy từ
      // getBoundingClientRect nên đang mang cả zoom fit-to-screen, phải chia lại
      // mới ra đúng toạ độ trong lòng #export-container.
      const content =
        containerRef.current.querySelector<HTMLElement>("#export-container");
      const treeArea = treeAreaRef.current;
      if (!content || !treeArea) return;
      const contentTop = treeArea.getBoundingClientRect().top;

      // Đọc tỉ lệ thẳng từ transform đang áp, không dùng state `scale`: state đổi
      // trước khi trình duyệt vẽ lại, lấy nhầm là toạ độ phồng lên mấy lần.
      const transform = getComputedStyle(content).transform;
      const appliedScale =
        transform && transform !== "none"
          ? new DOMMatrixReadOnly(transform).a || 1
          : 1;

      const bands = Object.entries(levelMap)
        .map(([level, levelNodes]) => {
          const rects = levelNodes.map((n) => n.getBoundingClientRect());
          const top = Math.min(...rects.map((r) => r.top));
          const bottom = Math.max(...rects.map((r) => r.bottom));
          return {
            level: Number(level),
            top: (top - contentTop) / appliedScale,
            height: (bottom - top) / appliedScale,
          };
        })
        .sort((a, b) => a.level - b.level);

      setLevelBands((prev) =>
        JSON.stringify(prev) === JSON.stringify(bands) ? prev : bands,
      );
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
    compactLayout,
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

  // Những nút sẽ xếp đàn con thành cột dọc để cây gọn lại vừa khổ giấy in.
  const stackedNodes = useMemo(() => {
    if (!compactLayout) return null;
    return pickVerticallyStackedNodes(
      roots.map((r) => r.id),
      (id) => getTreeData(id).children.map((c) => c.id),
    );
    // getTreeData đọc từ adj + các cờ lọc, nên phụ thuộc đúng vào chúng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    compactLayout,
    roots,
    personsMap,
    adj,
    hideDaughtersInLaw,
    hideSonsInLaw,
    hideDaughters,
    hideSons,
    hideMales,
    hideFemales,
  ]);

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
          className="node-container relative inline-flex flex-col items-center"
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
          <ul className={stackedNodes?.has(personId) ? "stack" : undefined}>
            {data.children.map((child) => (
              <React.Fragment key={child.id}>
                {renderTreeNode(child.id, new Set(visited), level + 1)}
              </React.Fragment>
            ))}
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

  // Vùng cây kèm thước đời. Hai lề chừa trống để nhãn "ĐỜI n" không bị thẻ đè.
  const treeArea = (
    <div
      ref={treeAreaRef}
      className="relative"
      style={{ paddingInline: compactLayout ? 0 : GENERATION_GUTTER }}
    >
      {/* Thước đời chỉ có nghĩa khi mỗi đời nằm gọn một hàng ngang; ở chế độ
          xếp cột dọc các đời đan vào nhau nên bỏ đi. */}
      {!compactLayout && <GenerationRuler bands={levelBands} />}
      <ul className="tree-root relative z-10">
        {roots.map((root) => (
          <React.Fragment key={root.id}>
            {renderTreeNode(root.id)}
          </React.Fragment>
        ))}
      </ul>
    </div>
  );

  // Số đời ghi trên khung: đời lớn nhất trong dữ liệu, tính từ 1.
  const generationCount =
    Math.max(
      0,
      ...[...personsMap.values()].map((p) => (p.generation ?? 0) + 1),
    ) || 0;

  return (
    <div className="w-full h-full relative">
      <TreeToolbar
        scale={scale}
        handleZoomIn={handleZoomIn}
        handleZoomOut={handleZoomOut}
        handleResetZoom={handleResetZoom}
        compactLayout={compactLayout}
        setCompactLayout={setCompactLayout}
        showFrame={showFrame}
        setShowFrame={setShowFrame}
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

        /* ── Xếp con thành cột dọc ──────────────────────────────────────────
           Mấy đời cuối xếp dọc để cây khỏi kéo dài thành một dải. Đường nối vẽ
           theo từng đoạn: mỗi người con vẽ đoạn sống dọc từ mép trên ô của mình
           xuống ngang giữa thẻ, các đoạn nối tiếp nhau thành một sống liền, và
           người con cuối tự dừng lại đúng chỗ nên không thừa đuôi. */
        .css-tree ul.stack {
          padding-top: 0;
          padding-left: 44px;
        }
        .css-tree ul.stack::before {
          display: none;
        }
        .css-tree ul.stack > li {
          float: none;
          display: block;
          text-align: left;
          padding: 14px 0 0 0;
        }
        /* Bỏ đường nối kiểu hàng ngang bên trong cột dọc */
        .css-tree ul.stack > li::before,
        .css-tree ul.stack > li::after {
          display: none;
        }
        /* Nhánh ngang từ sống dọc sang thẻ */
        .css-tree ul.stack > li > .node-container::before {
          content: '';
          position: absolute; left: -22px; top: 50%;
          width: 22px; height: 0;
          border-top: 2px solid #d6d3d1;
        }
        /* Một đoạn sống dọc, nối từ mép trên ô xuống ngang giữa thẻ */
        .css-tree ul.stack > li > .node-container::after {
          content: '';
          position: absolute; left: -23px; top: -14px;
          width: 0; height: calc(50% + 14px);
          border-left: 2px solid #d6d3d1;
        }
        /* Người cha của một cột dọc căn trái để sống dọc rơi đúng dưới thẻ */
        .css-tree li:has(> ul.stack) {
          text-align: left;
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
          className={`relative w-max min-w-full mx-auto p-4 css-tree transition-all duration-200 ${isDragging ? "opacity-90" : ""}`}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top center",
          }}
        >
          {showFrame ? (
            <PhaDoFrame
              personCount={personsMap.size}
              generationCount={generationCount}
            >
              {treeArea}
            </PhaDoFrame>
          ) : (
            treeArea
          )}
        </div>
      </div>
    </div>
  );
}
