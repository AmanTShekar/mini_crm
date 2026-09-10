export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  // Intentionally shell-free: /admin/login renders clean and standalone.
  // Everything else lives under (shell)/layout.tsx with the sidebar,
  // which only ever renders after middleware auth passes.
  return <>{children}</>;
}
