import { cookies } from "next/headers";
import { requireSession } from "@/lib/session";
import { apiFetch } from "@/lib/api";
import { MfaSettings } from "@/components/auth/mfa-settings";
import styles from "../overview.module.css";

export const metadata = { title: "Account security", robots: { index: false, follow: false } };

export default async function SecurityPage() {
  await requireSession();
  const response = await apiFetch("/api/v1/auth/mfa", { headers: { cookie: (await cookies()).toString() } });
  if (!response.ok) throw new Error("Your security settings could not be loaded.");
  const status = await response.json() as { enabled: boolean; recoveryCodesRemaining: number };
  return <main id="main-content" className={styles.main}>
    <header className={styles.heading}><div><span className="eyebrow">Your account</span><h1>Account security.</h1><p>Protect your account with an authenticator and recovery codes.</p></div></header>
    <MfaSettings initialEnabled={status.enabled} initialRemaining={status.recoveryCodesRemaining} />
  </main>;
}
