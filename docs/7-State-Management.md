# 7. State Management Analysis

## How State is Managed
State management in this application bypasses modern robust solutions (like Redux, Zustand, or TanStack Query) in favor of the **React Context API combined with heavily burdened generic `useState` hooks.**

### Global State (The "God Object")
In `agency-workflow-os-v3.jsx`, almost 15 distinct `useState` declarations exist sequentially inside `App()` to store global data:
```javascript
const [currentUser, setCurrentUser] = useState(null)
const [tasks, setTasks] = useState([])
const [invoices, setInvoices] = useState([])
const [clients, setClients] = useState([])
const [stages, setStages] = useState(STAGES_DEFAULT) // ...etc
```
These hooks are strictly populated by real-time Firestore listeners. The setters (`setTasks`, `setClients`) are literally passed downward in Context, even though they should almost never be called manually by child components (as the data source of truth is Firebase).

### Local State
Individual pages maintain their own ephemeral state variables for inputs, modals, and tabs.
- *Example:* The `SettingsPage` utilizes deeply nested localized state (`editDict`, `newStageName`) to hold draft edits before mapping them directly back structurally to Firebase `updateDoc` commands.

## Anti-Patterns Identified

### 1. Massive Context Un-Optimization
Because *all* state is bundled into a single Context object (`const ctx = { tasks, invoices, users... }`), the standard React rule applies: **When any property in the provider value changes, all components consuming the context will re-render.**
- *Impact:* A team member leaving a comment on Task A causes the `Tasks` array to update in Firebase. This pushes a new `Tasks` array to Context. The `BillingPage` (which consumes Context simply to calculate unbilled hours) will inexplicably re-render, eating CPU.

### 2. Lack of Optimistic UI Updates
When a user clicks "Completed" on a task:
1. The app fires an `updateDoc` network request.
2. The UI pauses.
3. The Firebase server acknowledges the write and triggers the client-side `onSnapshot`.
4. The React state updates, finally moving the UI card to the "Completed" column.
- *Fix Required:* Changes should be optimistically rendered to local state instantly, while silently verifying against the database loop.

### 3. Mixing Server State heavily with Client Variables
The app confuses the role of `useState`. Realistically, Firebase data is *Server State* and should be cached and fetched efficiently (e.g., via `react-query` or `SWR`). Wrapping server streams directly into client `useState` loops essentially overrides React's render lifecycle with network latency.
