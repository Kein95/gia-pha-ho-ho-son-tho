import { LayoutGrid, ZoomIn, ZoomOut } from "lucide-react";
import BaseToolbar, { BaseToolbarProps } from "./BaseToolbar";

interface TreeToolbarProps extends BaseToolbarProps {
  scale: number;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  blockLayout: boolean;
  setBlockLayout: (value: boolean) => void;
}

export default function TreeToolbar({
  scale,
  handleZoomIn,
  handleZoomOut,
  handleResetZoom,
  blockLayout,
  setBlockLayout,
  ...baseProps
}: TreeToolbarProps) {
  return (
    <BaseToolbar {...baseProps}>
      {/* Xếp nhiều tầng: cắt cây dài thành từng khối cho vừa khổ giấy in */}
      <button
        onClick={() => setBlockLayout(!blockLayout)}
        title="Cắt cây thành từng khối xếp nhiều tầng cho vừa khổ giấy in"
        className={`flex items-center gap-2 h-10 px-4 rounded-full border shadow-sm text-sm font-medium transition-colors ${
          blockLayout
            ? "bg-amber-600 border-amber-600 text-white"
            : "bg-white/80 backdrop-blur-md border-stone-200/60 text-stone-600 hover:bg-stone-100/50"
        }`}
      >
        <LayoutGrid className="size-4 shrink-0" />
        <span className="hidden sm:block min-w-max">Xếp nhiều tầng</span>
      </button>

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
    </BaseToolbar>
  );
}
