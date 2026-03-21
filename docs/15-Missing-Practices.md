# 15. Missing Best Practices

## 1. Modularity (Atomic Design)
Components should be broken down into their smallest possible reusable instances (e.g., `src/components/atoms/Button.jsx`, `src/pages/Dashboard.jsx`). This repository fundamentally rejects this standard.

## 2. Server State Libraries
Relying strictly on `useState` concatenated to real-time Firebase websockets is reckless at scale. Standard React architecture demands tools like **TanStack Query (React Query)** or **SWR** to manage server-state. These tools cache responses, paginate large collections automatically, deduplicate requests, and provide `isLoading / isError` states gracefully without blocking the entire DOM.

## 3. Typed Programming (TypeScript)
A system managing complex financial deliverables, arbitrary roles, and custom invoice calculations requires guarantees. Using pure Javascript invites catastrophic bugs (e.g., adding an Integer `10` to a String `"10"` results in `"1010"`, heavily corrupting the `total` invoice output). The absence of TypeScript guarantees technical debt expansion.

## 4. Pagination & Query Limits
Enterprise dashboards do not load 10,000 tasks simultaneously on boot. Modern architecture mandates `limit()` cursors combined with infinitely scrolling lazy-loads or classic pagination indexing.

## 5. Security Validation Layers
Modern applications utilize `Zod`, `Yup`, or `Joi` schema validations *before* permitting any payload to be blasted into a database connection. The current architecture strictly believes whatever comes out of the `<Inp>` generic component is truthful and format-perfect.

## 6. Unit & E2E Testing Ecosystems
There are zero tests covering incredibly critical logic, such as the `runAutomations()` matrix or the `BillingPage` invoice generation math. Changes to the code currently require manual verification of every possible workflow to assure nothing fractured. Lack of `Jest` or `Cypress` frameworks marks the software strictly as pre-production.
