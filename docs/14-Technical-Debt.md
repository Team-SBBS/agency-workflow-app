# 14. Technical Debt & Anti-Patterns

## 1. The Monolith: `agency-workflow-os-v3.jsx`
- **Code Smell:** A file possessing 2,600+ lines of intricately interwoven UI code, state orchestration, design tokens, backend logic, and routing.
- **Impact:** Tight coupling makes isolated testing impossible. Changing the search logic in `TasksPage` could accidentally corrupt the Context payload in `BillingPage`. No two developers can work on this architecture simultaneously without infinite Git merge conflicts.

## 2. Fat Client (Zero Backend Functions)
- **Code Smell:** Using the browser client to execute crucial operations like `runAutomations()`, array mapping an entire agency's task history to calculate financial invoices, and enforcing RBAC.
- **Impact:** The client machine is fully trusted. If it crashes, internet drops, or a malicious actor manipulates the scripts, the database relies purely on an honor system. For B2B agency software running billing logic, this is profoundly dangerous.

## 3. Poor Separation of Concerns
- **Code Smell:** Database queries (`updateDoc`) live side-by-side with rendering logic (`onClick={() => { ... }}`).
- **Impact:** If the database logic needs to switch (e.g., from Firebase to Supabase), the *entire* UI logic layer must be aggressively gutted and re-written. Model, View, and Controller layers do not mathematically exist here.

## 4. Repeated Logic Arrays
- **Code Smell:** Reusing identical massive chunks of HTML inline, or mapping `.filter()` calculations consecutively within the same render.
- **Impact:** Unnecessary heavy lifting for the browser.

## 5. Faux-Routing
- **Code Smell:** Relying on a string switch (`setNav('dashboard')`) rather than utilizing true URL routing (`react-router-dom`).
- **Impact:** A user cannot bookmark a specific task. They cannot hit the "Back" button on their browser to return to an old search. If they refresh the page, they lose their entire navigation state and are booted aggressively back to the Dashboard.
