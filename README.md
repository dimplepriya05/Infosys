# 🛡️ InsureClaim Pro™ — Enterprise Insurance Claim System

A production-grade, full-featured Insurance Claim Submission & Management System built with **React 18 + TypeScript + Vite**. No UI library dependencies — 100% custom CSS design system.

---

## 📁 Project Structure

```
insurance-claim-system/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .env.example
└── src/
    ├── main.tsx                        ← App entry point
    ├── App.tsx                         ← Root router + role guard
    ├── types/
    │   └── index.ts                    ← All TypeScript interfaces & types
    ├── data/
    │   └── mockData.ts                 ← Demo data (users, claims, policies, etc.)
    ├── utils/
    │   └── helpers.ts                  ← Formatters, role menus, token utils
    ├── services/
    │   └── api.ts                      ← Axios instance + all API modules
    ├── hooks/
    │   └── index.ts                    ← Custom hooks (useDisclosure, useFilter, useUpload, etc.)
    ├── context/
    │   ├── AuthContext.tsx             ← Authentication + session management
    │   └── ToastContext.tsx            ← Global toast notification system
    ├── styles/
    │   └── globals.css                 ← Full custom design system (no Bootstrap/Tailwind)
    ├── components/
    │   ├── auth/
    │   │   └── LoginPage.tsx           ← Login form with validation + demo accounts
    │   ├── layout/
    │   │   ├── Sidebar.tsx             ← Role-based sidebar navigation
    │   │   ├── Header.tsx              ← Top header with notifications + profile
    │   │   └── AppShell.tsx            ← Main layout shell + session warning
    │   └── shared/
    │       ├── index.tsx               ← Badge, Modal, Alert, Tabs, Table, Paginator…
    │       └── ErrorBoundary.tsx       ← React error boundary
    └── pages/
        ├── shared/
        │   ├── Dashboard.tsx           ← Role-aware dashboard with charts
        │   ├── ClaimsPage.tsx          ← Claims queue with filters + pagination
        │   ├── ClaimDetail.tsx         ← Full claim detail: overview, timeline, docs, financial
        │   └── OtherPages.tsx          ← Policies, Documents, Reports, Users, Audit, Settings, Profile
        └── policyholder/
            └── NewClaimPage.tsx        ← 6-step claim submission wizard
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# Clone or unzip the project
cd insurance-claim-system

# Install dependencies
npm install

# Copy env file
cp .env.example .env

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🔐 Demo Accounts

| Role             | Email                  | Password  |
|-----------------|------------------------|-----------|
| Admin            | admin@insure.com       | admin123  |
| Claims Adjuster  | adjuster@insure.com    | adj123    |
| Underwriter      | uw@insure.com          | uw123     |
| Policyholder     | ph@insure.com          | ph123     |
| Partner/TPA      | partner@insure.com     | pt123     |

---

## ✨ Features

### 🔐 Authentication
- JWT-based login with form validation
- Session timeout warning (25s demo / 25min production)
- Auto-logout on expiry
- Role-based route protection (5 roles)
- Session keepalive on user activity

### 🧭 App Layout
- Dark navy sidebar with role-specific menus + badge counts
- Sticky header with global search, notifications dropdown, profile dropdown
- Global toast notification system (success/error/info/warning)
- React Error Boundary with fallback UI
- Responsive layout

### 👤 Policyholder Features
- Policy card grid with coverage details + risk scores
- My Claims filtered view
- **6-step Claim Wizard:**
  1. Incident Details (date, type, location, description)
  2. Policy Selection (visual cards)
  3. Claim Type (6 types with icons)
  4. Damages & Estimated Amount
  5. Document Upload (drag-and-drop with progress bars)
  6. Review & Submit
- Save Draft + resume

### 📋 Claims Management
- Full claims queue table with search + multi-filter (status, priority, assignee)
- Client-side CSV export
- Pagination (8 per page)
- Click-to-view claim detail

### 📄 Claim Detail Page
- **Overview tab:** All claim metadata + notes
- **Timeline tab:** Activity history + add-note form
- **Documents tab:** Upload zone + document list with preview/download
- **Financial tab:** Reserve, deductible, depreciation → auto-calculated net payable
- High-value approval warning (>$10K)
- Workflow stage tracker (7 stages)
- Decision modal (Approve / Partial / Deny + reason + checklist)
- Payment modal (Bank Transfer / UPI / Cheque)
- Quick actions sidebar, policyholder card, document checklist, payment summary

### 📊 Reports
- Monthly bar chart (claims volume)
- Outcome breakdown (approved/partial/denied/withdrawn)
- Claims by type
- TAT distribution histogram
- KPI cards
- CSV export

### ⚙️ Admin Module
- User CRUD (add, edit, delete with confirmation)
- Role assignment
- Audit logs table with export
- Settings: Password Policy, Workflow Rules, Notification Templates

### 👤 Profile Page
- Personal info form with validation
- Password change with confirm validation

---

## 🔗 API Integration

All API calls route through `src/services/api.ts`:

```typescript
import api from '@/services/api';

// JWT auto-attached via Axios interceptor
// 401 → auto-redirect to login
// 403 → fires 'ics:unauthorized' event
```

Replace the base URL in `.env`:
```
VITE_API_BASE_URL=https://your-api.com/api
```

---

## 🎨 Design System

Custom CSS design system in `src/styles/globals.css`:
- **Font:** DM Sans (body) + DM Mono (code/IDs)
- **Colors:** Navy sidebar, blue primary, semantic status colors
- **Components:** Cards, Buttons (7 variants), Badges (8 variants), Modals, Toasts, Tables, Tabs, Pills, Upload Zone, Timeline, Workflow Track, Steps Wizard, Progress Bar, Shimmer Skeleton, Alert boxes
- **Motion:** CSS transitions, modal animations, toast slide-in, session banner slide-up

---

## 🛠️ Tech Stack

| Layer       | Technology              |
|-------------|-------------------------|
| Framework   | React 18 + TypeScript   |
| Build       | Vite 5                  |
| HTTP        | Axios                   |
| State       | React Context + useState |
| Styling     | Custom CSS (no UI lib)  |
| Forms       | Controlled components   |
| Types       | TypeScript strict mode  |

---

## 📝 Environment Variables

| Variable                  | Default            | Description                      |
|--------------------------|-------------------|----------------------------------|
| `VITE_API_BASE_URL`       | `/api`            | Backend API base URL             |
| `VITE_APP_NAME`           | `InsureClaim Pro` | App display name                 |
| `VITE_SESSION_TIMEOUT_MS` | `1800000`         | Session timeout (30 min)         |
| `VITE_SESSION_WARN_MS`    | `1500000`         | Session warning (25 min)         |

---

## 📄 License

MIT © InsureClaim Pro Team
