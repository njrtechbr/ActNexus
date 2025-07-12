
"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Book,
  Users,
  Settings,
  BrainCircuit,
  ClipboardCheck,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppLogo } from "@/components/app-logo";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import Loading from "./loading";

interface UserProfile {
    role: string;
}

const menuItems = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/dashboard/conferencia-minuta", label: "Conferir Minuta", icon: ClipboardCheck },
  { href: "/dashboard/livros", label: "Livros", icon: Book },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users },
];

const adminMenuItems = [
    { href: "/dashboard/auditoria-ia", label: "Auditoria IA", icon: BrainCircuit },
    { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem("actnexus_user");
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      router.replace("/");
    }
    setIsCheckingAuth(false);
  }, [router]);

  const isLinkActive = (path: string, itemHref: string) => {
    if (itemHref === '/dashboard') {
        return path === itemHref;
    }
    return path.startsWith(itemHref);
  }

  if (isCheckingAuth) {
    return <Loading />;
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <AppLogo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  asChild
                  isActive={isLinkActive(pathname, item.href)}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {user?.role === 'admin' && adminMenuItems.map((item) => (
                 <SidebarMenuItem key={item.label}>
                 <SidebarMenuButton
                   asChild
                   isActive={pathname.startsWith(item.href)}
                   tooltip={item.label}
                 >
                   <Link href={item.href}>
                     <item.icon />
                     <span>{item.label}</span>
                   </Link>
                 </SidebarMenuButton>
               </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
