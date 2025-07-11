
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppLogo } from "@/components/app-logo";
import { Loader2 } from "lucide-react";

export default function BypassLoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Define um usuário admin padrão e redireciona para o dashboard
    const defaultAdminUser = { name: "Admin Dev", email: "dev@actnexus.com", role: "admin" };
    localStorage.setItem('actnexus_user', JSON.stringify(defaultAdminUser));
    
    // Redireciona para o dashboard
    router.push("/dashboard");
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-4 text-center">
            <AppLogo />
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Iniciando em modo de desenvolvimento...</span>
            </div>
        </div>
    </main>
  );
}
