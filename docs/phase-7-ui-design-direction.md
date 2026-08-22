# AgentFlow UI/UX Design Direction

## Product Design Principle

**"Command & Clarity"**

AgentFlow should feel like a high-end financial or analyst platform—tools like Bloomberg Terminal, Stripe Dashboard, or Linear. It must exude competence, trust, and transparency. The application is an autonomous agent operating on the user's behalf with real money; therefore, the design must prioritize crystal-clear visibility into *actions*, *expenditure*, and *evidence*, without overwhelming the user with the underlying technical mechanics.

**Core Tenets:**
1. **Evidence-First**: Citations and sources should feel like verifiable proof, not just links.
2. **Controlled Autonomy**: The user should always feel in control. Approvals should feel like high-stakes business decisions, not software popups.
3. **Elegance over Decoration**: Avoid generic "AI" styling (no neon gradients, no sparkle emojis). Rely on crisp typography, subtle contrast, and intentional spacing.

---

## Information Architecture

The current navigation model is too fragmented. The user's primary mental model revolves around **Research Missions**. 

**Recommended Structure:**
- **Dashboard (Home)**: The command center. Combines active research, recent history, and high-level spending.
- **Research Workspace**: The detailed view of a single mission. (Includes its own contextual history, ledger, and approvals).
- **Settings / Global Ledger (Secondary)**: For technical or finance users who need to see global x402 settings or all transactions across the org.

*Why:* Approvals and Payments are highly contextual to the research they belong to. They should live inside the Workspace, pulling the user's focus to the actual work rather than scattering it across horizontal tabs.

---

## Workspace Architecture

The Research Workspace is the heart of AgentFlow. The current 2-column layout (Main + Sidebar) is functional but needs refinement in hierarchy and density.

**Recommended Layout (Desktop):**
- **Top Bar (Sticky)**: Goal statement, global status (e.g., "Researching...", "Waiting for Approval", "Complete"), and high-level Budget/Spend progress bar.
- **Left/Main Stage (70%)**: The action area.
  - *While Researching*: An elegant, simplified step-by-step progress visual.
  - *When Approval Needed*: A dominant, inline approval card (blocking progress).
  - *When Complete*: The Final Report takes over the entire main stage, styled like a published document.
- **Right Sidebar (30%)**: Context and Evidence.
  - *Sources / Citations*: Displayed as rich reference cards.
  - *Financial Ledger*: A compact view of transactions.
  - *Technical Log*: The verbose activity feed (collapsed by default).

*Why:* The user cares about the *result* (Main Stage) and the *proof* (Sidebar). Separating them visually allows the report to breathe while keeping evidence one click away.

---

## Research Flow UX

1. **Start Research**: A focused, distraction-free prompt interface (think Google Search, but for complex tasks). Includes an explicit budget slider with real-world currency (USDC) to anchor the spending reality.
2. **Researching (Progress)**: Do not show a raw console log by default. Show semantic steps: "Searching public data" → "Evaluating knowledge gaps" → "Synthesizing". 
3. **Approval Needed**: The workflow pauses. The UI shifts focus to a high-contrast intervention card.
4. **Completed Report**: The progress UI fades away, and the final report blossoms into a clean, editorial reading view.

---

## Approval UX

Approvals must feel like a **Purchase Order Review**, not an error message.

- **Interaction**: Inline in the Workspace's Main Stage. It shouldn't be a modal that can be accidentally dismissed.
- **Information Presented**:
  - **What**: The specific data/service being purchased.
  - **Why**: The gap it fills (Agent's reasoning).
  - **Cost**: The exact USDC amount (with base units hidden in a tooltip).
- **Actions**: Two distinct buttons. A primary (e.g., "Approve $2.00") and a secondary ("Decline & Continue Without"). 

---

## Report UX

The final report should feel like a premium deliverable. 
- **Typography**: Shift to a highly readable, elegant font stack (e.g., a modern serif for headers like *Merriweather* or *Playfair*, and a clean sans-serif for body text like *Inter*).
- **Structure**: Render Markdown with proper typographic scale. 
- **Integration**: Citations in the text should visually link to the sources in the Right Sidebar (e.g., hovering over a footnote highlights the source card).

---

## Dashboard UX

The Dashboard should be an operational overview, not just a list of links.
- **Top Row**: Key metrics (Total Spend, Active Missions, Pending Approvals).
- **Main Area**: "Active & Recent Research" table or grid. 
- **Action**: A prominent "New Research" entry point.
- Avoid vanity metrics like "Total SSE Events Processed" or "Database Rows".

---

## Visual System

- **Surfaces over Borders**: Move away from drawing borders around every single div. Use subtle background color shifts (e.g., white cards on a `bg-gray-50` canvas) and soft, diffuse shadows (`shadow-sm`) to define spatial relationships.
- **Typography**: 
  - Sans-serif (Inter or Roboto) for UI controls, data, and ledgers.
  - Monospace (JetBrains Mono or Fira Code) exclusively for transaction IDs or technical metadata.
- **Color Palette**:
  - *Primary*: A deep, trustworthy Slate or Navy (`slate-900`) instead of generic blue.
  - *Accents*: Restrained use of semantic colors. Emerald/Green for completions and budget health. Amber for pending approvals. 
  - *Backgrounds*: Off-whites and cool grays (`gray-50`, `slate-50`) to reduce eye strain.
- **Density**: 
  - *High Density* for ledgers, logs, and citations (compact spacing, smaller fonts).
  - *Low Density* for the Final Report and New Research prompt (generous line height, ample whitespace).

---

## Responsive Strategy

- **Desktop (1024px+)**: The 2-column Workspace (Main + Sidebar).
- **Tablet (768px - 1024px)**: Sidebar shrinks; less critical data (like the technical log) is hidden behind a toggle.
- **Mobile (<768px)**: 
  - Dashboard tables become stacked cards.
  - Workspace becomes a single column with a bottom-sticky navigation bar to toggle between "Report", "Sources", and "Ledger".

---

## Accessibility Strategy

- **Contrast**: Ensure all text, especially subtle grays used for metadata, passes WCAG AA contrast ratios against their backgrounds.
- **Focus States**: Implement highly visible, styled focus rings (`focus-visible:ring-2`) for all interactive elements, avoiding default browser outlines.
- **Semantics**: Use proper HTML5 landmarks (`<main>`, `<aside>`, `<nav>`) and ARIA live regions for the dynamic agent activity feed so screen readers announce state changes without needing a page refresh.

---

## Current UI Problems

1. **Box Fatigue**: Everything is contained in heavily bordered boxes with generic padding, making the UI feel like a wireframe or a standard admin template.
2. **Information Clutter**: The timeline and the citations fight for attention. The timeline shows technical logs (e.g., "Found a source: X") right next to the actual citation cards, causing redundancy.
3. **Navigation Fragmentation**: Forcing the user to leave the workspace to view Approvals or Payments breaks their train of thought.
4. **Markdown Rendering**: The final output is rendered as plain text/raw markdown, which defeats the purpose of an "analyst" tool.
5. **Technical Bleed-through**: Occasional exposure of orchestration mechanisms or base-unit math that distracts the business user.

---

## Proposed UI Improvements (Prioritized)

1. **Merge & Consolidate Navigation**: Eliminate standalone Approvals and Payments pages; embed them directly into the Dashboard and Workspace.
2. **Implement Markdown Rendering**: Add a robust markdown renderer for the `ReportArea` with premium typography.
3. **Redesign the Workspace Layout**: Adopt a borderless, surface-driven approach. Group the technical logs into an expandable "Developer Details" section to clean up the primary view.
4. **Contextual Approvals**: Design a high-impact, inline approval card that halts the workspace when human intervention is needed.
5. **Polished Dashboard**: Create a focused landing page with a clear "Start Research" entry point and an overview of active tasks.

---

## Why This Design

This direction shifts AgentFlow from feeling like a "developer debug console" to a "professional enterprise product." By hiding the complex x402 orchestration beneath an elegant, evidence-driven interface, we build trust with the non-technical user. When they are asked to spend real money, the interface supports their decision with clear reasoning, contextual evidence, and a calm visual language.
