"use client";

import config from "@/app/config";
import Image from "next/image";

/** Hoa văn trống đồng Đông Sơn đặt bốn góc khung, mờ để không át phần tên. */
function DrumCorner({ className }: { className: string }) {
  return (
    <Image
      unoptimized
      aria-hidden
      src="/trongdong/drum-gold.png"
      alt=""
      width={520}
      height={520}
      className={`pointer-events-none absolute size-[520px] opacity-50 ${className}`}
    />
  );
}

/**
 * Khung phả đồ bao quanh cây khi in: viền kép, dải hoa văn chữ triện, hoành phi
 * đề tên dòng họ, triện son và dòng chân ghi ngày lập.
 *
 * Dựng bằng chính bộ hoa văn có sẵn của app (`.orn-fret`, `.orn-frame`,
 * `.seal`) nên đổi theme là khung đổi màu theo, và không dính bản quyền của bộ
 * phôi tải về — repo này public.
 *
 * Chỉ dùng viền, nền phẳng và chữ nằm ngang: đó là những thứ bộ xuất SVG
 * (`utils/dom-to-svg`) dựng lại được chính xác. Câu đối dọc cố ý không đưa vào
 * vì `writing-mode: vertical-rl` không tái dựng đúng khi xuất SVG.
 */
export default function PhaDoFrame({
  personCount,
  generationCount,
  children,
}: {
  personCount: number;
  generationCount: number;
  children: React.ReactNode;
}) {
  const today = new Date();
  const printedOn = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  // Cỡ chữ và nét viền đặt bằng px thẳng: tờ phả đồ in ra rộng cỡ 1,6 m nên cỡ
  // chữ thường của giao diện web sẽ nhỏ như hạt gạo trên bản in.
  return (
    <div className="orn-frame border-[10px] border-[var(--gold-strong)] bg-[var(--surface-card)] p-4">
      <div className="relative overflow-hidden border-4 border-[var(--gold)] px-24 py-16">
        <DrumCorner className="-top-40 -left-40" />
        <DrumCorner className="-top-40 -right-40" />
        <DrumCorner className="-bottom-40 -left-40" />
        <DrumCorner className="-right-40 -bottom-40" />

        <div className="orn-frame__c orn-frame__c--tl !size-14 !border-4" />
        <div className="orn-frame__c orn-frame__c--tr !size-14 !border-4" />
        <div className="orn-frame__c orn-frame__c--bl !size-14 !border-4" />
        <div className="orn-frame__c orn-frame__c--br !size-14 !border-4" />

        <header className="mb-16 flex flex-col items-center gap-8">
          <div className="orn-fret h-3.5" />
          <h1 className="text-center font-serif text-[130px] leading-none font-bold tracking-[0.14em] text-[var(--accent-ink)] uppercase">
            {config.siteName}
          </h1>
          <p className="text-center font-serif text-[54px] leading-tight text-[var(--text-muted)]">
            {config.siteLocation}
          </p>
          <p className="text-[30px] tracking-[0.22em] text-[var(--text-faint)] uppercase">
            {generationCount} đời · {personCount} người
          </p>
          <div className="orn-fret h-3.5" />
        </header>

        <div className="flex justify-center">{children}</div>

        <footer className="mt-16 flex items-center justify-between gap-16">
          <p className="font-serif text-[30px] text-[var(--text-muted)]">
            Lập ngày {printedOn}
          </p>
          <div className="orn-fret h-3.5 flex-1" />
          <div className="seal seal--block size-[150px] text-[76px]">譜</div>
        </footer>
      </div>
    </div>
  );
}
