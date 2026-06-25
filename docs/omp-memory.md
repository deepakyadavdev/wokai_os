# WokAI Hindsight Memory

- WokAI must always distinguish demo-mode actions from live integrations.
- Sensitive actions require approval before execution.
- User-owned data lives under `users/{uid}` in Firestore.
- Agent planning should load memories, tasks, deadlines, device state, and recent actions before responding.
- Browser automation pauses before submit, payment, upload, send, or destructive operations.
