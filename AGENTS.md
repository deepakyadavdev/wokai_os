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
