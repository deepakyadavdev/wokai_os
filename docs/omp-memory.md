# WokAI OMP Memory: UI Design Upgrades & Real-Time Thinking Streams

This document records the design decisions and implementation details for the UI upgrades matching the user's reference layout and the agent thinking streaming features.

## Design Decisions

1. **Theme Adjustment**: Swapped the default theme in `src/app/globals.css` from dark to light mode to match the reference layout's white/light-gray background and black/slate text. Preserved dark mode variable support under the `.dark` class block for compatibility.
2. **Collapsible Sidebar**:
   - Implemented a `SidebarContext` and `useSidebar` hook in `src/components/app-shell.tsx` to handle responsive collapsible states for the main left sidebar.
3. **Sidebar Layout & Session Grouping**:
   - Styled the session list items in the sidebar to remove icons and focus purely on title, relative metadata (`RelativeTime` helper), and a small blue tag showing the model utilized (e.g. `kimi-k2`).
   - Condensed all other workspace app navigation routes into a tiny, elegant, icon-only horizontal list right above the User Card at the bottom, keeping 95% of the sidebar space dedicated to chat history.
4. **Header Control Deletion**:
   - Deleted the upper toolbar of the chat interface entirely (removing model selects like `kimi`, system prompt selectors, action count stats, profile silhouettes, and eye toggles) to provide a clean, distraction-free view matching the user's reference layout.
5. **High-Contrast Typography**:
   - Updated the assistant message body container in `src/components/chat/chat-main.tsx` to use high-contrast dark text (`text-slate-900` on light background, `text-slate-100` on dark background).
   - Modified `src/components/chat/markdown-renderer.tsx` to explicitly render paragraph text, lists, bold text, headings, and code text in `text-slate-900 dark:text-slate-100` color rules, guaranteeing excellent visibility and contrast.
   - Fixed a CSS scroll padding bug by changing the message list wrapper's padding to `pb-48`. This ensures that messages do not scroll behind the sticky bottom input bar's fade-out gradient overlay, preventing faded/poor contrast text.
6. **Real-time Subagent Output Streaming**:
   - Augmented the progress callbacks in `src/lib/wokai/agent.ts` and the stream handler in `src/app/api/agent/chat/route.ts` to capture and forward the raw text outputs of each planning model (Agent A, Agent B, Agent 1, Agent 2, Agent 4, Agent 3, Agent #, and Agent 5) the instant they finish and release.
   - Placed a real-time reactive logger at the bottom of the active chat list showing these outputs as they arrive in live-updating panels during the thinking phase.
7. **Thinking Process Accordion**:
   - Programmed the subagent outputs to automatically hide once the planning pipeline completes and the main response is printed.
   - Placed a collapsible accordion toggle (`Show thinking process` / `Hide thinking process`) under assistant message bubbles to expand and inspect the logs retroactively.
8. **Interactive Input Card & Upgrade Tab**:
   - Styled the input card with a pink brain icon `🧠` on the left, `What's in your mind?...` placeholder text, and a circular blue paper-airplane send button on the right.
   - Added a vertical floating "Upgrade to Pro" banner on the right edge of the viewport matching the reference layout.

## Verified Verification Steps
- `npm run typecheck`: Completed successfully (0 errors).
- `npm run lint`: Completed successfully for all modified files.
- `npm run build`: Production Next.js build completed successfully.
