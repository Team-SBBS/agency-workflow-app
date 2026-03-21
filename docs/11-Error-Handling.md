# 11. Error Handling & Edge Cases

## Current Error Handling Strategy
The application’s error handling is highly optimistic and largely relies on standard browser `alert()` popups or silent Console failures.

### Authentication Errors
- Implemented reasonably well. `signInWithEmailAndPassword` is wrapped in a `try/catch` block, which maps Firebase error codes to a localized string and displays them via a generic `setError(msg)` UI banner.

### Database Write Errors
- **Missing Validations:** Most `updateDoc` calls are executed blindly via `onClick` handlers. E.g., `async () => { await updateDoc(...) }`. 
- **Failure Consequence:** If the user's internet drops immediately before a write, the promise will hang. Because there are no `.catch()` blocks attached to the majority of database mutations, the user will not receive UI feedback that their action failed.

## Missing Data Validations
1. **Form Completeness:** Many forms (like "New Task") rely on basic HTML5 `required` attributes rather than strict Javascript schema validation (e.g., Zod/Yup).
2. **Type Coercion:** Numeric inputs for `retainer` or `estimatedHours` lack rigid decimal boundaries. If a corrupt string is passed to Firestore, the billing math functions will fail silently by returning `NaN` across financial reports.

## Identified Potential Failure Points
- **Automation Race Conditions:** If two users edit the same task simultaneously, triggering opposing automation rules within the client browser, both browsers will race to execute `updateDoc`, corrupting the task state based entirely on ping latency.
- **Orphaned References:** If a user deletes a Department from `SettingsPage`, all tasks associated with `deptId === 'xyz'` will instantly crash the Kanban board lookup functions, because there is no cascading delete safeguard or null-check on the column renderer.
