"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Bot,
  Plus,
  Search,
  MessageSquare,
  Activity,
  CheckSquare,
  Settings,
  LogOut,
  ChevronRight,
  Trash2,
  X,
  Gauge,
  Globe,
  MonitorSmartphone,
  BriefcaseBusiness
} from "lucide-react";

import { cn, initials } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { useChatSessions } from "@/hooks/use-chat-sessions";
import type { ChatSession } from "@/hooks/use-chat-sessions";

// ── sidebar context ────────────────────────────────────────────
interface SidebarContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SidebarContext = React.createContext<SidebarContextType>({
  isOpen: true,
  setIsOpen: () => {}
});

export function useSidebar() {
  return React.useContext(SidebarContext);
}

// ── bottom nav config ──────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/workspace", label: "Workspace", icon: BriefcaseBusiness },
  { href: "/browser-agent", label: "Browser Agent", icon: Globe },
  { href: "/devices", label: "Devices", icon: MonitorSmartphone },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/settings", label: "Settings", icon: Settings }
] as const;

const MOBILE_TABS = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/workspace", label: "Workspace", icon: BriefcaseBusiness },
  { href: "/devices", label: "Devices", icon: MonitorSmartphone },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/settings", label: "Settings", icon: Settings }
] as const;

// ── session group section ──────────────────────────────────────

function SessionGroup({
  label,
  sessions,
  activeId,
  onSelect,
  onDelete
}: {
  label: string;
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (sessions.length === 0) return null;

  return (
    <div className="mb-3">
      <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
        {label}
      </p>
      <ul className="space-y-0.5">
        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            isActive={session.id === activeId}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </div>
  );
}

function RelativeTime({ iso }: { iso: string }) {
  const [timeStr, setTimeStr] = React.useState("...");

  React.useEffect(() => {
    const updateTime = () => {
      try {
        const diff = Date.now() - new Date(iso).getTime();
        const diffMins = Math.floor(diff / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) setTimeStr("just now");
        else if (diffMins < 60) setTimeStr(`${diffMins}m ago`);
        else if (diffHours < 24) setTimeStr(`${diffHours}h ago`);
        else setTimeStr(`${diffDays}d ago`);
      } catch {
        setTimeStr("some time ago");
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [iso]);

  return <span>{timeStr}</span>;
}

function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete
}: {
  session: ChatSession;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = React.useState(false);
  const modelName = session.model || "Gemini 3.5 Flash";

  return (
    <li
      className={cn(
        "group relative flex flex-col items-start gap-0.5 p-3 rounded-lg cursor-pointer select-none transition-all duration-150 mb-1 border border-transparent",
        isActive
          ? "bg-slate-200/60 dark:bg-accent/60 border-slate-300/30 dark:border-border/30"
          : "hover:bg-slate-100 dark:hover:bg-accent/20"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(session.id)}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <span className="flex-1 truncate text-[13px] font-medium text-slate-800 dark:text-slate-200 leading-snug">
          {session.title}
        </span>
        {(hovered || isActive) && (
          <button
            aria-label="Delete chat"
            className="shrink-0 p-0.5 rounded text-slate-400 hover:text-red-500 transition-all duration-150"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(session.id);
            }}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
        <RelativeTime iso={session.updatedAt} /> • {session.messages.length} messages
      </span>
      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded mt-1.5">
        {modelName}
      </span>
    </li>
  );
}

// ── user card ──────────────────────────────────────────────────

function UserCard({
  name,
  email,
  onSignOut
}: {
  name: string;
  email: string;
  onSignOut: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      {/* Avatar */}
      <div
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
          "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
        )}
      >
        {initials(name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-medium leading-tight truncate">{name}</p>
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{email}</p>
      </div>

      {/* Sign out */}
      <button
        aria-label="Sign out"
        onClick={onSignOut}
        className="shrink-0 p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors duration-150"
      >
        <LogOut size={14} />
      </button>
    </div>
  );
}

// ── sidebar ────────────────────────────────────────────────────

function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, firebaseConfigured, signOut } = useAuth();
  const { isOpen } = useSidebar();
  const {
    activeSessionId,
    setActiveSessionId,
    createSession,
    deleteSession,
    groupedSessions,
    filteredSessions,
    searchQuery,
    setSearchQuery
  } = useChatSessions();

  function handleNewChat() {
    createSession();
    router.push("/chat");
  }

  function handleSelectSession(id: string) {
    setActiveSessionId(id);
    router.push("/chat");
  }

  function handleDeleteSession(id: string) {
    deleteSession(id);
  }

  const isDemo = !firebaseConfigured || user?.uid === "demo-user";

  // When search is active, show flat filtered list; otherwise show grouped
  const showFiltered = searchQuery.trim().length > 0;

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-[260px] z-40 transition-transform duration-300 ease-in-out",
        "bg-slate-50 dark:bg-[#0d1117] border-r border-slate-200 dark:border-border/60",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* ── Top Bar / Logo / New Chat ── */}
      <div className="flex items-center justify-between px-4 py-4 shrink-0 border-b border-slate-200/60 dark:border-border/40 bg-slate-100/30 dark:bg-slate-900/10 mb-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
            <Bot size={14} />
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 select-none">History</span>
        </div>
        
        <button
          id="new-chat-btn"
          onClick={handleNewChat}
          title="New Chat"
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
          </svg>
        </button>
      </div>

      {/* ── Search ── */}
      <div className="px-3 mb-4 shrink-0">
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-muted-foreground/60 pointer-events-none"
          />
          <input
            id="chat-search-input"
            type="text"
            placeholder="Search chats…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-7 pr-7 py-1.5 text-[12px] rounded-md border",
              "bg-white dark:bg-accent/40 border-slate-200 dark:border-border/40 text-slate-800 dark:text-foreground placeholder:text-slate-400 dark:placeholder:text-muted-foreground/50",
              "focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors duration-150"
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-muted-foreground/60 hover:text-slate-600 dark:hover:text-foreground transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Chat History ── */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin">
        {showFiltered ? (
          <div>
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground/60 select-none">
              Results
            </p>
            {filteredSessions.length === 0 ? (
              <p className="px-3 py-4 text-[12px] text-slate-400 dark:text-muted-foreground/60 text-center">
                No chats found
              </p>
            ) : (
              <ul className="space-y-0.5">
                {filteredSessions.map((s) => (
                  <SessionItem
                    key={s.id}
                    session={s}
                    isActive={s.id === activeSessionId}
                    onSelect={handleSelectSession}
                    onDelete={handleDeleteSession}
                  />
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            <SessionGroup
              label="Today"
              sessions={groupedSessions.today}
              activeId={activeSessionId}
              onSelect={handleSelectSession}
              onDelete={handleDeleteSession}
            />
            <SessionGroup
              label="Yesterday"
              sessions={groupedSessions.yesterday}
              activeId={activeSessionId}
              onSelect={handleSelectSession}
              onDelete={handleDeleteSession}
            />
            <SessionGroup
              label="Previous 7 Days"
              sessions={groupedSessions.week}
              activeId={activeSessionId}
              onSelect={handleSelectSession}
              onDelete={handleDeleteSession}
            />
            <SessionGroup
              label="Older"
              sessions={groupedSessions.older}
              activeId={activeSessionId}
              onSelect={handleSelectSession}
              onDelete={handleDeleteSession}
            />
          </>
        )}
      </div>

      {/* ── All Chats Button ── */}
      <div className="p-3 shrink-0 border-t border-slate-200/60 dark:border-border/40 bg-slate-100/10 dark:bg-slate-900/10">
        <button
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-200 dark:border-border/60",
            "bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-accent/40 text-slate-700 dark:text-slate-300 font-medium text-xs shadow-sm",
            "transition-colors duration-150"
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="7" height="7" x="3" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="14" rx="1" />
            <rect width="7" height="7" x="3" y="14" rx="1" />
          </svg>
          All Chats
        </button>
      </div>

      {/* ── Secondary Nav Icons for Workspace Apps ── */}
      <div className="px-3 py-2 flex items-center justify-around gap-1 bg-slate-100/50 dark:bg-slate-900/20 border-t border-slate-200/40 dark:border-border/10 shrink-0">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "p-1.5 rounded transition-all duration-150 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-accent/50",
                isActive && "text-emerald-600 dark:text-emerald-400 bg-slate-200 dark:bg-accent/60"
              )}
            >
              <Icon size={14} />
            </Link>
          );
        })}
      </div>

      {/* ── User Card ── */}
      <div className="shrink-0 border-t border-slate-200/60 dark:border-border/40 bg-slate-50 dark:bg-[#0d1117]">
        {user && user.uid !== "demo-user" ? (
          <UserCard
            name={user.name}
            email={user.email}
            onSignOut={signOut}
          />
        ) : (
          <div className="px-3 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium leading-tight text-slate-800 dark:text-foreground truncate">
                {user ? user.name : "Not signed in"}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-muted-foreground truncate">
                {user ? user.email : "Please sign in to proceed"}
              </p>
            </div>
            <Link
              href="/auth/login"
              className="shrink-0 px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs select-none transition-colors duration-150"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}

// ── mobile bottom tab bar ──────────────────────────────────────

function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "lg:hidden fixed bottom-0 left-0 right-0 z-40",
        "bg-white dark:bg-[#0d1117] border-t border-slate-200 dark:border-border/60",
        "flex items-center justify-around px-2 py-2 safe-area-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.05)]"
      )}
    >
      {MOBILE_TABS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href === "/chat" && pathname.startsWith("/chat"));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors duration-150",
              isActive
                ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                : "text-slate-500 dark:text-muted-foreground hover:text-slate-800 dark:hover:text-foreground"
            )}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ── app shell ─────────────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="min-h-screen bg-slate-50/50 dark:bg-[#0a0f1e] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-150">
        <Sidebar />
        <MobileTabBar />
        <main className={cn(
          "min-h-screen flex flex-col pb-16 lg:pb-0 transition-all duration-300 ease-in-out",
          isOpen ? "lg:ml-[260px]" : "lg:ml-0"
        )}>
          {children}
        </main>
      </div>
    </SidebarContext.Provider>
  );
}
