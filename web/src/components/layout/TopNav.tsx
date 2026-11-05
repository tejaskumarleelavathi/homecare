import { CalendarCheck, ClipboardList, HelpCircle, Home as HomeIcon, HousePlus, LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type NavKey = "home" | "work-status" | "inspections" | "help";

interface NavItem {
  key: NavKey;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  enabled: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "Home", icon: HomeIcon, enabled: true },
  { key: "work-status", label: "Work Status", icon: ClipboardList, enabled: true },
  { key: "inspections", label: "Inspections", icon: CalendarCheck, enabled: true },
  { key: "help", label: "Help & About", icon: HelpCircle, enabled: true },
];

import type { User as UserType } from "@/types/user";

interface TopNavProps {
  user: UserType;
  activeTab: NavKey;
  onTabChange: (key: NavKey) => void;
  onLogout: () => void;
}

export function TopNav({ user, activeTab, onTabChange, onLogout }: TopNavProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur-md shadow-xs transition-shadow print:hidden">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 pt-3 sm:px-6">
        <button
          type="button"
          onClick={() => onTabChange("home")}
          className="justify-self-start cursor-pointer text-left transition-opacity hover:opacity-80 focus:outline-none"
          title={`Go to ${user.company_name} Home`}
        >
          <Logo companyName={user.company_name} showTagline={true} />
        </button>

        <button
          type="button"
          onClick={() => onTabChange("home")}
          className="flex items-center justify-center gap-2 cursor-pointer transition-opacity hover:opacity-80 focus:outline-none"
          title="Go to Home"
        >
          <HousePlus className="size-5 text-primary" strokeWidth={2.25} />
          <span className="font-heading text-lg font-semibold tracking-tight whitespace-nowrap">
            Home Care
          </span>
        </button>

        <div className="justify-self-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition-colors hover:bg-muted"
              >
                <Avatar className="size-7">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold uppercase">
                    {user.username?.charAt(0) || user.company_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline">{user.username}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-xs font-semibold text-foreground">{user.company_name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                <div className="mt-1.5 inline-flex items-center rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  Trial valid until {user.expire_date}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} variant="destructive">
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <nav className="mx-auto flex max-w-7xl items-center justify-center gap-1 px-4 py-2 sm:px-6">
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === activeTab;
          return (
            <button
              key={item.key}
              type="button"
              disabled={!item.enabled}
              onClick={() => item.enabled && onTabChange(item.key)}
              className={cn(
                "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
                !item.enabled && "cursor-not-allowed text-muted-foreground/50 hover:bg-transparent hover:text-muted-foreground/50",
              )}
            >
              {item.icon ? <item.icon className="size-4" /> : null}
              {item.label}
              {!item.enabled && (
                <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground/70 uppercase">
                  Soon
                </span>
              )}
              {isActive && (
                <span className="absolute inset-x-2 -bottom-[9px] h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
