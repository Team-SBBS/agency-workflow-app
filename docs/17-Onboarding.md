# 17. Developer Onboarding Guide

## Introduction
Welcome to Agency Workflow OS. This application is an internal command center designed to track tasks, manage CRM relationships, and automate agency billing based on deeply embedded role-based access logic. 

**Disclaimer:** This is a monolithic React Application containing technical debt. Do not be intimidated by the `agency-workflow-os-v3.jsx` file footprint.

## Pre-Requisites
- **Node.js:** v18 or newer
- **Firebase CLI:** Installed globally (`npm i -g firebase-tools`)
- **React Knowledge:** Specifically deep expertise in hooks (`useState`, `useEffect`, `useContext`) and React memory management.

## Installation & Setup
1. Clone the repository and navigate into the root directory.
2. Run `npm install` to hydrate package dependencies.
3. Ensure the `.env` file exists alongside `package.json`, populated with the Firebase API keys (check Slack/Secret Manager for values).

## How to Run Locally
1. Type `npm run dev` into your terminal. Vite will host the HMR server (usually on `http://localhost:3000` or `5173`).
2. Log in using the default Seed Admin credentials (or create a new profile via the backend console).

## Modifying Code: Key Areas
Because the app is fundamentally comprised of one large file, here is the map for `agency-workflow-os-v3.jsx`:
- **Line 1-100:** Configuration, static tokens, and initial mapping declarations.
- **Line 150-400 (approx):** Purely shared, dumb UI Components (styled elements).
- **Line 500-1400:** Core workflow modules. The most heavily edited piece of code is `TaskDetail` (the right-side sliding pane).
- **Line 2400-End:** The Master orchestrator, containing Firebase initialization, context injection, automation processing (`runAutomations`) and routing wrappers.

## Debugging and Logs
- **The Audit Tab:** This UI view specifically mirrors the `transitions` node on task documents. If business logic appears fractured, check the Audit tag historically.
- **The Context Dump:** If variables are failing, temporarily add `<pre>{JSON.stringify(tasks[0], null, 2)}</pre>` directly onto `Dashboard.jsx` to view the active WebSockets stream shape.
- **Check Your Firebase Console:** Since there is little schema validation in Javascript, checking the raw Collections tab in Firebase is mandatory to confirm your frontend updates didn't accidentally fire corrupted `null` values into a column.
