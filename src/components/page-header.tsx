import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function PageHeader({
  title,
  description,
  icon: Icon,
  status
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  status?: string;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-card text-primary shadow-glow">
          <Icon />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">{title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      {status ? <Badge variant="outline">{status}</Badge> : null}
    </div>
  );
}
