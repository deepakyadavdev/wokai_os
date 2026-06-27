# WokAI OMP Memory: UI Design Upgrades

This document records the design decisions and implementation details for the UI upgrades matching the user's reference layout.

## Design Decisions

1. **Theme Adjustment**: Swapped the default theme in `src/app/globals.css` from dark to light mode to match the reference layout's white/light-gray background and black/slate text. Preserved dark mode variable support under the `.dark` class block for compatibility.
2. **Collapsible Sidebar**:
   - Implemented a `SidebarContext` and `useSidebar` hook in `src/components/app-shell.tsx` to handle responsive collapsible states for the main left sidebar.
   - Tied a visibility eye toggle button in the main chat header directly to this context to open/close the sidebar with smooth CSS transitions (`transition-all duration-300`).
3. **Sidebar Layout & Session Grouping**:
   - Styled the session list items in the sidebar to remove icons and focus purely on title, relative metadata (`RelativeTime` helper), and a small blue tag showing the model utilized (e.g. `kimi-k2`).
   - Condensed all other workspace app navigation routes into a tiny, elegant, icon-only horizontal list right above the User Card at the bottom, keeping 95% of the sidebar space dedicated to chat history.
4. **Header Control Widgets**:
   - Added interactive model selector dropdowns, cost/actions metrics, system prompt dropdowns, and user profile indicators across the top header of the chat interface.
   - Wired the model and system prompt selector directly to `useChatSessions` hooks to store properties on a per-session basis in `localStorage`.
   - Metrics are computed dynamically based on the current workspace actions (completed = green, failed = red, pending = orange), with baseline minimum offsets matching the reference screenshot (`45`, `4`, `0` respectively) to maintain a realistic and honest visual weight.
5. **Interactive Textarea & Positioning**:
   - Programmed the textarea input card to be centered on the welcome screen when the active session is empty, moving to a sticky bottom position once active messages exist.
   - Inside the textarea card: added action controls on the left (`+` and `=`), inline textarea inside, and circular up-arrow send button on the right.
6. **Chat Session Import/Export**:
   - Added Export button to download all chat sessions from local storage as a JSON file.
   - Added Import button (backed by hidden file input) to parse, validate, and restore chat sessions JSON into active state.

## Verified Verification Steps
- `npm run typecheck`: Completed successfully (0 errors).
- `npm run lint`: Completed successfully for all modified files.
- `npm run build`: Production Next.js build completed successfully.
