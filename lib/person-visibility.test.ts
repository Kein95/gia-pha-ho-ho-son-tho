import { expect, test } from "bun:test";
import { sanitizePerson, sanitizePersons } from "./person-visibility";

const living = {
  is_deceased: false,
  birth_year: 1985,
  birth_month: 7,
  birth_day: 16,
  note: "chuyện riêng tư",
};

const dead = {
  is_deceased: true,
  birth_year: 1920,
  birth_month: 3,
  birth_day: 2,
  note: "Thủy tổ chi họ",
};

test("khách: người sống bị giấu ngày/tháng sinh và note", () => {
  const out = sanitizePerson(living, false);
  expect(out.birth_month).toBeNull();
  expect(out.birth_day).toBeNull();
  expect(out.note).toBeNull();
});

test("khách: người sống vẫn giữ năm sinh (cây cần mốc thời gian)", () => {
  expect(sanitizePerson(living, false).birth_year).toBe(1985);
});

test("khách: người đã mất hiện đầy đủ", () => {
  const out = sanitizePerson(dead, false);
  expect(out.birth_month).toBe(3);
  expect(out.birth_day).toBe(2);
  expect(out.note).toBe("Thủy tổ chi họ");
});

test("đã đăng nhập: người sống hiện đầy đủ", () => {
  const out = sanitizePerson(living, true);
  expect(out.birth_month).toBe(7);
  expect(out.note).toBe("chuyện riêng tư");
});

test("không sửa object gốc (tránh rò qua tham chiếu dùng chung)", () => {
  sanitizePerson(living, false);
  expect(living.note).toBe("chuyện riêng tư");
  expect(living.birth_month).toBe(7);
});

test("sanitizePersons lọc từng phần tử theo is_deceased", () => {
  const out = sanitizePersons([living, dead], false);
  expect(out[0].note).toBeNull();
  expect(out[1].note).toBe("Thủy tổ chi họ");
});

// Người sống không có ngày/tháng sinh thì computeEvents không sinh sự kiện
// "Sinh nhật" — đây là cơ chế chặn rò ngày sinh qua trang Sự kiện.
test("khách: người sống mất mọi dữ liệu để dựng sự kiện sinh nhật", () => {
  const out = sanitizePerson(living, false);
  expect(out.birth_month && out.birth_day).toBeFalsy();
});
