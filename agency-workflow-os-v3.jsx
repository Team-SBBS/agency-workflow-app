import { useState, useCallback, useRef, createContext, useContext, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, query, orderBy, limit, getDocs } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCIyWWhBVwHsyX7g-j_v6eRopyB2vqCg-k",
  authDomain: "agency-management-sofwtare.firebaseapp.com",
  projectId: "agency-management-sofwtare",
  storageBucket: "agency-management-sofwtare.firebasestorage.app",
  messagingSenderId: "224916921374",
  appId: "1:224916921374:web:ac3c142efd478d6587220f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// ═══════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════
const T = {
  bg: "#F0F2F7", surface: "#FFFFFF", surfaceElev: "#FAFBFD",
  border: "#E4E8F0", borderDark: "#C9D0DE",
  navy: "#0D1B3E", blue: "#1D4ED8", blueHov: "#1E40AF",
  blueLight: "#EFF6FF", blueMid: "#DBEAFE",
  text: "#0D1B3E", textMid: "#4B5675", textLight: "#8B94B0",
  success: "#059669", successBg: "#ECFDF5", successBorder: "#A7F3D0",
  danger: "#DC2626", dangerBg: "#FEF2F2", dangerBorder: "#FECACA",
  warning: "#D97706", warningBg: "#FFFBEB", warningBorder: "#FDE68A",
  purple: "#7C3AED", purpleBg: "#F5F3FF",
  sidebar: "#0D1B3E", sidebarBorder: "rgba(255,255,255,0.08)",
  radius: "10px", radiusSm: "7px", radiusLg: "14px",
  shadow: "0 1px 4px rgba(13,27,62,0.07),0 1px 2px rgba(13,27,62,0.04)",
  shadowMd: "0 4px 20px rgba(13,27,62,0.10)",
  shadowLg: "0 16px 48px rgba(13,27,62,0.18)",
  font: "'Outfit','Nunito',system-ui,sans-serif",
  fontMono: "'JetBrains Mono','Fira Code',monospace",
};

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════
const INR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const ROLES = { SA: "super_admin", PM: "project_manager", DM: "dept_manager", TM: "team_member", CL: "client" };
const ROLE_LABELS = { super_admin: "Super Admin", project_manager: "Project Manager", dept_manager: "Dept. Manager", team_member: "Team Member", client: "Client" };

const STAGES_DEFAULT = [
  { id: "created", label: "Created", color: "#64748B", bg: "#F1F5F9", step: 1, terminal: false, isStart: true },
  { id: "assigned", label: "Assigned", color: "#2563EB", bg: "#EFF6FF", step: 2, terminal: false },
  { id: "in_progress", label: "In Progress", color: "#D97706", bg: "#FFFBEB", step: 3, terminal: false },
  { id: "submitted", label: "Under Review", color: "#7C3AED", bg: "#F5F3FF", step: 4, terminal: false },
  { id: "dept_approved", label: "Dept. Approved", color: "#0891B2", bg: "#ECFEFF", step: 5, terminal: false },
  { id: "client_review", label: "Client Review", color: "#EA580C", bg: "#FFF7ED", step: 6, terminal: false },
  { id: "on_hold", label: "On Hold", color: "#6B7280", bg: "#F3F4F6", step: 7, terminal: false },
  { id: "completed", label: "Completed", color: "#059669", bg: "#ECFDF5", step: 8, terminal: true },
];

const TRANSITIONS_DEFAULT = {
  on_hold: [{ action: "resume", label: "Resume Task", to: "in_progress", roles: [ROLES.DM, ROLES.PM, ROLES.SA] }],
  created: [{ action: "assign", label: "Assign to Team", to: "assigned", roles: [ROLES.DM, ROLES.SA], needsComment: false, isReject: false, needsAssignee: true }],
  assigned: [{ action: "start", label: "Start Work", to: "in_progress", roles: [ROLES.TM, ROLES.SA], needsComment: false, isReject: false }],
  in_progress: [{ action: "submit", label: "Submit for Review", to: "submitted", roles: [ROLES.TM, ROLES.SA], needsComment: false, isReject: false }, { action: "hold_tm", label: "Put on Hold", to: "on_hold", roles: [ROLES.TM, ROLES.SA], needsComment: true }],
  submitted: [
    { action: "approve_dept", label: "Approve & Escalate", to: "dept_approved", roles: [ROLES.DM, ROLES.SA], needsComment: false, isReject: false },
    { action: "reject_dept", label: "Request Revision", to: "in_progress", roles: [ROLES.DM, ROLES.SA], needsComment: true, isReject: true },
  ],
  dept_approved: [{ action: "send_client", label: "Send to Client", to: "client_review", roles: [ROLES.PM, ROLES.SA], needsComment: false, isReject: false }],
  client_review: [
    { action: "approve_client", label: "Approve & Complete", to: "completed", roles: [ROLES.CL, ROLES.PM, ROLES.SA], needsComment: false, isReject: false },
    { action: "reject_client", label: "Request Changes", to: "dept_approved", roles: [ROLES.CL, ROLES.PM, ROLES.SA], needsComment: true, isReject: true },
    { action: "hold", label: "Put on Hold", to: "on_hold", roles: [ROLES.DM, ROLES.PM, ROLES.SA], needsComment: true, isReject: false },
  ],
  completed: [],
};

const PRIORITY_CFG = {
  critical: { label: "Critical", color: "#DC2626", bg: "#FEF2F2" },
  high: { label: "High", color: "#EA580C", bg: "#FFF7ED" },
  medium: { label: "Medium", color: "#D97706", bg: "#FFFBEB" },
  low: { label: "Low", color: "#059669", bg: "#ECFDF5" },
};

const BILLING_CFG = {
  retainer: { label: "Retainer", color: "#1D4ED8" },
  one_time: { label: "One-Time", color: "#7C3AED" },
  internal: { label: "Internal", color: "#6B7280" },
};

// ── DEPARTMENTS (now includes Sales & Customer Support) ──────────
const DEPTS_DEFAULT = [
  { id: "d1", name: "Design", icon: "🎨", color: "#EC4899" },
  { id: "d2", name: "Video Editing", icon: "🎬", color: "#F97316" },
  { id: "d3", name: "SEO", icon: "🔍", color: "#06B6D4" },
  { id: "d4", name: "Web Dev", icon: "💻", color: "#8B5CF6" },
  { id: "d5", name: "App Dev", icon: "📱", color: "#3B82F6" },
  { id: "d6", name: "Social Media", icon: "📣", color: "#F59E0B" },
  { id: "d7", name: "Sales", icon: "💼", color: "#10B981" },
  { id: "d8", name: "Customer Support", icon: "🎧", color: "#EF4444" },
];

const AUTOMATION_TRIGGERS = [
  { id: "task_created", label: "Task is created" },
  { id: "task_updated", label: "Task any field updated" },
  { id: "stage_changed", label: "Workflow stage changes to..." },
  { id: "assigned_changed", label: "Assignee changes to..." },
  { id: "priority_changed", label: "Priority changes to..." },
  { id: "subtask_completed", label: "Any subtask completed" },
  { id: "all_subtasks_done", label: "All subtasks completed" },
  { id: "checklist_done", label: "All checklist items completed" },
  { id: "overdue", label: "Task becomes overdue" },
  { id: "due_approaching", label: "Due date is approaching (24h)" },
];

const AUTOMATION_ACTIONS = [
  { id: "assign_to", label: "Assign task to..." },
  { id: "change_stage", label: "Move to stage..." },
  { id: "change_priority", label: "Set priority to..." },
  { id: "add_comment", label: "Add a comment" },
  { id: "create_subtask", label: "Create a subtask" },
  { id: "add_checklist", label: "Add checklist items" },
  { id: "set_due_date", label: "Set due date (days from now)" },
  { id: "notify_email", label: "Send email notification" },
  { id: "notify_slack", label: "Send Slack notification" },
];

// ── SEED DATA ────────────────────────────────────────────────────
const SEED_USERS = [
  { id: "admin-sbbs", name: "Master Admin", role: ROLES.SA, dept: null, av: "SA", color: "#1D4ED8", email: "team@sbbs.co.in", password: "Sbbs@123" },
];

const SEED_CLIENTS = [];

const n0 = new Date();
const dA = (d) => new Date(n0 - d * 86400000).toISOString();
const dF = (d) => new Date(n0.getTime() + d * 86400000).toISOString().slice(0, 10);

const SEED_TASKS = [];

const SEED_INVOICES = [];

const SEED_AUTOMATIONS = [
  {
    id: "a1",
    name: "Auto-assign on Design Stage",
    trigger: "stage_changed",
    triggerValue: "design",
    conditions: [],
    conditionLogic: "AND",
    actions: [{ type: "assign_to", value: "admin-sbbs" }],
    active: true
  },
  {
    id: "a2",
    name: "Flag Critical Tasks",
    trigger: "priority_changed",
    triggerValue: "critical",
    conditions: [],
    conditionLogic: "AND",
    actions: [{ type: "add_comment", value: "System: This critical task requires immediate attention." }],
    active: true
  }
];

// ═══════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════
const Ctx = createContext(null);
const useApp = () => useContext(Ctx);

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════
const getUser = (id, currentUsers = null) => (currentUsers || SEED_USERS).find(u => u.id === id);
const getDept = (id, depts) => (depts || DEPTS_DEFAULT).find(d => d.id === id);
const getClient = (id, cls) => (cls || SEED_CLIENTS).find(c => c.id === id);
const isOverdue = (t) => t.stage !== "completed" && t.dueDate && new Date(t.dueDate) < new Date();
const relTime = (ts) => ts ? new Date(ts).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const uuid = () => "x" + Math.random().toString(36).slice(2, 10);

// ═══════════════════════════════════════════════════════════════════════
// PRIMITIVE UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════
function Av({ userId, size = 28 }) {
  const ctx = useApp();
  const u = getUser(userId, ctx?.users);
  if (!u) return <div style={{ width: size, height: size, borderRadius: "50%", background: T.border }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: u.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.34, fontWeight: 700, color: "#fff", flexShrink: 0, border: "2px solid #fff" }}>
      {u.av}
    </div>
  );
}

function Badge({ stage, stages }) {
  const list = stages || STAGES_DEFAULT;
  const s = list.find(x => x.id === stage) || list[0];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", border: `1px solid ${s.color}30` }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />{s.label}
    </span>
  );
}

function PBadge({ priority }) {
  const p = PRIORITY_CFG[priority] || PRIORITY_CFG.medium;
  return <span style={{ fontSize: 11, fontWeight: 700, color: p.color, background: p.bg, padding: "2px 8px", borderRadius: 20 }}>{p.label}</span>;
}

// FIX #2 — Btn: explicit minWidth, explicit color/background always set, no hover state issues
function Btn({ children, onClick, variant = "primary", size = "md", disabled = false, full = false, sx = {} }) {
  const [hov, setHov] = useState(false);
  const base = {
    primary: { bg: hov ? "#1E40AF" : T.blue, color: "#ffffff", border: "none", shadow: "0 1px 3px rgba(29,78,216,.3)" },
    secondary: { bg: hov ? "#E8ECF5" : T.surface, color: T.textMid, border: `1px solid ${T.border}`, shadow: "none" },
    danger: { bg: hov ? "#B91C1C" : T.danger, color: "#ffffff", border: "none", shadow: "none" },
    ghost: { bg: hov ? T.border : "transparent", color: T.textMid, border: "none", shadow: "none" },
    success: { bg: hov ? "#047857" : T.success, color: "#ffffff", border: "none", shadow: "none" },
    outline: { bg: "transparent", color: T.blue, border: `1.5px solid ${T.blue}`, shadow: "none" },
  };
  const sz = { sm: { padding: "5px 13px", fontSize: 12 }, md: { padding: "9px 18px", fontSize: 13 }, lg: { padding: "12px 26px", fontSize: 14 } };
  const v = base[variant] || base.primary;
  const s = sz[size] || sz.md;
  return (
    <button
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        border: v.border || "none", cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: T.font, fontWeight: 700, borderRadius: T.radiusSm, outline: "none",
        transition: "all .15s ease", background: v.bg, color: v.color,
        width: full ? "100%" : "auto", opacity: disabled ? 0.45 : 1,
        boxShadow: v.shadow || "none", textDecoration: "none", whiteSpace: "nowrap",
        minWidth: size === "sm" ? 0 : 64, ...s, ...sx,
      }}>
      {children}
    </button>
  );
}

function Card({ children, sx = {}, onClick, hover = false }) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => hover && setH(true)} onMouseLeave={() => hover && setH(false)}
      style={{ background: T.surface, borderRadius: T.radiusLg, border: `1px solid ${T.border}`, boxShadow: h ? T.shadowMd : T.shadow, transition: "all .2s ease", cursor: onClick ? "pointer" : "default", transform: h ? "translateY(-1px)" : "none", ...sx }}>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children, width = 520 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(13,27,62,.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, backdropFilter: "blur(5px)", padding: 16 }}>
      <div style={{ background: T.surface, borderRadius: T.radiusLg, width: "100%", maxWidth: width, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: T.shadowLg, animation: "mIn .2s ease" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.textLight, fontSize: 22, lineHeight: 1, padding: 4, borderRadius: 6 }}>×</button>
        </div>
        <div style={{ overflow: "auto", flex: 1, padding: "20px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

function Inp({ label, value, onChange, type = "text", placeholder = "", required = false, as = "input", rows = 3, disabled = false }) {
  const s = { width: "100%", padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 13, fontFamily: T.font, color: T.text, background: disabled ? T.bg : T.surface, outline: "none", boxSizing: "border-box", resize: "vertical" };
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: T.textMid, display: "block", marginBottom: 5 }}>{label}{required && <span style={{ color: T.danger }}> *</span>}</label>}
      {as === "textarea"
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} disabled={disabled} style={s} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} style={s} />}
    </div>
  );
}

function Sel({ label, value, onChange, options, required = false }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: T.textMid, display: "block", marginBottom: 5 }}>{label}{required && <span style={{ color: T.danger }}> *</span>}</label>}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 13, fontFamily: T.font, color: T.text, background: T.surface, outline: "none", boxSizing: "border-box" }}>
        <option value="">— Select —</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// FIX #1 — Searchable client dropdown
function ClientSearchSel({ label, value, onChange, clients, required = false }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const filtered = (clients || SEED_CLIENTS).filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
  const selected = (clients || SEED_CLIENTS).find(c => c.id === value);

  const close = () => { setOpen(false); setQ(""); };

  return (
    <div style={{ marginBottom: 14, position: "relative" }} ref={ref}>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: T.textMid, display: "block", marginBottom: 5 }}>{label}{required && <span style={{ color: T.danger }}> *</span>}</label>}
      <div onClick={() => setOpen(o => !o)}
        style={{ width: "100%", padding: "9px 12px", border: `1px solid ${open ? T.blue : T.border}`, borderRadius: T.radiusSm, fontSize: 13, fontFamily: T.font, color: selected ? T.text : T.textLight, background: T.surface, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" }}>
        <span>{selected ? selected.name : "— Select Client —"}</span>
        <span style={{ color: T.textLight, fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: T.surface, border: `1px solid ${T.blue}`, borderRadius: T.radiusSm, zIndex: 500, boxShadow: T.shadowMd, marginTop: 2 }}>
          <div style={{ padding: "8px 10px", borderBottom: `1px solid ${T.border}` }}>
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="🔍  Search clients…"
              style={{ width: "100%", padding: "6px 10px", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 12, fontFamily: T.font, outline: "none" }} />
          </div>
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {filtered.length === 0
              ? <div style={{ padding: "12px 14px", fontSize: 12, color: T.textLight }}>No clients found</div>
              : filtered.map(c => (
                <div key={c.id} onClick={() => { onChange(c.id); close(); }}
                  style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, fontWeight: c.id === value ? 700 : 400, color: c.id === value ? T.blue : T.text, background: c.id === value ? T.blueLight : "transparent" }}
                  onMouseEnter={e => e.currentTarget.style.background = c.id === value ? T.blueLight : T.bg}
                  onMouseLeave={e => e.currentTarget.style.background = c.id === value ? T.blueLight : "transparent"}>
                  <div>{c.name}</div>
                  <div style={{ fontSize: 11, color: T.textLight, marginTop: 1 }}>{c.industry} · {c.email}</div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon, color = T.blue, danger = false }) {
  return (
    <Card sx={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: danger && Number(value) > 0 ? T.danger : T.text, fontFamily: T.fontMono, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color, marginTop: 6, fontWeight: 600 }}>{sub}</div>}
    </Card>
  );
}

function Progress({ value, color = T.blue, h = 6 }) {
  return (
    <div style={{ width: "100%", height: h, background: T.border, borderRadius: h, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: "100%", background: color, borderRadius: h, transition: "width .4s ease" }} />
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <div onClick={() => onChange(!checked)}
      style={{ width: 40, height: 22, borderRadius: 11, background: checked ? T.blue : T.border, position: "relative", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 2, left: checked ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PIPELINE VISUAL
// ═══════════════════════════════════════════════════════════════════════
function Pipeline({ currentStage, stages }) {
  const S = stages || STAGES_DEFAULT;
  const idx = S.findIndex(s => s.id === currentStage);
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%", padding: "4px 0", overflowX: "auto" }}>
      {S.map((s, i) => {
        const done = i < idx, active = i === idx;
        return (
          <div key={s.id} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: active ? s.color : done ? s.color : "#E2E8F0", boxShadow: active ? `0 0 0 4px ${s.bg}` : "none", border: active ? `2px solid ${s.color}` : "none" }}>
                <span style={{ fontSize: 11, color: (done || active) ? "#fff" : "#94A3B8", fontWeight: 700 }}>{done ? "✓" : s.step}</span>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: active ? s.color : done ? T.textMid : T.textLight, textAlign: "center", whiteSpace: "nowrap", letterSpacing: ".02em" }}>{s.label}</span>
            </div>
            {i < S.length - 1 && <div style={{ width: 20, height: 2, background: i < idx ? T.blue : T.border, flexShrink: 0, marginBottom: 14 }} />}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const DEMOS = [];

  const handleLogin = async () => {
    setError(""); setLoading(true);
    try {
      // Fetch from Firestore
      const snap = await getDocs(collection(db, "users"));
      const allUsers = snap.docs.map(d => ({ ...d.data(), id: d.id }));

      // Merge with SEED_USERS in case DB is empty or for initial admin
      const combined = [...SEED_USERS, ...allUsers];

      const u = combined.find(u => u.email?.trim().toLowerCase() === email.trim().toLowerCase() && u.password === password);

      if (u) {
        // App observer handles user fetch
        onLogin(u);
      } else {
        setError("Invalid email or password. Please check your credentials.");
      }
    } catch (err) {
      console.error(err);
      setError("Connection error. Please check your internet or Firebase config.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg,${T.navy} 0%,#1D3461 55%,#2563EB 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      {[["−10%", "10%", "400px", "rgba(37,99,235,.15)"], ["80%", "60%", "300px", "rgba(124,58,237,.1)"]].map(([l, t, w, c], i) => (
        <div key={i} style={{ position: "absolute", left: l, top: t, width: w, height: w, borderRadius: "50%", background: c, filter: "blur(60px)" }} />
      ))}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, maxWidth: 900, width: "100%", position: "relative" }}>
        {/* Branding */}
        <div style={{ color: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", padding: "20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
            <div style={{ width: 48, height: 48, background: T.blue, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, boxShadow: "0 8px 24px rgba(37,99,235,.4)" }}>⚡</div>
            <div><div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px" }}>WorkflowOS</div><div style={{ fontSize: 12, opacity: .6, fontWeight: 500 }}>Agency Edition</div></div>
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.2, marginBottom: 16, letterSpacing: "-1px" }}>
            Control every task.<br /><span style={{ color: "#60A5FA" }}>Prevent every leak.</span>
          </h1>
          <p style={{ fontSize: 14, opacity: .7, lineHeight: 1.7, marginBottom: 28 }}>Department-driven project management with strict workflow enforcement, billing tracking, and real-time audit logs.</p>
          {[["🔒", "Strict 7-stage workflow engine"], ["💰", "Billing & invoice tracking in ₹"], ["📊", "Real-time audit & revision logs"]].map(([ic, txt]) => (
            <div key={txt} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, fontSize: 13, opacity: .85 }}><span>{ic}</span><span>{txt}</span></div>
          ))}
        </div>
        {/* Form */}
        <div>
          <Card sx={{ padding: 32 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: T.text, marginBottom: 4 }}>Sign in</div>
            <div style={{ fontSize: 13, color: T.textLight, marginBottom: 24 }}>Enter your credentials to continue</div>
            {error && <div style={{ padding: "10px 14px", background: T.dangerBg, border: `1px solid ${T.dangerBorder}`, borderRadius: T.radiusSm, fontSize: 13, color: T.danger, marginBottom: 16 }}>{error}</div>}
            <Inp label="Email" value={email} onChange={setEmail} type="email" placeholder="your email" required />
            <div style={{ position: "relative" }}>
              <Inp label="Password" value={password} onChange={setPassword} type={showPass ? "text" : "password"} placeholder="••••••••" required />
              <button onClick={() => setShowPass(s => !s)} style={{ position: "absolute", right: 10, top: 30, background: "none", border: "none", cursor: "pointer", color: T.textLight, fontSize: 12, fontFamily: T.font }}>{showPass ? "Hide" : "Show"}</button>
            </div>
            <Btn full onClick={handleLogin} disabled={loading || !email || !password} size="lg" sx={{ marginTop: 4 }}>{loading ? "Signing in…" : "Sign In"}</Btn>
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {DEMOS.map(acc => (
                  <button key={acc.email} onClick={() => { setEmail(acc.email); setPassword(SEED_USERS.find(u => u.email === acc.email)?.password || ""); setError(""); }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: T.radiusSm, border: `1px solid ${T.border}`, background: email === acc.email ? T.blueLight : T.bg, cursor: "pointer", fontFamily: T.font, transition: "all .15s" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: email === acc.email ? T.blue : T.text }}>{acc.label}</span>
                    <span style={{ fontSize: 11, color: T.textLight }}>{acc.role}</span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TASK CARD
// ═══════════════════════════════════════════════════════════════════════
function TaskCard({ task, onClick, stages, depts }) {
  const dept = getDept(task.deptId, depts);
  const ov = isOverdue(task);
  const days = task.dueDate ? Math.ceil((new Date(task.dueDate) - new Date()) / 86400000) : null;
  return (
    <Card hover onClick={onClick} sx={{ padding: "14px 16px", cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, lineHeight: 1.4, flex: 1 }}>{task.title}</div>
        <Badge stage={task.stage} stages={stages} />
      </div>
      {task.description && <div style={{ fontSize: 12, color: T.textMid, marginBottom: 10, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{task.description}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
        {(task.tags || []).map(tg => <span key={tg} style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: T.border, color: T.textMid }}>#{tg}</span>)}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {dept && <span style={{ fontSize: 11, color: dept.color, fontWeight: 700, background: `${dept.color}18`, padding: "2px 7px", borderRadius: 20 }}>{dept.icon}</span>}
          <PBadge priority={task.priority} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {task.assignedTo && <Av userId={task.assignedTo} size={22} />}
          {days !== null && <span style={{ fontSize: 11, fontWeight: 700, color: ov ? T.danger : days <= 2 ? T.warning : T.textLight }}>{ov ? "OVERDUE" : (task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "")}</span>}
        </div>
      </div>
      <div style={{ fontSize: 10, color: T.textLight, fontFamily: T.fontMono, marginTop: 8 }}>Created: {new Date(task.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
      {task.revisionCount > 0 && <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: T.warning, background: T.warningBg, padding: "2px 8px", borderRadius: 4 }}>🔄 {task.revisionCount} revision{task.revisionCount > 1 ? "s" : ""}</div>}
      {task.estimatedHours > 0 && <div style={{ marginTop: 8 }}><Progress value={(task.actualHours / task.estimatedHours) * 100} color={task.actualHours > task.estimatedHours ? T.danger : T.blue} h={4} /><div style={{ fontSize: 9, color: T.textLight, marginTop: 2, fontFamily: T.fontMono }}>{Number(task.actualHours).toFixed(2)}h / {task.estimatedHours}h</div></div>}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CREATE TASK MODAL — FIX #1 (client search), FIX #6 (billing type conditional)
// ═══════════════════════════════════════════════════════════════════════
function CreateTaskModal({ onClose, initialClient = "" }) {
  const { setTasks, currentUser, stages, clients, depts, users, runAutomations } = useApp();
  const [f, setF] = useState({ title: "", description: "", clientId: initialClient, deptId: "", priority: "medium", billingType: "retainer", isBillable: true, estimatedHours: 8, dueDate: dF(14), startDate: dF(0), tags: "" });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const ok = f.title && f.clientId && f.deptId && f.dueDate;

  const create = () => {
    if (!ok) return;

    const dm = users.find(u => u.role === ROLES.DM && (Array.isArray(u.dept) ? u.dept.includes(f.deptId) : u.dept === f.deptId));
    const t = {
      id: uuid(), clientId: f.clientId, deptId: f.deptId, title: f.title, description: f.description,
      stage: "created", priority: f.priority, billingType: f.isBillable ? f.billingType : "internal",
      isBillable: f.isBillable, isInvoiced: false, invoiceId: null, invoiceDate: null, paymentStatus: null,
      estimatedHours: parseFloat(f.estimatedHours) || 0, actualHours: 0, revisionCount: 0, revisionOverheadHours: 0,
      assignedTo: dm?.id || null, createdBy: currentUser.id, dueDate: f.dueDate, completedAt: null,
      createdAt: new Date().toISOString(), tags: f.tags.split(",").map(x => x.trim()).filter(Boolean),
      transitions: [{ from: null, to: "created", actor: currentUser.id, comment: null, ts: new Date().toISOString() }],
    };
    const saveTask = async () => {
      try {
        const docRef = await addDoc(collection(db, "tasks"), t);
        onClose();
        // FIRE AUTOMATION
        runAutomations("task_created", { taskId: docRef.id, task: t });
      } catch (err) {
        console.error("Error adding task: ", err);
        alert("Could not save task to cloud. Please check your Firestore rules.");
      }
    };
    saveTask();
  };

  return (
    <Modal title="Create New Task" onClose={onClose} width={600}>
      <Inp label="Task Title" value={f.title} onChange={v => set("title", v)} required placeholder="What needs to be done?" />
      <Inp label="Description / Brief" value={f.description} onChange={v => set("description", v)} as="textarea" placeholder="Provide detailed context for the team…" />

      {/* FIX #1 — Searchable client dropdown */}
      <ClientSearchSel label="Client" value={f.clientId} onChange={v => set("clientId", v)} clients={clients} required />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Sel label="Department" value={f.deptId} onChange={v => set("deptId", v)} required
          options={(depts || DEPTS_DEFAULT).map(d => ({ value: d.id, label: `${d.icon} ${d.name}` }))} />
        <Sel label="Priority" value={f.priority} onChange={v => set("priority", v)} required
          options={Object.entries(PRIORITY_CFG).map(([k, v]) => ({ value: k, label: v.label }))} />
        <Inp label="Estimated Hours" value={f.estimatedHours} onChange={v => set("estimatedHours", v)} type="number" />
        <Inp label="Due Date" value={f.dueDate} onChange={v => set("dueDate", v)} type="date" required />
      </div>

      {/* FIX #6 — Billable checkbox first, billing type only shows when billable is ticked */}
      <div style={{ padding: "12px 14px", background: T.bg, borderRadius: T.radiusSm, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: f.isBillable ? 14 : 0 }}>
          <input type="checkbox" id="billable" checked={f.isBillable} onChange={e => set("isBillable", e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer", accentColor: T.blue }} />
          <label htmlFor="billable" style={{ fontSize: 13, fontWeight: 700, color: T.text, cursor: "pointer" }}>Billable to client</label>
          {!f.isBillable && <span style={{ fontSize: 11, color: T.textLight, marginLeft: "auto" }}>Internal / non-billable task</span>}
        </div>
        {f.isBillable && (
          <Sel label="Billing Type" value={f.billingType} onChange={v => set("billingType", v)} required
            options={[{ value: "retainer", label: "Retainer" }, { value: "one_time", label: "One-Time" }]} />
        )}
      </div>

      <Inp label="Tags (comma separated)" value={f.tags} onChange={v => set("tags", v)} placeholder="branding, logo, ux" />
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={create} disabled={!ok}>Create Task</Btn>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TASK DETAIL MODAL
// ═══════════════════════════════════════════════════════════════════════
function TaskDetail({ taskId, onClose }) {
  const { openDialog, tasks, stages, depts, clients, users, currentUser, updateTask, doTransition } = useApp();
  const [tab, setTab] = useState("overview");
  const [txnModal, setTxnModal] = useState(null);
  const [logH, setLogH] = useState("");
  const [logN, setLogN] = useState("");

  const task = tasks.find(t => t.id === taskId);
  if (!task) return null;

  const dept = getDept(task.deptId, depts);
  const client = getClient(task.clientId, clients);
  const assignee = getUser(task.assignedTo, users);
  const ov = isOverdue(task);
  const S = stages || STAGES_DEFAULT;

  const available = (TRANSITIONS_DEFAULT[task.stage] || []).filter(tx => tx.roles.includes(currentUser.role));

  const TABS = [
    ["overview", "Overview"],
    ["execution", "Checklist & Subtasks"],
    ["discussion", `Discussion (${task.comments?.length || 0})`],
    ["timeline", `Timeline (${(task.transitions || []).length})`],
    ["history", "Time History"],
    ["billing", "Billing"],
    ["notes", "Notes"]
  ];

  return (
    <Modal title={task.title} onClose={onClose} width={750}>
      <Pipeline currentStage={task.stage} stages={S} />
      <div style={{ height: 1, background: T.border, margin: "14px 0" }} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {[[dept ? `${dept.icon} ${dept.name}` : "—", "Dept", dept?.color || T.textMid],
        [PRIORITY_CFG[task.priority]?.label, "Priority", PRIORITY_CFG[task.priority]?.color],
        [BILLING_CFG[task.billingType]?.label || "—", "Billing", BILLING_CFG[task.billingType]?.color],
        [client?.name || "—", "Client", T.text]].map(([v, l, c]) => (
          <div key={l} style={{ background: T.bg, borderRadius: T.radiusSm, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 2 }}>{l}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, marginBottom: 16, gap: 4, overflowX: "auto" }}>
        {TABS.map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === id ? 800 : 500, fontFamily: T.font, color: tab === id ? T.blue : T.textMid, borderBottom: tab === id ? `2px solid ${T.blue}` : "2px solid transparent", marginBottom: -1, whiteSpace: "nowrap" }}>
            {lbl}
          </button>
        ))}
      </div>

      <div style={{ minHeight: 300 }}>
        {tab === "overview" && (
          <div style={{ animation: "mIn .2s ease" }}>
            {task.description && <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.7, marginBottom: 16, padding: 14, background: T.bg, borderRadius: T.radiusSm }}>{task.description}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 8 }}>Assignee</div>
                {assignee ? <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Av userId={task.assignedTo} size={32} /><div><div style={{ fontSize: 13, fontWeight: 700 }}>{assignee.name}</div><div style={{ fontSize: 11, color: T.textLight }}>{ROLE_LABELS[assignee.role]}</div></div></div> : <span style={{ fontSize: 12, color: T.textLight }}>Unassigned</span>}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 8 }}>Schedule</div>
                <div style={{ fontSize: 12, marginBottom: 2 }}><span style={{ color: T.textLight }}>Start:</span> {task.startDate ? relTime(task.startDate) : "—"}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: ov ? T.danger : T.text }}><span style={{ color: T.textLight }}>Due:</span> {task.dueDate ? relTime(task.dueDate) : "—"}{ov && <span style={{ color: T.danger, marginLeft: 6 }}>OVERDUE</span>}</div>
              </div>
            </div>

            <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 12 }}>Performance & Time</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 14 }}>
                {[["Logged", `${Number(task.actualHours).toFixed(2)}h`, T.blue], ["Estimated", `${task.estimatedHours}h`, T.textMid], ["Delta", `${(task.estimatedHours - task.actualHours).toFixed(2)}h`, task.actualHours > task.estimatedHours ? T.danger : T.success]].map(([l, v, c]) => (
                  <div key={l} style={{ textAlign: "center" }}><div style={{ fontSize: 22, fontWeight: 900, color: c, fontFamily: T.fontMono }}>{v}</div><div style={{ fontSize: 10, color: T.textLight }}>{l}</div></div>
                ))}
              </div>
              <Progress value={(task.actualHours / (task.estimatedHours || 1)) * 100} color={task.actualHours > task.estimatedHours ? T.danger : T.blue} />
              {task.stage === "in_progress" && (
                <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
                  {!task.timerStart ? (
                    <Btn onClick={() => updateTask(task.id, { timerStart: new Date().toISOString() })}>▶ Start Tracking</Btn>
                  ) : (
                    <Btn variant="danger" onClick={() => {
                      const dur = ((new Date() - new Date(task.timerStart)) / 3600000);
                      const entry = { start: task.timerStart, end: new Date().toISOString(), duration: dur, userId: currentUser.id };
                      updateTask(task.id, { actualHours: task.actualHours + dur, timerStart: null, timeLog: [...(task.timeLog || []), entry] });
                    }}>⏹ Stop & Log Session</Btn>
                  )}
                  <div style={{ width: 1, height: 20, background: T.border }} />
                  <input value={logH} onChange={e => setLogH(e.target.value)} type="number" placeholder="Hrs" style={{ width: 60, padding: 8, borderRadius: 4, border: `1px solid ${T.border}` }} />
                  <Btn size="sm" variant="ghost" onClick={() => { const h = parseFloat(logH); if (h) { updateTask(task.id, { actualHours: task.actualHours + h }); setLogH(""); } }}>+ Manual</Btn>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "execution" && (
          <div style={{ animation: "mIn .2s ease" }}>
            <div style={{ background: T.surfaceElev, padding: 16, borderRadius: T.radiusSm, border: `1px solid ${T.border}`, marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>Actionable Checklist</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(task.checklist || []).map((ch, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input type="checkbox" checked={ch.done} onChange={async () => { const n = [...(task.checklist || [])]; n[i].done = !n[i].done; await updateTask(task.id, { checklist: n }); }} />
                    <input value={ch.text} onChange={async (e) => { const n = [...(task.checklist || [])]; n[i].text = e.target.value; await updateTask(task.id, { checklist: n }); }} style={{ flex: 1, background: "none", border: "none", fontSize: 13, outline: "none", textDecoration: ch.done ? "line-through" : "none" }} />
                    <button style={{ background: "none", border: "none", color: T.danger, cursor: "pointer" }} onClick={async () => await updateTask(task.id, { checklist: task.checklist.filter((_, idx) => idx !== i) })}>×</button>
                  </div>
                ))}
                <input placeholder="+ New checklist item..." style={{ marginTop: 8, padding: 8, fontSize: 12, border: `1px solid ${T.border}`, borderRadius: 4 }}
                  onKeyDown={async e => { if (e.key === "Enter" && e.target.value) { await updateTask(task.id, { checklist: [...(task.checklist || []), { text: e.target.value, done: false }] }); e.target.value = ""; } }} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Subtasks (Work Units)</div>
              <Btn size="sm" variant="ghost" onClick={async () => { const t = prompt("Title:"); if (t) await updateTask(task.id, { subtasks: [...(task.subtasks || []), { id: uuid(), title: t, status: "pending", ts: new Date().toISOString() }] }); }}>+ Add</Btn>
            </div>
            {(task.subtasks || []).map((st, i) => (
              <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: T.bg, borderRadius: T.radiusSm, border: `1px solid ${T.border}`, marginBottom: 8 }}>
                <div style={{ flex: 1, fontWeight: 700, fontSize: 13 }}>{st.title}</div>
                <select value={st.status} onChange={async e => { const n = [...task.subtasks]; n[i].status = e.target.value; await updateTask(task.id, { subtasks: n }); }} style={{ padding: 4, borderRadius: 4 }}>
                  <option value="pending">Pending</option>
                  <option value="done">Completed</option>
                </select>
                <Btn size="sm" variant="ghost" onClick={async () => {
                  const nt = { ...task, id: uuid(), title: st.title, subtasks: [], checklist: [], transitions: [], actualHours: 0, timerStart: null, createdAt: new Date().toISOString() };
                  await addDoc(collection(db, "tasks"), nt);
                  await updateTask(task.id, { subtasks: task.subtasks.filter(x => x.id !== st.id) });
                }}>Convert</Btn>
              </div>
            ))}
          </div>
        )}

        {tab === "discussion" && (
          <div style={{ animation: "mIn .2s ease" }}>
            <div style={{ maxHeight: 300, overflowY: "auto", paddingRight: 8, marginBottom: 16 }}>
              {(task.comments || []).map(c => {
                const u = getUser(c.userId, users);
                return (
                  <div key={c.id} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                    <Av userId={c.userId} size={32} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, fontSize: 13 }}>{u?.name || "User"}</span>
                        <span style={{ fontSize: 10, color: T.textLight }}>{relTime(c.ts)}</span>
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.5, color: T.textMid }}>{c.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <input placeholder="Add a comment... (Enter to post)" style={{ width: "100%", padding: 12, border: `1px solid ${T.border}`, borderRadius: T.radiusSm }}
              onKeyDown={async e => { if (e.key === "Enter" && e.target.value) { await updateTask(task.id, { comments: [...(task.comments || []), { id: uuid(), text: e.target.value, userId: currentUser.id, ts: new Date().toISOString() }] }); e.target.value = ""; } }} />
          </div>
        )}

        {tab === "history" && (
          <div style={{ animation: "mIn .2s ease" }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Time Audit Log</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: T.bg, fontSize: 10, color: T.textLight }}>
                <tr><th style={{ padding: 8, textAlign: "left" }}>Member</th><th style={{ padding: 8, textAlign: "left" }}>Session Period</th><th style={{ padding: 8, textAlign: "right" }}>Dur.</th></tr>
              </thead>
              <tbody>
                {(task.timeLog || []).map((l, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, fontSize: 12 }}>
                    <td style={{ padding: 8 }}>{getUser(l.userId, users)?.name.split(" ")[0]}</td>
                    <td style={{ padding: 8, color: T.textMid }}>{new Date(l.start).toLocaleTimeString()} - {new Date(l.end).toLocaleTimeString()}<br /><small>{new Date(l.start).toLocaleDateString()}</small></td>
                    <td style={{ padding: 8, textAlign: "right", fontWeight: 700 }}>{Number(l.duration).toFixed(2)}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "timeline" && (
          <div style={{ animation: "mIn .2s ease" }}>
            {(task.transitions || []).slice().reverse().map((t, i) => {
              const actor = getUser(t.actor, users);
              return (
                <div key={i} style={{ display: "flex", gap: 12, paddingBottom: 16, borderLeft: "2px solid #E2E8F0", marginLeft: 8, paddingLeft: 16, position: "relative" }}>
                  <div style={{ position: "absolute", left: -6, top: 0, width: 10, height: 10, borderRadius: "50%", background: T.blue }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}>
                      {actor?.name || "System"} <span style={{ fontWeight: 400, color: T.textLight }}>{relTime(t.ts)}</span>
                    </div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      Moved from <Badge stage={t.from} /> to <Badge stage={t.to} />
                    </div>
                    {t.comment && <div style={{ fontSize: 12, color: T.textMid, background: T.bg, padding: 8, marginTop: 8, borderRadius: 4, borderLeft: `3px solid ${T.blue}` }}>{t.comment}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "notes" && (
          <div style={{ animation: "mIn .2s ease" }}>
            <textarea placeholder="Private internal notes..." value={task.notes || ""} onChange={async e => await updateTask(task.id, { notes: e.target.value })}
              style={{ width: "100%", height: 300, padding: 16, borderRadius: T.radiusSm, border: `1px solid ${T.border}`, fontSize: 13, lineHeight: 1.6, background: T.surfaceElev }} />
            <div style={{ fontSize: 11, color: T.textLight, marginTop: 8 }}>Changes are saved automatically.</div>
          </div>
        )}

        {tab === "billing" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[["Invoiced", task.isInvoiced ? "Yes" : "No"], ["Total Hours", `${Number(task.actualHours).toFixed(2)}h`], ["Rate Lock", "Standard"]].map(([l, v]) => (
              <Card key={l} sx={{ padding: 12, background: T.bg }}><div style={{ fontSize: 10, fontWeight: 700, color: T.textLight }}>{l}</div><div style={{ fontSize: 15, fontWeight: 800 }}>{v}</div></Card>
            ))}
          </div>
        )}
      </div>

      {task.stage !== "completed" && available.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}`, display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.textLight }}>Transitions:</span>
          {available.map(tx => <Btn key={tx.action} variant={tx.isReject ? "danger" : "primary"} size="sm" onClick={() => setTxnModal(tx)}>{tx.label}</Btn>)}
        </div>
      )}

      {txnModal && <TxnModal task={task} tx={txnModal} onClose={() => setTxnModal(null)} onConfirm={(c, a) => { doTransition(task.id, txnModal, c, a); setTxnModal(null); onClose(); }} />}
    </Modal>
  );
}

function TxnModal({ task, tx, onClose, onConfirm }) {
  const { users } = useApp();
  const [comment, setComment] = useState("");
  const [assignee, setAssignee] = useState("");
  const deptMembers = (users || []).filter(u => u.role === ROLES.TM && (Array.isArray(u.dept) ? u.dept.includes(task.deptId) : u.dept === task.deptId));
  const needsAssign = tx.needsAssignee || (!task.assignedTo && tx.to !== "created");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(13,27,62,.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(4px)" }}>
      <div style={{ background: T.surface, borderRadius: T.radiusLg, width: "100%", maxWidth: 400, padding: 24 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>{tx.label}</div>
        <div style={{ fontSize: 12, color: T.textLight, marginBottom: 16 }}>Confirm stage move to <Badge stage={tx.to} /></div>

        {needsAssign && <Sel label="Assign to Member" value={assignee} onChange={setAssignee} options={deptMembers.map(u => ({ value: u.id, label: u.name }))} required />}
        {tx.needsComment && <Inp label="Reason / Feedback" value={comment} onChange={setComment} as="textarea" placeholder="Minimum 10 characters..." required />}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <Btn variant="secondary" onClick={onClose} full>Cancel</Btn>
          <Btn onClick={() => onConfirm(comment, assignee)} disabled={tx.needsComment && comment.length < 10} full>Confirm</Btn>
        </div>
      </div>
    </div>
  );
}


function ListView({ tasks, onTaskClick, stages, depts }) {
  const { users } = useApp();
  if (!tasks.length) return <div style={{ padding: 40, textAlign: "center", color: T.textLight, fontSize: 13 }}>No tasks match your filters.</div>;
  return (
    <Card sx={{ overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr style={{ background: T.bg }}>
          {["Task", "Client", "Status", "Assigner", "Assignee", "Priority", "Due", "Hours", ""].map(h => (
            <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 800, color: T.textLight, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {tasks.map((t, i) => {
            const dept = getDept(t.deptId, depts), ov = isOverdue(t);
            const days = t.dueDate ? Math.ceil((new Date(t.dueDate) - new Date()) / 86400000) : null;
            return (
              <tr key={t.id} onClick={() => onTaskClick(t.id)} style={{ background: i % 2 === 0 ? T.surface : T.surfaceElev, cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = T.blueLight}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? T.surface : T.surfaceElev}>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{t.title}</div>
                  {dept && <div style={{ fontSize: 11, color: dept.color, fontWeight: 600, marginTop: 2 }}>{dept.icon} {dept.name}</div>}
                </td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 12, color: T.textMid, whiteSpace: "nowrap" }}>{getClient(t.clientId)?.name || "—"}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 12, color: T.textMid, whiteSpace: "nowrap" }}>{new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}><Badge stage={t.stage} stages={stages} /></td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}><PBadge priority={t.priority} /></td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>
                  {t.createdBy ? <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Av userId={t.createdBy} size={22} /><span style={{ fontSize: 11, color: T.textMid }}>{(getUser(t.createdBy, users)?.name || "System").split(" ")[0]}</span></div> : "—"}
                </td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>
                  {t.assignedTo ? <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Av userId={t.assignedTo} size={22} /><span style={{ fontSize: 11, color: T.textMid }}>{(getUser(t.assignedTo, users)?.name || "Unassigned").split(" ")[0]}</span></div> : <span style={{ fontSize: 11, color: T.textLight }}>—</span>}
                </td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: ov ? T.danger : days && days <= 2 ? T.warning : T.textMid, fontFamily: T.fontMono }}>{t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}</span>
                  {ov && <div style={{ fontSize: 9, color: T.danger, fontWeight: 700 }}>OVERDUE</div>}
                </td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 11, color: T.textMid, fontFamily: T.fontMono, whiteSpace: "nowrap" }}>{Number(t.actualHours).toFixed(2)}h/{t.estimatedHours}h</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>{t.revisionCount > 0 && <span style={{ fontSize: 10, color: T.warning, fontWeight: 700, background: T.warningBg, padding: "2px 6px", borderRadius: 10 }}>🔄×{t.revisionCount}</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

function KanbanView({ tasks, onTaskClick, stages, depts }) {
  const { updateTask } = useApp();
  const S = stages || STAGES_DEFAULT;

  const onDragStart = (e, taskId) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const onDrop = (e, stageId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.stage !== stageId) {
        setSelectedTask(taskId);
      }
    }
  };

  return (
    <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12, alignItems: "flex-start" }}>
      {S.map(stage => {
        const st = tasks.filter(t => t.stage === stage.id);
        return (
          <div key={stage.id} onDragOver={onDragOver} onDrop={(e) => onDrop(e, stage.id)} style={{ minWidth: 236, width: 236, flexShrink: 0, minHeight: 400 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "7px 10px", background: stage.bg, borderRadius: T.radiusSm, border: `1px solid ${stage.color}30` }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: stage.color }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: stage.color, flex: 1 }}>{stage.label}</span>
              <span style={{ background: stage.color, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 800, fontFamily: T.fontMono }}>{st.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {st.map(t => (
                <div key={t.id} draggable onDragStart={(e) => onDragStart(e, t.id)} style={{ cursor: "grab" }}>
                  <TaskCard task={t} onClick={() => onTaskClick(t.id)} stages={stages} depts={depts} />
                </div>
              ))}
              {!st.length && <div style={{ fontSize: 11, color: T.textLight, padding: "16px 8px", textAlign: "center", background: T.surface, borderRadius: T.radiusSm, border: `1px dashed ${T.border}` }}>Drop here</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GanttView({ tasks }) {
  const start = new Date("2026-02-01");
  const DW = 26, DAYS = 60;
  const cols = Array.from({ length: DAYS }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  const today = new Date();
  const todayLeft = Math.ceil((today - start) / 86400000) * DW;
  const getLeft = (ds) => Math.max(0, Math.ceil((new Date(ds) - start) / 86400000)) * DW;
  const getW = (est) => Math.max(1, est / 8) * DW;
  return (
    <Card sx={{ overflow: "hidden" }}>
      <div style={{ display: "flex", overflow: "auto" }}>
        <div style={{ width: 220, flexShrink: 0, borderRight: `1px solid ${T.border}` }}>
          <div style={{ height: 40, display: "flex", alignItems: "center", padding: "0 14px", background: T.bg, borderBottom: `1px solid ${T.border}`, fontSize: 11, fontWeight: 800, color: T.textLight, textTransform: "uppercase" }}>Task</div>
          {tasks.slice(0, 14).map((t, i) => {
            const dept = getDept(t.deptId);
            return <div key={t.id} style={{ height: 48, display: "flex", alignItems: "center", padding: "0 14px", borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? T.surface : T.surfaceElev }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                {dept && <div style={{ fontSize: 10, color: dept.color, fontWeight: 600 }}>{dept.icon} {dept.name}</div>}
              </div>
            </div>;
          })}
        </div>
        <div style={{ overflowX: "auto", flex: 1 }}>
          <div style={{ width: DAYS * DW, position: "relative", minWidth: "100%" }}>
            <div style={{ height: 40, display: "flex", borderBottom: `1px solid ${T.border}`, background: T.bg, position: "sticky", top: 0, zIndex: 5 }}>
              {cols.map((d, i) => (
                <div key={i} style={{ width: DW, flexShrink: 0, borderRight: `1px solid ${d.getDay() === 0 ? T.borderDark : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: d.getDay() === 0 || d.getDay() === 6 ? T.danger : T.textLight, fontFamily: T.fontMono, background: d.getDay() === 0 || d.getDay() === 6 ? "rgba(220,38,38,.04)" : T.bg, fontWeight: 600 }}>
                  {i === 0 || d.getDate() === 1 ? d.toLocaleDateString("en", { month: "short" }) : d.getDate() % 5 === 0 ? d.getDate() : ""}
                </div>
              ))}
            </div>
            <div style={{ position: "absolute", left: todayLeft, top: 0, bottom: 0, width: 2, background: T.danger, zIndex: 10, opacity: .7 }} />
            {tasks.slice(0, 14).map((t, i) => {
              const dept = getDept(t.deptId);
              const left = t.dueDate ? getLeft(t.dueDate) - getW(t.estimatedHours) : 0;
              const width = getW(t.estimatedHours);
              const pct = (t.actualHours / t.estimatedHours) * 100;
              return (
                <div key={t.id} style={{ height: 48, borderBottom: `1px solid ${T.border}`, position: "relative", background: i % 2 === 0 ? T.surface : T.surfaceElev }}>
                  {cols.map((d, ci) => <div key={ci} style={{ position: "absolute", left: ci * DW, top: 0, bottom: 0, width: DW, borderRight: `1px solid ${d.getDay() === 0 ? T.borderDark : T.border}`, background: d.getDay() === 0 || d.getDay() === 6 ? "rgba(220,38,38,.025)" : "transparent" }} />)}
                  {t.dueDate && <div style={{ position: "absolute", left: Math.max(0, left), top: 10, height: 28, width: Math.min(width, DAYS * DW - left), background: dept?.color || T.blue, borderRadius: 6, display: "flex", alignItems: "center", overflow: "hidden", zIndex: 1, cursor: "pointer" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, pct)}%`, background: "rgba(255,255,255,.25)", borderRadius: 6 }} />
                    <span style={{ fontSize: 10, color: "#fff", fontWeight: 700, padding: "0 8px", whiteSpace: "nowrap", position: "relative", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</span>
                  </div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

function CalendarView({ tasks }) {
  const [cur, setCur] = useState(new Date());
  const yr = cur.getFullYear(), mo = cur.getMonth();
  const first = new Date(yr, mo, 1).getDay();
  const days = new Date(yr, mo + 1, 0).getDate();
  const byDate = {};
  tasks.forEach(t => { if (t.dueDate) { const d = t.dueDate.slice(0, 10); if (!byDate[d]) byDate[d] = []; byDate[d].push(t); } });
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Card sx={{ overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
        <button onClick={() => setCur(new Date(yr, mo - 1, 1))} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: "4px 10px", cursor: "pointer", fontSize: 14 }}>‹</button>
        <span style={{ fontSize: 15, fontWeight: 800, flex: 1, textAlign: "center" }}>{cur.toLocaleDateString("en", { month: "long", year: "numeric" })}</span>
        <button onClick={() => setCur(new Date(yr, mo + 1, 1))} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: "4px 10px", cursor: "pointer", fontSize: 14 }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: `1px solid ${T.border}` }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d} style={{ padding: "8px 0", textAlign: "center", fontSize: 11, fontWeight: 800, color: T.textLight }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
        {Array.from({ length: first }).map((_, i) => <div key={`e${i}`} style={{ minHeight: 80, borderRight: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, background: "rgba(0,0,0,.015)" }} />)}
        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1;
          const ds = `${yr}-${String(mo + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dt = byDate[ds] || [];
          const isToday = ds === today;
          return (
            <div key={day} style={{ minHeight: 80, padding: 5, borderRight: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, background: isToday ? T.blueLight : "transparent" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: isToday ? T.blue : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? "#fff" : T.textMid, marginBottom: 3 }}>{day}</div>
              {dt.slice(0, 2).map(t => { const dept = getDept(t.deptId); return <div key={t.id} style={{ fontSize: 10, padding: "2px 5px", borderRadius: 3, background: `${dept?.color || T.blue}25`, color: dept?.color || T.blue, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>{t.title}</div>; })}
              {dt.length > 2 && <div style={{ fontSize: 9, color: T.textLight, fontWeight: 600 }}>+{dt.length - 2}</div>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════════

function GlobalTimer() {
  const { tasks, updateTask } = useApp();
  const activeTask = tasks.find(t => t.timerStart);
  const [elapsed, setElapsed] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (!activeTask) return;
    const interval = setInterval(() => {
      const diff = new Date() - new Date(activeTask.timerStart);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTask]);

  if (!activeTask) return null;

  const stopTimer = () => {
    const h = parseFloat(((new Date() - new Date(activeTask.timerStart)) / 3600000).toFixed(2));
    const newEntry = { start: activeTask.timerStart, end: new Date().toISOString(), duration: h, userId: currentUser.id };
    updateTask(activeTask.id, { actualHours: activeTask.actualHours + h, timerStart: null, timeLog: [...(activeTask.timeLog || []), newEntry] });
    setShowPopup(false);
  };

  return (
    <div style={{ position: "fixed", bottom: 20, left: 236, zIndex: 5000 }}>
      <button
        onClick={() => setShowPopup(!showPopup)}
        style={{ background: T.blue, color: "#fff", padding: "10px 18px", borderRadius: 30, border: "none", boxShadow: T.shadowLg, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, animation: "pulse 2s infinite" }}>
        <span style={{ fontSize: 18 }}>⏱</span>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 10, fontWeight: 700, opacity: .8, textTransform: "uppercase" }}>Tracking: {activeTask.title.substring(0, 20)}...</div>
          <div style={{ fontSize: 15, fontWeight: 900, fontFamily: T.fontMono }}>{elapsed}</div>
        </div>
      </button>

      {showPopup && (
        <div style={{ position: "absolute", bottom: 65, left: 0, width: 280, background: T.surface, borderRadius: T.radiusLg, boxShadow: T.shadowLg, padding: 16, border: `1px solid ${T.border}`, animation: "mIn .2s ease" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.textLight, textTransform: "uppercase", marginBottom: 8 }}>Active Timer</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 4 }}>{activeTask.title}</div>
          <div style={{ fontSize: 12, color: T.textMid, marginBottom: 16 }}>Started at {new Date(activeTask.timerStart).toLocaleTimeString()}</div>

          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={stopTimer} sx={{ flex: 1 }}>Stop & Log Time</Btn>
            <Btn variant="secondary" onClick={() => setShowPopup(false)}>Close</Btn>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(37, 99, 235, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
        }
      `}</style>
    </div>
  );
}

function Sidebar({ nav, setNav, currentUser, onLogout }) {
  const { tasks } = useApp();
  const badge = (fn) => tasks.filter(fn).length;
  const items = [
    { id: "dashboard", icon: "▣", label: "Dashboard" },
    { id: "tasks", icon: "☑", label: "Tasks", badge: badge(t => t.stage !== "completed" && (currentUser.role === ROLES.TM ? t.assignedTo === currentUser.id : currentUser.role === ROLES.DM ? t.deptId === currentUser.dept : true)) },
    { id: "clients", icon: "◉", label: "Clients" },
    { id: "billing", icon: "◈", label: "Billing" },
    { id: "reports", icon: "◫", label: "Reports" },
    { id: "audit", icon: "🔒", label: "Audit Log" },
  ];
  if ([ROLES.SA, ROLES.PM].includes(currentUser.role)) items.push({ id: "team", icon: "👤", label: "Team" });
  items.push({ id: "settings", icon: "⚙", label: "Settings" });
  if (currentUser.role === ROLES.TM) { const bIdx = items.findIndex(i => i.id === "billing"); if (bIdx !== -1) items.splice(bIdx, 1); }

  return (
    <div style={{ width: 216, background: T.sidebar, display: "flex", flexDirection: "column", height: "100vh", position: "fixed", left: 0, top: 0, zIndex: 200, flexShrink: 0 }}>
      <div style={{ padding: "20px 16px 14px", borderBottom: `1px solid ${T.sidebarBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {tasks.some(t => t.timerStart) && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />}
          <div style={{ width: 34, height: 34, background: T.blue, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚡</div>
          <div><div style={{ fontSize: 14, fontWeight: 900, color: "#fff", letterSpacing: "-0.4px" }}>WorkflowOS</div><div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", fontWeight: 600 }}>Agency Edition</div></div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
        {items.map(item => {
          const active = nav === item.id;
          return (
            <button key={item.id} onClick={() => setNav(item.id)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer", background: active ? "rgba(255,255,255,.12)" : "transparent", marginBottom: 1, transition: "background .15s", fontFamily: T.font }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, opacity: active ? 1 : .55 }}>{item.icon}</span>
                <span style={{ fontSize: 13, fontWeight: active ? 700 : 400, color: active ? "#fff" : "rgba(255,255,255,.6)" }}>{item.label}</span>
              </div>
              {item.badge > 0 && <span style={{ background: T.danger, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 800, fontFamily: T.fontMono }}>{item.badge}</span>}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: "12px 10px", borderTop: `1px solid ${T.sidebarBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: currentUser.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", border: "2px solid rgba(255,255,255,.2)" }}>{currentUser.av}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.name}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}>{ROLE_LABELS[currentUser.role]}</div>
          </div>
        </div>
        <button onClick={onLogout}
          style={{ width: "100%", padding: "7px", borderRadius: 7, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "rgba(255,255,255,.55)", fontSize: 12, cursor: "pointer", fontFamily: T.font, fontWeight: 600, transition: "all .15s" }}
          onMouseEnter={e => { e.target.style.background = "rgba(220,38,38,.25)"; e.target.style.color = "#fff"; }}
          onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "rgba(255,255,255,.55)"; }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

function TopBar({ title, actions }) {
  return (
    <div style={{ height: 56, background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", padding: "0 24px", gap: 12, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 3px rgba(13,27,62,.05)" }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: T.text, flex: 1, letterSpacing: "-0.4px" }}>{title}</div>
      {actions}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════
function Dashboard({ currentUser, setNav, openTask }) {
  const { openDialog, tasks, stages, clients, depts } = useApp();
  const [view, setView] = useState("kanban");
  const [fStage, setFS] = useState("all");
  const [fDept, setFD] = useState("all");
  const [fPrio, setFP] = useState("all");
  const [fClient, setFC] = useState("all");
  const role = currentUser.role;

  let myTasks = tasks;
  if (role === ROLES.TM) myTasks = tasks.filter(t => t.assignedTo === currentUser.id);
  else if (role === ROLES.DM) myTasks = tasks.filter(t => t.deptId === currentUser.dept);
  else if (role === ROLES.CL) { const cl = (clients || SEED_CLIENTS).find(c => c.portalUser === currentUser.id); myTasks = cl ? tasks.filter(t => t.clientId === cl.id && ["client_review", "completed"].includes(t.stage)) : []; }

  if (fStage !== "all") myTasks = myTasks.filter(t => t.stage === fStage);
  if (fDept !== "all") myTasks = myTasks.filter(t => t.deptId === fDept);
  if (fPrio !== "all") myTasks = myTasks.filter(t => t.priority === fPrio);
  if (fClient !== "all") myTasks = myTasks.filter(t => t.clientId === fClient);


  const stats = {
    active: myTasks.filter(t => !["created", "completed"].includes(t.stage)).length,
    overdue: myTasks.filter(isOverdue).length,
    completed: myTasks.filter(t => t.stage === "completed").length,
    unreviewed: myTasks.filter(t => t.stage === "submitted").length,
    awaitClient: myTasks.filter(t => t.stage === "client_review").length,
    unassigned: myTasks.filter(t => t.stage === "created").length,
    unbilled: tasks.filter(t => t.stage === "completed" && t.isBillable && !t.isInvoiced).length,
    billHours: myTasks.filter(t => t.isBillable).reduce((a, t) => a + t.actualHours, 0),
  };

  const statCards = role === ROLES.SA
    ? [{ label: "Active Tasks", value: stats.active, sub: `${tasks.length} total`, icon: "📋", color: T.blue }, { label: "Overdue", value: stats.overdue, icon: "⏰", color: T.danger, danger: true, sub: "Need attention" }, { label: "Unbilled Completed", value: stats.unbilled, icon: "💰", color: T.warning, danger: true, sub: "Revenue at risk" }, { label: "Billable Hours", value: `${Number(stats.billHours).toFixed(2)}h`, icon: "⏱", color: T.success, sub: "Month to date" }]
    : role === ROLES.PM
      ? [{ label: "Active Tasks", value: stats.active, sub: `${myTasks.length} total`, icon: "📋", color: T.blue }, { label: "Awaiting Client", value: stats.awaitClient, icon: "👤", color: T.warning, danger: true, sub: "Need client decision" }, { label: "Overdue", value: stats.overdue, icon: "⏰", color: T.danger, danger: true, sub: "Past due date" }, { label: "Completed", value: stats.completed, icon: "✅", color: T.success, sub: "All time" }]
      : role === ROLES.DM
        ? [{ label: "Dept Tasks", value: myTasks.length, icon: "🏢", color: T.blue, sub: "Total" }, { label: "Under Review", value: stats.unreviewed, icon: "🔍", color: T.warning, danger: true, sub: "Awaiting review" }, { label: "Unassigned", value: stats.unassigned, icon: "👤", color: T.danger, danger: true, sub: "Need assignment" }, { label: "Completed", value: stats.completed, icon: "✅", color: T.success, sub: "All time" }]
        : role === ROLES.TM
          ? [{ label: "My Tasks", value: myTasks.length, sub: `${stats.active} active`, icon: "📋", color: T.blue }, { label: "Overdue", value: stats.overdue, icon: "⏰", color: T.danger, danger: true, sub: "Attention needed" }, { label: "Completed", value: stats.completed, icon: "✅", color: T.success, sub: "All time" }, { label: "Hours Logged", value: `${Number(myTasks.reduce((a, t) => a + t.actualHours, 0)).toFixed(2)}h`, icon: "⏱", color: T.warning, sub: "Total" }]
          : [{ label: "Awaiting Approval", value: stats.awaitClient, icon: "📋", color: T.blue, sub: "Your deliverables" }, { label: "Completed", value: stats.completed, icon: "✅", color: T.success, sub: "Delivered" }];

  const priorityTasks = (role === ROLES.DM ? myTasks.filter(t => ["submitted", "created"].includes(t.stage)) : role === ROLES.PM ? myTasks.filter(t => ["dept_approved", "client_review"].includes(t.stage)) : role === ROLES.TM ? myTasks.filter(t => t.stage !== "completed") : myTasks.filter(t => isOverdue(t) || ["submitted", "client_review"].includes(t.stage))).slice(0, 6);

  const VIEWS = [["kanban", "⊞ Kanban"], ["list", "☰ List"], ["gantt", "◫ Gantt"], ["calendar", "📅 Calendar"]];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ flexShrink: 0, overflowY: "auto", maxHeight: "40vh", paddingBottom: 10 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: T.text, marginRight: 8 }}>Dashboard Filters</span>
          {[
            { val: fStage, set: setFS, opts: [["all", "All Stages"], ...(stages || STAGES_DEFAULT).map(s => [s.id, s.label])] },
            { val: fDept, set: setFD, opts: [["all", "All Depts"], ...(depts || DEPTS_DEFAULT).map(d => [d.id, `${d.icon} ${d.name}`])] },
            { val: fPrio, set: setFP, opts: [["all", "All Priorities"], ...Object.entries(PRIORITY_CFG).map(([k, v]) => [k, v.label])] },
            { val: fClient, set: setFC, opts: [["all", "All Clients"], ...(clients || SEED_CLIENTS).map(c => [c.id, c.name])] },
          ].map(({ val, set, opts }) => (
            <select key={opts[0][1]} value={val} onChange={e => set(e.target.value)}
              style={{ padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 12, fontFamily: T.font, color: T.text, background: T.surface, outline: "none" }}>
              {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 }}>
          {statCards.map((s, i) => <StatCard key={i} {...s} />)}
        </div>
        {priorityTasks.length > 0 && (
          <Card sx={{ padding: "16px 18px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>⚡ Priority Actions</span>
              <button onClick={() => setNav("tasks")} style={{ fontSize: 12, color: T.blue, background: "none", border: "none", cursor: "pointer", fontFamily: T.font, fontWeight: 700 }}>View all →</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
              {priorityTasks.map(t => (
                <div key={t.id} onClick={() => openTask(t.id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: T.bg, borderRadius: T.radiusSm, cursor: "pointer", border: `1px solid ${T.border}`, transition: "all .15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = T.blue}
                  onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: PRIORITY_CFG[t.priority].color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                    <div style={{ fontSize: 10, color: T.textLight }}>{getClient(t.clientId)?.name}</div>
                  </div>
                  <Badge stage={t.stage} stages={stages} />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 14, paddingTop: 6 }}>
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>Task Views</span>
          <div style={{ display: "flex", gap: 2, background: T.bg, borderRadius: T.radiusSm, border: `1px solid ${T.border}`, padding: 3, marginLeft: 8 }}>
            {VIEWS.map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "6px 13px", borderRadius: 6, border: "none", cursor: "pointer", background: view === v ? T.surface : "transparent", color: view === v ? T.blue : T.textMid, fontSize: 12, fontWeight: 700, fontFamily: T.font, boxShadow: view === v ? T.shadow : "none", transition: "all .15s" }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {view === "list" && <ListView tasks={myTasks} onTaskClick={openTask} stages={stages} depts={depts} />}
          {view === "kanban" && <KanbanView tasks={myTasks} onTaskClick={openTask} stages={stages} depts={depts} />}
          {view === "gantt" && <GanttView tasks={myTasks} />}
          {view === "calendar" && <CalendarView tasks={myTasks} />}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
// BULK UPLOAD MODAL
// ═══════════════════════════════════════════════════════════════════════
function BulkUploadModal({ onClose }) {
  const { setTasks, currentUser, clients, depts } = useApp();
  const [rows, setRows] = useState([{ title: "", clientId: "", deptId: "", priority: "medium" }]);
  const [csvMode, setCsvMode] = useState(false);
  const [csvText, setCsvText] = useState("");

  const addRow = () => setRows([...rows, { title: "", clientId: "", deptId: "", priority: "medium" }]);
  const updateRow = (i, k, v) => setRows(p => p.map((r, idx) => i === idx ? { ...r, [k]: v } : r));
  const removeRow = (i) => setRows(p => p.filter((_, idx) => i !== idx));

  const save = async () => {
    let toAdd = [];
    if (csvMode) {
      const lines = csvText.split("\n").map(l => l.trim()).filter(Boolean);
      lines.slice(1).forEach(l => {
        const [title, clientId, deptId, priority] = l.split(",");
        if (title) toAdd.push({ title, clientId: clientId || (clients || SEED_CLIENTS)[0].id, deptId: deptId || (depts || DEPTS_DEFAULT)[0].id, priority: priority || "medium" });
      });
    } else {
      toAdd = rows.filter(r => r.title && r.clientId && r.deptId);
    }

    if (toAdd.length === 0) return;

    const newTasks = toAdd.map(r => ({
      id: uuid(), clientId: r.clientId, deptId: r.deptId, title: r.title, description: "",
      stage: "created", priority: r.priority, billingType: "retainer",
      isBillable: true, isInvoiced: false, invoiceId: null, invoiceDate: null, paymentStatus: null,
      estimatedHours: 8, actualHours: 0, revisionCount: 0, revisionOverheadHours: 0,
      assignedTo: null, createdBy: currentUser.id, dueDate: dF(14), startDate: dF(0), completedAt: null, subtasks: [], todos: [], comments: [], timerStart: null,
      createdAt: new Date().toISOString(), tags: [],
      transitions: [{ from: null, to: "created", actor: currentUser.id, comment: null, ts: new Date().toISOString() }],
    }));

    newTasks.forEach(async t => await setDoc(doc(db, "tasks", t.id), t));
    onClose();
  };

  return (
    <Modal title="Bulk Upload Tasks" onClose={onClose} width={800}>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <Btn variant={!csvMode ? "primary" : "secondary"} onClick={() => setCsvMode(false)}>Row Entry</Btn>
        <Btn variant={csvMode ? "primary" : "secondary"} onClick={() => setCsvMode(true)}>CSV Import</Btn>
      </div>

      {!csvMode ? (
        <div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
            <thead>
              <tr style={{ background: T.surfaceElev }}>
                <th style={{ padding: 8, textAlign: "left", fontSize: 12 }}>Title</th>
                <th style={{ padding: 8, textAlign: "left", fontSize: 12 }}>Client</th>
                <th style={{ padding: 8, textAlign: "left", fontSize: 12 }}>Dept</th>
                <th style={{ padding: 8, textAlign: "left", fontSize: 12 }}>Priority</th>
                <th style={{ padding: 8 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ padding: "4px 8px" }}><input value={r.title} onChange={e => updateRow(i, "title", e.target.value)} style={{ width: "100%", padding: 6, fontSize: 12 }} placeholder="Task title" /></td>
                  <td style={{ padding: "4px 8px" }}><select value={r.clientId} onChange={e => updateRow(i, "clientId", e.target.value)} style={{ width: "100%", padding: 6, fontSize: 12 }}><option value="">Select</option>{(clients || SEED_CLIENTS).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></td>
                  <td style={{ padding: "4px 8px" }}><select value={r.deptId} onChange={e => updateRow(i, "deptId", e.target.value)} style={{ width: "100%", padding: 6, fontSize: 12 }}><option value="">Select</option>{(depts || DEPTS_DEFAULT).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></td>
                  <td style={{ padding: "4px 8px" }}><select value={r.priority} onChange={e => updateRow(i, "priority", e.target.value)} style={{ width: "100%", padding: 6, fontSize: 12 }}>{Object.entries(PRIORITY_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></td>
                  <td style={{ padding: "4px 8px" }}><button onClick={() => removeRow(i)} style={{ color: T.danger }}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Btn size="sm" variant="outline" onClick={addRow}>+ Add Row</Btn>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 12, marginBottom: 8, color: T.textMid }}>Format: Title, ClientID, DeptID, Priority (e.g. Logo Design, c1, d1, high)</div>
          <Inp as="textarea" rows={10} value={csvText} onChange={setCsvText} placeholder="Title,ClientID,DeptID,Priority\nLogo,c1,d1,high" />
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save}>Bulk Save</Btn>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TASKS PAGE
// ═══════════════════════════════════════════════════════════════════════
function TasksPage({ currentUser, openTask, showCreate, setShowCreate }) {
  const { openDialog, tasks, stages, clients, depts } = useApp();
  const [fStage, setFS] = useState("all");
  const [fDept, setFD] = useState("all");
  const [fPrio, setFP] = useState("all");
  const [fClient, setFC] = useState("all");
  const [search, setSrch] = useState("");
  const [view, setView] = useState("list");
  const [showBulk, setShowBulk] = useState(false);

  let f = tasks;
  if (currentUser.role === ROLES.TM) f = f.filter(t => t.assignedTo === currentUser.id);
  else if (currentUser.role === ROLES.DM) f = f.filter(t => t.deptId === currentUser.dept);
  else if (currentUser.role === ROLES.CL) { const cl = (clients || SEED_CLIENTS).find(c => c.portalUser === currentUser.id); f = cl ? f.filter(t => t.clientId === cl.id) : []; }
  if (fStage !== "all") f = f.filter(t => t.stage === fStage);
  if (fDept !== "all") f = f.filter(t => t.deptId === fDept);
  if (fPrio !== "all") f = f.filter(t => t.priority === fPrio);
  if (fClient !== "all") f = f.filter(t => t.clientId === fClient);
  if (search) f = f.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase()));

  const canCreate = [ROLES.SA, ROLES.PM, ROLES.DM].includes(currentUser.role);
  const S = stages || STAGES_DEFAULT;
  const D = depts || DEPTS_DEFAULT;
  const VIEWS = [["list", "☰ List"], ["kanban", "⊞ Kanban"], ["gantt", "◫ Gantt"], ["calendar", "📅 Calendar"]];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSrch(e.target.value)} placeholder="🔍  Search tasks…"
          style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 13, fontFamily: T.font, color: T.text, width: 200, outline: "none", background: T.surface }} />
        {[
          { val: fStage, set: setFS, opts: [["all", "All Stages"], ...S.map(s => [s.id, s.label])] },
          { val: fDept, set: setFD, opts: [["all", "All Depts"], ...D.map(d => [d.id, `${d.icon} ${d.name}`])] },
          { val: fPrio, set: setFP, opts: [["all", "All Priorities"], ...Object.entries(PRIORITY_CFG).map(([k, v]) => [k, v.label])] },
          { val: fClient, set: setFC, opts: [["all", "All Clients"], ...(clients || SEED_CLIENTS).map(c => [c.id, c.name])] },
        ].map(({ val, set, opts }) => (
          <select key={opts[0][1]} value={val} onChange={e => set(e.target.value)}
            style={{ padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 12, fontFamily: T.font, color: T.text, background: T.surface, outline: "none" }}>
            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 2, background: T.bg, borderRadius: T.radiusSm, border: `1px solid ${T.border}`, padding: 3 }}>
          {VIEWS.map(([v, l]) => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", background: view === v ? T.surface : "transparent", color: view === v ? T.blue : T.textMid, fontSize: 12, fontWeight: 700, fontFamily: T.font, boxShadow: view === v ? T.shadow : "none" }}>{l}</button>
          ))}
        </div>
        {canCreate && <><Btn onClick={() => setShowCreate(true)}>+ New</Btn><Btn variant="outline" onClick={() => setShowBulk(true)}>Bulk Upload</Btn></>}
      </div>
      <div style={{ fontSize: 12, color: T.textLight, marginBottom: 12 }}>Showing <strong style={{ color: T.text }}>{f.length}</strong> tasks</div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {view === "list" && <ListView tasks={f} onTaskClick={openTask} stages={S} depts={D} />}
        {view === "kanban" && <KanbanView tasks={f} onTaskClick={openTask} stages={S} depts={D} />}
        {view === "gantt" && <GanttView tasks={f} />}
        {view === "calendar" && <CalendarView tasks={f} />}
      </div>
      {showBulk && <BulkUploadModal onClose={() => setShowBulk(false)} />}

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CLIENTS PAGE
// ═══════════════════════════════════════════════════════════════════════
function ClientsPage({ openTask, openCreate }) {
  const { openDialog, tasks, clients, setClients, depts } = useApp();
  const [sel, setSel] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [nf, setNF] = useState({ name: "", email: "", billing: "retainer", retainer: "", industry: "", gst: "" });

  if (sel) {
    const cl = (clients || SEED_CLIENTS).find(c => c.id === sel);
    const cTasks = tasks.filter(t => t.clientId === sel);
    const unbilled = cTasks.filter(t => t.stage === "completed" && t.isBillable && !t.isInvoiced).length;
    return (
      <div>
        <button onClick={() => setSel(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.blue, fontSize: 13, fontWeight: 700, marginBottom: 16, fontFamily: T.font }}>← Back to Clients</button>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div><div style={{ fontSize: 22, fontWeight: 900, color: T.text, marginBottom: 4 }}>{cl?.name}</div><div style={{ fontSize: 13, color: T.textMid }}>{cl?.industry} · {cl?.email} · GST: {cl?.gst || "N/A"}</div></div>
          <Btn size="sm" onClick={() => openCreate && openCreate(sel)}>+ Add Task</Btn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20 }}>
          <div><div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>All Tasks</div><ListView tasks={cTasks} onTaskClick={openTask} depts={depts} /></div>
          <div>
            <Card sx={{ padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Pipeline</div>
              {STAGES_DEFAULT.map(s => { const c = cTasks.filter(t => t.stage === s.id).length; return c > 0 ? <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}><Badge stage={s.id} /><span style={{ fontSize: 13, fontWeight: 800, fontFamily: T.fontMono }}>{c}</span></div> : null; })}
            </Card>
            <Card sx={{ padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Billing</div>
              {[["Billable Hours", `${cTasks.filter(t => t.isBillable).reduce((a, t) => a + t.actualHours, 0)}h`, T.blue], ["Unbilled Tasks", unbilled, unbilled > 0 ? T.danger : T.success], ["Completed", cTasks.filter(t => t.stage === "completed").length, T.success]].map(([l, v, c]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 12, color: T.textMid }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: c, fontFamily: T.fontMono }}>{v}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}><Btn onClick={() => setShowAdd(true)}>+ Add Client</Btn></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
        {(clients || SEED_CLIENTS).map(cl => {
          const ct = tasks.filter(t => t.clientId === cl.id);
          const ub = ct.filter(t => t.stage === "completed" && t.isBillable && !t.isInvoiced).length;
          const ov = ct.filter(isOverdue).length;
          return (
            <Card key={cl.id} hover onClick={() => setSel(cl.id)} sx={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 3 }}>{cl.name}</div>
                  <div style={{ fontSize: 12, color: T.textMid }}>{cl.industry} {cl.mobile ? `· ${cl.mobile}` : ""} {cl.email ? `· ${cl.email}` : ""}</div>
                  {cl.gst && <div style={{ fontSize: 11, color: T.textLight, fontFamily: T.fontMono, marginTop: 2 }}>GST: {cl.gst}</div>}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={(e) => { e.stopPropagation(); if (window.confirm("Delete client?")) deleteDoc(doc(db, "clients", cl.id)); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>🗑️</button>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: T.blueLight, color: T.blue, flexShrink: 0 }}>{BILLING_CFG[cl.billing]?.label}</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
                {[["Tasks", ct.length, T.textMid], ["Done", ct.filter(t => t.stage === "completed").length, T.success], ["Overdue", ov, ov > 0 ? T.danger : T.textMid], ["Unbilled", ub, ub > 0 ? T.warning : T.textMid]].map(([l, v, c]) => (
                  <div key={l} style={{ textAlign: "center", background: T.bg, borderRadius: T.radiusSm, padding: 8 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: c, fontFamily: T.fontMono }}>{v}</div>
                    <div style={{ fontSize: 9, color: T.textLight, textTransform: "uppercase", fontWeight: 700 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: T.textMid }}>{cl.retainer > 0 ? `Retainer: ${INR(cl.retainer)}/mo` : "One-time billing"}</div>
            </Card>
          );
        })}
      </div>
      {showAdd && (
        <Modal title="Add New Client" onClose={() => setShowAdd(false)}>
          <Inp label="Client Name" value={nf.name} onChange={v => setNF(p => ({ ...p, name: v }))} required />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="Mobile Number" value={nf.mobile} onChange={v => setNF(p => ({ ...p, mobile: v }))} required />
            <Inp label="Email (Optional)" value={nf.email} onChange={v => setNF(p => ({ ...p, email: v }))} type="email" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Sel label="Billing Type" value={nf.billing} onChange={v => setNF(p => ({ ...p, billing: v }))} required options={Object.entries(BILLING_CFG).map(([k, v]) => ({ value: k, label: v.label }))} />
            <Inp label="Industry" value={nf.industry} onChange={v => setNF(p => ({ ...p, industry: v }))} />
            <Inp label="Monthly Retainer (₹)" value={nf.retainer} onChange={v => setNF(p => ({ ...p, retainer: v }))} type="number" />

          </div>
          <Inp label="GST Number" value={nf.gst} onChange={v => setNF(p => ({ ...p, gst: v }))} placeholder="27AABCT1234A1Z5" />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Btn>
            <Btn onClick={async () => { if (nf.name) { await addDoc(collection(db, "clients"), { ...nf, retainer: parseFloat(nf.retainer) || 0, createdAt: new Date().toISOString() }); setNF({ name: "", email: "", mobile: "", billing: "retainer", retainer: 0, industry: "", gst: "" }); setShowAdd(false); } }} disabled={!nf.name}>Add Client</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// BILLING PAGE
// ═══════════════════════════════════════════════════════════════════════

function BillingPage() {
  const { openDialog, tasks, setTasks, invoices, setInvoices, clients, depts } = useApp();
  const [tab, setTab] = useState("overview");
  const D = depts || DEPTS_DEFAULT;
  const unbilled = tasks.filter(t => t.stage === "completed" && t.isBillable && !t.isInvoiced);

  const generateInvoice = async (clientId) => {
    const clientUnbilled = unbilled.filter(t => t.clientId === clientId);
    if (!clientUnbilled.length) return;
    const amount = clientUnbilled.reduce((a, t) => a + (t.actualHours * 1000), 0); // Mock rate 1000/hr
    const newInv = { id: uuid(), number: "INV-" + Math.floor(Math.random() * 10000), clientId, amount: amount || 5000, status: "sent", issuedDate: dF(0), dueDate: dF(14), paidDate: null, taskIds: clientUnbilled.map(t => t.id) };
    await addDoc(collection(db, "invoices"), newInv);
    clientUnbilled.forEach(async t => await updateDoc(doc(db, "tasks", t.id), { isInvoiced: true, invoiceId: newInv.id }));
  };

  const markPaid = async (id) => {
    await updateDoc(doc(db, "invoices", id), { status: "paid", paidDate: dF(0) });
  };

  const totalRev = invoices.filter(i => i.status === "paid").reduce((a, i) => a + i.amount, 0);
  const outstanding = invoices.filter(i => ["sent", "overdue"].includes(i.status)).reduce((a, i) => a + i.amount, 0);
  const billH = tasks.filter(t => t.isBillable).reduce((a, t) => a + t.actualHours, 0);
  const nonBillH = tasks.filter(t => !t.isBillable).reduce((a, t) => a + t.actualHours, 0);
  const TABS = [["overview", "Overview"], ["execution", "Checklist & Subtasks"], ["unbilled", `Unbilled (${unbilled.length})`], ["invoices", `Invoices (${invoices.length})`], ["hours", "Hours Report"]];


  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard label="Revenue Collected" value={INR(totalRev)} icon="💰" color={T.success} sub="Paid invoices" />
        <StatCard label="Outstanding" value={INR(outstanding)} icon="📤" color={T.warning} sub="Awaiting payment" />
        <StatCard label="Billable Hours" value={`${Number(billH).toFixed(2)}h`} icon="⏱" color={T.blue} sub="Total logged" />
        <StatCard label="Revenue at Risk" value={unbilled.length} icon="⚠" color={T.danger} danger sub="Unbilled completed" />
      </div>
      <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, marginBottom: 20 }}>
        {TABS.map(([id, lbl]) => <button key={id} onClick={() => setTab(id)} style={{ padding: "9px 18px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === id ? 800 : 500, fontFamily: T.font, color: tab === id ? T.blue : T.textMid, borderBottom: tab === id ? `2px solid ${T.blue}` : "2px solid transparent", marginBottom: -1 }}>{lbl}</button>)}
      </div>
      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card sx={{ padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 14 }}>Billing by Client</div>
            {(clients || SEED_CLIENTS).map(cl => {
              const ct = tasks.filter(t => t.clientId === cl.id);
              const bh = ct.filter(t => t.isBillable).reduce((a, t) => a + t.actualHours, 0);
              const ub = ct.filter(t => t.stage === "completed" && t.isBillable && !t.isInvoiced).length;
              return (
                <div key={cl.id} style={{ padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{cl.name}</span>
                    <span style={{ fontSize: 12, color: T.blue, fontFamily: T.fontMono, fontWeight: 800 }}>{Number(bh).toFixed(2)}h billed</span>
                  </div>
                  {cl.retainer > 0 && <div style={{ fontSize: 11, color: T.textMid }}>Retainer: {INR(cl.retainer)}/mo</div>}
                  {ub > 0 && <div style={{ fontSize: 11, color: T.warning, fontWeight: 700 }}>⚠ {ub} task{ub > 1 ? "s" : ""} unbilled</div>}
                </div>
              );
            })}
          </Card>
          <Card sx={{ padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 14 }}>Hours by Department</div>
            {D.map(d => {
              const h = tasks.filter(t => t.deptId === d.id && t.isBillable).reduce((a, t) => a + t.actualHours, 0);
              const pct = billH > 0 ? (h / billH) * 100 : 0;
              return (
                <div key={d.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: T.text, fontWeight: 700 }}>{d.icon} {d.name}</span>
                    <span style={{ color: T.blue, fontFamily: T.fontMono, fontWeight: 800 }}>{Number(h).toFixed(2)}h ({Math.round(pct)}%)</span>
                  </div>
                  <Progress value={pct} color={d.color} />
                </div>
              );
            })}
          </Card>
        </div>
      )}
      {tab === "unbilled" && (
        unbilled.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: T.textLight }}>✅ No revenue leakage — all completed billable tasks are invoiced.</div> : (
          <Card>
            <div style={{ padding: "12px 16px", background: "#FEF9C3", borderBottom: `1px solid ${T.border}`, fontSize: 12, fontWeight: 700, color: T.warning }}>⚠ {unbilled.length} completed billable task{unbilled.length > 1 ? "s" : ""} not yet invoiced</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: T.bg }}>{["Task", "Client", "Completed", "Hours", "Billing", "Action"].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 800, color: T.textLight, textTransform: "uppercase", borderBottom: `1px solid ${T.border}` }}>{h}</th>)}</tr></thead>
              <tbody>
                {unbilled.map((t, i) => (
                  <tr key={t.id} style={{ background: i % 2 === 0 ? T.surface : T.surfaceElev }}>
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 13, fontWeight: 700, color: T.text }}>{t.title}</td>
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 12, color: T.textMid }}>{getClient(t.clientId)?.name}</td>
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 12, color: T.textMid }}>{relTime(t.completedAt)}</td>
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 12, fontFamily: T.fontMono, fontWeight: 800, color: T.blue }}>{t.estimatedHours}h</td>
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${T.border}` }}><span style={{ fontSize: 11, fontWeight: 700, color: BILLING_CFG[t.billingType]?.color }}>{BILLING_CFG[t.billingType]?.label}</span></td>
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${T.border}` }}><Btn size="sm" onClick={() => generateInvoice(t.clientId)}>Gen Invoice</Btn></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}
      {tab === "invoices" && (
        <Card sx={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: T.bg }}>{["Invoice #", "Client", "Amount (₹)", "Status", "Issued", "Due", "Paid"].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 800, color: T.textLight, textTransform: "uppercase", borderBottom: `1px solid ${T.border}` }}>{h}</th>)}</tr></thead>
            <tbody>
              {invoices.map((inv, i) => {
                const sc = { paid: [T.success, T.successBg], sent: [T.blue, T.blueLight], overdue: [T.danger, T.dangerBg], draft: [T.textMid, T.bg] };
                const [c, bg] = sc[inv.status] || [T.textMid, T.bg];
                return (
                  <tr key={inv.id} style={{ background: i % 2 === 0 ? T.surface : T.surfaceElev }}>
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 13, fontWeight: 800, color: T.blue, fontFamily: T.fontMono }}>{inv.number}</td>
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 12, fontWeight: 700, color: T.text }}>{getClient(inv.clientId)?.name}</td>
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 14, fontWeight: 900, color: T.text, fontFamily: T.fontMono }}>{INR(inv.amount)}</td>
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${T.border}` }}><span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: bg, color: c, textTransform: "capitalize" }}>{inv.status}</span></td>
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 11, color: T.textMid }}>{inv.issuedDate}</td>
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 11, color: T.textMid }}>{inv.dueDate}</td>
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 11, color: inv.paidDate ? T.success : T.textLight }}>{inv.paidDate || (!["paid"].includes(inv.status) ? <Btn size="sm" variant="outline" onClick={() => markPaid(inv.id)}>Mark Paid</Btn> : "—")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
      {tab === "hours" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card sx={{ padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 14 }}>Hours Summary</div>
            {[["Billable", billH, T.blue], ["Non-Billable", nonBillH, T.textMid]].map(([l, v, c]) => (
              <div key={l} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ fontSize: 12, color: T.textMid }}>{l}</span><span style={{ fontSize: 16, fontWeight: 900, color: c, fontFamily: T.fontMono }}>{Number(v).toFixed(2)}h</span></div>
                <Progress value={(v / (billH + nonBillH || 1)) * 100} color={c} />
              </div>
            ))}
            <div style={{ marginTop: 10, padding: 10, background: T.bg, borderRadius: T.radiusSm, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: T.textMid }}>Billable Ratio</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: T.success, fontFamily: T.fontMono }}>{Math.round((billH / (billH + nonBillH || 1)) * 100)}%</span>
            </div>
          </Card>
          <Card sx={{ padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 14 }}>By Team Member</div>
            {SEED_USERS.filter(u => u.role === ROLES.TM).map(u => {
              const ut = tasks.filter(t => t.assignedTo === u.id);
              const h = ut.reduce((a, t) => a + t.actualHours, 0);
              const bh = ut.filter(t => t.isBillable).reduce((a, t) => a + t.actualHours, 0);
              return (
                <div key={u.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <Av userId={u.id} size={22} /><span style={{ fontSize: 12, fontWeight: 700, color: T.text, flex: 1 }}>{u.name}</span>
                    <span style={{ fontSize: 11, color: T.blue, fontFamily: T.fontMono, fontWeight: 800 }}>{Number(bh).toFixed(2)}h</span>
                    <span style={{ fontSize: 11, color: T.textLight, fontFamily: T.fontMono }}>{Number(h).toFixed(2)}h total</span>
                  </div>
                  <Progress value={h > 0 ? (bh / h) * 100 : 0} color={u.color} h={4} />
                </div>
              );
            })}
          </Card>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// REPORTS PAGE
// ═══════════════════════════════════════════════════════════════════════
function ReportsPage() {
  const { openDialog, tasks, clients, depts } = useApp();
  const [tab, setTab] = useState("overview");
  const [fc, setFc] = useState("all");
  const [cMetric, setCMetric] = useState("time");
  const [cGroup, setCGroup] = useState("client");

  const D = depts || DEPTS_DEFAULT;
  let f = fc === "all" ? tasks : tasks.filter(t => t.clientId === fc);
  const done = f.filter(t => t.stage === "completed").length;
  const total = f.length;

  const getCustomReport = () => {
    let groups = {};
    f.forEach(t => {
      let gId = cGroup === "client" ? getClient(t.clientId)?.name : cGroup === "dept" ? getDept(t.deptId, D)?.name : t.stage;
      if (!gId) gId = "Unknown";
      if (!groups[gId]) groups[gId] = { total: 0, val: 0, count: 0 };
      groups[gId].total++;
      if (cMetric === "time") groups[gId].val += t.actualHours;
      if (cMetric === "revisions") groups[gId].val += t.revisionCount;
      if (cMetric === "tasks") groups[gId].val++;
    });
    return Object.entries(groups).map(([k, v]) => ({ label: k, ...v }));
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 16, borderBottom: `1px solid ${T.border}`, marginBottom: 20 }}>
        {["overview", "custom"].map(id => <button key={id} onClick={() => setTab(id)} style={{ padding: "9px 18px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === id ? 800 : 500, fontFamily: T.font, color: tab === id ? T.blue : T.textMid, borderBottom: tab === id ? `2px solid ${T.blue}` : "2px solid transparent", textTransform: "capitalize", marginBottom: -1 }}>{id} Report</button>)}
      </div>

      {tab === "overview" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center" }}>
            <select value={fc} onChange={e => setFc(e.target.value)} style={{ padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 12, fontFamily: T.font, background: T.surface, outline: "none" }}>
              <option value="all">All Clients Filter</option>
              {(clients || SEED_CLIENTS).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div style={{ flex: 1 }} />
            <Btn variant="secondary" size="sm">📥 PDF</Btn>
            <Btn variant="secondary" size="sm">📊 Excel</Btn>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
            <StatCard label="Completion Rate" value={`${total > 0 ? Math.round((done / total) * 100) : 0}%`} icon="✅" color={T.success} sub={`${done}/${total} tasks`} />
            <StatCard label="Avg Revisions" value={(total > 0 ? f.reduce((a, t) => a + t.revisionCount, 0) / total : 0).toFixed(1)} icon="🔄" color={T.warning} sub="Per task" />
            <StatCard label="Billable Hours" value={`${Number(f.filter(t => t.isBillable).reduce((a, t) => a + t.actualHours, 0)).toFixed(2)}h`} icon="⏱" color={T.blue} sub="Total logged" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card sx={{ padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 14 }}>Department Performance</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Dept", "Total", "Done", "Revisions", "Hours"].map(h => <th key={h} style={{ padding: "7px 8px", textAlign: "left", fontSize: 10, fontWeight: 800, color: T.textLight, textTransform: "uppercase", borderBottom: `1px solid ${T.border}` }}>{h}</th>)}</tr></thead>
                <tbody>{D.map((d, i) => {
                  const dt = f.filter(t => t.deptId === d.id);
                  if (!dt.length) return null;
                  return <tr key={d.id} style={{ background: i % 2 === 0 ? T.surface : T.surfaceElev }}>
                    <td style={{ padding: "9px 8px", borderBottom: `1px solid ${T.border}`, fontSize: 12, fontWeight: 700, color: d.color }}>{d.icon} {d.name}</td>
                    <td style={{ padding: "9px 8px", borderBottom: `1px solid ${T.border}`, fontSize: 12, fontFamily: T.fontMono, fontWeight: 800 }}>{dt.length}</td>
                    <td style={{ padding: "9px 8px", borderBottom: `1px solid ${T.border}`, fontSize: 12, color: T.success, fontWeight: 700 }}>{dt.filter(t => t.stage === "completed").length}</td>
                    <td style={{ padding: "9px 8px", borderBottom: `1px solid ${T.border}`, fontSize: 12, color: T.warning, fontWeight: 700 }}>{dt.reduce((a, t) => a + t.revisionCount, 0)}</td>
                    <td style={{ padding: "9px 8px", borderBottom: `1px solid ${T.border}`, fontSize: 12, color: T.blue, fontFamily: T.fontMono, fontWeight: 700 }}>{dt.reduce((a, t) => a + t.actualHours, 0).toFixed(2)}h</td>
                  </tr>;
                })}</tbody>
              </table>
            </Card>
            <Card sx={{ padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 14 }}>Stage Distribution</div>
              {STAGES_DEFAULT.map(s => { const c = f.filter(t => t.stage === s.id).length; const pct = total > 0 ? (c / total) * 100 : 0; return (<div key={s.id} style={{ marginBottom: 10 }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}><Badge stage={s.id} /><span style={{ fontSize: 12, fontFamily: T.fontMono, fontWeight: 800, color: T.text }}>{c} ({Math.round(pct)}%)</span></div><Progress value={pct} color={s.color} /></div>); })}
            </Card>
          </div>
        </>
      )}

      {tab === "custom" && (
        <Card sx={{ padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>Custom Data Builder</div>
          <div style={{ display: "flex", gap: 14, marginBottom: 24, padding: 14, background: T.bg, borderRadius: T.radiusSm }}>
            <Sel label="Metric to Measure" value={cMetric} onChange={setCMetric} options={[{ value: "time", label: "Hours Spent" }, { value: "revisions", label: "Revision Count" }, { value: "tasks", label: "Task Volume" }]} />
            <Sel label="Group By" value={cGroup} onChange={setCGroup} options={[{ value: "client", label: "Client" }, { value: "dept", label: "Department" }, { value: "stage", label: "Workflow Stage" }]} />
            <Btn sx={{ alignSelf: "flex-end" }} onClick={() => { }}>Generate Report</Btn>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: T.bg }}>{["Group", "Metric Volume", "Percentage"].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 800, color: T.textLight, textTransform: "uppercase", borderBottom: `1px solid ${T.border}` }}>{h}</th>)}</tr></thead>
            <tbody>
              {getCustomReport().map((r, i) => {
                const totalMetric = getCustomReport().reduce((a, x) => a + x.val, 0);
                const pct = totalMetric > 0 ? (r.val / totalMetric) * 100 : 0;
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? T.surface : T.surfaceElev }}>
                    <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 13, fontWeight: 700, color: T.text }}>{r.label}</td>
                    <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 14, fontWeight: 800, color: T.blue, fontFamily: T.fontMono }}>{Number(r.val).toFixed(2)} {cMetric === "time" ? "hrs" : ""}</td>
                    <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {tasks.some(t => t.timerStart) && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />}
                        <span style={{ fontSize: 12, fontWeight: 700, width: 34 }}>{Math.round(pct)}%</span>
                        <Progress value={pct} color={Object.values(PRIORITY_CFG)[i % 3].color} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════
function AuditPage() {
  const { openDialog, tasks, depts } = useApp();
  const [fActor, setFA] = useState("all");
  const [fDept, setFD] = useState("all");
  const [fAction, setFAct] = useState("all");

  const events = [];
  tasks.forEach(t => t.transitions.forEach(tr => events.push({ taskId: t.id, taskTitle: t.title, actor: tr.actor, from: tr.from, to: tr.to, isRejection: !!tr.isRejection, comment: tr.comment, ts: tr.ts, deptId: t.deptId, clientId: t.clientId })));
  events.sort((a, b) => new Date(b.ts) - new Date(a.ts));

  let f = events;
  if (fActor !== "all") f = f.filter(e => e.actor === fActor);
  if (fDept !== "all") f = f.filter(e => e.deptId === fDept);
  if (fAction === "rejection") f = f.filter(e => e.isRejection);
  if (fAction === "creation") f = f.filter(e => !e.from);
  if (fAction === "stage") f = f.filter(e => e.from && !e.isRejection);

  const actors = Array.from(new Set(events.map(e => e.actor))).filter(Boolean);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <select value={fActor} onChange={e => setFA(e.target.value)} style={{ padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 12, fontFamily: T.font, outline: "none" }}>
          <option value="all">All Members</option>
          {actors.map(a => <option key={a} value={a}>{getUser(a, typeof useApp === "function" ? useApp()?.users : null)?.name || a}</option>)}
        </select>
        <select value={fDept} onChange={e => setFD(e.target.value)} style={{ padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 12, fontFamily: T.font, outline: "none" }}>
          <option value="all">All Departments</option>
          {(depts || DEPTS_DEFAULT).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={fAction} onChange={e => setFAct(e.target.value)} style={{ padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 12, fontFamily: T.font, outline: "none" }}>
          <option value="all">All Actions</option>
          <option value="creation">Task Created</option>
          <option value="stage">Stage Changed</option>
          <option value="rejection">Revision Requested</option>
        </select>
      </div>
      <Card sx={{ overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", background: T.surfaceElev, borderBottom: `1px solid ${T.border}`, fontSize: 12, color: T.textMid, fontWeight: 600 }}>🔒 Append-only audit log — all actions recorded with actor, timestamp, and payload</div>
        {f.slice(0, 100).map((e, i) => {
          const actor = getUser(e.actor, typeof useApp === "function" ? useApp()?.users : null), dept = getDept(e.deptId, depts), cl = getClient(e.clientId);
          const theDate = new Date(e.ts);
          return (
            <div key={i} style={{ display: "flex", gap: 14, padding: "12px 16px", borderBottom: `1px solid ${T.border}`, background: e.isRejection ? "#FFF8F8" : T.surface }}>
              {actor && <Av userId={e.actor} size={28} />}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{actor?.name || "System"}</span>
                  <span style={{ fontSize: 10, color: T.textLight, fontFamily: T.fontMono }}>{theDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                  {e.isRejection && <span style={{ fontSize: 10, fontWeight: 800, color: T.danger, background: T.dangerBg, padding: "1px 7px", borderRadius: 10 }}>REVISION REQUESTED</span>}
                  {dept && <span style={{ fontSize: 10, color: dept.color, fontWeight: 700, background: `${dept.color}18`, padding: "1px 7px", borderRadius: 10 }}>{dept.icon} {dept.name}</span>}
                  {cl && <span style={{ fontSize: 10, color: T.textLight }}>· {cl.name}</span>}
                </div>
                <div style={{ fontSize: 12, color: T.textMid }}><strong style={{ color: T.text }}>{e.taskTitle}</strong> — {e.from ? <span>moved to <Badge stage={e.to} /></span> : <span>created as <Badge stage={e.to} /></span>}</div>
                {e.comment && <div style={{ marginTop: 5, padding: "6px 10px", background: e.isRejection ? T.dangerBg : T.blueLight, borderRadius: T.radiusSm, fontSize: 11, color: T.textMid, borderLeft: `3px solid ${e.isRejection ? T.danger : T.blue}` }}>{e.comment}</div>}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TEAM PAGE
// ═══════════════════════════════════════════════════════════════════════
function BulkUserModal({ onClose }) {
  const { users, depts, setUsers } = useApp();
  const [text, setText] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    setLoading(true);
    setError(null);
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const newUsers = [];

    for (const line of lines) {
      const parts = line.split(",").map(s => s.trim());
      const [name, email, roleKey, deptName] = parts;

      if (!name || !email || !roleKey) {
        setError(`Invalid line: "${line}". Expected format: Name, Email, Role, [Department]`);
        setLoading(false);
        return;
      }

      const role = ROLES[roleKey.toUpperCase()] || roleKey;
      const dept = depts.find(d => d.name.toLowerCase() === deptName?.toLowerCase())?.id || null;

      newUsers.push({
        id: uuid(),
        name,
        email,
        role,
        dept,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
        av: name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
        password: "Sbbs@123",
        createdAt: new Date().toISOString()
      });
    }

    try {
      for (const u of newUsers) {
        await setDoc(doc(db, "users", u.id), u);
      }
      setLoading(false);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to upload users: " + err.message);
      setLoading(false);
    }
  };

  return (
    <Modal title="Bulk Upload Users" onClose={onClose} width={500}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: T.textLight, marginBottom: 10, padding: 10, background: T.bg, borderRadius: T.radiusSm }}>
          <strong>Format:</strong> <code>Name, Email, Role, Department</code> (one per line)<br />
          <strong>Roles:</strong> PM (Project Manager), DM (Dept Manager), M (Member), CL (Client), SA (Super Admin)<br />
          <strong>Example:</strong> <code>John Doe, john@sbbs.com, M, Design</code>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          style={{ width: "100%", height: 200, padding: 10, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontFamily: T.fontMono, fontSize: 12, outline: "none", background: T.surface }}
          placeholder="Name, Email, Role, Dept..."
        />
      </div>
      {error && <div style={{ color: T.danger, fontSize: 12, marginBottom: 10, fontWeight: 700 }}>⚠️ {error}</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn variant="secondary" onClick={onClose} disabled={loading}>Cancel</Btn>
        <Btn onClick={handleUpload} disabled={loading || !text.trim()}>
          {loading ? "Uploading..." : `Upload ${text.split("\n").filter(l => l.trim()).length} Users`}
        </Btn>
      </div>
    </Modal>
  );
}

function TeamPage() {
  const { openDialog, tasks, depts, users, setUsers } = useApp();
  const [showInvite, setShowInvite] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", role: "", dept: [], password: "Sbbs@123" });

  const openInvite = () => { setForm({ name: "", email: "", role: "", dept: [], password: "Sbbs@123" }); setEditingUser(null); setShowInvite(true); };
  const openEdit = (u) => { setForm({ name: u.name, email: u.email, role: u.role, dept: Array.isArray(u.dept) ? u.dept : (u.dept ? [u.dept] : []), password: u.password || "" }); setEditingUser(u); setShowInvite(true); };

  const save = async () => {
    if (!form.name || !form.email || !form.role) return;
    if (editingUser) {
      await updateDoc(doc(db, "users", editingUser.id), { ...form, av: form.name.substring(0, 2).toUpperCase() });
    } else {
      await addDoc(collection(db, "users"), { id: uuid(), ...form, av: form.name.substring(0, 2).toUpperCase(), color: "#4F46E5", createdAt: new Date().toISOString() });
    }
    setShowInvite(false);
  };

  const showDept = ![ROLES.SA, ROLES.PM].includes(form.role);

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 16 }}>
        <Btn variant="secondary" onClick={() => setShowBulk(true)}>Bulk Upload</Btn>
        <Btn onClick={openInvite}>+ Invite Member</Btn>
      </div>
      {showBulk && <BulkUserModal onClose={() => setShowBulk(false)} />}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
        {(users || SEED_USERS).filter(u => u.role !== ROLES.CL).map(u => {
          const ut = tasks.filter(t => t.assignedTo === u.id);
          const active = ut.filter(t => !["created", "completed"].includes(t.stage));
          const done = ut.filter(t => t.stage === "completed");
          const ov = ut.filter(isOverdue);
          const h = ut.reduce((a, t) => a + t.actualHours, 0);
          const dept = getDept(u.dept, depts);
          return (
            <Card key={u.id} sx={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: u.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff", border: "3px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,.15)" }}>{u.av}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{u.name}</div><div style={{ fontSize: 11, color: T.textMid }}>{ROLE_LABELS[u.role]}</div>{dept && <div style={{ fontSize: 10, color: dept.color, fontWeight: 700 }}>{dept.icon} {dept.name}</div>}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: T.successBg, color: T.success }}>Active</span><Btn size="sm" variant="ghost" onClick={() => openEdit(u)}>Edit</Btn><Btn size="sm" variant="ghost" sx={{ color: T.danger }} onClick={async () => { const pw = prompt("New password for " + u.name); if (pw) await updateDoc(doc(db, "users", u.id), { password: pw }); }}>Reset Pwd</Btn><Btn size="sm" variant="danger" onClick={async () => { const pw = prompt("New password for " + u.name); if (pw) await updateDoc(doc(db, "users", u.id), { password: pw }); }}>Reset Pwd</Btn></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                {[["Active", active.length, T.blue], ["Done", done.length, T.success], ["Overdue", ov.length, ov.length > 0 ? T.danger : T.textMid], ["Hours", `${Number(h).toFixed(2)}h`, T.warning]].map(([l, v, c]) => (
                  <div key={l} style={{ textAlign: "center", background: T.bg, borderRadius: T.radiusSm, padding: "8px 4px" }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: c, fontFamily: T.fontMono }}>{v}</div>
                    <div style={{ fontSize: 9, color: T.textLight, textTransform: "uppercase", fontWeight: 700 }}>{l}</div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
      {showInvite && (
        <Modal title={editingUser ? "Edit Member" : "Invite Team Member"} onClose={() => setShowInvite(false)}>
          <Inp label="Full Name" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} required />
          <Inp label="Email" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} type="email" required />
          <Sel label="Role" value={form.role} onChange={v => setForm(p => ({ ...p, role: v }))} required options={Object.entries(ROLE_LABELS).filter(([k]) => k !== ROLES.CL).map(([k, v]) => ({ value: k, label: v }))} />
          {showDept && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.textMid, display: "block", marginBottom: 5 }}>Departments (Ctrl/Cmd-click to select multiple)</label>
              <select multiple value={form.dept} onChange={e => setForm(p => ({ ...p, dept: Array.from(e.target.selectedOptions, o => o.value) }))} style={{ width: "100%", padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 13, fontFamily: T.font, outline: "none", minHeight: 100 }}>
                {(depts || DEPTS_DEFAULT).map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
              </select>
            </div>
          )}
          <Inp label="Login Password" value={form.password} onChange={v => setForm(p => ({ ...p, password: v }))} required />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setShowInvite(false)}>Cancel</Btn>
            <Btn onClick={save} disabled={!form.name || !form.email || !form.role}>{editingUser ? "Save Changes" : "Send Invite"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SETTINGS PAGE — FIX #4 (dept CRUD) + FIX #5 (stage edit)
// ═══════════════════════════════════════════════════════════════════════
function SettingsPage() {
  const { openDialog, tasks, stages, depts, users, currentUser, updateTask, permissions, automations } = useApp();
  const [tab, setTab] = useState("workflow");

  const [editingAuto, setEditingAuto] = useState(null);
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [autoForm, setAutoForm] = useState({ name: "", trigger: "stage_changed", triggerValue: "", conditions: [], conditionLogic: "AND", actions: [{ type: "assign_to", value: "" }], active: true });

  // Stage form state
  const [showAddStage, setShowAddStage] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [stageForm, setStageForm] = useState({ label: "", color: "#6366F1", bg: "#EEF2FF", approverRole: "" });

  // Dept form state
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: "", icon: "🏢", color: "#6366F1" });

  const [notifState, setNotifState] = useState({ "Task assigned to me": true, "Stage updates": true, "Revision requested": true, "Client approval": true, "Overdue alerts": false, "Weekly summary": false });

  const TABS = [["workflow", "⚙ Workflow Builder"], ["departments", "🏢 Departments"], ["roles", "🔒 Roles & Privileges"], ["automations", "🤖 Automations"], ["notifications", "🔔 Notifications"], ["general", "🏢 General"]];

  const saveStage = async () => {
    if (!stageForm.label) return;
    if (editingStage) {
      const updated = stages.map(s => s.id === editingStage ? { ...s, label: stageForm.label, color: stageForm.color, bg: stageForm.bg, approverRole: stageForm.approverRole } : s);
      await updateDoc(doc(db, "config", "workflow"), { stages: updated });
    } else {
      const ns = { id: uuid(), label: stageForm.label, color: stageForm.color, bg: stageForm.bg, approverRole: stageForm.approverRole, step: stages.length, terminal: false };
      const newStages = [...stages];
      newStages.splice(newStages.length - 1, 0, ns);
      const final = newStages.map((s, i) => ({ ...s, step: i + 1 }));
      await updateDoc(doc(db, "config", "workflow"), { stages: final });
    }
    setShowAddStage(false);
  };

  const deleteStage = async (id) => {
    if (["created", "completed"].includes(id)) return;
    const final = stages.filter(s => s.id !== id).map((s, i) => ({ ...s, step: i + 1 }));
    await updateDoc(doc(db, "config", "workflow"), { stages: final });
  };

  const saveDept = async () => {
    if (!deptForm.name) return;
    if (editingDept) {
      const final = depts.map(d => d.id === editingDept ? { ...d, ...deptForm } : d);
      await updateDoc(doc(db, "config", "departments"), { list: final });
    } else {
      const final = [...depts, { id: uuid(), ...deptForm }];
      await updateDoc(doc(db, "config", "departments"), { list: final });
    }
    setShowDeptModal(false);
  };

  const deleteDept = async (id) => {
    const final = depts.filter(d => d.id !== id);
    await updateDoc(doc(db, "config", "departments"), { list: final });
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", paddingRight: 4 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 24, padding: "0 4px", borderBottom: `1px solid ${T.border}`, overflowX: "auto" }}>
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: "12px 20px", background: "none", border: "none", borderBottom: `2px solid ${tab === id ? T.blue : "transparent"}`, color: tab === id ? T.blue : T.textMid, fontSize: 13, fontWeight: tab === id ? 800 : 600, cursor: "pointer", whiteSpace: "nowrap", fontFamily: T.font }}>{label}</button>
        ))}
      </div>

      {tab === "workflow" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div><div style={{ fontSize: 16, fontWeight: 800 }}>Workflow Builder</div><div style={{ fontSize: 12, color: T.textMid }}>Customize your agency's pipeline stages.</div></div>
            <Btn onClick={() => { setEditingStage(null); setStageForm({ label: "", color: "#6366F1", bg: "#EEF2FF", approverRole: "" }); setShowAddStage(true); }}>+ Add Stage</Btn>
          </div>
          <Card sx={{ padding: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stages.map((s, i) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: 12, border: `1px solid ${T.border}`, borderRadius: T.radiusSm }}>
                  <div style={{ fontSize: 14, fontWeight: 800, width: 24, color: T.textLight }}>{i + 1}</div>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                    <Badge stage={s.id} stages={stages} />
                    {s.approverRole && <span style={{ fontSize: 10, color: T.textLight }}>· Needs approval by {ROLE_LABELS[s.approverRole]}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn size="sm" variant="ghost" onClick={() => { setEditingStage(s.id); setStageForm({ label: s.label, color: s.color, bg: s.bg, approverRole: s.approverRole || "" }); setShowAddStage(true); }}>Edit</Btn>
                    {!["created", "completed"].includes(s.id) && <Btn size="sm" variant="ghost" sx={{ color: T.danger }} onClick={() => deleteStage(s.id)}>Remove</Btn>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          {showAddStage && (
            <Modal title={editingStage ? "Edit Stage" : "Add Stage"} onClose={() => setShowAddStage(false)}>
              <Inp label="Stage Label" value={stageForm.label} onChange={v => setStageForm(p => ({ ...p, label: v }))} required />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <Sel label="Approver" value={stageForm.approverRole} onChange={v => setStageForm(p => ({ ...p, approverRole: v }))} options={[["", "No approval needed"], ...Object.entries(ROLE_LABELS)].map(([v, l]) => ({ value: v, label: l }))} />
                <Inp label="Hex Color" value={stageForm.color} onChange={v => setStageForm(p => ({ ...p, color: v }))} />
              </div>
              <Btn onClick={saveStage} full>Save Stage</Btn>
            </Modal>
          )}
        </div>
      )}

      {tab === "departments" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Departments</div>
            <Btn onClick={() => { setEditingDept(null); setDeptForm({ name: "", icon: "🏢", color: "#6366F1" }); setShowDeptModal(true); }}>+ Add Dept</Btn>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {depts.map(d => (
              <Card key={d.id} sx={{ padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 24 }}>{d.icon}</div>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 800 }}>{d.name}</div><div style={{ fontSize: 10, color: d.color }}>{d.color}</div></div>
                  <Btn size="sm" variant="ghost" onClick={() => { setEditingDept(d.id); setDeptForm({ name: d.name, icon: d.icon, color: d.color }); setShowDeptModal(true); }}>Edit</Btn>
                  <Btn size="sm" variant="ghost" sx={{ color: T.danger }} onClick={() => deleteDept(d.id)}>Remove</Btn>
                </div>
              </Card>
            ))}
          </div>
          {showDeptModal && (
            <Modal title={editingDept ? "Edit Dept" : "Add Dept"} onClose={() => setShowDeptModal(false)}>
              <Inp label="Name" value={deptForm.name} onChange={v => setDeptForm(p => ({ ...p, name: v }))} required />
              <Inp label="Icon" value={deptForm.icon} onChange={v => setDeptForm(p => ({ ...p, icon: v }))} required />
              <Inp label="Color" value={deptForm.color} onChange={v => setDeptForm(p => ({ ...p, color: v }))} required />
              <Btn onClick={saveDept} full>Save Department</Btn>
            </Modal>
          )}
        </div>
      )}

      {tab === "roles" && (
        <Card sx={{ padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>Roles & Privileges</div>
          {Object.entries(ROLE_LABELS).map(([k, v]) => (
            <div key={k} style={{ marginBottom: 16, padding: 16, border: `1px solid ${T.border}`, borderRadius: T.radiusSm }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>{v}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {["Create Tasks", "Edit Organization", "Approve Stages", "View Financials", "Manage Users", "Access Settings"].map(priv => {
                  const rolePerms = permissions[k] || [];
                  const hasPriv = rolePerms.includes(priv);
                  const toggle = async () => {
                    const next = hasPriv ? rolePerms.filter(p => p !== priv) : [...rolePerms, priv];
                    await updateDoc(doc(db, "config", "permissions"), { [`roles.${k}`]: next });
                  };
                  return (
                    <label key={priv} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
                      <input type="checkbox" checked={hasPriv} onChange={toggle} disabled={k === "super_admin"} /> {priv}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </Card>
      )}

      {tab === "general" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <Card sx={{ padding: 24, gridColumn: "span 2" }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>Security</div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
              <Inp label="New Password" id="new-pwd" type="password" sx={{ flex: 1 }} />
              <Btn onClick={async () => {
                const val = document.getElementById("new-pwd").value;
                if (!val) return;
                await updateDoc(doc(db, "users", currentUser.id), { password: val });
                alert("Password updated successfully.");
                document.getElementById("new-pwd").value = "";
              }}>Update Password</Btn>
            </div>
          </Card>
          <Card sx={{ padding: 24 }}>
            <div style={{ fontWeight: 800, marginBottom: 16 }}>Agency Profile</div>
            <Inp label="Agency Name" value="PixelForge Agency" />
            <Btn sx={{ marginTop: 8 }}>Save Agency</Btn>
          </Card>
        </div>
      )}

      {tab === "automations" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div><div style={{ fontSize: 16, fontWeight: 800 }}>Automations</div><div style={{ fontSize: 12, color: T.textMid }}>Trigger actions based on task events and conditions.</div></div>
            <Btn onClick={() => { setEditingAuto(null); setAutoForm({ name: "", trigger: "stage_changed", triggerValue: "", conditions: [], conditionLogic: "AND", actions: [{ type: "assign_to", value: "" }], active: true }); setShowAutoModal(true); }}>+ New Automation</Btn>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {automations.map(a => (
              <Card key={a.id} sx={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: a.active ? T.blueLight : T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{a.active ? "🤖" : "💤"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: T.textLight }}>{AUTOMATION_TRIGGERS.find(t => t.id === a.trigger)?.label} {a.triggerValue && `→ ${a.triggerValue}`}</div>
                  </div>
                  <Toggle checked={a.active} onChange={async (v) => {
                    const final = automations.map(x => x.id === a.id ? { ...x, active: v } : x);
                    await updateDoc(doc(db, "config", "automations"), { list: final });
                  }} />
                  <Btn size="sm" variant="ghost" onClick={() => {
                    setEditingAuto(a.id);
                    setAutoForm({ ...a });
                    setShowAutoModal(true);
                  }}>Edit</Btn>
                  <Btn size="sm" variant="ghost" sx={{ color: T.danger }} onClick={async () => {
                    openDialog("danger", "Delete automation", "Delete automation?", async () => {
                      const final = automations.filter(x => x.id !== a.id);
                      await updateDoc(doc(db, "config", "automations"), { list: final });
                    });
                  }}>Delete</Btn>
                </div>
              </Card>
            ))}
          </div>

          {showAutoModal && (
            <Modal title={editingAuto ? "Edit Automation" : "New Automation"} onClose={() => setShowAutoModal(false)} width={600}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Inp label="Automation Name" value={autoForm.name} onChange={v => setAutoForm(p => ({ ...p, name: v }))} required />

                <div style={{ padding: 14, background: T.bg, borderRadius: T.radiusSm }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: T.textLight, textTransform: "uppercase", marginBottom: 10 }}>1. Trigger</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Sel label="When..." value={autoForm.trigger} onChange={v => setAutoForm(p => ({ ...p, trigger: v }))} options={AUTOMATION_TRIGGERS.map(t => ({ value: t.id, label: t.label }))} />

                    {autoForm.trigger === "stage_changed" && (
                      <Sel label="Stage is..." value={autoForm.triggerValue} onChange={v => setAutoForm(p => ({ ...p, triggerValue: v }))} options={stages.map(s => ({ value: s.id, label: s.label }))} />
                    )}
                    {autoForm.trigger === "assigned_changed" && (
                      <Sel label="Assignee is..." value={autoForm.triggerValue} onChange={v => setAutoForm(p => ({ ...p, triggerValue: v }))} options={users.filter(u => u.role !== ROLES.CL).map(u => ({ value: u.id, label: u.name }))} />
                    )}
                    {autoForm.trigger === "priority_changed" && (
                      <Sel label="Priority is..." value={autoForm.triggerValue} onChange={v => setAutoForm(p => ({ ...p, triggerValue: v }))} options={Object.entries(PRIORITY_CFG).map(([k, x]) => ({ value: k, label: x.label }))} />
                    )}
                    {!["stage_changed", "assigned_changed", "priority_changed", "task_created", "task_updated", "subtask_completed", "all_subtasks_done", "checklist_done", "overdue", "due_approaching"].includes(autoForm.trigger) && autoForm.triggerValue && (
                      <Inp label="Value equals..." value={autoForm.triggerValue} onChange={v => setAutoForm(p => ({ ...p, triggerValue: v }))} />
                    )}
                  </div>
                </div>

                <div style={{ padding: 14, background: T.bg, borderRadius: T.radiusSm }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: T.textLight, textTransform: "uppercase" }}>2. Conditions (Optional)</div>
                    <Btn size="sm" variant="ghost" onClick={() => setAutoForm(p => ({ ...p, conditions: [...(p.conditions || []), { field: "priority", operator: "==", value: "" }] }))}>+ Add</Btn>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(autoForm.conditions || []).map((c, i) => (
                      <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                        <Sel label="Field" value={c.field} onChange={v => {
                          const nc = [...autoForm.conditions]; nc[i].field = v; setAutoForm(p => ({ ...p, conditions: nc }));
                        }} options={[{ value: "priority", label: "Priority" }, { value: "deptId", label: "Department" }, { value: "isBillable", label: "Billable" }]} />
                        <Sel label="Is" value={c.operator} onChange={v => {
                          const nc = [...autoForm.conditions]; nc[i].operator = v; setAutoForm(p => ({ ...p, conditions: nc }));
                        }} options={[{ value: "==", label: "Equals" }, { value: "!=", label: "Not Equals" }, { value: "contains", label: "Contains" }]} />

                        {c.field === "priority" ? (
                          <Sel label="Value" value={c.value} onChange={v => { const nc = [...autoForm.conditions]; nc[i].value = v; setAutoForm(p => ({ ...p, conditions: nc })); }} options={Object.entries(PRIORITY_CFG).map(([k, x]) => ({ value: k, label: x.label }))} />
                        ) : c.field === "deptId" ? (
                          <Sel label="Value" value={c.value} onChange={v => { const nc = [...autoForm.conditions]; nc[i].value = v; setAutoForm(p => ({ ...p, conditions: nc })); }} options={depts.map(d => ({ value: d.id, label: d.name }))} />
                        ) : c.field === "isBillable" ? (
                          <Sel label="Value" value={c.value === "true" || c.value === true} onChange={v => { const nc = [...autoForm.conditions]; nc[i].value = v; setAutoForm(p => ({ ...p, conditions: nc })); }} options={[{ value: true, label: "Yes" }, { value: false, label: "No" }]} />
                        ) : (
                          <Inp label="Value" value={c.value} onChange={v => {
                            const nc = [...autoForm.conditions]; nc[i].value = v; setAutoForm(p => ({ ...p, conditions: nc }));
                          }} />
                        )}

                        <Btn size="sm" variant="ghost" sx={{ color: T.danger }} onClick={() => {
                          const nc = autoForm.conditions.filter((_, idx) => idx !== i);
                          setAutoForm(p => ({ ...p, conditions: nc }));
                        }}>✕</Btn>
                      </div>
                    ))}
                    {autoForm.conditions?.length > 1 && (
                      <Sel label="Logic" value={autoForm.conditionLogic} onChange={v => setAutoForm(p => ({ ...p, conditionLogic: v }))} options={[{ value: "AND", label: "Match ALL conditions" }, { value: "OR", label: "Match ANY condition" }]} />
                    )}
                  </div>
                </div>

                <div style={{ padding: 14, background: T.bg, borderRadius: T.radiusSm }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: T.textLight, textTransform: "uppercase" }}>3. Action</div>
                    <Btn size="sm" variant="ghost" onClick={() => setAutoForm(p => ({ ...p, actions: [...(p.actions || []), { type: "assign_to", value: "" }] }))}>+ Add Action</Btn>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {(autoForm.actions || []).map((a, i) => (
                      <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-end", paddingBottom: 8, borderBottom: i < autoForm.actions.length - 1 ? `1px dashed ${T.border}` : "none" }}>
                        <Sel label="Action Type" value={a.type} onChange={v => {
                          const na = [...autoForm.actions]; na[i].type = v; setAutoForm(p => ({ ...p, actions: na }));
                        }} options={AUTOMATION_ACTIONS.map(x => ({ value: x.id, label: x.label }))} />

                        {a.type === "assign_to" ? (
                          <Sel label="Assign to" value={a.value} onChange={v => { const na = [...autoForm.actions]; na[i].value = v; setAutoForm(p => ({ ...p, actions: na })); }} options={users.filter(u => u.role !== ROLES.CL).map(u => ({ value: u.id, label: u.name }))} />
                        ) : a.type === "change_stage" ? (
                          <Sel label="Stage" value={a.value} onChange={v => { const na = [...autoForm.actions]; na[i].value = v; setAutoForm(p => ({ ...p, actions: na })); }} options={stages.map(s => ({ value: s.id, label: s.label }))} />
                        ) : a.type === "change_priority" ? (
                          <Sel label="Priority" value={a.value} onChange={v => { const na = [...autoForm.actions]; na[i].value = v; setAutoForm(p => ({ ...p, actions: na })); }} options={Object.entries(PRIORITY_CFG).map(([k, x]) => ({ value: k, label: x.label }))} />
                        ) : (
                          <Inp label="Action Value" value={a.value} onChange={v => {
                            const na = [...autoForm.actions]; na[i].value = v; setAutoForm(p => ({ ...p, actions: na }));
                          }} />
                        )}

                        <Btn size="sm" variant="ghost" sx={{ color: T.danger }} onClick={() => {
                          const na = autoForm.actions.filter((_, idx) => idx !== i);
                          setAutoForm(p => ({ ...p, actions: na }));
                        }}>✕</Btn>
                      </div>
                    ))}
                  </div>
                </div>

                <Btn full onClick={async () => {
                  if (!autoForm.name) return;
                  const final = editingAuto
                    ? automations.map(x => x.id === editingAuto ? { ...autoForm } : x)
                    : [...automations, { ...autoForm, id: uuid() }];
                  await updateDoc(doc(db, "config", "automations"), { list: final });
                  setShowAutoModal(false);
                }}>Save Automation</Btn>
              </div>
            </Modal>
          )}
        </div>
      )}

      {tab === "notifications" && (
        <Card sx={{ padding: 24 }}>
          <div style={{ fontWeight: 800, marginBottom: 20 }}>Notifications</div>
          {Object.entries(notifState).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>
              <span>{k}</span>
              <Toggle checked={v} onChange={newV => setNotifState(p => ({ ...p, [k]: newV }))} />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [nav, setNav] = useState("dashboard");
  const [tasks, setTasks] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [stages, setStages] = useState(STAGES_DEFAULT);
  const [depts, setDepts] = useState(DEPTS_DEFAULT);
  const [automations, setAutomations] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [prefilledClient, setPrefilledClient] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const openDialog = (type, title, msg, onConfirm, placeholder = "") => setDialog({ type, title, msg, onConfirm, placeholder });


  // REAL-TIME CLOUD SYNC
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (s) => {
      const data = s.docs.map(d => ({ ...d.data(), id: d.id }));
      if (data.length === 0 && loading) seedDatabase();
      setUsers(data);
    });
    const unsubTasks = onSnapshot(collection(db, "tasks"), (s) => setTasks(s.docs.map(d => ({ ...d.data(), id: d.id }))));
    const unsubInvoices = onSnapshot(collection(db, "invoices"), (s) => setInvoices(s.docs.map(d => ({ ...d.data(), id: d.id }))));
    const unsubClients = onSnapshot(collection(db, "clients"), (s) => setClients(s.docs.map(d => ({ ...d.data(), id: d.id }))));
    const unsubConfig = onSnapshot(collection(db, "config"), (s) => {
      s.docs.forEach(d => {
        if (d.id === "workflow" && d.data().stages?.length) setStages(d.data().stages);
        if (d.id === "departments" && d.data().list?.length) setDepts(d.data().list);
        if (d.id === "permissions") setPermissions(d.data().roles || {});
        if (d.id === "automations") setAutomations(d.data().list || []);
      });
      setLoading(false);
    });

    return () => { unsubTasks(); unsubInvoices(); unsubClients(); unsubUsers(); };
  }, []);

  const seedDatabase = async () => {
    console.log("Seeding Master Configuration & Admin...");
    await setDoc(doc(db, "config", "workflow"), { stages: STAGES_DEFAULT });
    await setDoc(doc(db, "config", "departments"), { list: DEPTS_DEFAULT });
    await setDoc(doc(db, "config", "automations"), { list: SEED_AUTOMATIONS });

    const initialPerms = {};
    Object.keys(ROLE_LABELS).forEach(r => {
      initialPerms[r] = ["Create Tasks", "Edit Organization", "Approve Stages", "View Financials", "Manage Users", "Access Settings"].filter(p => {
        if (r === "super_admin") return true;
        if (r === "project_manager") return ["Create Tasks", "Approve Stages", "View Financials", "Access Settings"].includes(p);
        if (r === "dept_manager") return ["Create Tasks", "Approve Stages"].includes(p);
        return false;
      });
    });
    await setDoc(doc(db, "config", "permissions"), { roles: initialPerms });
    for (const u of SEED_USERS) await setDoc(doc(db, "users", u.id), u);
  };

  const PAGE_TITLES = { dashboard: "Dashboard", tasks: "Tasks", clients: "Clients", billing: "Billing & Invoices", reports: "Reports", audit: "Audit Log", team: "Team", settings: "Settings" };

  const runAutomations = useCallback(async (triggerType, triggerData) => {
    if (!automations.length) return;
    const activeAutos = automations.filter(a => a.active && a.trigger === triggerType);

    for (const auto of activeAutos) {
      if (auto.triggerValue && triggerData.triggerValue !== auto.triggerValue) continue;

      const task = tasks.find(t => t.id === triggerData.taskId) || triggerData.task;
      if (!task) continue;

      let conditionsMet = true;
      if (auto.conditions?.length) {
        const results = auto.conditions.map(c => {
          const val = task[c.field];
          if (c.operator === "==") return val === c.value;
          if (c.operator === "!=") return val !== c.value;
          if (c.operator === "contains") return Array.isArray(val) ? val.includes(c.value) : String(val).includes(c.value);
          return false;
        });
        conditionsMet = auto.conditionLogic === "OR" ? results.some(r => r) : results.every(r => r);
      }
      if (!conditionsMet) continue;

      const actions = auto.actions || [{ type: auto.action, value: auto.actionValue }];
      for (const action of actions) {
        switch (action.type) {
          case "assign_to":
            await updateDoc(doc(db, "tasks", task.id), { assignedTo: action.value });
            break;
          case "change_stage":
            await updateDoc(doc(db, "tasks", task.id), { stage: action.value });
            break;
          case "change_priority":
            await updateDoc(doc(db, "tasks", task.id), { priority: action.value });
            break;
          case "add_comment":
            const newComment = { id: uuid(), userId: "system", text: action.value, ts: new Date().toISOString() };
            await updateDoc(doc(db, "tasks", task.id), { comments: [...(task.comments || []), newComment] });
            break;
          case "create_subtask":
            const newSub = { id: uuid(), title: action.value, completed: false };
            await updateDoc(doc(db, "tasks", task.id), { subtasks: [...(task.subtasks || []), newSub] });
            break;
          case "add_checklist":
            const newCheck = { id: uuid(), text: action.value, done: false };
            await updateDoc(doc(db, "tasks", task.id), { checklist: [...(task.checklist || []), newCheck] });
            break;
          case "set_due_date":
            const days = parseInt(action.value) || 0;
            const newDue = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
            await updateDoc(doc(db, "tasks", task.id), { dueDate: newDue });
            break;
        }
      }
    }
  }, [automations, tasks]);

  const doTransition = useCallback(async (taskId, tx, comment, assigneeId) => {
    const t = tasks.find(x => x.id === taskId);
    if (!t) return;

    // RBAC logic...
    const isAssigned = t.assignedTo === currentUser.id;
    const isPM = [ROLES.SA, ROLES.PM].includes(currentUser.role);
    const isDMAssigned = currentUser.role === ROLES.DM && currentUser.dept === t.deptId;
    if (!isAssigned && !isPM && !isDMAssigned) { alert("Workflow Control error"); return; }
    if (!t.assignedTo && !assigneeId && tx.to !== "created") { alert("Assignment required"); return; }

    const newTr = { from: t.stage, to: tx.to, actor: currentUser.id, comment: comment || null, ts: new Date().toISOString(), isRejection: !!tx.isReject };
    await updateDoc(doc(db, "tasks", taskId), {
      stage: tx.to,
      revisionCount: tx.isReject ? t.revisionCount + 1 : t.revisionCount,
      revisionOverheadHours: tx.isReject ? t.revisionOverheadHours + 2 : t.revisionOverheadHours,
      completedAt: tx.to === "completed" ? new Date().toISOString() : t.completedAt,
      assignedTo: assigneeId || t.assignedTo || null,
      transitions: [...(t.transitions || []), newTr]
    });

    // FIRE AUTOMATION
    runAutomations("stage_changed", { taskId, triggerValue: tx.to });
  }, [currentUser, tasks, runAutomations]);

  const updateTask = useCallback(async (id, updates) => {
    await updateDoc(doc(db, "tasks", id), updates);
    // FIRE AUTOMATION (simplified for now, check changed keys)
    if (updates.stage) runAutomations("stage_changed", { taskId: id, triggerValue: updates.stage });
    if (updates.assignedTo) runAutomations("assigned_changed", { taskId: id, triggerValue: updates.assignedTo });
    if (updates.priority) runAutomations("priority_changed", { taskId: id, triggerValue: updates.priority });
    runAutomations("task_updated", { taskId: id });
  }, [runAutomations]);

  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} />;

  const isClient = currentUser.role === ROLES.CL;
  // openDialog added to context
  const ctx = { openDialog, tasks, setTasks, invoices, setInvoices, clients, setClients, stages, setStages, depts, setDepts, automations, setAutomations, users, setUsers, currentUser, doTransition, updateTask, permissions, setPermissions, runAutomations, seedDatabase };

  return (
    <Ctx.Provider value={ctx}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${T.bg};font-family:${T.font};color:${T.text};}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-thumb{background:${T.borderDark};border-radius:10px}
        @keyframes mIn{from{opacity:0;transform:scale(.96) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
        select,input,textarea{font-family:${T.font};}
        input[type=date]{color:${T.text};}
        button{font-family:${T.font};}
      `}</style>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {!isClient && <Sidebar nav={nav} setNav={setNav} currentUser={currentUser} onLogout={async () => { await auth.signOut(); setCurrentUser(null); setNav("dashboard"); }} />}
        <div style={{ flex: 1, marginLeft: isClient ? 0 : 216, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
          <TopBar title={PAGE_TITLES[nav] || "Dashboard"} actions={
            <div style={{ display: "flex", gap: 8 }}>
              {[ROLES.SA, ROLES.PM, ROLES.DM].includes(currentUser.role) && <Btn size="sm" onClick={() => setShowCreate(true)}>+ New Task</Btn>}
            </div>
          } />
          <main style={{ flex: 1, padding: "20px 24px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {nav === "dashboard" && <Dashboard currentUser={currentUser} setNav={setNav} openTask={setSelectedTask} />}
            {nav === "tasks" && <TasksPage currentUser={currentUser} openTask={setSelectedTask} showCreate={showCreate} setShowCreate={setShowCreate} />}
            {nav === "tasks" && showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} />}
            {nav === "clients" && <ClientsPage openTask={setSelectedTask} openCreate={(cId) => { setPrefilledClient(cId); setShowCreate(true); }} />}
            {nav === "billing" && <BillingPage />}
            {nav === "reports" && <ReportsPage />}
            {nav === "audit" && <AuditPage />}
            {nav === "team" && <TeamPage />}
            {nav === "settings" && <SettingsPage />}
          </main>
        </div>
      </div>
      {selectedTask && <TaskDetail taskId={selectedTask} onClose={() => setSelectedTask(null)} />}
      {showCreate && nav !== "tasks" && <CreateTaskModal onClose={() => { setShowCreate(false); setPrefilledClient(""); }} initialClient={prefilledClient} />}
      <GlobalTimer />
      {dialog && (
        <Modal title={dialog.title} onClose={() => setDialog(null)} width={400}>
          <div style={{ marginBottom: 20, fontSize: 13, color: T.textMid }}>{dialog.msg}</div>
          {dialog.type === 'prompt' && <Inp id="dialogPrompt" autoFocus placeholder={dialog.placeholder} />}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
            <Btn variant="secondary" onClick={() => setDialog(null)}>Cancel</Btn>
            <Btn sx={{ background: dialog.type === 'danger' ? T.danger : T.blue }} onClick={() => {
              const val = dialog.type === 'prompt' ? document.getElementById('dialogPrompt').value : true;
              if (dialog.type !== 'prompt' || val) {
                dialog.onConfirm(val);
                setDialog(null);
              }
            }}>Confirm</Btn>
          </div>
        </Modal>
      )}
    </Ctx.Provider>
  );
}
