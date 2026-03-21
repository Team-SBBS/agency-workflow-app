# 12. Performance Analysis

## 1. Massive Over-fetching (The Firestore Tax)
Because the `App` component registers unrestricted `onSnapshot` listeners (e.g., `collection(db, "tasks")`), the application forces the user to download *every task ever created* directly into browser memory upon login.
- **The Risk:** Once the agency reaches thousands of tasks and history objects, the initial payload size will exceed several megabytes. Load times will plummet.
- **Financial Risk:** Firestore bills by "Document Reads". If 50 employees refresh the page daily, and there are 10,000 tasks, that generates 500,000 document reads per day simply to render a dashboard. This will financially cripple the project scaling.

## 2. Global Re-render Cascades
React Context triggers a re-render on all consuming components when its value changes.
- Because `tasks`, `users`, and `invoices` are all bundled into a single object (`<Ctx.Provider value={{ tasks, users... }}>`), whenever *any* of those arrays change, the *entire* application re-renders. 
- *Symptom:* Typing a single letter into the task "Search" input might feel sluggish on slower machines because the massive DOM tree is diffing unnecessarily.

## 3. Expensive Array Iterations
Functions like the Kanban board renderer rely heavily on `tasks.filter()`.
- The column component filters the global task array by `stage`.
- The unbilled task loop inside the Billing page maps and filters through the entire array.
- As the dataset grows, $O(N)$ operations attached to every React render loop will severely bottleneck the browser's JavaScript execution thread.

## 4. Unoptimized Asset Loading
The entire 2,600+ line application is bundled by Vite into a single massive javascript chunk. There is no code-splitting (`React.lazy()`) or dynamic routing. The user downloads the heavy `BillingPage` logic even if they are a standard Team Member who will never have permission to view it.
