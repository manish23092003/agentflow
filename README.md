# AgentFlow

An autonomous AI research agent that discovers, evaluates, and purchases paid research resources using x402 payments on Algorand.

## 🚀 Overview

AgentFlow is an agentic research and procurement workflow. Traditional AI chat assistants are strictly limited to the information they already know or can scrape from free websites. AgentFlow breaks this barrier. 

When you give AgentFlow a research topic, it doesn't just return a summary of free SEO-optimized pages. It actively identifies gaps in publicly available data, discovers premium and proprietary research resources, evaluates their relevance, and requests your approval to purchase them. 

Once approved, AgentFlow securely facilitates the payment via the x402 protocol using your Pera Wallet on the Algorand TestNet, retrieves the paid data, and synthesizes a comprehensive final research report. It's not just a chatbot—it's a digital procurement agent that buys data on your behalf.

## ✨ Key Features

- **AI-powered research:** Deep synthesis of complex topics using Gemini.
- **Autonomous research workflow:** A state machine driven architecture orchestrating research.
- **Paid resource discovery:** Automatically identifies gaps where premium data is needed.
- **Resource evaluation:** Rates discovered resources based on relevance and cost.
- **Human-in-the-loop payment approval:** Requests your permission before spending funds.
- **x402 payment protocol:** Standardized HTTP 402 payments for digital resources.
- **Algorand TestNet payments:** Frictionless and low-cost crypto transactions.
- **Pera Wallet integration:** Securely sign transactions from your browser.
- **Google Sign-In:** Frictionless OAuth 2.0 Authorization Code flow.
- **Email/password authentication:** Alternative built-in authentication.
- **Secure HTTP-only sessions:** Maximum security against cross-site scripting (XSS).
- **PostgreSQL/Prisma:** Robust relational database for tracking history and users.
- **Clean numeric citations:** Generates professional [1], [2] citations mapping cleanly to real sources.
- **Research history:** Persists all past research sessions and evidence.
- **Payment history:** Detailed audit log of all x402 payments made.
- **Approval management:** Clear UI for managing pending resource purchases.
- **Budget-aware procurement:** Ensures agents do not exceed predefined spending limits.

## 🔄 How AgentFlow Works

```mermaid
flowchart TD
    A[User enters research topic] --> B[AI Research Agent]
    B --> C[Search & gather evidence]
    C --> D[Identify useful resources]
    D --> E[Evaluate resource quality/cost]
    E --> F{Is resource paid?}
    F -- No --> G[Free resource → continue]
    F -- Yes --> H[x402 payment request]
    H --> I[User approval]
    I --> J[Pera Wallet / Algorand TestNet payment]
    J --> K[Retrieve paid resource]
    K --> L[Synthesize evidence]
    G --> L
    L --> M[Final research report with 1, 2 citations]
```

## 💳 x402 Payment Flow

AgentFlow acts as an autonomous consumer of the x402 payment protocol. When navigating the web, the agent may encounter premium API endpoints or protected resources that respond with an **HTTP 402 Payment Required** status.

The server returns standardized `PAYMENT-REQUIRED` headers dictating the cost, asset, and payment destination. AgentFlow decodes these requirements, verifies them against its configured budget, and halts its workflow to request human-in-the-loop approval. 

Once you approve the purchase, AgentFlow connects to your Pera Wallet. You sign the transaction securely in your browser, and the payment is broadcasted to the Algorand TestNet. After confirmation, AgentFlow resubmits its request to the premium resource with the payment signature, gains access to the protected data, records the purchase in your payment history, and resumes its research.

## 🧠 Research Pipeline

The backend executes a multi-stage deterministic state machine:

- **Research Orchestrator:** The core state machine that advances the research session through its lifecycle.
- **Research Agent:** Generates search queries and gathers initial free intelligence using the Tavily Search API.
- **Gap Analysis:** Evaluates the gathered information to determine if material gaps exist that require proprietary or paid data (e.g., market size forecasts, proprietary datasets).
- **Service Discovery:** Searches a simulated x402 Bazaar for premium providers capable of fulfilling the intelligence gaps.
- **Service Evaluation:** Scores discovered paid services against the research criteria and filters out low-value options.
- **Procurement:** Generates approval requests for the user and suspends the orchestrator.
- **Payment Tool:** Executes the x402 protocol, handles HTTP 402 responses, and resumes the flow with valid cryptographic signatures.
- **Synthesis:** Consolidates all free and paid evidence into a highly structured final research report using deterministic, hallucination-free numerical citations.

## 🔐 Authentication

Security is a first-class citizen in AgentFlow:

- **Google OAuth 2.0:** Implements the secure Authorization Code flow. No implicit ID-tokens are used.
- **Email/password authentication:** Securely hashed alternative login.
- **HTTP-only session cookies:** All sessions are tracked via strict `Secure`, `SameSite=None` HTTP-only cookies to protect against XSS.
- **Protected routes:** API routes and frontend pages are securely gated.
- **User-specific data:** Research sessions, payment history, and approvals are strictly isolated per user.

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| **Frontend Framework** | React, TypeScript, Vite |
| **Backend Framework** | Node.js, Express |
| **Database & ORM** | PostgreSQL, Prisma |
| **AI Models** | Google Gemini (`gemini-3.5-flash-lite`) |
| **Search Engine** | Tavily Search API |
| **Authentication** | Google OAuth 2.0, HTTP-only Cookies |
| **Crypto/Payments** | Algorand (TestNet), Pera Wallet, x402 Protocol |
| **Testing** | Vitest |
| **Version Control** | Git, GitHub |

## 📁 Project Structure

This project uses a monorepo architecture:

```
apps/
  web/          # The React frontend application
  api/          # The Express backend API and Research Orchestrator
packages/
  shared/       # Shared TypeScript interfaces, types, and loggers
  x402-client/  # Universal client for handling x402 HTTP flows
services/
  x402/         # A mock x402-compliant premium resource provider for testing
```

## ⚙️ Local Development

1. **Clone repository:**
   ```bash
   git clone https://github.com/your-username/agentflow.git
   cd agentflow
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Copy the example environment file and configure your API keys.
   ```bash
   cp .env.example .env
   ```

4. **Set up PostgreSQL:**
   Ensure you have a PostgreSQL instance running (e.g., locally via Docker or via a cloud provider like Neon/Supabase). Update the `DATABASE_URL` in your `.env` file.

5. **Run Prisma migration:**
   Initialize your database schema.
   ```bash
   npm -w apps/api exec prisma migrate deploy
   ```

6. **Generate Prisma client:**
   ```bash
   npm -w apps/api exec prisma generate
   ```

7. **Start development servers:**
   Run the backend, frontend, and mock x402 services concurrently.
   ```bash
   npm run dev
   ```

## 🔑 Environment Variables

Copy `.env.example` to `.env` in the root directory. **Never commit your `.env` file to version control.**

### Backend (`apps/api`):
```env
# Required PostgreSQL connection string
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/agentflow

# Required Google OAuth credentials (do not expose to frontend)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/v1/auth/google/callback

# Required AI & Search keys
GEMINI_API_KEY=your_gemini_api_key
TAVILY_API_KEY=your_tavily_api_key

# Optional Algorand configurations (defaults to testnet)
X402_PROVIDER_ADDRESS=your_provider_wallet_address
```

### Frontend (`apps/web`):
```env
# Required in production. Leave empty for local Vite proxy development.
VITE_API_URL=https://api.yourdomain.com
```

## 🔵 Google Sign-In Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project and configure the OAuth consent screen.
3. Create new Credentials -> **OAuth client ID** -> Web Application.
4. Add your production frontend origin (e.g., `https://app.yourdomain.com`) to **Authorized JavaScript origins**.
5. Add your production backend callback URL (e.g., `https://api.yourdomain.com/api/v1/auth/google/callback`) to **Authorized redirect URIs**.
6. Copy the resulting Client ID and Client Secret into your production environment variables.

## 🧪 Testing

We use Vitest for rigorous testing across the monorepo.

- **Run linting:**
  ```bash
  npm run lint
  ```
- **Run all tests:**
  ```bash
  npm run test
  ```
- **Build API:**
  ```bash
  npm run build:api
  ```
- **Full Production Build:**
  ```bash
  npm run build
  ```

*(Currently tracking 100% test pass rate across 200+ unit and integration tests!)*

## 🚀 Deployment

To deploy AgentFlow to production, you will need:
- A PostgreSQL database (e.g., AWS RDS, Neon, Supabase)
- Backend Node.js hosting (e.g., Render, Railway, DigitalOcean)
- Frontend static hosting (e.g., Vercel, Netlify)
- Configured production environment variables
- Production Google OAuth redirect URIs matching your domain
- Algorand TestNet configuration

## 🔒 Security Notes

- **Secrets belong in environment variables:** Never hardcode secrets.
- **Git ignore:** `.env` files are strictly ignored by Git.
- **Server-side secrets:** `GOOGLE_CLIENT_SECRET` and `GEMINI_API_KEY` remain strictly on the backend.
- **Secure sessions:** HTTP-only cookies are utilized. JavaScript cannot access session tokens.
- **Wallet security:** Never commit wallet mnemonics or private keys.
- **Frontend variables:** Never expose backend API keys through `VITE_` prefixed variables.

## 🏆 Hackathon Context

AgentFlow was built around the conceptual x402 payment protocol. It demonstrates a concrete implementation of how AI agents can interact with the machine-readable web to access, evaluate, and purchase paid digital resources frictionlessly using crypto networks. 

## 🗺️ Future Improvements

- Algorand MainNet support
- Integration with real-world paid data providers
- Advanced multi-step agent planning architectures
- Sophisticated resource quality scoring and ranking heuristics
- Streaming UI for real-time research progress updates
- Production observability and tracing (e.g., LangSmith)
- Support for additional EVM and non-EVM payment networks
- Granular budget policies and automated micro-transaction approvals

## 📄 License

This project is licensed under the MIT License.
