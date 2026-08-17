import { Frame, LayoutGrid, ZoomIn, ZoomOut } from "lucide-react";
import BaseToolbar, { BaseToolbarProps } from "./BaseToolbar";

interface TreeToolbarProps extends BaseToolbarProps {
  scale: number;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  compactLayout: boolean;
  setCompactLayout: (value: boolean) => void;
  showFrame: boolean;
  setShowFrame: (value: boolean) => void;
}

/** Nút bật/tắt một tuỳ chọn bố cục, dùng chung kiểu viên thuốc của thanh công cụ. */
function ToggleButton({
  active,
  onClick,
  title,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center gap-2 h-10 px-4 rounded-full border shadow-sm text-sm font-medium transition-colors ${
        active
          ? "bg-amber-600 border-amber-600 text-white"
          : "bg-white/80 backdrop-blur-md border-stone-200/60 text-stone-600 hover:bg-stone-100/50"
      }`}
    >
      {icon}
      <span className="hidden sm:block min-w-max">{label}</span>
    </button>
  );
}

export default function TreeToolbar({
  scale,
  handleZoomIn,
  handleZoomOut,
  handleResetZoom,
  compactLayout,
  setCompactLayout,
  showFrame,
  setShowFrame,
  ...baseProps
}: TreeToolbarProps) {
  return (
    <BaseToolbar {...baseProps}>
      {/* Các chi nhỏ xếp thành cột dọc cho cả cây gọn vừa khổ giấy in */}
      <ToggleButton
        active={compactLayout}
        onClick={() => setCompactLayout(!compactLayout)}
        title="Xếp các chi nhỏ thành cột dọc để cả cây gọn vừa khổ giấy in"
        icon={<LayoutGrid className="size-4 shrink-0" />}
        label="Xếp nhiều tầng"
      />

      {/* Khung phả đồ: viền, hoành phi, triện — tắt đi khi cần bản trơn ghép Corel */}
      <ToggleButton
        active={showFrame}
        onClick={() => setShowFrame(!showFrame)}
        title="Thêm khung phả đồ: viền hoa văn, hoành phi tên dòng họ và triện"
        icon={<Frame className="size-4 shrink-0" />}
        label="Khung phả đồ"
      />

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
