import { Link, useNavigate } from "@tanstack/react-router";
import { Leaf, LogOut, MessageCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useVerify } from "@/components/verify-dialog";
import { clearStudent, useStudent } from "@/lib/student-session";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Leaf className="size-4" />
      </span>
      <span className="text-lg">ReDorm</span>
    </Link>
  );
}

export function SiteHeader() {
  const stored = useStudent();
  const { requireVerified, openVerify } = useVerify();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 text-sm sm:flex">
            <Link
              to="/feed"
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground font-medium" }}
            >
              Browse
            </Link>
            <Link
              to="/inbox"
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground font-medium" }}
            >
              Messages
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => requireVerified(() => navigate({ to: "/sell" }))}
          >
            <Plus /> <span className="hidden sm:inline">List an item</span>
            <span className="sm:hidden">List</span>
          </Button>
          <Button asChild variant="ghost" size="icon" className="sm:hidden" aria-label="Messages">
            <Link to="/inbox">
              <MessageCircle />
            </Link>
          </Button>
          {stored === undefined ? (
            <div className="size-8" />
          ) : stored ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary-strong"
                  aria-label="Your account"
                >
                  {stored.student.name.slice(0, 1).toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="font-medium">{stored.student.name}</div>
                  <div className="text-xs text-muted-foreground">{stored.student.email}</div>
                  <div className="text-xs text-muted-foreground">{stored.student.dorm}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => clearStudent()}>
                  <LogOut /> Sign out on this device
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" variant="outline" onClick={openVerify}>
              Verify
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
