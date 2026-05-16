/**
 * Layout for public, unauthenticated routes (login, onboarding).
 * Renders without the AppShell sidebar/topbar chrome.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
