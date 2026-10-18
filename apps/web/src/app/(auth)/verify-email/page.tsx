"use client";
import { useI18n } from '@/components/i18n/language-provider';

import { ButtonLink } from "@daify/ui";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function VerifyEmailPage() {
  const { t } = useI18n();
  const token = useSearchParams().get("token") ?? "";
  const request = useRef<{ token: string; promise: Promise<boolean> } | null>(null);
  const [result, setResult] = useState<{ token: string; success: boolean } | null>(null);
  const state = !token ? "error" : result?.token === token ? result.success ? "success" : "error" : "pending";

  useEffect(() => {
    if (!token) return;
    let active = true;
    // Re-subscribe to the same request when Strict Mode runs the effect again.
    if (request.current?.token !== token) {
      request.current = { token, promise: fetch("/api/auth/verify-email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) }).then(response => response.ok).catch(() => false) };
    }
    void request.current.promise.then(success => { if (active) setResult({ token, success }); });
    return () => { active = false; };
  }, [token]);

  return <div style={{ width: "min(100%, 32rem)", padding: "clamp(1.5rem, 5vw, 4rem)" }}>
    <span className="eyebrow">{t("Email verification")}</span>
    <h1>{state === "pending" ? t("Verifying your email…") : state === "success" ? t("Email verified.") : t("We couldn’t verify this link.")}</h1>
    <p>{state === "pending" ? t("One moment while we verify your email.") : state === "success" ? t("Your account is ready. You can now log in.") : t("The link may have expired or already been used, or the service may be unavailable. Try logging in if you already verified your email, or request a new link.")}</p>
    {state !== "pending" ? <ButtonLink href="/login">{t("Continue to login")}</ButtonLink> : null}
    {state === "error" ? <ButtonLink variant="secondary" href="/resend-verification">{t("Request a new link")}</ButtonLink> : null}
  </div>;
}
