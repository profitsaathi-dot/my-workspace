"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@workspace/ui";
import { useT } from "@/src/i18n/useT";

/**
 * Client-side links into the email/password auth flow.
 *   - SignInButton    → /login (existing seller)
 *   - GetStartedButton → /signup (new seller; signup auto-redirects to /onboarding)
 *
 * Auth lives entirely in the seller-app + Spring backend now — no SSO
 * redirect, no `signIn("...")` round-trip. These trigger ordinary
 * client-side navigations.
 */

export function SignInButton({
  className,
  size,
  variant,
  children,
}: {
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "link";
  children?: React.ReactNode;
}) {
  const t = useT();
  const router = useRouter();
  return (
    <Button
      type="button"
      onClick={() => router.push("/login")}
      size={size}
      variant={variant}
      className={className}
    >
      {children ?? t("landing.signIn")}
    </Button>
  );
}

export function GetStartedButton({
  className,
  size,
  variant,
  children,
}: {
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "link";
  children?: React.ReactNode;
}) {
  const t = useT();
  const router = useRouter();
  return (
    <Button
      type="button"
      onClick={() => router.push("/signup")}
      size={size}
      variant={variant}
      className={className}
    >
      {children ?? t("landing.getStarted")}
      <ArrowRight className="size-4" />
    </Button>
  );
}
