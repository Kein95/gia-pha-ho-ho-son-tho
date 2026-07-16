import type { NextAuthConfig } from "next-auth";

// Middleware-safe config — không import DB, chạy được trên Edge
export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      // Cây gia phả xem công khai; chỉ khu quản trị mới cần đăng nhập.
      // Mỗi trang trong danh sách này còn tự gọi requireAdmin() ở server —
      // đây chỉ là lớp chặn sớm, không phải lớp bảo vệ duy nhất.
      const isProtected = [
        "/dashboard/users",
        "/dashboard/data",
        "/dashboard/lineage",
      ].some((p) => nextUrl.pathname.startsWith(p));
      const isLoginPage = nextUrl.pathname.startsWith("/login");

      if (isProtected && !isLoggedIn) return false;
      if (isLoginPage && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.isActive = user.isActive;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "admin" | "editor" | "member";
        session.user.isActive = token.isActive as boolean;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
