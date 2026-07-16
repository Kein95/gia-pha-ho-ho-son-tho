import type { MetadataRoute } from "next";

// Gia phả nội tộc: ai có link thì xem được, nhưng tên con cháu không nổi lên
// khi search Google. Cặp với `robots: { index: false }` ở metadata layout —
// robots.txt chặn crawl, meta noindex chặn lập chỉ mục.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
