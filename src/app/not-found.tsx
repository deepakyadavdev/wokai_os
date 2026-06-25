import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground">
      <h1 className="text-3xl font-semibold">This WokAI surface does not exist yet.</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Head back to the dashboard to plan, rescue, schedule, email, search, or queue work.
      </p>
      <Button asChild>
        <Link href="/dashboard">Open dashboard</Link>
      </Button>
    </main>
  );
}
