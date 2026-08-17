"use client";

/**
 * Thước đời: dải nền xen kẽ theo từng hàng đời, kèm nhãn "ĐỜI n" ghim ở cả hai
 * lề trái và phải.
 *
 * Bản phả đồ cuộn dài tới 4,4 m, người xem đứng ở giữa tờ không thấy được lề
 * nào cả nếu chỉ ghi một bên — nên nhãn đặt hai đầu, và dải nền xen kẽ giúp mắt
 * bám đúng hàng khi dò ngang.
 *
 * Toạ độ do `FamilyTree` đo từ DOM sau khi cây dàn xong; ở đây chỉ vẽ.
 */
export default function GenerationRuler({
  bands,
}: {
  bands: { level: number; top: number; height: number }[];
}) {
  if (bands.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      {bands.map((band) => (
        <div
          key={band.level}
          className={`absolute right-0 left-0 flex items-center justify-between ${
            band.level % 2 === 0 ? "bg-amber-500/6" : "bg-transparent"
          }`}
          style={{ top: band.top, height: band.height }}
        >
          <span className="px-6 text-[42px] font-bold tracking-[0.2em] text-amber-700/50">
            ĐỜI {band.level}
          </span>
          <span className="px-6 text-[42px] font-bold tracking-[0.2em] text-amber-700/50">
            ĐỜI {band.level}
          </span>
        </div>
      ))}
    </div>
  );
}
