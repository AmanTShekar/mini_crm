import { withAuth } from "next-auth/middleware";

// Protects everything under /admin except the login page itself.
// (Guarding /admin/login from a layout causes a self-redirect loop.)
export default withAuth({
  pages: { signIn: "/admin/login" },
});

export const config = {
  matcher: ["/admin", "/admin/((?!login).*)"],
};
