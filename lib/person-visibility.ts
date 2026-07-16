/**
 * Lọc dữ liệu person trước khi gửi ra ngoài. Thuần tuý, không phụ thuộc session
 * hay DB — để test độc lập được. Bên gọi tự lấy `canSee` từ
 * canSeeSensitive() ở lib/auth/permissions.
 */

/** Đủ dùng cho cả Person đầy đủ lẫn row rút gọn mà trang sự kiện select ra. */
type Sanitizable = {
  is_deceased: boolean;
  birth_month: number | null;
  birth_day: number | null;
  note?: string | null;
};

/**
 * Với người còn sống: bỏ note (ghi chú tự do, có thể chứa chuyện riêng tư) và
 * ngày/tháng sinh. Giữ năm sinh để cây gia phả còn mốc thời gian — ngày sinh
 * đầy đủ mới là phần định danh cần giấu.
 *
 * Lọc ở server, không ở component: component chỉ ẩn khi render, dữ liệu vẫn
 * được gửi về client và đọc được trong DevTools.
 *
 * Bỏ birth_month/birth_day cũng đồng thời triệt sự kiện "Sinh nhật" của người
 * sống ở computeEvents — không cần lọc event riêng.
 */
export function sanitizePerson<T extends Sanitizable>(
  p: T,
  canSee: boolean,
): T {
  if (canSee || p.is_deceased) return p;
  return { ...p, note: null, birth_month: null, birth_day: null };
}

export function sanitizePersons<T extends Sanitizable>(
  list: T[],
  canSee: boolean,
): T[] {
  return list.map((p) => sanitizePerson(p, canSee));
}
