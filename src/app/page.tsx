"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Bot, Cpu, Mail, Calendar, Globe, Terminal, PhoneCall, ShieldCheck, 
  Check, ArrowRight, Lock, Plus, ChevronDown, ChevronUp, RefreshCw, 
  Play, Square, Code, Eye, BookOpen, User, FileText, Sparkles, 
  Layers, Settings, Zap, Workflow, Info, ExternalLink, Menu, X, Sun, Moon
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// Types for Demo Simulation
interface SimulationStep {
  agentName: string;
  role: string;
  message: string;
  delay: number;
}

interface ActionStep {
  id: string;
  tool: string;
  description: string;
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "idle" | "running" | "pending-approval" | "completed";
  requiresApproval: boolean;
  rawJson: string;
}

const DEMO_PROMPTS = [
  {
    id: 0,
    text: "Summarize unread emails about product launch and schedule a Monday status sync",
    conversationalReply: "I will scan Gmail for product launch emails, extract the main highlights, and configure a calendar meeting for Monday morning.",
    conductorLogs: [
      { agentName: "Agent A", role: "Human Thinker", message: "Deconstructing intent: Search emails with matching keywords, parse headers/bodies, compile summary points, verify calendar slots for Monday, select standard hour, create event, and prepare summary notification.", delay: 800 },
      { agentName: "Agent B", role: "Tool Mapper", message: "Mapping requirements to system adapters. Selected: gmail.search, gmail.summarize, calendar.createEvent. Offline queueing: enabled.", delay: 600 },
      { agentName: "Agent 1", role: "Conversationalist", message: "Drafting user confirmation message.", delay: 400 },
      { agentName: "Agent 2", role: "JSON Planner", message: "Synthesizing execution plan. Risk parameters: LOW (gmail.search), MEDIUM (calendar.createEvent). Flagging sensitive action (createEvent) for safety gates.", delay: 800 },
      { agentName: "Agent 4", role: "Content Writer", message: "Writing calendar event payload details: Title 'Product Launch Sync', duration 30m, attendees PM team, timezone client-local.", delay: 700 },
      { agentName: "Agent 3", role: "API Parameter Binder", message: "Generating hydrated API structures for Gmail queries and Calendar JSON resource payloads.", delay: 500 },
      { agentName: "Agent #", role: "Summarizer", message: "Summarizing plan: 'Search launch emails and create status sync meeting on Monday'.", delay: 400 },
      { agentName: "Agent 5", role: "QA Evaluator", message: "Plan validation check: Input parameters align with user goal. Security rules passed. Plan verified.", delay: 600 }
    ] as SimulationStep[],
    actions: [
      {
        id: "act-1",
        tool: "gmail.search",
        description: "Search for unread launch emails",
        risk: "LOW",
        status: "idle",
        requiresApproval: false,
        rawJson: JSON.stringify({ query: 'subject:"product launch" is:unread', maxResults: 10 }, null, 2)
      },
      {
        id: "act-2",
        tool: "gmail.summarize",
        description: "Analyze and summarize threads",
        risk: "LOW",
        status: "idle",
        requiresApproval: false,
        rawJson: JSON.stringify({ threadIds: ["t12345", "t12346"], format: "bullet-points" }, null, 2)
      },
      {
        id: "act-3",
        tool: "calendar.createEvent",
        description: "Schedule Monday Morning Sync",
        risk: "MEDIUM",
        status: "idle",
        requiresApproval: true,
        rawJson: JSON.stringify({ summary: "Product Launch Sync", startTime: "2026-06-29T10:00:00", duration: 30, description: "Auto-generated from email summary context" }, null, 2)
      }
    ] as ActionStep[]
  },
  {
    id: 1,
    text: "Extract competitor prices using Playwright browser and upload results to Drive",
    conversationalReply: "I will open a secure automated browser session, scrape the pricing listings from shop.com, format the values into CSV, and upload the report to Drive.",
    conductorLogs: [
      { agentName: "Agent A", role: "Human Thinker", message: "Deconstructing intent: Open target URL, parse pricing tables from HTML, format content to CSV, verify Google Drive upload folders, upload file, and yield link.", delay: 900 },
      { agentName: "Agent B", role: "Tool Mapper", message: "Mapping requirements. Selected: browser.plan (Playwright), drive.uploadFile. Sandbox execution: active.", delay: 700 },
      { agentName: "Agent 1", role: "Conversationalist", message: "Drafting user confirmation text.", delay: 400 },
      { agentName: "Agent 2", role: "JSON Planner", message: "Synthesizing execution sequence. Risk parameters: MEDIUM (browser.plan), LOW (drive.uploadFile). No high-risk gates required.", delay: 800 },
      { agentName: "Agent 4", role: "Content Writer", message: "Generating browser selector plan: navigation to 'shop.com/pricing', selector evaluation: 'div.price-card', data map: { title, price }.", delay: 900 },
      { agentName: "Agent 3", role: "API Parameter Binder", message: "Binding page configuration options and target folder IDs for Drive storage.", delay: 500 },
      { agentName: "Agent #", role: "Summarizer", message: "Summarizing plan: 'Scrape pricing from shop.com and upload table spreadsheet to Drive'.", delay: 400 },
      { agentName: "Agent 5", role: "QA Evaluator", message: "Plan check. Scraper boundaries are safe. Schema output validated. Plan verified.", delay: 600 }
    ] as SimulationStep[],
    actions: [
      {
        id: "act-1",
        tool: "browser.plan",
        description: "Scrape pricing entries from shop.com",
        risk: "MEDIUM",
        status: "idle",
        requiresApproval: false,
        rawJson: JSON.stringify({ url: "https://shop.com/pricing", selectors: { cards: "div.price-card", label: "h3", price: ".price-tag" } }, null, 2)
      },
      {
        id: "act-2",
        tool: "drive.uploadFile",
        description: "Upload report CSV to Drive",
        risk: "LOW",
        status: "idle",
        requiresApproval: false,
        rawJson: JSON.stringify({ fileName: "competitor_prices.csv", parentFolder: "WokaiReports", mimeType: "text/csv" }, null, 2)
      }
    ] as ActionStep[]
  },
  {
    id: 2,
    text: "Prepare Twilio outbound calls to verify service, and notify team on WhatsApp",
    conversationalReply: "I will compile a text-to-speech script, schedule the Twilio outbound call, and queue a WhatsApp notification once execution completes successfully.",
    conductorLogs: [
      { agentName: "Agent A", role: "Human Thinker", message: "Deconstructing intent: Write speech script for deployment status, check Twilio environment credentials, format call settings, set completion callback, and assemble WhatsApp message.", delay: 900 },
      { agentName: "Agent B", role: "Tool Mapper", message: "Mapping requirements. Selected: calls.prepare, calls.initiate, whatsapp.sendNotification.", delay: 600 },
      { agentName: "Agent 1", role: "Conversationalist", message: "Drafting user confirmation statement.", delay: 400 },
      { agentName: "Agent 2", role: "JSON Planner", message: "Synthesizing plan. Risk parameters: HIGH (calls.initiate), LOW (whatsapp.sendNotification). Twilio action marked as CRITICAL risk - forcing USER approval gate.", delay: 900 },
      { agentName: "Agent 4", role: "Content Writer", message: "Generating speech XML text: 'System deployment check completed successfully at 10 PM.' and WhatsApp body: 'Deployment status verified'.", delay: 800 },
      { agentName: "Agent 3", role: "API Parameter Binder", message: "Binding cell numbers and Twilio XML script templates to parameters.", delay: 500 },
      { agentName: "Agent #", role: "Summarizer", message: "Summarizing plan: 'Initiate Twilio status phone call and dispatch WhatsApp alert on finish'.", delay: 400 },
      { agentName: "Agent 5", role: "QA Evaluator", message: "Plan check. Verified phone formats. Safety approval rules applied. Plan approved.", delay: 600 }
    ] as SimulationStep[],
    actions: [
      {
        id: "act-1",
        tool: "calls.prepare",
        description: "Prepare TTS phone script body",
        risk: "LOW",
        status: "idle",
        requiresApproval: false,
        rawJson: JSON.stringify({ script: "Hello, this is WokAI OS. This call is to verify the deployment status. All tests passed." }, null, 2)
      },
      {
        id: "act-2",
        tool: "calls.initiate",
        description: "Trigger outbound call (Twilio)",
        risk: "HIGH",
        status: "idle",
        requiresApproval: true,
        rawJson: JSON.stringify({ recipientNumber: "+15550199", callbackUrl: "https://wokai.os/api/calls/verify" }, null, 2)
      },
      {
        id: "act-3",
        tool: "whatsapp.sendNotification",
        description: "Send dispatch alert on completion",
        risk: "LOW",
        status: "idle",
        requiresApproval: false,
        rawJson: JSON.stringify({ groupName: "Dev Team Alert", message: "WokAI verified deployment status via phone call." }, null, 2)
      }
    ] as ActionStep[]
  }
];

const ARCHITECTURE_AGENTS = [
  {
    id: "Agent A",
    name: "Agent A",
    title: "Human Worker Thinker",
    roleDescription: "Cognitive deconstruction of user intent",
    focus: "Ignores tool constraints and plans the logical, step-by-step actions a highly proactive, competent human assistant would take to complete the request.",
    color: "from-blue-500 to-indigo-500",
    bgLight: "bg-blue-50/50 border-blue-200 text-blue-900",
    bgDark: "bg-blue-950/20 border-blue-500/20 text-blue-300"
  },
  {
    id: "Agent B",
    name: "Agent B",
    title: "Tool Mapper & Adaptor",
    roleDescription: "System API capability matching",
    focus: "Maps the human steps to WokAI's allowed system tools (e.g. gmail.send, calendar.createEvent). If no direct match exists, it plans browser automations or terminal execution.",
    color: "from-purple-500 to-violet-500",
    bgLight: "bg-purple-50/50 border-purple-200 text-purple-900",
    bgDark: "bg-purple-950/20 border-purple-500/20 text-purple-300"
  },
  {
    id: "Agent 1",
    name: "Agent 1",
    title: "Conversational Responder",
    roleDescription: "User-facing conversational engine",
    focus: "Drafts a natural, professional reply explaining the upcoming steps to the user in 2-3 sentences, free from technical JSON formats or backend tool names.",
    color: "from-pink-500 to-rose-500",
    bgLight: "bg-pink-50/50 border-pink-200 text-pink-900",
    bgDark: "bg-pink-950/20 border-pink-500/20 text-pink-300"
  },
  {
    id: "Agent 2",
    name: "Agent 2",
    title: "Structured Plan Generator",
    roleDescription: "JSON Plan Synthesizer",
    focus: "Translates mapped tools into a structured JSON block containing exact WokaiAction objects, assigns unique IDs, and evaluates risk levels (LOW, MEDIUM, HIGH, CRITICAL).",
    color: "from-orange-500 to-amber-500",
    bgLight: "bg-orange-50/50 border-orange-200 text-orange-900",
    bgDark: "bg-orange-950/20 border-orange-500/20 text-orange-300"
  },
  {
    id: "Agent 4",
    name: "Agent 4",
    title: "Content Generator",
    roleDescription: "Contextual payload writer",
    focus: "Dynamically writes exact code, script bodies, markdown docs, search query terms, email subjects/bodies, or terminal command lines needed for each scheduled action.",
    color: "from-yellow-500 to-amber-600",
    bgLight: "bg-yellow-50/50 border-yellow-200 text-yellow-900",
    bgDark: "bg-yellow-950/20 border-yellow-500/20 text-yellow-300"
  },
  {
    id: "Agent 3",
    name: "Agent 3",
    title: "API Handler",
    roleDescription: "API Parameter Binder",
    focus: "Merges structured actions from Agent 2 with payload contents from Agent 4, outputting fully hydrated, syntactically valid execution parameters.",
    color: "from-cyan-500 to-sky-500",
    bgLight: "bg-cyan-50/50 border-cyan-200 text-cyan-900",
    bgDark: "bg-cyan-950/20 border-cyan-500/20 text-cyan-300"
  },
  {
    id: "Agent #",
    name: "Agent #",
    title: "Plan Summarizer",
    roleDescription: "Execution Summary Engine",
    focus: "Creates a high-level summary of what will run. After execution, it converts raw JSON outputs (like list queries or raw API responses) into highly readable result cards.",
    color: "from-teal-500 to-emerald-500",
    bgLight: "bg-teal-50/50 border-teal-200 text-teal-900",
    bgDark: "bg-teal-950/20 border-teal-500/20 text-teal-300"
  },
  {
    id: "Agent 5",
    name: "Agent 5",
    title: "Quality Assurance Evaluator",
    roleDescription: "Gatekeeper & Auditor",
    focus: "Evaluates the entire plan against user intent. Rejects the plan if unsafe or incomplete, triggering recursive prompt refinement cycles until verified.",
    color: "from-emerald-500 to-green-600",
    bgLight: "bg-emerald-50/50 border-emerald-200 text-emerald-900",
    bgDark: "bg-emerald-950/20 border-emerald-500/20 text-emerald-300"
  }
];

const FAQS = [
  {
    q: "How does the multi-agent conductor architecture work?",
    a: "Unlike standard chatbots that attempt to plan, write content, and parse parameters all at once, WokAI OS splits the work among 8 specialized agents (inspired by the OMP Conductor pattern). Agent A creates the human logic, Agent B maps it to tools, Agent 2 outputs JSON schemas, Agent 4 writes payloads, Agent 3 binds them to APIs, Agent # summarizes the flow, and Agent 5 runs QA checks. If the plan fails QA, it is recursively refined."
  },
  {
    q: "What are 'Approval Gates' and how do they keep actions safe?",
    a: "WokAI OS automatically scores the risk of any generated plan (LOW, MEDIUM, HIGH, CRITICAL). Actions such as sending an email, creating calendar events, running shell terminal commands, placing Twilio phone calls, or submitting browser forms are paused under an approval block. The conductor waits until you review and click 'Approve' on the action card before executing the adaptors."
  },
  {
    q: "How does the Local Companion Daemon work?",
    a: "When running locally, WokAI OS connects to a lightweight companion background daemon (running on port 4317). This service allows the cloud orchestrator to safely launch local applications, execute PowerShell/Command Prompt scripts with a 15-second timeout safeguard, and manage offline command queuing that syncs to Firestore once connectivity is restored."
  },
  {
    q: "Can I automate sites that do not have APIs?",
    a: "Yes! WokAI incorporates a Playwright browser automation agent. When a task requires interacting with a web portal, the browser agent launches a Chromium instance, plans selectors, navigates, and extracts data. If it needs to upload files or click 'Submit', it pauses to request user approval first."
  },
  {
    q: "Is Firebase required to run WokAI OS?",
    a: "No, Firebase is completely optional. If Firebase credentials are not configured in your environment, WokAI automatically starts in an offline/local development sandbox mode, saving your workspace logs and profiles locally."
  }
];

export default function LandingPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(DEMO_PROMPTS[0]);
  const [activeStep, setActiveStep] = useState<"idle" | "thinking" | "executing" | "done">("idle");
  const [conductorLogs, setConductorLogs] = useState<SimulationStep[]>([]);
  const [actionsList, setActionsList] = useState<ActionStep[]>([]);
  const [conversationalOutput, setConversationalOutput] = useState("");
  const [currentLogIndex, setCurrentLogIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"visual" | "json">("visual");
  const [hoveredAgent, setHoveredAgent] = useState<typeof ARCHITECTURE_AGENTS[0] | null>(null);
  const [selectedArchAgent, setSelectedArchAgent] = useState<typeof ARCHITECTURE_AGENTS[0]>(ARCHITECTURE_AGENTS[0]);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [pricingPeriod, setPricingPeriod] = useState<"monthly" | "yearly">("monthly");
  
  // Custom scrolling tracker
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Theme toggle
  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  // Run Simulation handler
  const runSimulation = (promptId: number) => {
    const prompt = DEMO_PROMPTS.find(p => p.id === promptId) || DEMO_PROMPTS[0];
    setSelectedPrompt(prompt);
    setActiveStep("thinking");
    setConductorLogs([]);
    setConversationalOutput("");
    setActionsList(prompt.actions.map(act => ({ ...act, status: "idle" })));
    setCurrentLogIndex(0);
  };

  // Simulate thinking steps
  useEffect(() => {
    if (activeStep !== "thinking") return;

    if (currentLogIndex < selectedPrompt.conductorLogs.length) {
      const log = selectedPrompt.conductorLogs[currentLogIndex];
      const timer = setTimeout(() => {
        setConductorLogs(prev => [...prev, log]);
        setCurrentLogIndex(prev => prev + 1);
      }, log.delay);
      return () => clearTimeout(timer);
    } else {
      // Done thinking, transition to executing
      const timer = setTimeout(() => {
        setConversationalOutput(selectedPrompt.conversationalReply);
        setActiveStep("executing");
        // Start executing actions
        executeActionAtIndex(0);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activeStep, currentLogIndex, selectedPrompt]);

  // Execute steps sequentially
  const executeActionAtIndex = (index: number) => {
    if (index >= actionsList.length) {
      setActiveStep("done");
      return;
    }

    setActionsList(prev => prev.map((act, idx) => {
      if (idx === index) {
        return { ...act, status: act.requiresApproval ? "pending-approval" : "running" };
      }
      return act;
    }));

    if (!actionsList[index].requiresApproval) {
      // Simulate automatic running
      const timer = setTimeout(() => {
        setActionsList(prev => prev.map((act, idx) => {
          if (idx === index) return { ...act, status: "completed" };
          return act;
        }));
        executeActionAtIndex(index + 1);
      }, 1500);
      return () => clearTimeout(timer);
    }
  };

  // User click Approval Gate
  const handleApproveAction = (actionId: string) => {
    const index = actionsList.findIndex(a => a.id === actionId);
    if (index === -1) return;

    setActionsList(prev => prev.map(act => act.id === actionId ? { ...act, status: "running" } : act));
    
    // Simulate finishing running after approval
    setTimeout(() => {
      setActionsList(prev => prev.map(act => act.id === actionId ? { ...act, status: "completed" } : act));
      executeActionAtIndex(index + 1);
    }, 1000);
  };

  // Restart simulation
  const resetSimulation = () => {
    setActiveStep("idle");
    setConductorLogs([]);
    setActionsList([]);
    setConversationalOutput("");
    setCurrentLogIndex(0);
  };

  return (
    <div className={`${theme} ${theme === "dark" ? "bg-[#070b19]" : "bg-slate-50"} text-foreground min-h-screen font-sans antialiased overflow-x-hidden transition-colors duration-300`}>
      {/* Background gradients */}
      {theme === "dark" ? (
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
          <div className="absolute top-[800px] right-1/4 w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[150px]" />
          <div className="absolute bottom-[400px] left-1/3 w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[130px]" />
        </div>
      ) : (
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px]" />
          <div className="absolute top-[800px] right-1/4 w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[150px]" />
        </div>
      )}

      {/* ── Navigation ── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/85 backdrop-blur-md border-b py-3 shadow-sm" : "bg-transparent py-5"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shadow-sm">
              <Bot className="h-5 w-5 text-primary animate-pulse" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary/80 bg-clip-text text-transparent select-none">
              WokAI OS
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#architecture" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Architecture</a>
            <a href="#demo" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Live Simulation</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#faqs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">FAQs</a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link href="/auth/login">
              <button className="text-xs font-semibold px-4 py-2 rounded-lg border hover:bg-accent transition-colors">
                Sign In
              </button>
            </Link>
            <Link href="/chat">
              <button className="text-xs font-semibold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20">
                Launch Console
              </button>
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex md:hidden items-center gap-2">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button 
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-b bg-background"
            >
              <div className="px-4 py-4 space-y-3 flex flex-col">
                <a 
                  href="#features" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium py-1.5 text-muted-foreground hover:text-foreground"
                >
                  Features
                </a>
                <a 
                  href="#architecture" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium py-1.5 text-muted-foreground hover:text-foreground"
                >
                  Architecture
                </a>
                <a 
                  href="#demo" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium py-1.5 text-muted-foreground hover:text-foreground"
                >
                  Live Simulation
                </a>
                <a 
                  href="#pricing" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium py-1.5 text-muted-foreground hover:text-foreground"
                >
                  Pricing
                </a>
                <a 
                  href="#faqs" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium py-1.5 text-muted-foreground hover:text-foreground"
                >
                  FAQs
                </a>
                <div className="pt-3 border-t flex flex-col gap-2">
                  <Link href="/auth/login" className="w-full text-left">
                    <button className="w-full text-xs font-semibold py-2 rounded-lg border hover:bg-accent transition-colors">
                      Sign In
                    </button>
                  </Link>
                  <Link href="/chat" className="w-full text-left">
                    <button className="w-full text-xs font-semibold py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm">
                      Launch Console
                    </button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Hero Section ── */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6 select-none animate-fade-in">
            <Sparkles size={13} />
            <span>Multi-Agent Orchestration Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-balance leading-none max-w-4xl mx-auto mb-6">
            The Agentic Productivity <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-400 via-primary to-blue-500 bg-clip-text text-transparent">
              Operating System
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground text-balance max-w-2xl mx-auto mb-10 leading-relaxed">
            WokAI OS goes beyond the limits of standard chatbots. It breaks complex goals into structured JSON plans, checks Gmail, schedules events, runs local command lines, and automates browser scripts—all secured behind secure user approval gates.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/chat" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-semibold px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-lg shadow-primary/20 group">
                Launch Dashboard
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <a href="#demo" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-semibold px-6 py-3 rounded-lg border hover:bg-accent transition-all">
                Try Simulation
                <Play size={14} className="fill-current" />
              </button>
            </a>
          </div>

          {/* Core visual overview banner */}
          <div className="relative mt-8 max-w-5xl mx-auto border rounded-2xl bg-card shadow-2xl overflow-hidden group select-none">
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            
            {/* Header border bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/70" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <span className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <span className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">WOKAI-CONDUCTOR-CONSOLE.EXE</span>
              <div className="w-12" />
            </div>

            {/* Content banner */}
            <div className="p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 items-center bg-[#080d1a]/95">
              <div className="flex-1 text-left">
                <div className="text-xs font-mono text-emerald-400 mb-2 font-bold tracking-wider">SYSTEM INITIALIZED</div>
                <h3 className="text-lg sm:text-xl font-bold mb-3">Multi-Agent Workflow Execution</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  When a request is submitted, WokAI spins up an orchestration chain. It deconstructs parameters, builds structured JSON codebases, tests scripts locally using the Companion Daemon on port 4317, and monitors state.
                </p>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Workspace Sync</span>
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                      <Check size={12} strokeWidth={2.5} /> Google Cloud Active
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Companion Link</span>
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                      <Check size={12} strokeWidth={2.5} /> Port 4317 Bound
                    </span>
                  </div>
                </div>
              </div>

              {/* Graphic container */}
              <div className="flex-1 w-full flex items-center justify-center p-4 bg-black/40 border rounded-xl font-mono text-[10px] text-slate-400 text-left overflow-auto max-h-52">
                <div className="w-full space-y-2">
                  <div className="text-slate-500">{"$ npm run dev"}</div>
                  <div className="text-slate-200">{"[WokAI OS] Starting Next.js App Router..."}</div>
                  <div className="text-emerald-400">{"[WokAI OS] Firebase configured under users/{uid}/..."}</div>
                  <div className="text-emerald-400">{"[WokAI OS] Connected to Twilio API Adapter"}</div>
                  <div className="text-slate-200">{"[WokAI OS] Listening for local triggers on port 4317..."}</div>
                  <div className="text-slate-500">{"----------------------------------------"}</div>
                  <div className="text-yellow-400 animate-pulse">{"[Conductor] Waiting for input triggers..."}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section id="features" className="py-20 border-t bg-muted/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight mb-4">
              Equipped with Native Tools & Adapters
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              WokAI is built to execute. It bridges the gap between language generation and host commands, local browsers, and communication APIs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="group border rounded-xl bg-card p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400">
                <Cpu size={20} />
              </div>
              <h3 className="text-base font-bold mb-2">5-Agent Conductor</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cognitive work is segmented. Specialized planning, code writing, execution, and QA agents collaborate instead of depending on single-prompt summaries.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group border rounded-xl bg-card p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400">
                <Mail size={20} />
              </div>
              <h3 className="text-base font-bold mb-2">Workspace Integrations</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Inspect and summarize Gmail inboxes, manage Drive files, and write structured sheets or docs securely using OAuth 2.0.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group border rounded-xl bg-card p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400">
                <Globe size={20} />
              </div>
              <h3 className="text-base font-bold mb-2">Browser Automation</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Under the hood, Playwright scripts automate form filling, pricing checks, and data collection using headless browser instances.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group border rounded-xl bg-card p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400">
                <Terminal size={20} />
              </div>
              <h3 className="text-base font-bold mb-2">Companion Daemon</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect directly to your local PC terminal. Safely execute local scripts and queue offline tasks that sync back to Firestore automatically.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group border rounded-xl bg-card p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400">
                <PhoneCall size={20} />
              </div>
              <h3 className="text-base font-bold mb-2">Twilio Outbound Calling</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Synthesize custom text-to-speech calls, verify server alerts over voice, and receive direct WhatsApp status confirmations on completion.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group border rounded-xl bg-card p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-base font-bold mb-2">Safety Approval Gates</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Complete control over risky transactions. Sensitive actions (calls, emails, file creation) wait under user-approved holds before running.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Interactive Live Simulation Section ── */}
      <section id="demo" className="py-20 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight mb-4">
              Watch the Conductor in Real-Time
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Click one of our pre-configured task triggers below to simulate how WokAI's 5-Agent conductor deconstructs requests, binds parameters, and enforces approval safety checks.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {DEMO_PROMPTS.map((prompt) => (
                <button
                  key={prompt.id}
                  onClick={() => runSimulation(prompt.id)}
                  disabled={activeStep === "thinking" || activeStep === "executing"}
                  className={`text-xs px-4 py-2 rounded-full border transition-all duration-150 ${selectedPrompt.id === prompt.id ? "bg-primary text-primary-foreground border-primary shadow-sm" : "hover:bg-accent bg-background"}`}
                >
                  Prompt {prompt.id + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto">
            
            {/* Left Box: Prompt Input & Conductor Log */}
            <div className="lg:col-span-7 flex flex-col border rounded-2xl bg-card shadow-xl overflow-hidden h-[540px]">
              {/* Header Bar */}
              <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-muted-foreground" />
                  <span className="text-[11px] font-mono font-bold tracking-wider text-muted-foreground uppercase">Work Conductor Execution Log</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${activeStep === "thinking" ? "bg-amber-500 animate-ping" : activeStep === "executing" ? "bg-blue-500 animate-pulse" : activeStep === "done" ? "bg-emerald-500" : "bg-slate-400"}`} />
                  <span className="text-[10px] font-mono capitalize text-muted-foreground">{activeStep}</span>
                </div>
              </div>

              {/* Prompt box display */}
              <div className="p-4 border-b bg-muted/10">
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5">User Prompt</div>
                <div className="p-3 bg-background border rounded-lg text-sm text-foreground flex items-center justify-between gap-3">
                  <p className="italic leading-normal flex-1 truncate text-xs sm:text-sm">{selectedPrompt.text}</p>
                  {activeStep === "idle" && (
                    <button
                      onClick={() => runSimulation(selectedPrompt.id)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors shadow-sm"
                    >
                      <Play size={11} className="fill-current" /> Run
                    </button>
                  )}
                  {(activeStep === "thinking" || activeStep === "executing") && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 font-medium">
                      <RefreshCw size={12} className="animate-spin" /> Processing
                    </div>
                  )}
                  {activeStep === "done" && (
                    <button
                      onClick={resetSimulation}
                      className="px-3.5 py-1.5 border hover:bg-accent rounded text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <RefreshCw size={11} /> Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Conductor log list */}
              <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-3 bg-[#080d19]/90 border-b">
                <AnimatePresence>
                  {conductorLogs.length === 0 && activeStep === "idle" && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-slate-500 h-full flex flex-col items-center justify-center text-center p-6 gap-2"
                    >
                      <Bot size={28} className="text-slate-600 animate-bounce" />
                      <p>Simulation idle. Click 'Run' to begin the conductor loop.</p>
                    </motion.div>
                  )}
                  {conductorLogs.map((log, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="border-l-2 border-primary/40 pl-3 py-0.5"
                    >
                      <span className="text-emerald-400 font-bold">[{log.agentName}: {log.role}]</span>{" "}
                      <span className="text-slate-300">{log.message}</span>
                    </motion.div>
                  ))}
                  {activeStep === "thinking" && (
                    <div className="flex items-center gap-2 text-yellow-400 pl-3">
                      <span className="animate-pulse">●</span> Deconstructing pipeline inputs...
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Conversational bottom bubble */}
              <div className="p-4 bg-muted/20 min-h-[90px] flex flex-col justify-center">
                {conversationalOutput ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 select-none">
                      <Bot size={16} />
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Conversational Responder (Agent 1)</div>
                      <p className="text-xs text-foreground mt-0.5 leading-relaxed">{conversationalOutput}</p>
                    </div>
                  </motion.div>
                ) : (
                  <span className="text-xs text-slate-500 italic text-center font-mono select-none">Waiting for conductor generation...</span>
                )}
              </div>
            </div>

            {/* Right Box: Actions list, raw output & approval gates */}
            <div className="lg:col-span-5 flex flex-col border rounded-2xl bg-card shadow-xl overflow-hidden h-[540px]">
              
              {/* Tab Selector */}
              <div className="px-4 border-b bg-muted/30 flex items-center justify-between h-[45px]">
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveTab("visual")}
                    className={`text-xs px-3 py-1.5 font-medium rounded transition-colors ${activeTab === "visual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Visual Actions
                  </button>
                  <button
                    onClick={() => setActiveTab("json")}
                    className={`text-xs px-3 py-1.5 font-medium rounded transition-colors ${activeTab === "json" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Raw Plan JSON
                  </button>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono select-none">Agent 2 Plan Schema</div>
              </div>

              {/* Content Panel */}
              <div className="flex-1 p-4 overflow-y-auto bg-black/10">
                {activeTab === "visual" ? (
                  <div className="space-y-4">
                    {actionsList.length === 0 ? (
                      <div className="text-slate-500 text-xs italic text-center py-20 font-mono">
                        No actions mapped. Start simulation to synthesize steps.
                      </div>
                    ) : (
                      actionsList.map((action) => (
                        <div 
                          key={action.id}
                          className={`p-4 border rounded-xl transition-all duration-200 ${action.status === "completed" ? "bg-emerald-500/5 border-emerald-500/30" : action.status === "running" ? "bg-primary/5 border-primary/40 animate-pulse-soft" : action.status === "pending-approval" ? "bg-yellow-500/5 border-yellow-500/40 shadow-[0_0_12px_rgba(234,179,8,0.1)]" : "bg-muted/20 border-border/60"}`}
                        >
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-muted rounded border text-muted-foreground">
                                {action.tool}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${action.risk === "LOW" ? "bg-blue-500/10 text-blue-400" : action.risk === "MEDIUM" ? "bg-orange-500/10 text-orange-400" : "bg-red-500/10 text-red-400"}`}>
                                {action.risk} Risk
                              </span>
                            </div>
                            <span className="text-[10px] font-mono capitalize">
                              {action.status === "pending-approval" ? "Paused" : action.status}
                            </span>
                          </div>

                          <p className="text-xs text-foreground font-medium mb-3">{action.description}</p>

                          {/* Render Approval Trigger */}
                          {action.status === "pending-approval" && (
                            <motion.div 
                              initial={{ scale: 0.95 }}
                              animate={{ scale: 1 }}
                              className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-2">
                                <Lock size={14} className="text-yellow-500 shrink-0" />
                                <span className="text-[10px] text-yellow-500 leading-tight">Requires user permission to proceed</span>
                              </div>
                              <button
                                onClick={() => handleApproveAction(action.id)}
                                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-white rounded text-[10px] font-bold shadow transition-colors shrink-0"
                              >
                                Approve Action
                              </button>
                            </motion.div>
                          )}

                          {action.status === "completed" && (
                            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold font-mono">
                              <Check size={12} strokeWidth={2.5} /> Done
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="font-mono text-[10px] text-slate-300 p-2 bg-black/40 border rounded-lg h-full overflow-y-auto select-all">
                    {actionsList.length === 0 ? (
                      <span className="text-slate-500 italic">Plan block is empty...</span>
                    ) : (
                      <pre>{`[\n${actionsList.map(a => `  {\n    "actionId": "${a.id}",\n    "tool": "${a.tool}",\n    "requiresApproval": ${a.requiresApproval},\n    "risk": "${a.risk}",\n    "params": ${a.rawJson.split('\n').join('\n    ')}\n  }`).join(',\n')}\n]`}</pre>
                    )}
                  </div>
                )}
              </div>

              {/* Status footer bar */}
              <div className="px-4 py-3 border-t bg-muted/30 text-[10px] font-mono text-muted-foreground flex justify-between">
                <span>Total Actions: {actionsList.length}</span>
                <span>Active Task: {actionsList.filter(a => a.status === "completed").length} / {actionsList.length}</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Core Architecture Node Diagram ── */}
      <section id="architecture" className="py-20 border-t bg-muted/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight mb-4">
              OMP Conductor: Multi-Agent Cascade
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Our structured multi-agent engine segments tasks recursively to preserve reliability and guarantee correctness. Click on any agent node below to inspect its focus.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto">
            
            {/* Left 8-Grid nodes */}
            <div className="lg:col-span-7 grid grid-cols-2 gap-4">
              {ARCHITECTURE_AGENTS.map((agent) => {
                const isSelected = selectedArchAgent.id === agent.id;
                return (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedArchAgent(agent)}
                    onMouseEnter={() => setHoveredAgent(agent)}
                    onMouseLeave={() => setHoveredAgent(null)}
                    className={`p-4 border rounded-xl text-left transition-all duration-200 ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary shadow-md" : "hover:border-border/80 hover:bg-muted/30 bg-card"}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-muted-foreground">{agent.name}</span>
                      <span className="w-2 h-2 rounded-full bg-primary/70 animate-pulse-soft" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground truncate">{agent.title}</h3>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{agent.roleDescription}</p>
                  </button>
                );
              })}
            </div>

            {/* Right detail panel */}
            <div className="lg:col-span-5 border rounded-2xl bg-card shadow-xl p-6 relative overflow-hidden h-[340px] flex flex-col justify-between">
              {/* Subtle background flow trace */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full pointer-events-none" />

              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider mb-4">
                  Agent Inspector
                </div>

                <div className="mb-4">
                  <h3 className="text-xl font-bold tracking-tight">{selectedArchAgent.title}</h3>
                  <span className="text-xs font-mono font-semibold text-emerald-400/90 mt-1 block">
                    {selectedArchAgent.roleDescription}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {selectedArchAgent.focus}
                </p>
              </div>

              <div className="pt-4 border-t flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span>Sequence Status: ACTIVE</span>
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <Check size={11} strokeWidth={2.5} /> Verified
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Pricing Section ── */}
      <section id="pricing" className="py-20 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight mb-4">
              Flexible Sandbox & Professional Scale
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Start building in our free local sandbox or scale with our high-throughput cloud cluster.
            </p>

            <div className="mt-6 inline-flex p-1 rounded-lg bg-muted border">
              <button
                onClick={() => setPricingPeriod("monthly")}
                className={`text-xs px-4 py-1.5 font-medium rounded-md transition-colors ${pricingPeriod === "monthly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setPricingPeriod("yearly")}
                className={`text-xs px-4 py-1.5 font-medium rounded-md transition-colors ${pricingPeriod === "yearly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Yearly (Save 20%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            
            {/* Sandbox Plan */}
            <div className="border rounded-2xl bg-card p-8 flex flex-col justify-between hover:shadow-lg transition-shadow relative">
              <div>
                <h3 className="text-lg font-bold">Developer Sandbox</h3>
                <p className="text-xs text-muted-foreground mt-1">For offline development & staging automation</p>
                <div className="my-6">
                  <span className="text-4xl font-extrabold">$0</span>
                  <span className="text-xs text-muted-foreground ml-1">/ forever</span>
                </div>

                <div className="pt-6 border-t space-y-3">
                  <div className="flex items-start gap-3 text-xs">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>Single local companion connection (Port 4317)</span>
                  </div>
                  <div className="flex items-start gap-3 text-xs">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>Run local terminal tools & processes</span>
                  </div>
                  <div className="flex items-start gap-3 text-xs">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>Playwright local browser sandbox execution</span>
                  </div>
                  <div className="flex items-start gap-3 text-xs">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>Firebase offline mode user profiles</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link href="/chat">
                  <button className="w-full text-xs font-semibold py-2.5 rounded-lg border hover:bg-accent transition-colors">
                    Start Local Dev
                  </button>
                </Link>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="border border-primary rounded-2xl bg-card p-8 flex flex-col justify-between hover:shadow-lg transition-shadow relative">
              <div className="absolute top-0 right-6 -translate-y-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider">
                Recommended
              </div>

              <div>
                <h3 className="text-lg font-bold">Pro Command Center</h3>
                <p className="text-xs text-muted-foreground mt-1">High-throughput multi-agent execution in the cloud</p>
                <div className="my-6">
                  <span className="text-4xl font-extrabold">
                    {pricingPeriod === "monthly" ? "$29" : "$23"}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">/ month</span>
                </div>

                <div className="pt-6 border-t space-y-3">
                  <div className="flex items-start gap-3 text-xs">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>Infinite Google Workspace OAuth integration nodes</span>
                  </div>
                  <div className="flex items-start gap-3 text-xs">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>Interactive Real-time Conductor execution map</span>
                  </div>
                  <div className="flex items-start gap-3 text-xs">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>Twilio REST voice calling and automated WhatsApp triggers</span>
                  </div>
                  <div className="flex items-start gap-3 text-xs">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>Persistent user memory context & multi-directory workspace</span>
                  </div>
                  <div className="flex items-start gap-3 text-xs">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>Priority background queue execution</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link href="/chat">
                  <button className="w-full text-xs font-semibold py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow shadow-primary/20">
                    Get Started Now
                  </button>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section id="faqs" className="py-20 border-t bg-muted/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Find answers to common questions about WokAI's agent conductor and local execution features.
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className="border rounded-xl bg-card overflow-hidden transition-all duration-200">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-muted/10 transition-colors"
                  >
                    <span className="text-sm font-bold text-foreground">{faq.q}</span>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="px-6 pb-5 text-xs text-muted-foreground leading-relaxed border-t pt-4 bg-muted/5">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t bg-muted/20 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <span className="text-sm font-bold">WokAI OS</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The Multi-Agent Conductor productivity operating system built to finish work before it's too late.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#features" className="text-muted-foreground hover:text-foreground">Features</a></li>
                <li><a href="#demo" className="text-muted-foreground hover:text-foreground">Conductor Log</a></li>
                <li><a href="#pricing" className="text-muted-foreground hover:text-foreground">Pricing Plans</a></li>
                <li><Link href="/chat" className="text-muted-foreground hover:text-foreground">Developer Console</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">Tech Stack</h4>
              <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                <li>Next.js 16 (App Router)</li>
                <li>TypeScript & Tailwind CSS</li>
                <li>Playwright Engine</li>
                <li>Firebase & Firestore</li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">Newsletter</h4>
              <p className="text-xs text-muted-foreground mb-3">Subscribe to product updates.</p>
              <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
                <input 
                  type="email" 
                  placeholder="name@email.com" 
                  className="flex-1 px-3 py-1.5 text-xs bg-background border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button className="px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded hover:bg-primary/90 transition-colors">
                  Join
                </button>
              </form>
            </div>
          </div>

          <div className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-muted-foreground">
            <span>© {new Date().getFullYear()} WokAI. All rights reserved.</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-foreground">Terms of Service</a>
              <a href="#" className="hover:text-foreground">Privacy Policy</a>
              <a href="#" className="hover:text-foreground">Audit Logs</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
