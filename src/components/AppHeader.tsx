import { Eye, Menu, X, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { label: "Home", path: "/" },
  { label: "Report Issue", path: "/report" },
  { label: "Community Feed", path: "/feed" },
  { label: "My Tickets", path: "/my-tickets" },
  { label: "Leaderboard", path: "/leaderboard" },
  { label: "Admin", path: "/admin" },
];

export default function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, displayName, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-card/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-lg gradient-accent flex items-center justify-center shadow-md group-hover:animate-pulse-glow transition-shadow">
            <Eye className="h-5 w-5 text-accent-foreground" />
          </div>
          <span className="text-xl font-bold text-gradient-navy tracking-tight">CivicEye AI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <Button
                variant={location.pathname === item.path ? "secondary" : "ghost"}
                size="sm"
                className="text-sm"
              >
                {item.label}
              </Button>
            </Link>
          ))}
          {isLoggedIn && (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
              <span className="text-sm font-medium text-foreground">{displayName}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </nav>

        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card p-4 space-y-1 animate-fade-in-up">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
              <Button
                variant={location.pathname === item.path ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                {item.label}
              </Button>
            </Link>
          ))}
          {isLoggedIn && (
            <Button variant="ghost" className="w-full justify-start text-destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" /> Logout ({displayName})
            </Button>
          )}
        </div>
      )}
    </header>
  );
}
