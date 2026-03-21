# 13. Security Analysis

## Recent Security Fixes
The codebase recently underwent a critical security lock-down. The following prior vulnerabilities have been successfully patched:
1. **Hardcoded API Keys:** Firebase credentials originally committed to the repository have been rotated to a local `.env` file (`VITE_FIREBASE_API_KEY`, etc.).
2. **Clear-Text Database Passwords:** Removed a legacy requirement where `admin` passwords were saved in pure string format onto user documents inside `SEED_USERS`.
3. **`localStorage` XSS Vectors:** Removed logic copying the sensitive `currentUser` payload into `localStorage`. The app now strictly defers to Firebase's `onAuthStateChanged` hook to maintain sessions, nullifying Javascript payload exfiltration.
4. **Native Dialog Replacements:** Eradicated the heavily-abused `window.confirm()` and `window.prompt()` methods (which can be hijacked by malicious browser extensions) with internally controlled `<Modal>` React components for things like triggering a password reset.

## Current Authorization Gaps (Backend)
Because development heavily prioritized UI functionality, the backend security is functionally reliant on basic authentication.
- **`firestore.rules` Limitation:** The current rules (as recently deployed) verify that a user `isAuthenticated()`.
- **The True Threat Vector:** While external guests cannot steal data, an *internal* employee (e.g., a "Team Member") can simply open the Network Tab, steal their valid Firebase Bearer Token, and send a raw REST API request (`PATCH`) to Firebase to modify *someone else's* task or promote themselves to `Super Admin`. 
- **Recommendation:** `firestore.rules` must be painstakingly rebuilt to match the Javascript RBAC logic.

## Data Exposure Risks
Because of the "God Context" design (see *Performance Analysis*), every user downloading the application intrinsically downloads **every single client, task, and invoice document** in the agency.
- **Risk:** A low-level graphic designer (`Team Member` role) will have the entire financial invoice history, retainer structures, and client phone numbers sitting invisibly inside their browser's React Context, even though the UI explicitly hides the "Billing" tab from them. This is a massive Data Leak waiting to happen if a rogue employee knows how to open React DevTools.
