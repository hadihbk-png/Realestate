# Hadi Real Estate — Luxury UAE Brokerage & Private Client CRM

A full-stack luxury real estate web platform and private client brokerage CRM tailored for the United Arab Emirates (Dubai & Abu Dhabi).

![Luxury Real Estate](assets/images/hero-skyline.jpg)

---

## 🌟 Key Features

### 🏛️ Public Experience
- **Luxury Ready Residences**: Filter by community (Downtown, Palm Jumeirah, Dubai Hills Estate, Business Bay, JVC), property type, and budget.
- **Off-Plan Investment Portfolio**: Landmark master developments with milestone payment plans, developer credentials, and downloadable brochures.
- **Mortgage Calculator**: Built for UAE Central Bank guidelines (resident vs. non-resident LTV, DLD transfer fees, broker fees, and monthly payments).
- **Private Seller Valuation**: Confidential dossier requests with anti-spam protection and direct DLD transaction valuation metrics.
- **Direct Engagement**: Seamless WhatsApp private inquiry integration and automated 24-hour callback requests.

### 💼 Private Client CRM & Admin Console
- **Role-Based Access Control**:
  - **Executive Admin**: Complete visibility over all 40+ client leads, pipeline stages, deals closed, and agent commissions.
  - **Licensed Advisors / Agents**: Isolated pipeline views showing their assigned portfolio and leads.
- **Kanban Deal Pipeline**: Drag-and-drop workflow stages (`New`, `Contacted`, `Viewing`, `Offer`, `Won`, `Lost`).
- **Automated Lead Scoring Engine (0–100)**: Evaluates leads based on verified phone numbers, cash readiness, purchasing timeline, and budget tier.
- **2% Brokerage Commission Tracking**: Instant calculation upon marking deals as won.
- **Stale Lead Detection**: Alerts advisors to leads inactive for 3+ days.
- **Real-Time 1-Minute Polling**: Notification bell highlighting new uncontacted client inquiries.
- **Data Export**: Export leads directly to CSV / Excel.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express 5
- **Database**: Dual Architecture:
  - **Cloud**: Neon Serverless PostgreSQL (`pg`)
  - **Resilient Fallback**: In-memory repository with pre-seeded properties, developers, off-plan projects, and sample CRM leads
- **Frontend**: Modern Vanilla JavaScript, Semantic HTML5, and Responsive Custom CSS
- **Typography**: Cormorant Garamond & Inter via Google Fonts

---

## 🚀 Getting Started

### 1. Installation
```bash
git clone https://github.com/hadihbk-png/Realestate.git
cd Realestate
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Optional)* Add your Neon PostgreSQL connection string to `DATABASE_URL`. If left empty, the server automatically boots with the pre-seeded in-memory store.

### 3. Launch Server
```bash
npm start
```

- Public Website: `http://localhost:3000`
- Staff & Advisor Portal: `http://localhost:3000/login.html`

### 🔑 Demo Credentials
| Name | Role | Email | Password |
|---|---|---|---|
| Hadi | Managing Principal (Admin) | `admin@hadirealestate.ae` | `Hadi2026!` |
| Rashid Al-Mansoor | Senior Broker (Agent) | `rashid@hadirealestate.ae` | `Rashid2026!` |
| Elena Rostova | Off-Plan Lead (Agent) | `elena@hadirealestate.ae` | `Elena2026!` |
| Tariq Al-Hashimi | Advisory Broker (Agent) | `tariq@hadirealestate.ae` | `Tariq2026!` |

---

## 📜 License
ISC License. Designed for Hadi Real Estate UAE.
