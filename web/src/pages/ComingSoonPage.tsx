import { Construction } from "lucide-react";

interface ComingSoonPageProps {
  label: string;
}

export function ComingSoonPage({ label }: ComingSoonPageProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border px-6 py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Construction className="size-6" strokeWidth={2.25} />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight">{label}</h1>
        <p className="text-sm text-muted-foreground">
          This section hasn't been designed yet — check back soon.
        </p>
      </div>
    </div>
  );
}
