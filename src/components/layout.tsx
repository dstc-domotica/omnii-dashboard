import { Link, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/hooks/useTheme";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const router = useRouterState();
  const currentPath = router.location.pathname;
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (path: string) => {
    return currentPath === path;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-medium">Omnii Server</h1>
              <p className="text-xs text-muted-foreground">Home Assistant Management</p>
            </div>
            <nav className="flex items-center gap-2">
              <Link to="/">
                <Button variant={isActive("/") ? "default" : "ghost"} size="sm">
                  Dashboard
                </Button>
              </Link>
              <Link to="/enrollment">
                <Button variant={isActive("/enrollment") ? "default" : "ghost"} size="sm">
                  Enrollment
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                title={mounted && theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {mounted && theme === "dark" ? "Light" : "Dark"}
              </Button>
            </nav>
          </div>
        </div>
      </header>
      <main className="pb-12">{children}</main>
    </div>
  );
}

