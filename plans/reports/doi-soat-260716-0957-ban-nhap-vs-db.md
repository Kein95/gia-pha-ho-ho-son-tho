# Đối soát: `gia_pha_ho_ho_ban_nhap.md` ↔ DB production

Ngày: 2026-07-16. Nguồn DB: payload thật của https://giaphahoho.com/dashboard/members (19 người, 18 quan hệ). Nguồn bản nháp: 475 dòng, ~180 tên.

## Kết luận ngắn

DB mới nhập tới **đời 4**, dừng ở nhánh Hồ Thuyết. Bản nháp có ~180 tên tới đời 7. **DB phủ khoảng 10% bản nháp.**

Nhưng vấn đề lớn hơn số lượng: ở phần hai bên CÙNG có, **DB và bản nháp mâu thuẫn nhau về cả tên lẫn quan hệ cha-con**. Hai nguồn này được đọc từ cùng bộ ảnh nhưng ra kết quả khác nhau, nên **không thể coi cái nào là bản đúng** nếu chưa có người trong họ phân xử.

## 1. Mâu thuẫn QUAN HỆ (nghiêm trọng hơn sai tên)

| Người | DB nói cha là | Bản nháp nói cha là | |
|---|---|---|---|
| Hồ Kiêm | **Hồ Tuấn** | **Hồ Túc** | ✗ khác |
| Hồ Nhuyên / Hồ Nhường | **Hồ Tượng** | **Hồ Túc** | ✗ khác |
| Hồ Niệm × Thị Nhuyện | con **Hồ Thuyết** | (Hồ Ái × Thị Nhiêm) con **Hồ Túc** | ✗ khác |

Cặp thứ 3 đáng ngờ nhất: DB có "Hồ Niệm × Thị Nhuyện", bản nháp có "HỒ ÁI × THỊ NHIÊM". Tên vợ gần trùng (Nhuyện/Nhiêm) → nhiều khả năng **cùng một cặp vợ chồng**, nhưng DB gắn vào Hồ Thuyết còn bản nháp gắn vào Hồ Túc. Một trong hai sai.

## 2. Lệch TÊN (nhiều khả năng cùng người, đọc khác nhau)

| DB | Bản nháp | Ghi chú |
|---|---|---|
| Hồ Tượng | HỒ TƯỜNG | dấu nặng/huyền |
| Hồ Suyền | HỒ SUYÊN | |
| Hồ Bầu | HỒ BẢO (?) | nháp đã tự đánh dấu ngờ |
| Hồ Chuyên | HỒ CHUYỂN | |
| Hồ Nhuyên | HỒ NHƯỜNG | lệch nhiều nhất |
| Thị Nhuyện | THỊ NHIÊM | |
| Hồ Kiêm | HỒ KIÊM / KIỂM (?) | nháp để ngỏ 2 cách đọc |

**Khớp chắc (12):** Hồ Khang, Hồ Tạo, Hồ Thị Thịnh, Nguyễn Thị Loan, Hồ Túc, Thị Bằng, Hồ Thuyết, Thị Thiệp, Hồ Tuấn, Hồ Luyện, Thị Chung + quan hệ Hồ Khang→Hồ Tạo, Hồ Tạo×2 bà.

## 3. Chỉ có ở DB, không có trong bản nháp

- **Hồ Niệm** — không tìm được tên tương ứng nào trong nháp. Xem mục 1.

## 4. Có trong bản nháp, THIẾU ở DB

Cùng đời với dữ liệu DB đã có (nên bổ sung trước):

- **HỒ VƠI / HỒ VỢI (?)** — con Hồ Tạo. DB có 6 con, nháp có 7.
- Con của Hồ Túc: **HỒ XINH**, **HỒ ÁI**, **HỒ HUYỀN**
- **THỊ KIÊN** — vợ Hồ Nhường
- Con của Hồ Thuyết: **HỒ HẢI**, **HỒ HUYỀN**
- Con của Hồ Suyên: **HỒ TIẾM / TIÊM (?)**, **HỒ BIẾM × CAO THỊ THAO**

Nghịch lý đáng chú ý: **Thị Nhuyện (≈ Thị Nhiêm) có trong DB nhưng chồng bà — Hồ Ái — thì không**. DB thay bằng "Hồ Niệm".

Chưa nhập (~160 người, đời 5-7): toàn bộ PHẦN A mục 4-5, PHẦN B, PHẦN C mục 9, PHẦN D (nhánh Hồ Trâm, Hồ Cựu, Hồ Văn Phát, Hồ Công Bôn/Bản), mục 14 (6 tên rời).

## 5. Điểm hai nguồn ĐỒNG Ý là chưa chắc

Note trong DB và bản nháp trùng nhau ở các nghi vấn:

- Ký hiệu `(1)`/`(2)` dưới Hồ Tạo: DB ghi "Đời/cha cần xác minh (frame ghi dấu '(1)')" — nháp mục 16.1 hỏi đúng câu đó.
- Hồ Thuyết: DB ghi "Quan hệ cha-con với Hồ Tạo: cần xác minh (có thể là nhánh anh em)". Bản nháp lại xếp Hồ Thuyết là con Hồ Tạo **không ghi ngờ** → nháp đang chắc hơn dữ liệu cho phép.
- Hồ Bầu: DB "Cha: cần xác minh"; nháp ghi HỒ BẢO (?) là con Hồ Tạo.
- Họ của các bà: DB ghi "họ chưa rõ" cho Thị Bằng, Thị Thiệp, Thị Nhuyện, Thị Chung — nháp cũng chỉ ghi "THỊ ...".
- Ngày giỗ bà Nguyễn Thị Loan: DB "26/11 — vài frame đọc 26/7, cần xác minh"; nháp ghi `(26/11)` không nhắc dị bản → **nháp mất thông tin này**.

## 6. Đề xuất

1. **Đừng import bản nháp đè lên DB.** Sẽ tạo trùng lặp (Hồ Ái vs Hồ Niệm) và ghi sai quan hệ.
2. Chốt 3 mâu thuẫn quan hệ ở mục 1 với người trong họ trước — chúng quyết định hình dạng cây, sửa sau rất đắt.
3. Chốt 7 tên lệch ở mục 2 bằng cách xem lại ảnh gốc.
4. Sau khi chốt, nhập tiếp theo thứ tự: con Hồ Tạo còn thiếu → đời 4 → nhánh Hồ Suyên → phần D.
5. Bổ sung dị bản ngày giỗ bà Loan vào bản nháp (mục 5).

## Câu hỏi chưa giải quyết

1. "Hồ Niệm" trong DB là ai? Là cách đọc khác của "Hồ Ái", hay là người thứ 20 mà bản nháp bỏ sót?
2. Bản nháp này là nguồn mới hơn hay cũ hơn dữ liệu DB? Ai nhập DB, đọc từ cùng bộ ảnh hay nguồn khác?
3. File `gia_pha_ho_ho_ban_nhap.md` hiện **không bị gitignore** — commit trước có tên "gitignore digitized family-data draft (private)" cho thấy loại dữ liệu này từng bị coi là riêng tư. Có định commit file này lên GitHub public không?
