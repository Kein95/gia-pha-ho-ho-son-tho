const config = {
  siteName: process.env.SITE_NAME || "Gia Phả Họ Hồ",
  siteLocation:
    process.env.SITE_LOCATION || "Sơn Thọ – Kỳ Thọ – Kỳ Anh – Hà Tĩnh",
  // Địa danh theo đơn vị hành chính sau sáp nhập 2025 — hiển thị trong ngoặc ở dòng dưới
  siteLocationNew:
    process.env.SITE_LOCATION_NEW || "Sơn Thọ – Kỳ Khang – Hà Tĩnh",
  exampleEmail: process.env.EXAMPLE_EMAIL || "",
  examplePassword: process.env.EXAMPLE_PASSWORD || "",
  demoDomain: process.env.DEMO_DOMAIN || "giapha-os.homielab.com",
};

export default config;
