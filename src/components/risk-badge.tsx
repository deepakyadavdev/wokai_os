import { Badge } from "@/components/ui/badge";
import type { RiskLevel } from "@/lib/types";

export function RiskBadge({ level }: { level: RiskLevel }) {
  const variant =
    level === "CRITICAL" ? "danger" : level === "HIGH" ? "warning" : level === "MEDIUM" ? "signal" : "success";
  return <Badge variant={variant}>{level}</Badge>;
}
