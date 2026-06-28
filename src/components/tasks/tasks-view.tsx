'use client';

import * as React from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  PlusCircle,
  AlertTriangle,
  BarChart3,
  MessageSquare,
  Loader2,
} from 'lucide-react';

import { cn, formatRelativeTime } from '@/lib/utils';
import { useAuth } from '@/components/auth/auth-provider';
import { useWorkspaceData } from '@/hooks/use-workspace-data';
import { RiskBadge } from '@/components/risk-badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { WokaiTask } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Tab = 'urgent' | 'upcoming' | 'completed';

const SOURCE_BADGE: Record<string, string> = {
  chat: 'bg-emerald-500/15 text-emerald-400',
  email: 'bg-blue-500/15 text-blue-400',
  calendar: 'bg-purple-500/15 text-purple-400',
  manual: 'bg-zinc-500/15 text-zinc-400',
  demo: 'bg-muted/50 text-muted-foreground',
};

function SourceBadge({ source }: { source: WokaiTask['source'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize',
        SOURCE_BADGE[source] ?? SOURCE_BADGE.demo,
      )}
    >
      {source}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Task Card
// ---------------------------------------------------------------------------

function TaskCard({ task }: { task: WokaiTask }) {
  const completedSubtasks = Math.round((task.progress / 100) * task.subtasks.length);

  return (
    <div className="rounded-xl border border-border/50 bg-card/80 p-5 hover:border-border transition-colors group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <RiskBadge level={task.priority || "LOW"} />
            <h3 className="font-semibold text-foreground truncate">{task.title}</h3>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
        </div>
        {task.deadline && (
          <div className="text-right text-xs text-muted-foreground shrink-0">
            <div className="flex items-center gap-1 justify-end">
              <Clock size={12} />
              <span>Due {formatRelativeTime(task.deadline)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {task.progress > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Progress</span>
            <span className="text-xs font-semibold text-foreground">{task.progress}%</span>
          </div>
          <Progress value={task.progress} className="h-1.5" />
        </div>
      )}

      {/* Subtask chips */}
      {task.subtasks.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {task.subtasks.map((sub, i) => {
            const done = i < completedSubtasks;
            return (
              <span
                key={sub}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border',
                  done
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 line-through'
                    : 'border-border/60 bg-muted/50 text-muted-foreground',
                )}
              >
                {done ? <CheckCircle2 size={9} /> : <Circle size={9} />}
                {sub}
              </span>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SourceBadge source={task.source} />
        </div>
        <a
          href="/chat"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-emerald-400 transition-colors opacity-0 group-hover:opacity-100"
        >
          <MessageSquare size={12} />
          Chat about this
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/80 p-5 flex items-center gap-4">
      <div className={cn('flex h-11 w-11 items-center justify-center rounded-lg border', color)}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ tab }: { tab: Tab }) {
  const messages: Record<Tab, string> = {
    urgent: 'No urgent tasks right now — well done!',
    upcoming: 'No upcoming tasks scheduled.',
    completed: 'No completed tasks yet. Get to work!',
  };
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <CheckCircle2 size={24} className="text-muted-foreground" />
      </div>
      <p className="text-base font-semibold text-foreground">{messages[tab]}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Start a chat with WokAI to create tasks automatically.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main View
// ---------------------------------------------------------------------------

export function TasksView() {
  const { user } = useAuth();
  const { snapshot } = useWorkspaceData(user);
  const [activeTab, setActiveTab] = React.useState<Tab>('urgent');
  const [showToast, setShowToast] = React.useState(false);

  const tasks = snapshot.tasks;

  const urgent = tasks.filter(
    (t) => t.status !== 'done' && (t.priority === 'CRITICAL' || t.priority === 'HIGH'),
  );
  const upcoming = tasks.filter(
    (t) => t.status !== 'done' && t.priority !== 'CRITICAL' && t.priority !== 'HIGH',
  );
  const completed = tasks.filter((t) => t.status === 'done');

  const TABS: { label: string; value: Tab; count: number }[] = [
    { label: 'Urgent', value: 'urgent', count: urgent.length },
    { label: 'Upcoming', value: 'upcoming', count: upcoming.length },
    { label: 'Completed', value: 'completed', count: completed.length },
  ];

  const visibleTasks =
    activeTab === 'urgent' ? urgent : activeTab === 'upcoming' ? upcoming : completed;

  function handleNewTask() {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative">
      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-border bg-card px-4 py-3 shadow-xl text-sm text-foreground flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <MessageSquare size={14} className="text-emerald-400" />
          Start a chat to create tasks with WokAI.
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tasks</h1>
          <p className="mt-1 text-muted-foreground">
            WokAI manages your tasks from conversations, emails, and calendars.
          </p>
        </div>
        <Button
          onClick={handleNewTask}
          className="shrink-0 gap-2 bg-emerald-600 hover:bg-emerald-500 text-white border-0"
        >
          <PlusCircle size={16} />
          New Task
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Urgent"
          value={urgent.length}
          icon={AlertTriangle}
          color="border-red-500/30 bg-red-500/10 text-red-400"
        />
        <StatCard
          label="This Week"
          value={upcoming.length}
          icon={Clock}
          color="border-blue-500/30 bg-blue-500/10 text-blue-400"
        />
        <StatCard
          label="Completed"
          value={completed.length}
          icon={BarChart3}
          color="border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
        />
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-border/50 bg-muted/30 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2',
              activeTab === tab.value
                ? 'bg-card text-foreground shadow-sm border border-border/50'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  activeTab === tab.value
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task list */}
      {visibleTasks.length > 0 ? (
        <div className="flex flex-col gap-4">
          {visibleTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <EmptyState tab={activeTab} />
      )}
    </div>
  );
}
