import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Reset password" };

export default function Page() {
  return <AuthForm mode="forgot" />;
}
