# OMP Setup For WokAI

WokAI uses OMP in two ways:

1. As the coding-agent workflow for developing the project.
2. As architectural inspiration for WokAI's own agent runtime.

## Install OMP

Official options from the OMP documentation:

```powershell
irm https://omp.sh/install.ps1 | iex
```

```sh
bun install -g @oh-my-pi/pi-coding-agent
```

```sh
curl -fsSL https://omp.sh/install | sh
brew install can1357/tap/omp
mise use -g github:can1357/oh-my-pi
```

This project also includes OMP as a dev dependency, so after `npm install` you can run:

```sh
npm run omp
npm run omp:plan
npm run omp:resume
```

## OMP Ideas Used In WokAI

- **Conductor agent:** one top-level planner decides intent, risk, tools, approvals, and final response.
- **Subagents:** specialized modules for tasks, memory, Gmail, calendar, drive, browser, calls, and devices.
- **Tool registry:** every capability has a typed input, safe execution path, sensitivity level, and audit entry.
- **Plan mode:** risky or multi-step work is planned first, then executed only after approval.
- **Hindsight memory:** useful user preferences and work patterns are retained and recalled before planning.
- **Worktree-style isolation:** browser jobs, device commands, and external integrations are stored as separate jobs with state.
- **MCP-ready extension surface:** future custom tools can be added without changing the conductor contract.

## Recommended OMP Development Flow

1. Run `npm run omp:plan` for major features.
2. Ask OMP to spawn subagents by subsystem: UI, Firebase, Google APIs, agent runtime, tests.
3. Require each subagent to return typed findings or diffs.
4. Run `npm run verify` before handoff.
5. Update `docs/omp-memory.md` with project-level lessons worth reusing.
