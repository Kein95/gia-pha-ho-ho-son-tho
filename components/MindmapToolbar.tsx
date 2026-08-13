import { ChevronsDownUp, ChevronsUpDown, ZoomIn, ZoomOut } from "lucide-react";
import BaseToolbar, { BaseToolbarProps } from "./BaseToolbar";

interface MindmapToolbarProps extends BaseToolbarProps {
  setExpandSignal: (val: { type: "expand" | "collapse"; ts: number }) => void;
  scale: number;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
}

export default function MindmapToolbar({
  setExpandSignal,
  scale,
  handleZoomIn,
  handleZoomOut,
  handleResetZoom,
  ...baseProps
}: MindmapToolbarProps) {
  return (
    <BaseToolbar {...baseProps}>
      {/* Zoom Controls */}
      <div className="flex items-center bg-white/80 backdrop-blur-md shadow-sm border border-stone-200/60 rounded-full overflow-hidden transition-opacity h-10">
        <button
          onClick={handleZoomOut}
          className="px-3 h-full hover:bg-stone-100/50 text-stone-600 transition-colors disabled:opacity-50"
          title="Thu nhỏ"
          disabled={scale <= 0.3}
        >
          <ZoomOut className="size-4" />
        </button>
        <button
          onClick={handleResetZoom}
          className="px-2 h-full hover:bg-stone-100/50 text-stone-600 transition-colors text-xs font-medium min-w-[50px] text-center border-x border-stone-200/50"
          title="Đặt lại"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          onClick={handleZoomIn}
          className="px-3 h-full hover:bg-stone-100/50 text-stone-600 transition-colors disabled:opacity-50"
          title="Phóng to"
          disabled={scale >= 2}
        >
          <ZoomIn className="size-4" />
        </button>
      </div>

      {/* Expand/Collapse Controls */}
      <div className="flex items-center bg-white/80 backdrop-blur-md shadow-sm border border-stone-200/60 rounded-full overflow-hidden transition-opacity h-10">
        <button
          onClick={() => setExpandSignal({ type: "collapse", ts: Date.now() })}
          className="px-3 md:px-4 h-full flex items-center gap-1.5 hover:bg-stone-100/50 text-stone-600 transition-colors font-medium"
          title="Thu gọn tất cả"
        >
          <ChevronsDownUp className="size-4" />
          <span className="hidden sm:inline text-xs sm:text-sm">Thu gọn</span>
        </button>
        <button
          onClick={() => setExpandSignal({ type: "expand", ts: Date.now() })}
          className="px-3 md:px-4 h-full flex items-center gap-1.5 hover:bg-stone-100/50 text-stone-600 transition-colors font-medium border-r border-stone-200/50"
          title="Mở rộng tất cả"
        >
          <ChevronsUpDown className="size-4" />
          <span className="hidden sm:inline text-xs sm:text-sm">Mở rộng</span>
        </button>
      </div>
    </BaseToolbar>
  );
}
