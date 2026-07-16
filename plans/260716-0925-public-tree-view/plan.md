# Mở gia phả cho xem công khai, login chỉ để sửa

Status: chờ duyệt 1 câu hỏi (birth_year) → implement

## Mục tiêu

Khách vãng lai xem được cây gia phả không cần login. Login chỉ dành cho admin/editor sửa.

## Quyết định đã chốt với user

- Ẩn `note` + ngày sinh của **người còn sống** với khách chưa login. Người đã mất hiện đầy đủ.
- Chặn Google index (noindex + robots.txt).

## Hiện trạng (đã verify bằng đọc code)

- Tường login duy nhất: `app/dashboard/layout.tsx:16` `requireAuth()`, cộng `auth.config.ts` chặn path `/dashboard`.
- `app/dashboard/users|data|lineage/page.tsx` **mỗi trang tự có `requireAdmin()`** → gỡ tường layout KHÔNG làm hở chúng.
- `stats|kinship|events` không guard → đúng nhóm public (code tự đặt tên `publicFeatures` ở `dashboard/page.tsx`).
- `members/page.tsx:20` đã có sẵn `canEdit` theo role.
- Dữ liệu nhạy cảm (phone/nghề/nơi ở) đã ở bảng riêng `personDetailsPrivate`, `getPersonPrivateDetails()` có `requireAdmin()` → an toàn sẵn.

## Chỗ rò cần bịt (mọi đường đọc person)

1. `app/dashboard/members/page.tsx` — mapper inline, trả `note` + ngày sinh.
2. `app/actions/relationship.ts` — `mapPersonRow()` (dùng bởi getPersonById, searchPersons, getRecentPersons, getChildrenMarriages).
3. `app/actions/relationship.ts` — `getPersonRelationships()` có 2 mapper inline riêng, KHÔNG đi qua mapPersonRow.
4. **`utils/eventHelpers.ts` computeEvents** — trang Sự kiện + launchpad hiện "Sinh nhật {tên} · dd/mm" của người sống. Bịt cây mà quên chỗ này là vẫn lộ.
5. `app/actions/persons-list.ts`, `getPersonById` — không có auth check; hiện an toàn nhờ caller nằm trong /dashboard, nhưng là server action nên phải tự guard.

## Cách làm (fix 1 chỗ, mọi caller đi qua)

- Thêm `lib/person-visibility.ts`: `canSeeSensitive()` (session-based) + `sanitizePerson(p, canSee)`.
- Áp ở **server**, không phải ở component (component-level masking vẫn gửi data về client, xem được trong DevTools).
- Gỡ `requireAuth()` khỏi dashboard layout → `getCurrentUser()`, render shell public khi chưa login.
- `auth.config.ts`: đổi vùng protected từ `/dashboard` → `/dashboard/users|data|lineage`.
- Anon: lọc bỏ event type `birthday` khỏi computeEvents.
- `app/robots.ts` + metadata noindex.
- Landing CTA: "Đăng nhập để xem thông tin" → "Xem gia phả", nút Đăng nhập phụ cho admin.

## Rủi ro

- Đây là đẩy dữ liệu người thật ra Internet, Google cache rồi là không undo được → làm noindex NGAY trong cùng commit, không để lần sau.
- Phải verify bằng cách curl thật ở trạng thái chưa login, không tin vào việc UI không render.

## Câu hỏi chưa giải quyết

- `birth_year` của người còn sống: ẩn luôn hay giữ? Ẩn hết thì cây mất mốc thời gian, thẻ trông như thiếu dữ liệu. Giữ năm + ẩn ngày/tháng thì bỏ được phần định danh mạnh nhất mà cây vẫn đọc được.
