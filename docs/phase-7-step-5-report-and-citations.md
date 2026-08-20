# Phase 7 Step 5: Report and Citations

## Overview
This document covers the implementation of the final Research Report and Citation Experience for AgentFlow. The goal was to provide a professional, analyst-like report generation view, accompanied by a clear and factual citation panel, without introducing "fake" or "hallucinated" data when backend data is absent.

## Report Architecture
- **`FinalReport.tsx`**: The main container for the completed research. It dynamically checks for structured narrative data in `session.report` (e.g., `executiveSummary`, `keyFindings`).
- If narrative sections are absent, the component gracefully omits them, falling back to a clean summary of the research Goal, Completion Status, Expenses, and Citations.
- **Empty States**: We actively avoid generic placeholders (like "Not provided by backend") and instead only render narrative headers if data actually exists.

## Citation Model & Paid Source Transparency
- **`CitationPanel.tsx` & `CitationItem.tsx`**: These components list all sources used in the research.
- **Paid Sources**: Using `isPaid` and `cost`, sources are visually distinguished with a `PAID` badge (or `FREE` badge otherwise). The cost is formatted properly in standard USDC units using `formatBaseUnits`.
- **Transaction Proofs**: When a citation is paid, the frontend attempts to match its `purchaseId` to a known `PaymentRecord`. If a `transactionId` exists on the record, it provides a "View transaction" link directly to the Algorand TestNet explorer (`https://testnet.explorer.perawallet.app/tx/<txId>`).

## Workspace Integration
The `Workspace.tsx` component is the central orchestrator for the research session. 
- **`COMPLETED`**: Renders `FinalReport` in the main view. Renders `CitationPanel` on the right sidebar.
- **`SYNTHESIZING`**: Renders a dedicated animated synthesis state in `ReportArea`.
- **`FAILED`**: Renders the failure state in `ReportArea` showing the `failureReason` explicitly.

## Dashboard & History Updates
- **Dashboard**: Replaced the "Recent Payments" block with "Recent Research" to focus on overall mission objectives.
- **History**: A dedicated `/history` route displaying a comprehensive table of all historical sessions, keeping the design lightweight and professional.

## Testing Strategy
New tests were added in `report.test.tsx` and `history.test.tsx` to rigorously cover:
- Omitting missing narrative sections in reports.
- Displaying FAILED limitation reasons.
- Correctly badging citations based on `isPaid` flags (regardless of cost value anomalies).
- Dynamically linking to the PeraWallet TestNet Explorer only when a real `transactionId` is present.
- Handling empty/error states on the `/history` view.
