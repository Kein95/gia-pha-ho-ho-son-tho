import Footer from "@/components/Footer";
import LandingHero from "@/components/LandingHero";
import config from "./config";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col selection:bg-amber-200 selection:text-amber-900 relative overflow-hidden">
      {/* Decorative background grid and blurs (over the themed page background) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-size-[24px_24px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-30%,var(--brand-soft),transparent)] opacity-70 pointer-events-none"></div>

      <div className="absolute top-0 inset-x-0 h-screen overflow-hidden pointer-events-none flex justify-center">
        <div className="absolute top-[-10%] right-[-5%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-amber-300/20 rounded-full blur-[100px] mix-blend-multiply" />
        <div className="absolute top-[20%] left-[-10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-[var(--gold)]/12 rounded-full blur-[120px] mix-blend-multiply" />
      </div>

      {/* Câu đối — cây có gốc / nước có nguồn (flanking the hero on large screens) */}
      <div
        className="cau-doi absolute left-6 xl:left-14 top-1/2 -translate-y-1/2 z-10 hidden lg:flex text-xl"
        aria-hidden
      >
        木有本
      </div>
      <div
        className="cau-doi absolute right-6 xl:right-14 top-1/2 -translate-y-1/2 z-10 hidden lg:flex text-xl"
        aria-hidden
      >
        水有源
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 md:py-32 relative z-10 w-full">
        <LandingHero
          siteName={config.siteName}
          siteLocation={config.siteLocation}
        />
      </main>

      <Footer className="bg-transparent relative z-10 border-none" />
    </div>
  );
}
