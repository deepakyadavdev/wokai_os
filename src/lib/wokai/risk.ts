import type { RiskLevel, WokaiTask } from "@/lib/types";

export function riskWeight(level: RiskLevel) {
  return {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4
  }[level];
}

export function calculateTaskRisk(task: Pick<WokaiTask, "deadline" | "progress" | "priority">): RiskLevel {
  const hoursLeft = (new Date(task.deadline).getTime() - Date.now()) / 36e5;
  if (hoursLeft <= 6 && task.progress < 80) return "CRITICAL";
  if (hoursLeft <= 24 && task.progress < 70) return "HIGH";
  if (hoursLeft <= 72 && task.progress < 50) return "MEDIUM";
  return task.priority;
}

export function highestRisk(tasks: WokaiTask[]): RiskLevel {
  return tasks
    .map((task) => calculateTaskRisk(task))
    .sort((a, b) => riskWeight(b) - riskWeight(a))[0] ?? "LOW";
}

export function riskCopy(level: RiskLevel) {
  switch (level) {
    case "CRITICAL":
      return "Critical rescue needed";
    case "HIGH":
      return "High deadline danger";
    case "MEDIUM":
      return "Watch list";
    default:
      return "Safe";
  }
}
