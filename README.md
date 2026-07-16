# Gia Phả Họ Hồ - Sơn Thọ

Repository: [github.com/Kein95/gia-pha-ho-ho-son-tho](https://github.com/Kein95/gia-pha-ho-ho-son-tho)

Ứng dụng quản lý gia phả dòng Họ Hồ - Sơn Thọ, cung cấp giao diện trực quan để xem sơ đồ phả hệ, quản lý thành viên (cả nam và nữ) và tìm kiếm danh xưng.

Dự án ra đời từ nhu cầu thực tế: cần một hệ thống Cloud để con cháu ở nhiều nơi có thể cùng cập nhật thông tin (kết hôn, sinh con...), thay vì phụ thuộc vào một máy cục bộ. Việc tự triển khai mã nguồn mở giúp gia đình nắm trọn quyền kiểm soát dữ liệu nhạy cảm, thay vì phó mặc cho các dịch vụ bên thứ ba.

Phù hợp với người Việt Nam.

## 🙏 Lời cảm ơn

Dự án này được phát triển dựa trên mã nguồn mở **[giapha-os](https://github.com/homielab/giapha-os)** của [@homielab](https://github.com/homielab). Xin chân thành cảm ơn tác giả đã chia sẻ source code chất lượng cho cộng đồng người Việt.

> **Lời chia sẻ từ tác giả gốc ([@homielab](https://github.com/homielab)):**
>
> Chia sẻ mã nguồn quản lý gia phả: <https://github.com/homielab/giapha-os>
>
> Ban đầu mình chỉ làm để dùng cho gia đình. Sau khi đăng screenshot lên Threads thì có nhiều người hỏi xin source nên mình public luôn.
>
> P/S: Mình cũng thấy có nhiều bài viết chia sẻ trong nhóm sản phẩm trau chuốt hơn, nhưng mình dùng thử thì cảm giác không làm chủ được, có thể các bạn dùng app của mình cũng thấy vậy, ai làm ra thì người đấy hiểu nhất, thôi thì mình cứ chia sẻ biết đâu phù hợp với người này người kia. Vui vẻ nhé mọi người.

**Customizations cho Họ Hồ - Sơn Thọ:**

- Liệt kê đầy đủ cả nam và nữ trong phả hệ
- Tối ưu mobile + chế độ in cây gia phả
- Thêm trường ngày giỗ âm lịch (lunar death date)
- Branding riêng cho dòng họ
- Migrate backend Supabase → Vercel + Neon Postgres + Auth.js v5 + Vercel Blob (✅ done 2026-05-01)

## Mục lục

- [Các tính năng chính](#các-tính-năng-chính)
- [Demo](#demo)
- [Hình ảnh Giao diện](#hình-ảnh-giao-diện)
- [Cài đặt và Chạy dự án](#cài-đặt-và-chạy-dự-án)
- [Phân quyền người dùng (User Roles)](#phân-quyền-người-dùng-user-roles)
- [Đóng góp (Contributing)](#đóng-góp-contributing)
- [Tuyên bố từ chối trách nhiệm & Quyền riêng tư](#tuyên-bố-từ-chối-trách-nhiệm--quyền-riêng-tư)
- [Giấy phép (License)](#giấy-phép-license)

## Các tính năng chính

- **Sơ đồ trực quan**: Xem gia phả dạng Cây (Tree) và Sơ đồ tư duy (Mindmap).
- **Tìm danh xưng**: Tự động xác định cách gọi tên (Bác, Chú, Cô, Dì...) chính xác.
- **Quản lý thành viên**: Lưu trữ thông tin, avatar và sắp xếp thứ tự nhánh dòng họ.
- **Quản lý quan hệ**: Quản lý các mối quan hệ trong gia phả (hỗ trợ các trường hợp đặc biệt như đa thê, đa phu,...).
- **Thống kê & Sự kiện**: Theo dõi ngày giỗ và các chỉ số nhân khẩu học của dòng họ.
- **Sao lưu dữ liệu**: Xuất/nhập file JSON, CSV, GEDCOM để lưu trữ hoặc di chuyển dễ dàng.
- **Bảo mật**: Phân quyền (Admin, Editor, Member), Auth.js v5 với password hash bcrypt, app-level authorization checks.
- **Đa thiết bị**: Giao diện hiện đại, tối ưu cho cả máy tính và điện thoại.

## Demo

Demo của project gốc giapha-os: [giapha-os.homielab.com](https://giapha-os.homielab.com) (account: `giaphaos@homielab.com` / `giaphaos`).

Bản Họ Hồ - Sơn Thọ này dùng nội bộ gia tộc, không public demo.

## Hình ảnh Giao diện

![Dashboard](docs/screenshots/dashboard.png)

![Danh sách](docs/screenshots/list.png)

![Sơ đồ cây](docs/screenshots/tree.png)

![Mindmap](docs/screenshots/mindmap.png)

![Mindmap](docs/screenshots/stats.png)

![Mindmap](docs/screenshots/kinship.png)

![Mindmap](docs/screenshots/events.png)

More screenshots: [docs/screenshots/](docs/screenshots/)

## Cài đặt và Chạy dự án

Stack mới: **Vercel + Neon Postgres + Auth.js + Vercel Blob** (1 dashboard duy nhất, không pause project, không cần config redirect URL).

### Bước 1 — Setup Vercel + Neon + Blob

1. Tạo tài khoản tại [vercel.com](https://vercel.com) (đăng ký GitHub cho nhanh)
2. Import repository này vào Vercel → tạo project
3. Tab **Storage** → **Create Database** → chọn **Neon Postgres**
   - Region: **Singapore (sin1)** (gần VN nhất)
   - Connect to project (chọn project vừa tạo)
4. Tab **Storage** → **Create Database** → chọn **Blob**
   - Name: `giapha-avatars`
   - Access: **Public**
   - Connect to project

### Bước 2 — Auth.js secret

1. Generate secret: `openssl rand -base64 32`
2. Vào project Vercel → **Settings → Environment Variables**, add:
   - `AUTH_SECRET` = (giá trị vừa generate, all environments)
   - `AUTH_URL` = `http://localhost:3000` (chỉ Development)
   - `SITE_NAME` = `Gia Phả Họ Hồ - Sơn Thọ`

### Bước 3 — Chạy local

Yêu cầu: [Node.js](https://nodejs.org/en) + [Bun](https://bun.sh/)

```bash
git clone https://github.com/Kein95/gia-pha-ho-ho-son-tho.git
cd gia-pha-ho-ho-son-tho
bun install

# Pull env vars từ Vercel về .env.local
npx vercel link
npx vercel env pull .env.local

# Push schema lên Neon Postgres (lần đầu)
bun run db:push

# Tạo admin đầu tiên (bắt buộc — invite-only model)
bun run scripts/seed-admin.ts <email> <password> "<tên>"

# Chạy dev
bun run dev
```

Mở `http://localhost:3000` → login với email + password vừa seed.

### Bước 4 — Deploy production

Vercel tự deploy mỗi push lên `main`. Build script có sẵn — không cần config thêm.

---

## Phân quyền người dùng (User Roles)

Hệ thống có 3 cấp độ phân quyền để dễ dàng quản lý ai được phép cập nhật gia phả:

1. **Admin (Quản trị viên):** Có toàn quyền đối với hệ thống.
2. **Editor (Biên soạn):** Cho phép thêm, sửa, xóa thông tin hồ sơ và các mối quan hệ.
3. **Member (Thành viên):** Chỉ có thể xem sơ đồ gia phả và các thống kê trực quan.

## Đóng góp (Contributing)

Dự án này là mã nguồn mở, hoan nghênh mọi đóng góp, báo cáo lỗi (issues) và yêu cầu sửa đổi (pull requests) để phát triển ứng dụng ngày càng tốt hơn.

## Tuyên bố từ chối trách nhiệm & Quyền riêng tư

> **Dự án này chỉ cung cấp mã nguồn (source code). Không có bất kỳ dữ liệu cá nhân nào được thu thập hay lưu trữ bởi tác giả.**

- **Tự lưu trữ hoàn toàn (Self-hosted):** Khi bạn triển khai ứng dụng, toàn bộ dữ liệu gia phả (tên, ngày sinh, quan hệ, thông tin liên hệ...) được lưu trữ **trong tài khoản Vercel + Neon Postgres + Vercel Blob của chính bạn**. Tác giả dự án không có quyền truy cập vào database đó.

- **Không thu thập dữ liệu:** Không có analytics, không có tracking, không có telemetry, không có bất kỳ hình thức thu thập thông tin người dùng nào được tích hợp trong mã nguồn.

- **Bạn kiểm soát dữ liệu của bạn:** Mọi dữ liệu gia đình, thông tin thành viên đều nằm hoàn toàn trong cơ sở dữ liệu mà bạn tạo và quản lý. Bạn có thể xóa, xuất hoặc di chuyển dữ liệu bất cứ lúc nào (export GEDCOM/JSON/CSV).

- **Demo công khai:** Trang demo tại `giapha-os.homielab.com` sử dụng dữ liệu mẫu hư cấu, không chứa thông tin của người thật. Không nên nhập thông tin cá nhân thật vào trang demo.

## Giấy phép (License)

Dự án được phân phối dưới giấy phép MIT.
