import { auth } from "@/auth";
import { redirect } from "next/navigation";

// Get current session user (null if not logged in)
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

// Throw 401 redirect if not authenticated
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Throw 403 if not admin
export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "admin") {
    throw new Error("Forbidden: Admin role required");
  }
  return user;
}

// Throw 403 if not admin or editor
export async function requireEditor() {
  const user = await requireAuth();
  if (user.role !== "admin" && user.role !== "editor") {
    throw new Error("Forbidden: Admin or Editor role required");
  }
  return user;
}

/**
 * Khách chưa đăng nhập chỉ được xem dữ liệu công khai của người còn sống.
 * Người đã mất hiển thị đầy đủ — dữ liệu gia phả, không còn là dữ liệu cá nhân.
 * Dùng kèm sanitizePerson() ở lib/person-visibility.
 */
export async function canSeeSensitive() {
  return (await getCurrentUser()) !== null;
}

export async function isAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin";
}

export async function isEditor() {
  const user = await getCurrentUser();
  return user?.role === "admin" || user?.role === "editor";
}
