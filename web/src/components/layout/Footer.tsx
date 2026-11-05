import { Logo } from "@/components/Logo";
import type { User } from "@/types/user";

interface FooterProps {
  user?: User | null;
}

export function Footer({ user }: FooterProps) {
  const companyName = user?.company_name || "Home Care";

  return (
    <footer className="mt-auto border-t border-border bg-background print:hidden">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-center sm:flex-row sm:px-6 sm:text-right">
        <Logo size="sm" companyName={user?.company_name} />

        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">
            © 2026 {companyName}. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground italic">
            Building excellence, one project at a time
          </p>
          <p className="text-xs text-muted-foreground">
            Developed by BioGenAI Solutions LLC — Agentic AI Automation &amp; Web Applications Development.
          </p>
        </div>
      </div>
    </footer>
  );
}
