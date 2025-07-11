
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppLogo } from "@/components/app-logo";

export default function BypassLoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Define um usuário admin padrão e redireciona para o dashboard
    const defaultAdminUser = { name: "Admin Dev", email: "dev@actnexus.com", role: "admin" };
    localStorage.setItem('actnexus_user', JSON.stringify(defaultAdminUser));
    
    // Redireciona para o dashboard
    router.replace("/dashboard");
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-4 text-center">
            <AppLogo />
            <p className="text-muted-foreground">Redirecionando...</p>
        </div>
    </main>
  );
}
