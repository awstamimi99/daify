import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Start free trial", robots: { index: false, follow: false } };
export default function SignupPage() { return <AuthForm mode="signup" />; }
