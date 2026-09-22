# 🎥 Loom Video Recording Script (6–8 Minutes)

> **Assignment Submission Guide for Opmaint Web Development Intern Role**  
> **Speaker Role**: Candidate walking through the live module with camera on.  
> **Tone**: Clear, professional, safety-conscious, and confident in technical decisions.

---

## ⏱️ Video Timeline Breakdown

| Timestamp | Section | Key Talking Points & Screen Actions |
| :--- | :--- | :--- |
| **0:00 – 1:15** | **Introduction & Domain Context** | • Introduction & enthusiasm for Opmaint's mission.<br>• What a PTW actually is in an Indian manufacturing context (not a generic to-do list, but a life-critical authorization document).<br>• Real-world risks: hot work near hydrocarbon pipes, confined space entry, fall from height, electrical isolation. |
| **1:15 – 3:30** | **Live Demo: The 4 Roles & State Machine** | • **Demo Switcher**: Showcase instant switching between Requester, Area Owner, Safety Officer, Admin.<br>• **Dashboard**: Point out KPIs, **Active Now**, **Expiring Soon (<2h)** warning badge, and the **Spatial-Temporal Conflict Warning** (Hot Work overlapping with Confined Space in Tank Farm).<br>• **Creating a Permit**: Walk through the multi-step form, showing how fields adapt to Hot Work (gas test, fire watch) vs Excavation (trench depth, shoring).<br>• **Self-Approval Guard**: Log in as Requester who is also Area Owner; show that the approve button is strictly blocked and server-guarded.<br>• **Approval Flow**: Switch to Area Owner and Safety Officer; draw a digital canvas signature and approve.<br>• **Activation Guard**: Show that permit cannot activate before scheduled start time.<br>• **Active Countdown & QR Code**: Show the live countdown clock and field inspection QR code modal. |
| **3:30 – 4:30** | **Two-Stage Closure & Audit Trail** | • **Requester Handback**: Requester closes work with mandatory completion notes.<br>• **Safety Officer Verification**: Safety Officer performs physical walk-down check.<br>• **Immutable Audit Log**: Open the Audit tab and show the clean, readable timeline with timestamps, actors, and status transitions (not a JSON dump). |
| **4:30 – 6:00** | **Code Part I'm Proud Of** | • Walk through **`src/lib/permit-types/registry.ts`** and **`src/lib/state-machine/index.ts`**.<br>• Explain the **Type Registry pattern**: why junior devs copy-paste 4 forms, and how our declarative registry allowed adding a 5th type (**Excavation**) in 30 lines of code with zero JSX changes.<br>• Highlight the **pure state machine**: decoupled from HTTP/database layers, allowing 26 unit tests to run in sub-second time. |
| **6:00 – 7:15** | **Code Part I'd Rewrite** | • Discuss **Offline-First Synchronization** (ElectricSQL / SQLite WASM).<br>• Why: In a chemical plant or deep boiler drum, cellular connectivity drops to zero. A technician with gloves cannot rely on server roundtrips.<br>• How to rewrite: Local SQLite in browser with CRDT conflict-free replication to PostgreSQL upon reconnecting at grade level. |
| **7:15 – 7:45** | **Conclusion & Wrap-up** | • Mention that test suite has 26 tests passing, database schema and seeds run cleanly.<br>• Express excitement about visiting factories around Chennai and building software with a helmet on. |

---

## 🎙️ Step-by-Step Spoken Script

### 1. Introduction & Domain Understanding (0:00 – 1:15)
> *"Hi Tanzeel and the Opmaint team, my name is [Your Name], and I'm excited to present my Permit to Work module for Opmaint CMMS.*
>
> *Before writing any code, I took your advice and spent time researching how permits to work operate in Indian industrial plants. In a refinery or an automotive plant, a PTW is not just a generic to-do app with a permit label. It is the single highest-stakes document on site. If a contractor welds a pipe rack without checking atmospheric LEL levels or ensuring combustible clearance, the failure mode is a person getting hurt, an explosion, and no regulatory audit record.*
>
> *My primary design goal was to model this accurately: enforcing strict server-side state machine rules, preventing self-approval, detecting spatial conflicts, and ensuring that adding new permit types requires zero copy-pasting of forms."*

### 2. Live Demo: Dashboard, Conflict Detection & Role Switcher (1:15 – 3:30)
*(Screen: Open `http://localhost:3000/permits`)*

> *"Here is the live dashboard. Across the top, you'll notice our **Demo Evaluation Switcher**, allowing you to switch instantly between Rajesh (Requester), Suresh (Area Owner), Ananya (Safety Officer), and Admin.*
>
> *Our KPI cards immediately highlight what's active right now, and specifically what's **Expiring in the next 2 hours** with an amber warning.*
>
> *Notice this red alert banner at the top: **Safety Conflict Detected**. Our conflict engine detected that a proposed Hot Work permit in the Tank Farm overlaps in both time and space with an active Confined Space Entry. This is a primary cause of industrial accidents, and the system automatically warns supervisors before work starts.*
>
> *Now, let's create a new permit by clicking 'Issue New Permit'. Notice this multi-step form. When I switch between Hot Work, Confined Space, Working at Height, Electrical LOTO, and Excavation, the form fields adapt dynamically based on a central schema registry. I can also click 'Save Draft' at any step.*
>
> *Let's look at one of our high-stakes rules: **A person can never approve their own permit**. If I open a permit created by Rajesh while logged in as Rajesh, even if I have administrative privileges, the approval button is completely hidden, and attempting to call the transition API directly rejects the request with an explicit 400 error.*
>
> *Now let's switch to **Suresh (Area Owner)**. Since this equipment is in his assigned Boiler House area, he can review the precautions, provide approval notes, and draw his **digital signature** directly onto our HTML5 canvas pad.*
>
> *Next, we switch to **Ananya (Safety Officer)** to grant final EHS clearance. Once approved, notice our **Start Time Guard**: if the planned start time is in the future, activation remains locked until the scheduled shift begins.*
>
> *Once active, we see a real-time countdown timer tracking remaining validity, and we can generate a field **QR Code** for safety officers to scan during physical walk-arounds."*

### 3. Closure, Verification & Immutable Audit Trail (3:30 – 4:30)
*(Screen: Navigate to permit tabs: Overview, Approvals, Audit Log, Work Logs)*

> *"When the shift ends, we have a two-stage closure process. First, the Requester logs completion notes—confirming housekeeping is done and tools are removed. Then, the Safety Officer performs an on-site walk-down inspection before transitioning the permit to `CLOSED_VERIFIED`.*
>
> *Under the **Approvals tab**, you can see the full sign-off trail with the captured digital signatures.*
>
> *Under the **Audit tab**, we produce an immutable, OSHA-compliant regulatory timeline. Every state transition, approval, rejection, and field edit is recorded with who, what, when, old values, and new values—not a raw JSON dump."*

### 4. Code I'm Proud Of (4:30 – 6:00)
*(Screen: Switch to VS Code / IDE, open `src/lib/permit-types/registry.ts` and `src/lib/state-machine/index.ts`)*

> *"Now let's dive into the code. The part I'm most proud of is our **Permit Type Schema Registry** in `src/lib/permit-types/registry.ts`.*
>
> *Instead of building 4 separate forms with duplicated state and validation, all permit types implement a unified `PermitTypeDefinition` contract. Each type defines its distinct Zod schema, unit labels, hazard defaults, and precautions.*
>
> *To prove this architecture, I added a 5th permit type—**Excavation & Trenching**—complete with soil classification, trench depth, and utility clearances, in just 30 lines of code. The shared UI component `DynamicTypeFields.tsx` automatically renders the inputs for creation and the inspection badges for review without any code duplication.*
>
> *Additionally, in `src/lib/state-machine/index.ts`, our state machine logic is built as pure, isolated TypeScript functions. This allowed us to write a comprehensive test suite in Vitest with **26 unit tests** verifying all edge cases—such as premature activation, cross-area sign-off attempts, and work log blocking—in under 1 second."*

### 5. Code I Would Rewrite (6:00 – 7:15)
*(Screen: Keep IDE open, showing `src/lib/permits/service.ts` or database queries)*

> *"The part of the code I would rewrite for a production environment is the **Offline Data Layer**.*
>
> *Currently, state transitions and auto-expiry checks rely on server-side Next.js route handlers and PostgreSQL queries. In an air-conditioned control room, this works great. But when an electrical technician climbs down into a basement transformer vault or inside a distillation column vessel, 4G and Wi-Fi signals drop out completely.*
>
> *If I were to rebuild this for the plant floor, I would re-architect the client data layer using an **offline-first local database** like SQLite compiled to WebAssembly with ElectricSQL or PowerSync. The technician could fill out gas tests and isolation checks completely offline, and once they step back out into the open plant yard, the changes would merge cleanly into PostgreSQL using Conflict-Free Replicated Data Types (CRDTs)."*

### 6. Conclusion & Ready for Shop Floor (7:15 – 7:45)
> *"To wrap up: this module includes a clean PostgreSQL schema with Prisma, migrations, a comprehensive seed script that runs in under 5 seconds, 26 passing automated tests, and a deployed live link.*
>
> *I saw your note in the assignment about visiting plants around Chennai with a helmet on. That sounds like the best part of the job to me, because real software isn't designed in isolation at a desk—it's designed by understanding the harsh conditions on the plant floor.*
>
> *Thank you for your time and for reviewing my submission!"*

---

## 📋 Email Template for Submission

**To**: `tanzeel@opmaint.com`  
**Subject**: `Web Dev Intern Assignment — <Your Name>`  

```text
Hi Tanzeel,

Please find my submission for the Opmaint Web Development Intern Assignment: Build a Permit to Work module for a CMMS.

1. GitHub Repository: https://github.com/<your-username>/opmaint-ptw
   (Added you as collaborator / public repo with full commit history)

2. Live Deployed Link: https://opmaint-ptw.vercel.app (or your deployed link)

3. Loom Video Walkthrough (6-8 mins): https://www.loom.com/share/<your-loom-id>
   (Walking through the live module, the Extensible Schema Registry, and my rewrite rationale for offline CRDTs)

Key Highlights of the Build:
- Extensible Type Registry Pattern: Added a 5th permit type (Excavation) without duplicating form code.
- Server-Side State Machine: Enforcing self-approval prohibition, area owner boundaries, start-time guards, and work-log locks.
- Real Safety Differentiators: Spatial-temporal conflict detection (Hot Work + Confined Space), auto-expiry surveillance with countdowns, mobile sunlight mode, QR code walk-around inspection, and digital canvas signatures.
- Tested & Seeded: 26 unit tests passing; seeds 4 users, 2 plants, 5 areas, 7 equipment items, and 11 permits across all statuses.

Looking forward to hearing your feedback!

Best regards,
<Your Name>
<Your Phone>
<Your LinkedIn / Portfolio>
```
