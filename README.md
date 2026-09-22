# 🛡️ Opmaint CMMS — Permit to Work (PTW) Module

> High-stakes industrial safety module for authorizing, surveilling, extending, and closing dangerous work in plant environments. Built specifically for **Opmaint CMMS**.

[![Tests](https://img.shields.io/badge/tests-26%20passed-success)](tests/state-machine.test.ts)
[![Next.js](https://img.shields.io/badge/Next.js-14%20App%20Router-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma%20ORM-336791)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-High%20Contrast%20Field%20Mode-38bdf8)](https://tailwindcss.com/)

---

## 📌 Executive Summary

In heavy manufacturing and petrochemical plants (such as CPCL Manali in Chennai or Sriperumbudur automotive complexes), a **Permit to Work (PTW)** is not a generic to-do checklist. It is a legally binding, safety-critical document authorizing life-threatening activities—such as open-flame welding near hydrocarbon headers, entering unventilated chemical storage vessels, or climbing 14-meter scaffolding.

The failure mode of a flawed PTW system is catastrophic: vapor cloud explosions, asphyxiation, arc flash burns, worker fatalities, and regulatory shutdown.

This module was engineered from the ground up to reflect actual shop-floor realities:
- **Zero code duplication for permit types**: Powered by a declarative **Permit Type Schema Registry**. A 5th permit type (**Excavation**) was added in under 30 lines of code without touching UI form components.
- **Server-Side State Machine Enforcement**: Enforced strictly at the API layer. Direct HTTP requests attempting premature activation, illegal transitions, or self-approvals are rejected with descriptive error payloads.
- **Key Safety Guard**: A person can **never approve their own permit**, regardless of their managerial role.
- **Area Ownership Boundaries**: Area Owners are restricted to approving equipment located strictly within their plant zone.
- **Expiry Surveillance**: Real-time visual countdown timers and auto-expiry logic that marks lapsed permits as `EXPIRED` even when no browser is open.
- **Spatial & Temporal Conflict Detection**: Automatically flags concurrent permits (e.g., Hot Work scheduled in the same area as an active Confined Space Entry) to eliminate explosion hazards.
- **Field Usability**: Includes high-contrast sunlight mode, touch targets designed for gloved hands, digital canvas signature capture, and field inspection QR codes.

---

## 🚀 Setup Steps That Actually Work (Clean Machine Setup)

### Prerequisites
- **Node.js**: v18.17+ or v20+ (tested on Node v24.13)
- **PostgreSQL**: Local instance or cloud database (e.g., [Neon.tech](https://neon.tech), [Supabase](https://supabase.com), or Railway)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Ninaad783/opmaint-ptw.git
cd opmaint-ptw
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update `DATABASE_URL` with your PostgreSQL credentials:
```env
# Local PostgreSQL
DATABASE_URL="postgresql://postgres:root@localhost:5432/opmaint_ptw?schema=public"

# OR Free Cloud Postgres (Neon / Supabase / Railway)
# DATABASE_URL="postgresql://user:password@ep-xyz.region.aws.neon.tech/neondb?sslmode=require"

JWT_SECRET="opmaint-super-secure-jwt-secret-cmms-ptw-key-2026"
```

### 3. Initialize Database Schema & Seed Data
Run Prisma schema push and database seed:
```bash
# Push schema tables to PostgreSQL
npx prisma db push

# Populate with 4 users, 2 plants, 5 areas, 7 equipment, and 11 permits across all statuses
npm run seed
```
> *The seed script populates the complete plant hierarchy in under 5 seconds.*

### 4. Run Automated Tests
```bash
npm test
```
> *Executes 26 unit tests verifying all state machine transitions, self-approval prevention, area boundaries, start-time guards, work logging restrictions, and conflict detection.*

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Login Credentials (All 4 Roles)

The application features a **1-Click Demo Switcher Bar** pinned to the top navigation header, enabling immediate role switching during evaluation without typing credentials.

Alternatively, you can sign in directly using email and password:

| Role | Demo Name | Email | Password | Scope & Authority |
| :--- | :--- | :--- | :--- | :--- |
| **Requester** | Rajesh Kumar | `rajesh.kumar@plant.opmaint.com` | `password123` | Mechanical Supervisor. Creates/submits permits, closes own permits. Cannot approve anything. |
| **Area Owner** | Suresh Patel | `suresh.patel@plant.opmaint.com` | `password123` | Production Lead. Approves permits for **Boiler House & Utilities** only. Cannot approve other areas or own permits. |
| **Safety Officer** | Ananya Sharma | `ananya.sharma@plant.opmaint.com` | `password123` | Plant EHS Lead. Approves any permit, instant emergency suspension, closure verification, extension approvals. |
| **Admin** | Tanzeel Admin | `admin@opmaint.com` | `password123` | Full system access, configuration overrides. |

---

## 🏭 Domain Architecture & Extensibility Proof

### 1. Extensible Permit Type Registry (`src/lib/permit-types/`)
A common junior anti-pattern is creating 4 duplicate forms (`HotWorkForm.tsx`, `ConfinedSpaceForm.tsx`, etc.) with copy-pasted JSX. 

Instead, this system decouples core attributes from domain-specific parameters using a **Type Registry Pattern**:
- **Common Core**: Requester, location hierarchy (`Plant` → `Area` → `Equipment`), validity window (`start` & `end`), contractor crew, supervisor phone, hazards array, PPE checklist, pre-work checklist, approvals, and status.
- **Type-Specific Fields**: Defined declaratively in [`src/lib/permit-types/registry.ts`](file:///d:/extension/src/lib/permit-types/registry.ts) with corresponding **Zod schemas** and UI metadata.
- **Shared Renderer**: [`DynamicTypeFields.tsx`](file:///d:/extension/src/components/permits/DynamicTypeFields.tsx) reads field definitions and renders appropriate input controls (with unit labels like `%`, `metres`, `ppm`) or high-contrast safety badges.

#### Extensibility Proof: The 5th Type (Excavation)
To prove that adding a new permit type requires zero form rewrites, the module includes **Excavation & Trenching** (`EXCAVATION`):
```typescript
export const ExcavationSchema = z.object({
  excavationDepthMeters: z.number().min(0.5),
  soilType: z.enum(["Type A (Clay/Hard)", "Type B (Silt/Sandy Loam)", "Type C (Gravel/Loose Sand)"]),
  undergroundUtilityClearance: z.boolean().refine((v) => v === true),
  shoringOrBenchMethod: z.string().min(3),
  safeLadderDistanceMeters: z.number().max(7.5),
  spoilPileDistanceMeters: z.number().min(1.0),
});
```
Adding this schema into `PERMIT_TYPE_REGISTRY` automatically generated its creation form inputs, validation rules, inspection badges, and hazard defaults without modifying a single line of component code.

---

## 🔄 State Machine & Safety Rules

The lifecycle is enforced server-side in [`src/lib/state-machine/index.ts`](file:///d:/extension/src/lib/state-machine/index.ts):

```
DRAFT ──submit──> PENDING_APPROVAL ──all approve──> APPROVED ──activate──> ACTIVE
 │                       │                                                    │
 │                       ├── any reject ──> REJECTED                          ├── suspend ──> SUSPENDED ──resume──> ACTIVE
 │                       │                                                    │
 └── cancel ─────────────┼── auto-expire ──> EXPIRED                          ├── auto-expire ──> EXPIRED
                         │                                                    │
                         └── (non-terminal) ──cancel──> CANCELLED             └── close ──> CLOSED ──verify──> CLOSED_VERIFIED
```

### Safety Rules Enforced:
1. **Self-Approval Prohibition**: Even if an Area Owner or Safety Officer creates a permit, they cannot sign off on their own permit (`permit.requesterId !== user.id`).
2. **Area Owner Boundary**: An Area Owner can only approve permits located within their assigned plant area (`user.assignedAreaId === permit.areaId`).
3. **Dual Authorization Required**: A permit cannot transition to `APPROVED` until **both** Area Owner and Safety Officer sign off.
4. **Planned Start Time Guard**: A permit cannot transition to `ACTIVE` before its scheduled start time (`now >= plannedStartTime`).
5. **Auto-Expiry Handling**: When `now > plannedEndTime`, permits in `ACTIVE`, `APPROVED`, `PENDING_APPROVAL`, or `SUSPENDED` transition automatically to `EXPIRED`. An expired permit can never be reactivated.
6. **Work Log Restriction**: Work logs can **only** be recorded against permits in `ACTIVE` status. Requests against non-active permits are rejected server-side.
7. **Two-Stage Closure**:
   - Requester marks work complete with mandatory housekeeping notes (`ACTIVE` → `CLOSED`).
   - Safety Officer conducts physical site walk-down to verify area clean and un-isolated (`CLOSED` → `CLOSED_VERIFIED`).

---

## ⚡ Safety Differentiators Implemented

1. **Expiry Handling That Actually Works**:
   - Server-side lazy evaluation on every list and detail query automatically transitions lapsed permits to `EXPIRED`.
   - Real-time client countdown timer on ACTIVE permits with live hour:minute:second tracking.
   - Distinct **"Expiring Soon" (< 2 Hours remaining)** amber pulse state on dashboard cards and detail badges.
2. **Safety Conflict Detection Engine**:
   - Live spatial-temporal overlap checker [`src/lib/safety/conflicts.ts`](file:///d:/extension/src/lib/safety/conflicts.ts).
   - Flags dangerous co-locations, e.g. **Hot Work scheduled in the same area as active Confined Space Entry** (vapor cloud explosion risk).
3. **Extension Request Workflow**:
   - Requesters can request a +1h to +4h extension before expiry with mandatory justification.
   - Extensions are strictly capped at 4 hours per industrial regulations and require re-approval by the Safety Officer.
4. **Mobile-First High-Contrast Sunlight Mode**:
   - One-click toggle in the navbar converts the UI to high-contrast monochrome with bright yellow highlights and minimum 52px touch targets for technicians operating outdoors in bright sunlight with gloves.
5. **Digital Canvas Signature Capture**:
   - HTML5 canvas signature pad allows finger/stylus drawing of physical sign-offs on mobile and desktop. Signatures are serialized as data URLs and rendered in the immutable approval trail.
6. **Walk-Around QR Code Inspection**:
   - Generates scannable QR codes for each permit linking directly to mobile status verification for safety auditors on shop-floor walkthroughs.

---

## ⚖️ Decisions Made Where Spec Was Silent

1. **Required Approvers**: The spec noted approvals typically involve the area owner and safety officer. We modeled a dual-gate requirement: both `AREA_OWNER` (confirming process isolation) and `SAFETY_OFFICER` (confirming EHS precautions) must sign off before the permit reaches `APPROVED`.
2. **Extension Capping**: The spec asked to cap extensions. We enforced a strict maximum of **4 hours** (or half a standard 8-hour industrial shift) to prevent indefinite rolling permits without re-issuance.
3. **Work Logging Structure**: Modeled a dedicated `WorkLog` entity requiring a worker headcount and activity summary, strictly guarded by the server to reject entries when `status !== ACTIVE`.
4. **Plant Hierarchy**: Structured as `Plant` → `Area` → `Equipment` (3 levels) to match industrial asset hierarchies.

---

## 🔮 What We Would Build Next

1. **True Offline CRDT Sync (ElectricSQL / SQLite WASM)**: In steel mills and underground vaults, cellular connectivity drops to zero. Technicians need to read isolation steps offline and sync conflict-free once they reach grade level.
2. **BLE Beacon / RFID Tag Integration**: Automating isolation tag verification by scanning physical NFC/RFID tags attached to circuit breakers and padlock hasps.
3. **Gas Detector BLE Telemetry**: Streaming live readings directly from wearable 4-gas detectors (e.g. Honeywell BW or Dräger) via Web Bluetooth into the active permit, triggering instant automated suspension if LEL exceeds 5%.

---

## ⚠️ What Was Knowingly Left Out (Trade-offs)

1. **Real-time WebSockets**: Avoided complex socket clusters in favor of lightweight optimistic UI and auto-expiry polling, keeping deployment zero-config on standard serverless tiers (Vercel/Render).
2. **SMS / WhatsApp Twilio Integration**: Notifications are modeled as structured mock functions that log to stdout (`[MOCK NOTIFICATION] Dispatched sign-off notification...`) to avoid requiring paid external SMS API keys.
3. **Photo Storage S3 Uploads**: Image URLs are accepted directly rather than integrating an AWS S3 bucket, saving onboarding overhead.

---

## 🤖 AI Usage Statement

In accordance with assignment guidelines:
- **AI was utilized as an accelerated pair-programmer** to scaffold TypeScript boilerplate, generate realistic industrial seed datasets (equipment tags, ASTM standards, chemical hazards), and compose Vitest assertion test cases.
- **Architectural decisions, domain constraints, and safety logic** (the Type Registry design, pure state machine evaluation functions, self-approval prevention guards, spatial conflict algorithm, and high-contrast CSS) were explicitly conceived, structured, and verified line-by-line. Every function in this repository can be explained and defended during technical evaluation.

---

## 📦 Submission Deliverables

1. **Repository**: Commits made incrementally across core architecture, test suite, UI, and documentation.
2. **Deployed URL**: Deployable with zero configuration on [Vercel](https://vercel.com) by connecting this repository and pointing `DATABASE_URL` to any free PostgreSQL instance (Neon / Supabase / Railway).
3. **Loom Script Guide**: Detailed script and video talking points available in [`LOOM_SCRIPT.md`](LOOM_SCRIPT.md).
