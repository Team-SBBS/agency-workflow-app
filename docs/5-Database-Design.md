# 5. Database Design Document (Firestore)

## Overview
The application uses Firebase Firestore, a NoSQL document database. Data is denormalized and heavily reliant on top-level collections, avoiding deep subcollections for easier global querying via the client SPA.

---

## 1. `users` Collection
Stores metadata mapped to Firebase Auth accounts for RBAC and profile rendering.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | String | Unique Identifier (Matches Firebase Auth UID) |
| `name` | String | User's full display name |
| `email` | String | Matches Firebase Auth email |
| `role` | String | Enum: `super_admin`, `project_manager`, `dept_manager`, `team_member`, `client` |
| `dept` | Array/String | Legacy string or array of strings mapping to `config/departments` IDs |
| `avatar` | String | URL to profile picture (or fallback static image) |
| `baseCost` | Number | Hourly cost rate for internal reporting (INR) |

---

## 2. `tasks` Collection
The core operational entity of the platform. *Warning: Sub-entities like comments and checklists are embedded as arrays within the document rather than subcollections.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | String | Unique Identifier |
| `clientId` | String | FK reference to `clients.id` |
| `deptId` | String | FK reference to `config/departments` ID |
| `title` | String | Task summary |
| `description` | String | HTML/Text blob detailing the task |
| `stage` | String | Current workflow phase (e.g., `created`, `in_progress`) |
| `priority` | String | Enum: `low`, `medium`, `high`, `urgent` |
| `assignedTo` | String | FK reference to `users.id` (or Null) |
| `dueDate` | String | ISO formatted date string |
| `isBillable` | Boolean | Determines if tracked hours offset retainers / generate invoices |
| `billingType` | String | Usually defaults to `hourly` |
| `estimatedHours` | Number | PM's projection of effort |
| `actualHours` | Number | Aggregated total from `timeLog` array |
| `isInvoiced` | Boolean | True if swept by the Billing Engine |
| `subtasks` | Array[Object] | Ordered list of subset deliverables (`{id, title, completed, ts}`) |
| `checklist` | Array[Object] | Ordered QA items (`{id, text, done}`) |
| `timeLog` | Array[Object] | Historical punches (`{id, userId, type, duration, ts}`) |
| `comments` | Array[Object] | Chat feed on the task (`{id, userId, text, ts}`) |
| `transitions` | Array[Object] | Audit trail (`{from, to, actor, ts, isRejection}`) |
| `revisionCount` | Number | Times a task was kicked backwards in the workflow |
| `revisionOverheadHours` | Number | Penalty calculation for reporting |

---

## 3. `clients` Collection
CRM records and parent associative objects for tasks.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | String | Unique Identifier |
| `name` | String | Company Name |
| `industry` | String | Business sector |
| `mobile` | String | Contact phone |
| `email` | String | Primary billing email |
| `gst` | String | Indian Tax ID (Optional) |
| `billing` | String | Enum: `retainer`, `hourly`, `project` |
| `retainer` | Number | Fixed monthly invoiced amount (INR) |
| `brandColors` | Array | UI customization hex codes |

---

## 4. `invoices` Collection
Generated financial documents locking in completed, billable tasks.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | String | Invoice ID (e.g., `INV-1710940291`) |
| `clientId` | String | FK reference to `clients.id` |
| `date` | String | ISO creation timestamp |
| `dueDate` | String | Calculated deadline timestamp |
| `status` | String | Enum: `draft`, `sent`, `paid`, `overdue` |
| `items` | Array[Object] | Snapshots of tasks billed (`{taskId, title, hours, rate, amount}`) |
| `subtotal` | Number | Sum of items |
| `tax` | Number | 18% GST calculation (if applicable) |
| `total` | Number | Final payable amount |

---

## 5. `config` Collection
System configuration documents determining dynamic UI drops. Contains singleton documents like `workflow`, `departments`, `permissions`, and `automations`.

---

## Assumed Query Patterns & Indexes
The application makes extensive use of the `.filter()` Javascript array method on the Client-side rather than executing native Firestore `.where()` queries. Therefore, **Firestore indexing is likely non-existent and unoptimized**, as the app simply downloads the entire collection mapping and sorts the logic in browser memory.
