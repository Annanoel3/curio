import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Sparkles, Library, Settings, Home } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/AuthContext";

export default function Layout() {
  const location = useLocation();
  const { user } = useAuth();
  const initials = (user?.full_name || user?.email || "?")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/appraise", icon: Sparkles, label: "Appraise" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div
      className="min-h-screen bg-background"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {/* Desktop header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/60" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
              <Library className="w-4 h-4 text-background" />
            </div>
            <span className="font-serif text-xl font-semibold tracking-tight">
              Curio
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link to="/appraise">
              <Button
                variant={location.pathname === "/appraise" ? "default" : "ghost"}
                size="sm"
                className="gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">AI Appraise</span>
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-2">
                  <Avatar className="w-8 h-8 border border-border">
                    <AvatarFallback className="text-xs bg-secondary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs">
                  <div className="font-medium truncate">{user?.full_name}</div>
                  <div className="text-muted-foreground truncate">{user?.email}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="w-3.5 h-3.5" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => base44.auth.logout()}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </header>

      <main className="pb-28 md:pb-0">
        <Outlet />
      </main>

      <footer className="hidden md:block border-t border-border/60 mt-24">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 text-xs text-muted-foreground flex items-center justify-between">
          <span>Curio · Your collection, curated.</span>
          <span className="font-serif italic">est. 2026</span>
        </div>
      </footer>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/60 flex"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? "text-foreground" : "text-muted-foreground"}`} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}