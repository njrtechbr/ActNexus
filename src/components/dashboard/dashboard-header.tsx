
"use client";

import { useState, useEffect } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Settings, LogOut, UserCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "../ui/badge";

interface UserProfile {
  name: string;
  email: string;
  role: string;
}

export function DashboardHeader() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem("actnexus_user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("actnexus_user");
    router.push("/");
  };

  const getRoleName = (role: string) => {
    switch (role) {
        case 'admin': return 'Administrador';
        case 'employee': return 'Funcionário';
        default: return 'Usuário';
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="flex-1">
        {/* Breadcrumbs or other header content can go here */}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9 border">
              <AvatarImage src="https://placehold.co/100x100.png" alt={user?.name || "User"} data-ai-hint="person avatar"/>
              <AvatarFallback>{user?.name?.[0].toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
            {user ? (
                <>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-2">
                            <div>
                                <p className="text-sm font-medium leading-none">{user.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {user.email}
                                </p>
                            </div>
                             <Badge variant="outline" className="w-fit gap-1 text-xs">
                                <UserCheck className="h-3 w-3"/>
                                {getRoleName(user.role)}
                            </Badge>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                     <Link href="/dashboard/configuracoes">
                        <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Configurações</span>
                        </DropdownMenuItem>
                     </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sair</span>
                    </DropdownMenuItem>
                </>
            ) : (
                <DropdownMenuLabel>Carregando...</DropdownMenuLabel>
            )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
