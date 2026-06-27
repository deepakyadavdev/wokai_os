'use client';

import * as React from 'react';
import {
  User,
  Mail,
  CalendarDays,
  HardDrive,
  FileText,
  Users,
  Shield,
  Database,
  Plug,
  ShieldCheck,
  ChevronRight,
  Loader2,
  RotateCcw,
  Download,
  Phone,
  Flame,
  Cpu,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

import { cn, initials } from '@/lib/utils';
import { useAuth } from '@/components/auth/auth-provider';
import { useWorkspaceData } from '@/hooks/use-workspace-data';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getGoogleToken, saveGoogleToken, clearGoogleToken, tokenExpiresIn } from '@/lib/google/token';
import { Globe } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types / constants
// ---------------------------------------------------------------------------

type SettingsCategory =
  | 'profile'
  | 'google'
  | 'integrations'
  | 'mcp'
  | 'safety'
  | 'data';

const NAV_ITEMS: { id: SettingsCategory; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'google', label: 'Google Account', icon: Mail },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'mcp', label: 'MCP Layer', icon: Cpu },
  { id: 'safety', label: 'Safety Rules', icon: ShieldCheck },
  { id: 'data', label: 'Data', icon: Database },
];

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

type ServiceStatus = 'connected' | 'not_configured';

function StatusBadge({ status }: { status: ServiceStatus }) {
  const config: Record<ServiceStatus, { cls: string; label: string }> = {
    connected: { cls: 'bg-emerald-500/20 text-emerald-400', label: 'Connected' },
    not_configured: { cls: 'bg-red-500/20 text-red-400', label: 'Not configured' },
  };
  const { cls, label } = config[status];
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', cls)}>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Service row (Google / Integrations)
// ---------------------------------------------------------------------------

interface ServiceRowProps {
  icon: React.ElementType;
  iconColor: string;
  name: string;
  description: string;
  status: ServiceStatus;
  onConnect?: () => void;
}

function ServiceRow({
  icon: Icon,
  iconColor,
  name,
  description,
  status,
  onConnect,
}: ServiceRowProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card/60 p-4">
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
          iconColor,
        )}
      >
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={status} />
        {status !== 'connected' && (
          <button
            onClick={onConnect}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
          >
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Safety rule row
// ---------------------------------------------------------------------------

function SafetyRow({ label, icon: Icon }: { label: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
        <Icon size={15} />
      </div>
      <p className="flex-1 text-sm text-foreground">{label}</p>
      <span className="rounded-full bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-yellow-400">
        Approval required
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel sections
// ---------------------------------------------------------------------------

function ProfilePanel({ firebaseConfigured }: { firebaseConfigured: boolean }) {
  const { user } = useAuth();

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Profile</h2>

      {/* Avatar */}
      <div className="flex items-center gap-5 mb-8">
        <div className="relative">
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt={user.name}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-border text-emerald-400 text-2xl font-bold">
              {initials(user?.name ?? 'WokAI')}
            </div>
          )}
          <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-background" />
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">{user?.name ?? 'WokAI User'}</p>
          <p className="text-sm text-muted-foreground">{user?.email ?? ''}</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Google account linked
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-border/50 bg-card/60 p-4">
          <p className="text-xs text-muted-foreground mb-1">Display name</p>
          <p className="text-sm font-medium text-foreground">{user?.name ?? 'WokAI User'}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/60 p-4">
          <p className="text-xs text-muted-foreground mb-1">Email</p>
          <p className="text-sm font-medium text-foreground">{user?.email ?? ''}</p>
        </div>
      </div>
    </div>
  );
}

function GoogleTokenManager() {
  const [token, setToken] = React.useState("");
  const [expiryMs, setExpiryMs] = React.useState(0);
  const [authUrl, setAuthUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    setToken(getGoogleToken() || "");
    setExpiryMs(tokenExpiresIn());
    const interval = setInterval(() => setExpiryMs(tokenExpiresIn()), 30000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    fetch("/api/google/auth-url")
      .then((r) => r.json())
      .then((data) => {
        if (data.configured && data.url) {
          setAuthUrl(data.url);
        }
      })
      .catch((err) => console.error("Error loading auth URL:", err));
  }, []);

  const handleSave = () => {
    if (token.trim()) {
      saveGoogleToken(token.trim());
      setExpiryMs(tokenExpiresIn());
      toast.success("Google Access Token saved successfully!");
      setTimeout(() => window.location.reload(), 800);
    } else {
      clearGoogleToken();
      setExpiryMs(0);
      toast.error("Google Access Token removed.");
      setTimeout(() => window.location.reload(), 800);
    }
  };

  const expiryMinutes = Math.round(expiryMs / 60000);

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 mb-6 flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2 text-emerald-400">
          <ShieldCheck className="size-4" />
          Google Cloud Console OAuth Authorization
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {expiryMs > 0
            ? `Status: Token active — expires in ~${expiryMinutes} minutes.`
            : "Status: Not authorized. Connect via your Google Cloud Console OAuth setup or enter an Access Token."}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ya29.a0Acv..."
          className="flex-1 rounded-lg bg-accent/40 border border-border/40 text-foreground text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
        />
        <div className="flex gap-2 shrink-0">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4" onClick={handleSave}>
            Save Token
          </Button>
          
          {authUrl && (
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs gap-1.5"
              onClick={() => {
                window.location.href = authUrl;
              }}
            >
              <Globe className="size-3.5" />
              Authorize via Cloud Console
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function GooglePanel({ firebaseConfigured }: { firebaseConfigured: boolean }) {
  const hasToken = getGoogleToken() !== null;
  const status: ServiceStatus = hasToken ? 'connected' : 'not_configured';

  const services: Omit<ServiceRowProps, 'onConnect'>[] = [
    {
      icon: Mail,
      iconColor: 'border-red-500/30 bg-red-500/10 text-red-400',
      name: 'Gmail',
      description: 'Read, draft, and send emails on your behalf',
      status,
    },
    {
      icon: CalendarDays,
      iconColor: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
      name: 'Google Calendar',
      description: 'Create events, find free slots, and manage schedule',
      status,
    },
    {
      icon: HardDrive,
      iconColor: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
      name: 'Google Drive',
      description: 'Search and retrieve files for tasks',
      status,
    },
    {
      icon: FileText,
      iconColor: 'border-green-500/30 bg-green-500/10 text-green-400',
      name: 'Google Docs',
      description: 'Create documents, reports, and write summaries',
      status,
    },
    {
      icon: Users,
      iconColor: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
      name: 'Contacts',
      description: 'Look up contact information for scheduling and calls',
      status,
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Google Account</h2>
      <p className="text-sm text-muted-foreground mb-6">
        WokAI uses Google Cloud Console OAuth scopes to act on your behalf across your Google workspace apps.
      </p>

      <GoogleTokenManager />

      <div className="flex flex-col gap-3">
        {services.map((s) => (
          <ServiceRow key={s.name} {...s} />
        ))}
      </div>
    </div>
  );
}

function IntegrationsPanel({ firebaseConfigured }: { firebaseConfigured: boolean }) {
  const integrations: Omit<ServiceRowProps, 'onConnect'>[] = [
    {
      icon: Phone,
      iconColor: 'border-red-500/30 bg-red-500/10 text-red-400',
      name: 'Twilio',
      description: 'Make calls and send SMS messages',
      status: 'not_configured',
    },
    {
      icon: Flame,
      iconColor: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
      name: 'Firebase',
      description: 'User data, workspace state, and audit log',
      status: firebaseConfigured ? 'connected' : 'not_configured',
    },
    {
      icon: Cpu,
      iconColor: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
      name: 'LLM Gateway / API',
      description: 'Powers the WokAI reasoning and planning engine',
      status: 'connected',
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Integrations</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Third-party services that extend WokAI&apos;s capabilities.
      </p>
      <div className="flex flex-col gap-3">
        {integrations.map((s) => (
          <ServiceRow key={s.name} {...s} />
        ))}
      </div>
    </div>
  );
}

function SafetyPanel() {
  const rules = [
    { label: 'Send an email on your behalf', icon: Mail },
    { label: 'Create or modify calendar events', icon: CalendarDays },
    { label: 'Submit a web form or make a purchase', icon: Shield },
    { label: 'Make or schedule a phone call', icon: Phone },
    { label: 'Upload or delete files from Drive', icon: HardDrive },
    { label: 'Interact with any payment page', icon: ShieldCheck },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Safety Rules</h2>
      <p className="text-sm text-muted-foreground mb-6">
        These actions always require explicit approval before WokAI proceeds. This keeps you in
        control.
      </p>
      <div className="flex flex-col gap-3">
        {rules.map((r) => (
          <SafetyRow key={r.label} label={r.label} icon={r.icon} />
        ))}
      </div>
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          WokAI will always pause and show you a confirmation card before taking any sensitive
          action. You can customise these rules once Firebase is configured.
        </p>
      </div>
    </div>
  );
}

function McpPanel() {
  const [clients, setClients] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("");

  async function loadClients() {
    try {
      const res = await fetch("/api/mcp?action=listClients");
      if (res.ok) {
        const data = await res.json();
        if (data.clients) {
          setClients(data.clients);
        }
      }
    } catch (err) {
      console.error("Failed to load MCP clients", err);
    }
  }

  React.useEffect(() => {
    let active = true;
    fetch("/api/mcp?action=listClients")
      .then((res) => res.json())
      .then((data) => {
        if (active && data.clients) {
          setClients(data.clients);
        }
      })
      .catch((err) => console.error("Failed to load MCP clients", err));
    return () => {
      active = false;
    };
  }, []);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !url.startsWith("mcp://")) {
      alert("Invalid inputs. URL must start with mcp://");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/mcp?action=registerClient", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, url })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.clients) {
          setClients(data.clients);
        }
        setName("");
        setUrl("");
        alert("MCP Client integration registered and tools indexed!");
      }
    } catch (err) {
      alert("Failed to register MCP Client");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">MCP Architecture Layer</h2>
      <p className="text-sm text-muted-foreground mb-6">
        WokAI acts as a dual-role Model Context Protocol implementation. It operates as an MCP Server
        exposing Wok capabilities, and an MCP Client connecting external developer tool sources.
      </p>

      {/* Register Client Form */}
      <form onSubmit={handleRegister} className="mb-6 rounded-xl border border-border/50 bg-card/60 p-5 flex flex-col gap-4">
        <h3 className="text-sm font-semibold">Connect External MCP Source</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            placeholder="Name (e.g. GitHub Client)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded-lg bg-accent/40 border border-border/40 text-foreground text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
          <input
            type="text"
            placeholder="Discovery URL (mcp://...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="rounded-lg bg-accent/40 border border-border/40 text-foreground text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-fit self-end bg-emerald-600 hover:bg-emerald-500 text-white font-medium border-0 text-xs px-4 py-2 h-auto">
          {loading ? "Indexing..." : "Index Source Tools"}
        </Button>
      </form>

      {/* Connected MCP Clients */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold mb-1">Active Client Integrations</h3>
        {clients.length === 0 ? (
          <p className="text-xs text-muted-foreground">Loading MCP clients...</p>
        ) : (
          clients.map((client) => (
            <div key={client.url} className="rounded-xl border border-border/50 bg-card/60 p-4">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div>
                  <p className="font-medium text-foreground text-sm">{client.name}</p>
                  <p className="text-xs text-muted-foreground">{client.url}</p>
                </div>
                <span className="rounded-full bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 text-[10px] font-semibold border border-emerald-500/30">
                  {client.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {client.tools.map((t: string) => (
                  <span key={t} className="rounded-md bg-secondary text-secondary-foreground px-2 py-0.5 text-[10px] font-mono border border-border/40">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 rounded-xl border border-border/50 bg-card/60 p-5">
        <h3 className="text-sm font-semibold mb-2">WokAI MCP Server Role</h3>
        <p className="text-xs text-muted-foreground leading-5">
          WokAI exposes local capabilities to parent execution contexts. Local API agents, websocket bridges,
          and processes connect via `/api/mcp` to register executables like app triggers or terminal sessions safely.
        </p>
      </div>
    </div>
  );
}

function DataPanel() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Data</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Manage your workspace data and export options.
      </p>

      <div className="flex flex-col gap-4">
        {/* Export */}
        <div className="rounded-xl border border-border/50 bg-card/60 p-5 opacity-50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-foreground">Export Workspace Data</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Download your tasks, memories, and audit log as JSON.
              </p>
            </div>
            <Button disabled variant="outline" className="shrink-0 gap-2">
              <Download size={14} />
              Export
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main View
// ---------------------------------------------------------------------------

export function SettingsView() {
  const { user, firebaseConfigured } = useAuth();
  const [activeCategory, setActiveCategory] = React.useState<SettingsCategory>('profile');

  // Capture Google access token from OAuth callback redirect
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const accessToken = params.get("access_token");
      const expiresIn = params.get("expires_in");
      if (accessToken) {
        saveGoogleToken(accessToken, expiresIn ? Number(expiresIn) : 3600);
        toast.success("Google Access Token saved from OAuth callback!");
        setActiveCategory('google');
        // Clean URL
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  const renderPanel = () => {
    switch (activeCategory) {
      case 'profile':
        return <ProfilePanel firebaseConfigured={firebaseConfigured} />;
      case 'google':
        return <GooglePanel firebaseConfigured={firebaseConfigured} />;
      case 'integrations':
        return <IntegrationsPanel firebaseConfigured={firebaseConfigured} />;
      case 'mcp':
        return <McpPanel />;
      case 'safety':
        return <SafetyPanel />;
      case 'data':
        return <DataPanel />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your WokAI account, integrations, and safety preferences.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Left nav */}
        <aside className="w-48 shrink-0">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeCategory === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveCategory(item.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left',
                    active
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                  {active && <ChevronRight size={14} className="ml-auto" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right content */}
        <div className="flex-1 min-w-0">{renderPanel()}</div>
      </div>
    </div>
  );
}
