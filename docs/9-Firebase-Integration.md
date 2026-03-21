# 9. Firebase Integration Analysis

## Firestore Read/Write Patterns
- **Reads (Global Streams):** The application relies almost entirely on `onSnapshot` listeners attached to the root level of massive collections (`tasks`, `clients`, `users`, `invoices`, `config`). It does not use paginated queries, `limit()`, or localized `.get()` requests outside of absolute edge cases.
- **Writes:** Mutative actions are executed via `updateDoc`, `setDoc`, and `deleteDoc` directly from UI interaction handlers. 

## Real-time Listeners vs One-time Fetch
Over 95% of data ingestion is handled by real-time listeners.
**The `App.jsx` Mount Lifecycle:**
```javascript
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), ...);
    const unsubTasks = onSnapshot(collection(db, "tasks"), ...);
    const unsubInvoices = onSnapshot(collection(db, "invoices"), ...);
    // ...
```
While this ensures the UI is magically fast and always current, it guarantees that Firestore Read operations will scale geometrically with data creation, rather than linearly with usage.

## Authentication
- **Provider:** Firebase Authentication (Email/Password).
- **Session:** Managed securely without `localStorage` via the Firebase SDK's `onAuthStateChanged`.
- **RBAC Sync:** Once Auth confirms identity via UID, the app fetches the corresponding `users/{uid}` document to determine the user's role (`role: 'super_admin'`), which gatekeeps the UI.

## Security Rule Assumptions
The app functions under the protection of a locked-down `firestore.rules` file:
```javascript
    match /{document=**} {
      allow read, write: if false; // Deny all by default
    }
    match /tasks/{taskId} {
      allow read, write: if request.auth != null; // Bare minimum Auth check
    }
```
**Risk:** While unauthorized internet bots cannot wipe the database, *any* authenticated user (even a lowly Team Member) technically has full read/write access to the entire `tasks` or `invoices` collection at the network layer. The RBAC is enforced *only* on the client UI, which a malicious actor could bypass using the Firebase REST API with their valid user token.
