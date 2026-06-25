'use client';

import * as React from 'react';
import {
  CalendarDays,
  Mail,
  Brain,
  Globe,
  Zap,
  HardDrive,
  Phone,
  CheckSquare,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useWorkspaceData } from '@/hooks/use-workspace-data';
import { useAuth } from '@/components/auth/auth-provider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActivityCategory = 'all' | 'email' | 'calendar' | 'tasks' | 'browser' | 'memory' | 'calls';

interface ActivityItem {
  id: string;
  icon: string;
  color: string;
  label: string;
  detail: string;
  category: string;
  time: string;
  source: string;
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const DEMO_ACTIVITY: ActivityItem[] = [
  {
    id: 'da1',
    icon: 'CalendarDays',
    color: 'purple',
    label: 'Meeting Created',
    detail: 'Meeting with Rahul — Tomorrow 4:00 PM',
    category: 'calendar',
    time: new Date(Date.now() - 2 * 60e3).toISOString(),
    source: 'Meeting With Rahul',
  },
  {
    id: 'da2',
    icon: 'Mail',
    color: 'blue',
    label: 'Email Drafted',
    detail: 'Subject: Chemistry Assignment Submission',
    category: 'email',
    time: new Date(Date.now() - 15 * 60e3).toISOString(),
    source: 'Chemistry Assignment',
  },
  {
    id: 'da3',
    icon: 'Brain',
    color: 'pink',
    label: 'Memory Saved',
    detail: 'Study preference: best performance after 8 PM',
    category: 'memory',
    time: new Date(Date.now() - 60 * 60e3).toISOString(),
    source: 'Study Planning',
  },
  {
    id: 'da4',
    icon: 'Globe',
    color: 'yellow',
    label: 'Browser Task Completed',
    detail: 'Applied for internship — paused before final submit',
    category: 'browser',
    time: new Date(Date.now() - 2 * 3600e3).toISOString(),
    source: 'Internship Application',
  },
  {
    id: 'da5',
    icon: 'Zap',
    color: 'red',
    label: 'Rescue Plan Created',
    detail: 'Chemistry assignment — 3 tasks, estimated 3.5 hours',
    category: 'tasks',
    time: new Date(Date.now() - 3 * 3600e3).toISOString(),
    source: 'Exam Preparation',
  },
  {
    id: 'da6',
    icon: 'HardDrive',
    color: 'orange',
    label: 'File Located',
    detail: 'Chemistry Notes.pdf — Organic chemistry section',
    category: 'memory',
    time: new Date(Date.now() - 4 * 3600e3).toISOString(),
    source: 'Chemistry Assignment',
  },
  {
    id: 'da7',
    icon: 'Phone',
    color: 'green',
    label: 'Call Logged',
    detail: 'Called Rahul — meeting shifted to 5 PM',
    category: 'calls',
    time: new Date(Date.now() - 5 * 3600e3).toISOString(),
    source: 'Meeting With Rahul',
  },
  {
    id: 'da8',
    icon: 'CalendarDays',
    color: 'purple',
    label: 'Calendar Updated',
    detail: 'Chemistry focus block added: 8 PM — 10 PM',
    category: 'calendar',
    time: new Date(Date.now() - 24 * 3600e3).toISOString(),
    source: 'Study Planning',
  },
  {
    id: 'da9',
    icon: 'CheckSquare',
    color: 'green',
    label: 'Task Completed',
    detail: 'Write reaction mechanism — marked done',
    category: 'tasks',
    time: new Date(Date.now() - 26 * 3600e3).toISOString(),
    source: 'Chemistry Assignment',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, LucideIcon> = {
  CalendarDays,
  Mail,
  Brain,
  Globe,
  Zap,
  HardDrive,
  Phone,
  CheckSquare,
};

const COLOR_CLASSES: Record<string, { dot: string; icon: string; badge: string }> = {
  purple: {
    dot: 'bg-purple-500',
    icon: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    badge: 'bg-purple-500/10 text-purple-400',
  },
  blue: {
    dot: 'bg-blue-500',
    icon: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    badge: 'bg-blue-500/10 text-blue-400',
  },
  pink: {
    dot: 'bg-pink-500',
    icon: 'bg-pink-500/20 text-pink-400 border-pink-500/40',
    badge: 'bg-pink-500/10 text-pink-400',
  },
  yellow: {
    dot: 'bg-yellow-500',
    icon: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    badge: 'bg-yellow-500/10 text-yellow-400',
  },
  red: {
    dot: 'bg-red-500',
    icon: 'bg-red-500/20 text-red-400 border-red-500/40',
    badge: 'bg-red-500/10 text-red-400',
  },
  orange: {
    dot: 'bg-orange-500',
    icon: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    badge: 'bg-orange-500/10 text-orange-400',
  },
  green: {
    dot: 'bg-emerald-500',
    icon: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    badge: 'bg-emerald-500/10 text-emerald-400',
  },
};

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60e3);
  const hours = Math.floor(diff / 3600e3);
  const days = Math.floor(diff / 86400e3);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function groupByDay(items: ActivityItem[]) {
  const now = Date.now();
  const todayStart = new Date(now).setHours(0, 0, 0, 0);
  const yesterdayStart = todayStart - 86400e3;

  const today: ActivityItem[] = [];
  const yesterday: ActivityItem[] = [];
  const older: ActivityItem[] = [];

  for (const item of items) {
    const t = new Date(item.time).getTime();
    if (t >= todayStart) today.push(item);
    else if (t >= yesterdayStart) yesterday.push(item);
    else older.push(item);
  }

  return { today, yesterday, older };
}

const FILTERS: { label: string; value: ActivityCategory }[] = [
  { label: 'All', value: 'all' },
  { label: 'Email', value: 'email' },
  { label: 'Calendar', value: 'calendar' },
  { label: 'Tasks', value: 'tasks' },
  { label: 'Browser', value: 'browser' },
  { label: 'Memory', value: 'memory' },
  { label: 'Calls', value: 'calls' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TimelineItem({ item }: { item: ActivityItem }) {
  const Icon = ICON_MAP[item.icon] ?? CalendarDays;
  const colors = COLOR_CLASSES[item.color] ?? COLOR_CLASSES.blue;

  return (
    <div className="relative flex gap-4 pb-8 last:pb-0">
      {/* Vertical line */}
      <div className="absolute left-[19px] top-10 bottom-0 w-px border-l-2 border-border/40 last:hidden" />

      {/* Icon bubble */}
      <div
        className={cn(
          'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border',
          colors.icon,
        )}
      >
        <Icon size={16} />
        {/* Colored dot */}
        <span
          className={cn(
            'absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background',
            colors.dot,
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 pt-1.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-medium text-foreground leading-tight">{item.label}</p>
          <span className="text-xs text-muted-foreground/70 whitespace-nowrap">
            {formatTimeAgo(item.time)}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{item.detail}</p>
        <div className="mt-2">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
              colors.badge,
            )}
          >
            {item.source}
          </span>
        </div>
      </div>
    </div>
  );
}

function GroupSection({ label, items }: { label: string; items: ActivityItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-4">
        {label}
      </p>
      <div className="relative pl-2">
        {items.map((item) => (
          <TimelineItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main View
// ---------------------------------------------------------------------------

export function ActivityView() {
  const { user } = useAuth();
  const { snapshot } = useWorkspaceData(user);
  const [activeFilter, setActiveFilter] = React.useState<ActivityCategory>('all');

  // Convert WokaiAction items into ActivityItem shape
  const actionItems: ActivityItem[] = snapshot.actions.map((a) => ({
    id: a.id,
    icon: 'Zap',
    color: a.status === 'COMPLETED' ? 'green' : a.status === 'FAILED' ? 'red' : 'blue',
    label: a.label,
    detail: a.output ?? `Tool: ${a.tool}`,
    category: 'tasks',
    time: a.createdAt,
    source: a.tool,
  }));

  // Merge + deduplicate
  const existingIds = new Set(DEMO_ACTIVITY.map((d) => d.id));
  const merged = [
    ...DEMO_ACTIVITY,
    ...actionItems.filter((a) => !existingIds.has(a.id)),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const filtered =
    activeFilter === 'all'
      ? merged
      : merged.filter((item) => item.category === activeFilter);

  const { today, yesterday, older } = groupByDay(filtered);
  const hasAny = today.length + yesterday.length + older.length > 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Activity</h1>
        <p className="mt-1 text-muted-foreground">
          Everything WokAI has done across your conversations.
        </p>
      </div>

      {/* Filter chips */}
      <div className="mb-8 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
              activeFilter === f.value
                ? 'bg-accent text-foreground border-border'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {hasAny ? (
        <>
          <GroupSection label="Today" items={today} />
          <GroupSection label="Yesterday" items={yesterday} />
          <GroupSection label="Older" items={older} />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Zap size={28} className="text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold text-foreground">No activity yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Actions appear here as WokAI works for you.
          </p>
        </div>
      )}
    </div>
  );
}
