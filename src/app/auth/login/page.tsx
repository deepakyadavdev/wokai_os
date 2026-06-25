import { LoginCard } from "@/components/auth/login-card";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0f1e] px-4">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.2),transparent_50%),radial-gradient(ellipse_at_bottom_right,hsl(166_79%_30%/0.15),transparent_50%)]" />
      <LoginCard />
    </main>
  );
}

