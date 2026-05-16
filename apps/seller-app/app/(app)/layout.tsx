import { AppShell } from "@/src/components/shell/AppShell";

/**
 * Authenticated app shell. The proxy.ts middleware already redirects
 * unauthenticated users to /login, so we don't need to re-check here.
 */
export default function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
