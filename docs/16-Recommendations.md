# 16. Recommendations & Refactoring Plan

## Immediate Priorities (High Risk, Low Effort)
1. **Dismantle the God Context (Data Leakage):**
   - *Problem:* Team Members receive every invoice and client document downloaded via Context silently.
   - *Fix:* Refactor the core `onSnapshot` queries to use `.where()` constraints. Explicitly filter queries: `query(collection(db, "invoices"), where("creatorId", "==", currentUser.id))` (adjust for specific RBAC constraints).

2. **Implement URL Routing (UX Improvement):**
   - *Problem:* Faux-routing blocks browser back buttons and bookmarking.
   - *Fix:* Install `react-router-dom` and map the basic views (`Dashboard`, `TasksPage`) to URL params (`/dashboard`, `/tasks/:taskId`).

## Secondary Priorities (Medium Risk, High Effort)
1. **Deconstruct the Monolith:**
   - Shred `agency-workflow-os-v3.jsx`.
   - Create a structured `/src` tree separating `pages/`, `components/`, and `services/` (Firestore interaction files).
   - This alone will dramatically improve developer velocity and isolated testing capability.

2. **Migrate Billing and Automations to Firebase Cloud Functions:**
   - *Problem:* Relying on the client to run logic implies critical failures upon browser drop.
   - *Fix:* When a task is marked `completed` in the client, let Firebase trigger an event bus function internally. This Node.js worker evaluates the automation rule engines invisibly and calculates retainers securely without browser involvement.

## Long-term Ambitions (Fundamental Re-Architecture)
1. **Introduce TypeScript:** Gradually convert `.jsx` to `.tsx`. Focus initially on defining Models (`User`, `Task`, `Invoice`) so parameters moving structurally through the system can be tracked safely.
2. **Implement TanStack Query:** Rip out the sweeping `<Ctx.Provider>` mapping. Allow child components to fetch specific localized data caches and paginate records. 

## The Step-by-Step Refactor Methodology
1. **Setup Testing:** Write integration tests specifically for the Billing Generator and Auth hooks before performing any alterations.
2. **Component Extraction:** Copy the `Btn`, `Card`, and `Inp` elements into a `ui/` folder. Replace all references.
3. **Service Logic Extraction:** Move all `updateDoc` and Firebase API calls into a `firebase/services.js` utility file, rendering the UI completely decoupled from the database mechanics.
4. **State Transition:** Remove `<Ctx.Provider>`, implement `react-query` hooks instead.
5. **Typescript Wrap:** Layer type-hints and strict null checks post-extraction.
