# 8. Business Logic & Workflow Mapping

## Core Logic Flow: Task State Transitions
The central arterial flow of the application involves moving a `Task` document through standard stages. This is exclusively handled by the `doTransition` Context wrapper.

**Workflow Path:**
1. User clicks a transition interface arrow (e.g., `↓` or `→`).
2. The `doTransition` function is invoked with the target `stage` string.
3. **Validation Check:** The system verifies Role-Based Access Control (RBAC):
   - Is the user a Super Admin or Project Manager? (Pass)
   - Is the user a Dept Manager of the *specific department* this task belongs to? (Pass)
   - Is the user directly assigned to this exact task? (Pass)
   - If none applies, halt.
4. **Audit Payload Construction:** Generates an audit trail object containing `{ from, to, actor (uid), ts, isRejection }`.
5. **Database Execution:** `updateDoc` mutates the task record in Firestore.
6. **Triggering Automations:** Immediately calls the custom client-side `runAutomations("stage_changed")` function to evaluate "If/Then" consequences in the background.

## Core Logic Flow: The Billing & Invoicing Engine
The application calculates finances based on tracked raw data, rather than maintaining running totals on the backend.

**Workflow Path:**
1. A task is marked `stage: "completed"` with `isBillable: true`.
2. A user logs hours against it (`actualHours` updates via `timeLog`).
3. An administrator navigates to the Billing Page.
4. The React component maps through ALL historical tasks, filtering solely for `{ stage: 'completed', isBillable: true, isInvoiced: false }`.
5. It aggregates the `actualHours` of these unbilled deliverables, multiplying by the `baseCost` associated with the configured Client CRM rate card.
6. **Execution:** The admin clicks "Generate Invoice."
7. The app writes a new `invoices` document containing the rigid subtotal math snapshot.
8. The app bulk-updates all relevant task documents to `isInvoiced: true`, permanently hiding them from the unbilled scope to prevent double-billing.

## Hidden Dependencies & Risks
- **Client-Side Automation Engine:** The `runAutomations` function loops through all configuration rules directly inside the user's browser runtime. If the user loses internet connection exactly after the `stage_change` updates but *before* the automation executes the `assign_to` rule, the automation will simply skip forever, breaking business logic expectations.
- **Retainer Complexity:** The `retainer` reduction math is calculated on the fly in the UI. There is no historical state tracking if a retainer was burned through "last month," risking miscalculation if historical invoicing data isn't perfectly curated.
