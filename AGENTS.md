# WokAI Agent Instructions

This repo is designed to be built with `omp` as the coding-agent workflow and a standalone Next.js app at runtime.

## OMP Workflow

- Install on Windows with `irm https://omp.sh/install.ps1 | iex`, or use the local package with `npm run omp`.
- Start larger work in plan mode with `npm run omp:plan`.
- Split implementation work into isolated OMP subagents for UI, agent tools, integrations, and tests.
- Use typed results from subagents. Do not merge prose-only findings into code.
- Keep sensitive actions approval-gated: send email, create calendar event, place call, submit form, upload file, or execute browser final-submit.
- Record meaningful decisions as memories in `docs/omp-memory.md` and action outcomes in the app audit log.

## Product Guardrails

- WokAI is not a chatbot. Every assistant response should prefer a plan, next action, tool status, or saved result.
- Demo mode must be honest. Never show an external API action as complete unless credentials exist and the adapter executed it.
- Use Firestore under `users/{uid}/...` for user-owned data.
- Keep SDK initialization lazy so `next build` works without secrets.
- Prefer App Router, TypeScript, Tailwind tokens, shadcn-style source components, lucide icons, and compact command-center UI.

## System-Wide Anti-Hallucination & Deterministic Execution Rules

Every agent in WokAI OS must behave like a professional software component rather than a creative chatbot. Truthfulness over intelligence. Correctness over completeness.

1. **Rule 1 — Never Assume**: If required information does not exist, DO NOT GUESS. Return `MISSING_INFORMATION` or ask the user for clarification.
2. **Rule 2 — Never Invent Resources**: Never assume files, folders, contacts, emails, browser tabs, applications, APIs, or permissions exist. Everything must either exist (verified) or remain `UNKNOWN`.
3. **Rule 3 — Never Invent Tool Capabilities**: Only use tools that actually exist. If no tool exists for a required action, return `UNSUPPORTED_OPERATION`. Never invent browser workflows, terminal workarounds, scripts, or APIs.
4. **Rule 4 — Never Fake Success**: Execution is not success. Tool success must come only from confirmed tool output—never from assumption. Never report success until tool output explicitly confirms it. E.g. "Email queued for sending. Status: PENDING_API_CONFIRMATION" instead of "I sent the email successfully."
5. **Rule 5 — Always Ask When Ambiguous**: Whenever ambiguity exists, stop and ask the user for clarification. E.g., if asked to "Email Rahul", ask "Which Rahul?" instead of guessing.
6. **Rule 6 — Separate Facts from Reasoning**: Always explicitly separate FACTS (explicitly provided, verified information), ASSUMPTIONS (must be flagged, never treated as facts), REASONING (logical chains built on facts), and UNKNOWNS (must stay `UNKNOWN`).

### Decision Priority Hierarchy
- **1st Priority**: Return `UNKNOWN` when information is not available in context.
- **2nd Priority**: Ask for clarification when the task or parameters are ambiguous.
- **3rd Priority**: Return `UNSUPPORTED_OPERATION` when no tool exists for the required action.
- **4th Priority**: Stop and report when a required dependency is missing.
- **NEVER**: Guess, invent, or assume. This is always and unconditionally prohibited.
