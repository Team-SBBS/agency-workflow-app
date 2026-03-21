# Agency Workflow OS

Agency Workflow OS is a comprehensive, production-ready internal application designed to streamline agency operations. It serves as a centralized hub for Project Management, Customer Relationship Management (CRM), Role-Based Access Control (RBAC), and automated Billing & Invoicing.

## 🚀 Live Demo

The application is deployed and hosted live on Firebase Hosting at:
**[https://agency-management-sofwtare.web.app](https://agency-management-sofwtare.web.app)**

## 🛠 Technology Stack

*   **Frontend Framework:** React 18+
*   **Build Tool:** Vite (for fast, optimized bundling)
*   **Database:** Firebase Firestore (Real-time NoSQL document database)
*   **Authentication:** Firebase Auth (Email/Password based, completely secure)
*   **Hosting:** Firebase Hosting (Global CDN)
*   **Styling:** Custom CSS injected via React (with standard styling tokens)

## ✨ Core Features

### 1. Advanced Task Management & Workflows
*   Customizable pipeline stages with approval requirements.
*   Task assignment, time tracking (estimated vs. actual hours logged via a floating global timer), and file attachments.
*   Kanban-style and List views.

### 2. Deep Role-Based Access Control (RBAC)
The application strictly enforces what users can see and do based on hierarchy:
*   **Super Admin (SA):** Full organization access, user management, global settings.
*   **Project Manager (PM):** Cross-department visibility and workflow control.
*   **Department Manager (DM):** Filtered to view only their assigned department(s).
*   **Team Member (TM):** Restricted to viewing, logging time, and transitioning only their directly assigned tasks.
*   **Client (CL):** (Planned/Beta) External access to approve invoices and track their specific project milestones.

### 3. CRM & Billing Automation
*   Manage clients, internal departments, and contact information.
*   Generate automated invoices for completed, billable tasks.
*   Monitor revenue leakage with the "Unbilled Tasks" dashboard.

### 4. Custom Automations engine
*   If/Then engine built directly into the app. E.g., _"If a task is moved to 'Review' stage, automatically assign it to a Project Manager."_

### 5. Append-Only Audit Logging
*   Tamper-proof history tracking for all state changes (status updates, revision requests, assignments).

## 🔏 Security Architecture

This app has undergone a comprehensive security audit to ensure safety in production environments:
1.  **Hidden API Credentials:** All Firebase keys are sourced from a local `.env` file during the build step and are never hardcoded into open-source repositories.
2.  **No Plain-Text Storage:** User passwords are managed exclusively by Firebase Authentication’s secure backend. Passwords are not saved in plaintext inside Firestore.
3.  **No `localStorage` Vulnerabilities:** The app retrieves the logged-in session securely via Firebase’s `onAuthStateChanged` hook to protect against Cross-Site Scripting (XSS).
4.  **Firestore Security Rules:** Access to backend collections (`users`, `tasks`, `clients`, `invoices`, `config`) is locked down and denied by default. Only successfully authenticated application users have read/write access.

## 💻 Local Development Setup

To run this application on your local machine:

1.  **Clone the Repository**
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Environment Variables:**
    Create a `.env` file in the root directory and add your Firebase credentials:
    ```env
    VITE_FIREBASE_API_KEY="your-api-key"
    VITE_FIREBASE_AUTH_DOMAIN="your-auth-domain"
    VITE_FIREBASE_PROJECT_ID="your-project-id"
    VITE_FIREBASE_STORAGE_BUCKET="your-storage-bucket"
    VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
    VITE_FIREBASE_APP_ID="your-app-id"
    ```
4.  **Start the Dev Server:**
    ```bash
    npm run dev
    ```
    The application will launch on `http://localhost:3000` or `http://localhost:5173`.

## ☁️ Deployment Guide

This project is configured for one-click deployments to Firebase.

1.  **Compile the production bundle:**
    ```bash
    npm run build
    ```
2.  **Deploy securely to Firebase Hosting & update Firestore rules:**
    ```bash
    firebase deploy
    ```
    *(Note: If you only modified database rules, execute `firebase deploy --only firestore:rules`)*
