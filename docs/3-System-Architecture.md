# 3. System Architecture Document

## High-Level Architecture
Agency Workflow OS follows a **Client-Heavy Serverless Architecture**, leveraging the Firebase ecosystem as its exclusive backend provider.

*   **Frontend (Client Layer):** React (18+) Single Page Application (SPA) built with Vite for optimized asset bundling. All core business logic resides on the client side.
*   **Backend (Data Layer):** Firebase Firestore, a NoSQL, flexible, scalable database.
*   **Authentication Layer:** Firebase Authentication handles identity verification, offloading credential security from the custom implementation.
*   **Hosting Layer:** Firebase Hosting serves the static React assets to a global CDN.

```ascii
+--------------------------+       +------------------------------------+
|                          |       |                                    |
|   React SPA (Vite)       | <---> |   Firebase Authentication          |
|   (Client Web Browser)   |       |   (Identity & Token Issuance)      |
|                          |       |                                    |
+------------+-------------+       +------------------------------------+
             |
             v
+------------+-------------+       +------------------------------------+
|                          |       |                                    |
|   Cloud Firestore        | <---- |   Firestore Security Rules         |
|   (Real-time Database)   |       |   (Authorization & RBAC checks)    |
|                          |       |                                    |
+--------------------------+       +------------------------------------+
```

## Data Flow Between Components

### The "God Context" Pattern
The application utilizes a massive, monolithic React Context (`Ctx.Provider` defined in `App()` inside `agency-workflow-os-v3.jsx`) to broadcast global state down to all sibling components. 
- *Data Source:* The `App` component establishes real-time `onSnapshot` listeners to the primary Firestore collections on initial mount.
- *Data Distribution:* These arrays of document objects (`tasks`, `clients`, `users`, `invoices`, `config`) are stuffed into the React Context.
- *Data Consumption:* Any child component (`TasksPage`, `Dashboard`, `BillingPage`) accesses `useContext(Ctx)` to retrieve raw data, then performs local, purely client-side mapping, filtering, or sorting to render the UI.

### Write Operations
When a user updates data (e.g., transitions a task):
1.  The component invokes a shared Context function (e.g., `doTransition` or `updateTask`).
2.  The function executes a direct `updateDoc` command against the Firestore reference.
3.  The Firestore backend confirms the write.
4.  The active `onSnapshot` listener at the root `App` level detects the backend change.
5.  React triggers a full re-render of the virtual DOM from top-to-bottom, cascading the fresh data to the UI.

## API / Service Usage
The app communicates entirely via the Firebase Javascript SDK over WebSockets (for active connections) and long-polling fallbacks.
- **`onSnapshot`:** Real-time listeners.
- **`getDocs` / `getDoc`:** Singular explicit reads (used sparingly compared to snapshots).
- **`addDoc` / `setDoc` / `updateDoc`:** Write operations structured functionally within components.
- There are **no custom REST APIs, Cloud Functions, or external webhooks** currently wired into the primary application loop.

## Identified Architectural Gaps
1.  **Fat-Client Anti-Pattern:** Because there are no backend cloud functions (e.g., Node.js webhook processors), the React client is entirely responsible for executing heavy business logic like *invoice calculation* and *automation triggering*. If a user's browser crashes halfway through generating an invoice, the database could land in a fractured state.
2.  **Over-fetching Problem:** The `App` component listens to the *entire* `tasks` and `invoices` collections simultaneously. In a large agency with 10,000 historical tasks, the client will attempt to download and hold all 10,000 documents in memory simply to render the dashboard, which will catastrophically degrade load times and spike Firestore read costs.
3.  **Monolithic File Structure:** The entire architecture of the SPA is violently squeezed into a single massive file (`agency-workflow-os-v3.jsx`), effectively destroying logical separation of concerns (MVC concepts).
