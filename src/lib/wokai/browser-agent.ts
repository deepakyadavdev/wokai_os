import type { BrowserJob } from "@/lib/types";

export function createBrowserPlan(goal: string): BrowserJob {
  const isApply = /apply|internship|form|submit/i.test(goal);
  return {
    id: `browser-${Date.now()}`,
    goal,
    currentStep: isApply ? "Preparing form-fill plan" : "Opening target website in safe demo mode",
    status: isApply ? "NEEDS_APPROVAL" : "QUEUED",
    approvalRequired: true,
    steps: [
      { label: "Resolve target website", status: "COMPLETED" },
      { label: "Inspect fields and requirements", status: "COMPLETED" },
      { label: "Prepare inputs and uploads", status: "RUNNING" },
      { label: "Pause before submit or payment", status: "NEEDS_APPROVAL" }
    ]
  };
}

export async function runLocalBrowserAgent(goal: string) {
  const endpoint = process.env.LOCAL_BROWSER_AGENT_URL;
  if (!endpoint || process.env.BROWSER_AGENT_MODE !== "local") {
    return createBrowserPlan(goal);
  }

  const response = await fetch(`${endpoint.replace(/\/$/, "")}/jobs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ goal, approvalPolicy: "pause-before-sensitive" })
  });

  if (!response.ok) return createBrowserPlan(goal);
  return (await response.json()) as BrowserJob;
}
