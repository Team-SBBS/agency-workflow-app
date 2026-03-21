# 2. Functional Requirements Document (FRD)

## Features & Modules Breakdown

### 1. Authentication Module
- **Action:** User enters email and password.
- **Output:** Identifies user against Firebase Auth. Creates secure session and fetches mapped user profile from the `users` Firestore collection to apply Role-Based Access Control (RBAC).

### 2. Dashboard Module
- **Action:** User logs in and lands on the dashboard.
- **Output:** Displays aggregate statistics relevant to their role.
  - *Super Admin / Project Manager:* View total active tasks, pending approvals, overdue deliverables, and high-level progress tracking.
  - *Department Manager:* View department-level backlog and assignments.
  - *Team Member:* View strictly personal workload, prioritized list, and recently logged hours.

### 3. Task Management Module
- **Feature:** Create, Assign, Update, and Transition Tasks.
- **Actions:**
  - Create a task assigned to a specific Client and Department.
  - Attach subtasks, checklists, and assign Priority (Low, Medium, High, Urgent).
  - Move tasks through standard or customized workflow stages (e.g., Created → In Progress → Review → Completed).
- **Constraints:** A *Team Member* cannot transition a task they are not assigned to unless they hold elevated privileges. Transitions requiring "Approval" force DM/PM intervention.

### 4. Client & CRM Module
- **Feature:** Client Records Management.
- **Actions:** Create new clients, define their industry, attach points of contact, and set unique billing structures (Retainer vs Hourly).
- **Outputs:** Read-only global visibility of the client list. Deleting a client creates "orphaned" tasks rather than cascading deletes to preserve historical financial integrity.

### 5. Time Tracking Module (Global Timer)
- **Feature:** Billable vs Non-Billable Time Logging.
- **Actions:** User starts a floating timer on the screen attached to an active task. User stops timer.
- **Outputs:** Injects a time log entry onto the specific task and aggregates `actualHours`. Modifies the total unbilled value of the task's parent Client for invoicing purposes.

### 6. Billing & Invoicing Module
- **Feature:** Revenue generation and Invoice tracking.
- **Actions:** Authorized user (PM/SA) generates an invoice against a target client.
- **Outputs:** Sweeps all unbilled, completed tasks. Locks them as `isInvoiced = true`. Generates a static invoice record with total due, calculated via retainer offsets or standard hourly rates.

### 7. Automations Rule Engine
- **Feature:** "If/Then" logic flows for automatic actions.
- **Actions:** Admin defines a Rule: Trigger (e.g., `stage_changed` to `Review`) -> Action (e.g., `assign_to` Project Manager).
- **Outputs:** Headless execution of the workflow configuration behind the scenes upon matching Firestore updates.

### 8. Audit & Reporting Module
- **Feature:** Tamper-proof logging.
- **Actions:** System passively logs every state change. User clicks "Audit Log" tab.
- **Outputs:** Chronological view of "User X moved Task Y from In Progress to Review at Timestamp Z."
