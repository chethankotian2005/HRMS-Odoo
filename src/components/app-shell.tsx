"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  User,
  CalendarCheck,
  CalendarOff,
  Banknote,
  Users,
  ClipboardCheck,
  ShieldAlert,
  Menu,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type Role = "ADMIN" | "HR" | "EMPLOYEE";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["EMPLOYEE"] },
  { name: "Admin Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "HR"] },
  { name: "Profile", href: "/employees/me", icon: User, roles: ["EMPLOYEE", "ADMIN", "HR"] },
  { name: "Attendance", href: "/attendance", icon: CalendarCheck, roles: ["EMPLOYEE", "ADMIN", "HR"] },
  { name: "Leave", href: "/leave", icon: CalendarOff, roles: ["EMPLOYEE", "ADMIN", "HR"] },
  { name: "Payroll", href: "/employees/me/payroll", icon: Banknote, roles: ["EMPLOYEE", "ADMIN", "HR"] },
  // Admin / HR Specific
  { name: "Leave Approvals", href: "/admin/leave", icon: ClipboardCheck, roles: ["ADMIN", "HR"] },
  { name: "Attendance Admin", href: "/admin/attendance", icon: CalendarCheck, roles: ["ADMIN", "HR"] },
  { name: "Payroll Admin", href: "/admin/payroll", icon: Banknote, roles: ["ADMIN", "HR"] },
  { name: "Audit Log", href: "/admin/audit", icon: ShieldAlert, roles: ["ADMIN"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = session?.user?.role as Role;

  const filteredNav = navItems.filter((item) => item.roles.includes(role));

  // Determine standard base href for active highlighting (e.g., "/leave" matches "/leave/apply")
  const isActive = (href: string) => {
    if (href === "/dashboard" || href === "/admin/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const NavLinks = () => (
    <nav className="space-y-1">
      {filteredNav.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary tracking-tight">
            <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-black">D</span>
            </div>
            Dayflow
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <NavLinks />
        </div>
        <div className="border-t p-4 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={(session?.user as any)?.image || ""} />
              <AvatarFallback>{session?.user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{(session?.user as any)?.name || session?.user?.email?.split('@')[0]}</span>
              <span className="text-xs text-muted-foreground truncate">{session?.user?.email}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs bg-muted/50">{role}</Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => signOut({ callbackUrl: "/login" })} title="Log out">
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Log out</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Shell & Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger className="md:hidden p-2 hover:bg-muted rounded-md">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex h-14 items-center border-b px-4">
                  <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary tracking-tight">
                    <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
                      <span className="text-primary-foreground text-xs font-black">D</span>
                    </div>
                    Dayflow
                  </Link>
                </div>
                <div className="flex-1 overflow-y-auto py-4 px-3 h-[calc(100vh-140px)]">
                  <NavLinks />
                </div>
                <div className="border-t p-4 absolute bottom-0 w-full bg-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={(session?.user as any)?.image || ""} />
                        <AvatarFallback>{session?.user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <Badge variant="outline" className="text-[10px]">{role}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: "/login" })}>
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <Link href="/" className="font-bold text-lg text-primary tracking-tight md:hidden">
              Dayflow
            </Link>
          </div>
          <Avatar className="h-8 w-8 md:hidden">
            <AvatarImage src={(session?.user as any)?.image || ""} />
            <AvatarFallback>{session?.user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </header>

        <main className="flex-1 overflow-y-auto bg-muted/20">
          {children}
        </main>
      </div>
    </div>
  );
}
