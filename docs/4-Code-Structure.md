# 4. Code Structure & Folder Organization

## Folder Structure Explanation
The overall repository follows a basic Vite scaffolding layout, but fundamentally ignores standard React structural conventions by grouping almost the entire application into one massive file.

```text
/home/vishali/Downloads/Project management/
├── .env                  # Environment Variables (Firebase Config)
├── .gitignore
├── firebase.json         # Firebase project routing and security declarations
├── firestore.rules       # Global backend database authorization logic
├── index.html            # Entry point for the SPA
├── package.json          # Dependency definitions and scripts (Vite, React, Firebase)
└── src/
    ├── main.jsx          # React DOM initialization and StrictMode wrapper
    └── agency-workflow-os-v3.jsx # THE MONOLITH (2,600+ lines of code)
```

## The Monolith: `agency-workflow-os-v3.jsx`

Because the application foregoes a structured `components/`, `pages/`, `hooks/`, `utils/`, and `services/` directory setup, `agency-workflow-os-v3.jsx` operates as a mega-module. 

### Component Hierarchy (Inferred from the Monolith)

1.  **Constants & Configurations (Top of File):**
    *   `T`: A massive styling token object defining global hex codes, radii, and fonts.
    *   `STAGES_DEFAULT`, `DEPTS_DEFAULT`, `SEED_USERS`: Hardcoded initialization arrays.
    *   `ROLE_LABELS`, `PRIORITY_CFG`: Enums utilized for mapping string IDs to human-readable UI elements.

2.  **Shared UI Primitives (Lines 150-400):**
    *   `Btn`, `Inp`, `Sel`, `Card`, `Modal`, `Badge`, `Toggle`, `Avatar`: Reusable, custom-styled internal components functioning as a mini design system.

3.  **Global Utilities (Lines 400-500):**
    *   `useApp()`: A custom hook wrapping `useContext(Ctx)`.
    *   Formatting helpers (`INR`, `formatDate`, `getDept`).

4.  **Major Page Components (Lines 500-2300):**
    *   `Dashboard`: The landing analytic view.
    *   `TasksPage`: The core workflow interface featuring both List and Kanban sub-renders.
    *   `TaskDetail`: The expansive right-side slide-over modal handling comments, subtasks, checklists, and time logs.
    *   `ClientsPage`: CRM viewing and creation.
    *   `BillingPage`: Invoice generation and historical tracking.
    *   `TeamPage`: User management and privilege assignment.
    *   `SettingsPage`: Platform configurations (Stages, Departments, Automations).

5.  **Root App Component (Bottom of File):**
    *   `App()`: The orchestrator. Instantiates Firebase auth listeners, sets up the `Ctx.Provider`, fetches the snapshot streams from Firestore, and manages top-level routing state (via `nav` string rather than established libraries like `react-router-dom`).

## Reusability Patterns (or lack thereof)
*  **PRO:** The creation of `Btn`, `Card`, and `Inp` at the top of the file demonstrates an *attempt* at a reusable Design System, significantly reducing raw CSS repetition.
*  **CON:** The lack of a router means navigation state is heavily coupled, requiring components to manually lift state up using a local string (`setNav('dashboard')`).
*  **CON:** Because everything is in one file, Git merge conflicts for multiple developers working on this project would be completely paralyzing.
