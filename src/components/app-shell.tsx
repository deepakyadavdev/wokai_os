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
  MonitorSmartphone
} from "lucide-react";

import { cn, initials } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { useChatSessions } from "@/hooks/use-chat-sessions";
import type { ChatSession } from "@/hooks/use-chat-sessions";

// ── bottom nav config ──────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/browser-agent", label: "Browser Agent", icon: Globe },
  { href: "/devices", label: "Devices", icon: MonitorSmartphone },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/settings", label: "Settings", icon: Settings }
] as const;

const MOBILE_TABS = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
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

  return (
    <li
      className={cn(
        "group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer select-none transition-colors duration-150",
        isActive
          ? "bg-accent/60 text-emerald-400"
          : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(session.id)}
    >
      <MessageSquare
        className={cn(
          "shrink-0 transition-colors duration-150",
          isActive ? "text-emerald-400" : "text-muted-foreground/50"
        )}
        size={13}
      />
      <span className="flex-1 truncate text-[13px] leading-snug">{session.title}</span>
      {(hovered || isActive) && (
        <button
          aria-label="Delete chat"
          className={cn(
            "shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150",
            "hover:text-destructive"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(session.id);
          }}
        >
          <Trash2 size={12} />
        </button>
      )}
    </li>
  );
}

// ── user card ──────────────────────────────────────────────────

function UserCard({
  name,
  email,
  isDemo,
  onSignOut
}: {
  name: string;
  email: string;
  isDemo: boolean;
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
          <span
            className={cn(
              "shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
              isDemo
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            )}
          >
            {isDemo ? "Demo" : "Live"}
          </span>
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
        "hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-[260px] z-40",
        "bg-[#0d1117] border-r border-border/60"
      )}
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-4 py-5 shrink-0">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-900/40">
          <Bot size={18} className="text-white" />
        </div>
        <div>
          <p className="text-[15px] font-bold leading-tight text-foreground">WokAI</p>
          <p className="text-[11px] text-muted-foreground leading-tight">AI Work Companion</p>
        </div>
      </div>

      {/* ── New Chat ── */}
      <div className="px-3 mb-3 shrink-0">
        <button
          id="new-chat-btn"
          onClick={handleNewChat}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg",
            "bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm",
            "transition-colors duration-150 shadow-md shadow-emerald-900/30"
          )}
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>

      {/* ── Search ── */}
      <div className="px-3 mb-4 shrink-0">
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none"
          />
          <input
            id="chat-search-input"
            type="text"
            placeholder="Search chats…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-7 pr-7 py-1.5 text-[12px] rounded-md",
              "bg-accent/40 border border-border/40 text-foreground placeholder:text-muted-foreground/50",
              "focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors duration-150"
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Chat History ── */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {showFiltered ? (
          <div>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
              Results
            </p>
            {filteredSessions.length === 0 ? (
              <p className="px-3 py-4 text-[12px] text-muted-foreground/60 text-center">
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

      {/* ── Divider ── */}
      <div className="shrink-0 border-t border-border/40 mx-3" />

      {/* ── Bottom Nav ── */}
      <nav className="shrink-0 px-2 py-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors duration-150",
                    isActive
                      ? "text-emerald-400 bg-accent/50"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                  )}
                >
                  <Icon
                    size={15}
                    className={isActive ? "text-emerald-400" : "text-muted-foreground/70"}
                  />
                  {label}
                  {isActive && (
                    <ChevronRight size={12} className="ml-auto text-emerald-400/60" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Divider ── */}
      <div className="shrink-0 border-t border-border/40 mx-3" />

      {/* ── User Card ── */}
      <div className="shrink-0">
        {user ? (
          <UserCard
            name={user.name}
            email={user.email}
            isDemo={isDemo}
            onSignOut={signOut}
          />
        ) : (
          <div className="px-3 py-3 text-[12px] text-muted-foreground">Not signed in</div>
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
        "bg-[#0d1117] border-t border-border/60",
        "flex items-center justify-around px-2 py-2 safe-area-bottom"
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
                ? "text-emerald-400"
                : "text-muted-foreground hover:text-foreground"
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
  return (
    <div className="min-h-screen bg-[#0a0f1e]">
      <Sidebar />
      <MobileTabBar />
      <main className="lg:ml-[260px] min-h-screen flex flex-col pb-16 lg:pb-0">
        {children}
      </main>
    </div>
  );
}
