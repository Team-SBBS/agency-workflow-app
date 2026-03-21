# 1. Product Overview Document

## Purpose of the Application
Agency Workflow OS is a centralized, internal web application built to streamline operations for an agency. Its primary purpose to replace fragmented tools by combining project management, client relationship management (CRM), time tracking, and automated billing/invoicing into a single platform governed by strict role-based access control (RBAC).

## Target Users
The system caters to five distinct user roles with varying levels of authorization:
1. **Super Admin (SA):** Founders or C-level executives requiring exhaustive system visibility, financial oversight, and configuration capabilities.
2. **Project Manager (PM):** Operations leaders managing cross-department workflows, assigning tasks, and moving deliverables through approval pipelines.
3. **Department Manager (DM):** Domain-specific leads focused on tasks assigned directly to their specific department(s) (e.g., Design Lead, Engineering Lead).
4. **Team Member (TM):** Individual contributors executing assigned tasks, logging time, and submitting work for review.
5. **Client (CL):** External stakeholders with heavily restricted portal access to monitor projects and approve invoices (infrastructure exists, partially implemented).

## Core Features and Functionalities
- **Customizable Kanban/Workflow Pipeline:** Tasks move through configurable stages (e.g., Backlog → In Progress → Review → Completed).
- **Time & Revision Tracking:** Integrated global timer for logging billable vs. non-billable hours, directly linked to tasks.
- **Automated Billing Engine:** Calculation of unbilled hours against client retainer configurations or hourly rates, automatically generating Firebase-backed invoices.
- **Rule-Based Automations Engine:** Custom "If/Then" triggers designed directly inside the UI (e.g., *If stage = Review, Assign to Project Manager*).
- **Append-only Audit Log:** Security and compliance tracking for every state transition or assignment change.
- **Bulk User Management:** Ability to batch-invite staff via CSV/text parsing.

## Key Workflows
1. **Task Lifecycle Workflow:** Task Created (PM/DM) → Assigned (TM) → In Progress (Timer running) → Revision Requested (from DM/PM) OR Approved → Completed → Invoiced.
2. **Client Onboarding Workflow:** Administrator creates a new Client record → assigns Billing Configuration (Retainer vs. Hourly) → Associates incoming tasks to that Client ID.
3. **Billing Workflow:** System flags completed tasks explicitly marked as "Billable" but not yet invoiced. An authorized user triggers "Generate Invoice", which aggregates unbilled hours and creates an invoice record, locking the tasks.

## Inferred Business Objectives
- **Minimize Revenue Leakage:** Ensure every billable hour logged against a task is reliably transitioned into an invoice.
- **Enforce Accountability:** Use the strict audit log and explicit stage-transition tracking to identify workflow bottlenecks and exact actor responsibility.
- **Standardize Delivery:** Replace ad-hoc Slack/Email assignments with a unified, transparent portal that enforces staging reviews before client delivery.
