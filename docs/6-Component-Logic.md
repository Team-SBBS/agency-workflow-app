# 6. Component & UI Logic Document

## Key React Components
Due to the monolithic structure, the following "components" exist purely as functions within a single file, rather than separate exported modules.

### `App` (The Root Controller)
- **Props:** None
- **State:** Manages the literal entirety of the backend state (`tasks`, `clients`, `users`, `invoices`, etc.) via multiple `useState` hooks mapped to Firestore `onSnapshot` listeners. Also handles the current routing state (`nav`).
- **Logic Pattern:** Wraps the entire application in `<Ctx.Provider>`, injecting all state and CRUD mutator functions (like `updateTask`, `doTransition`) downward.

### `TasksPage`
- **Props:** `currentUser`, `openTask` (Callback), `showCreate`, `setShowCreate`.
- **State:** Local view toggles (`view` string for list vs kanban) and extensive filtering inputs (`search`, `filterStage`, `filterAssignee`, `filterDept`).
- **Logic Pattern:** Aggressively maps, filters, and reduces the global `tasks` context array on every keystroke in the search bar. Iterates the filtered lists to render either a classic table or mapped columns of `TaskColumn` drops for the Kanban view.

### `TaskDetail`
- **Props:** `taskId`, `onClose`
- **State:** Highly volatile internal state for new comment inputs, editing modes, active timer counters, and temporary subtask names.
- **Logic Pattern:** Slide-over modal. It looks up the active task from context (`const t = tasks.find(x => x.id === taskId)`). If a user adds a comment, it triggers `updateDoc` against Firestore to append the comment directly to the task's JSON array. 

### `GlobalTimer`
- **Props:** None (Pulls everything from Context).
- **State:** Interval tracker (`setInterval` reference), elapsed seconds.
- **Logic Pattern:** A floating pill at the bottom right. When stopped, it calculates total duration and pushes a `timeLog` object to the active task array, then immediately increments the parent task's `actualHours` field in Firebase.

## UI Logic Patterns
- **Prop Drilling vs Context:** The app avoids medium-depth prop drilling by throwing literally everything into the `Ctx` Context. Components cherry-pick dependencies via destructuring (`const { tasks, currentUser, doTransition } = useApp()`).
- **Conditional Rendering:** Widespread use of `{boolean && <Component />}` to mount/unmount modals, sidebars, and tab states.

## Re-render Triggers & Lifecycle
- Every time *any* user executes a write operation to Firestore, the database pushes the delta to all active clients via WebSockets.
- The `App` component's `onSnapshot` listener updates the master `tasks` array.
- This causes the `Ctx.Provider` value reference to change, completely forcing a re-render of nearly the entire DOM tree, regardless of whether the change impacted the specific component the user is currently viewing.
