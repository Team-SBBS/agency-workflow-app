import { useState, useCallback, useRef, createContext, useContext } from "react";

// ═══════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════
const T = {
  bg:"#F0F2F7", surface:"#FFFFFF", surfaceElev:"#FAFBFD",
  border:"#E4E8F0", borderDark:"#C9D0DE",
  navy:"#0D1B3E", blue:"#1D4ED8", blueHov:"#1E40AF",
  blueLight:"#EFF6FF", blueMid:"#DBEAFE",
  text:"#0D1B3E", textMid:"#4B5675", textLight:"#8B94B0",
  success:"#059669", successBg:"#ECFDF5", successBorder:"#A7F3D0",
  danger:"#DC2626", dangerBg:"#FEF2F2", dangerBorder:"#FECACA",
  warning:"#D97706", warningBg:"#FFFBEB", warningBorder:"#FDE68A",
  purple:"#7C3AED", purpleBg:"#F5F3FF",
  sidebar:"#0D1B3E", sidebarBorder:"rgba(255,255,255,0.08)",
  radius:"10px", radiusSm:"7px", radiusLg:"14px",
  shadow:"0 1px 4px rgba(13,27,62,0.07),0 1px 2px rgba(13,27,62,0.04)",
  shadowMd:"0 4px 20px rgba(13,27,62,0.10)",
  shadowLg:"0 16px 48px rgba(13,27,62,0.18)",
  font:"'Outfit','Nunito',system-ui,sans-serif",
  fontMono:"'JetBrains Mono','Fira Code',monospace",
};

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════
const INR = (n) => `₹${Number(n||0).toLocaleString("en-IN")}`;
const ROLES = { SA:"super_admin", PM:"project_manager", DM:"dept_manager", TM:"team_member", CL:"client" };
const ROLE_LABELS = { super_admin:"Super Admin", project_manager:"Project Manager", dept_manager:"Dept. Manager", team_member:"Team Member", client:"Client" };

const STAGES_DEFAULT = [
  { id:"created",       label:"Created",        color:"#64748B", bg:"#F1F5F9", step:1, terminal:false, isStart:true },
  { id:"assigned",      label:"Assigned",       color:"#2563EB", bg:"#EFF6FF", step:2, terminal:false },
  { id:"in_progress",   label:"In Progress",    color:"#D97706", bg:"#FFFBEB", step:3, terminal:false },
  { id:"submitted",     label:"Under Review",   color:"#7C3AED", bg:"#F5F3FF", step:4, terminal:false },
  { id:"dept_approved", label:"Dept. Approved", color:"#0891B2", bg:"#ECFEFF", step:5, terminal:false },
  { id:"client_review", label:"Client Review",  color:"#EA580C", bg:"#FFF7ED", step:6, terminal:false },
  { id:"completed",     label:"Completed",      color:"#059669", bg:"#ECFDF5", step:7, terminal:true  },
];

const TRANSITIONS_DEFAULT = {
  created:       [{ action:"assign",         label:"Assign to Team",     to:"assigned",      roles:[ROLES.DM,ROLES.SA], needsComment:false, isReject:false, needsAssignee:true }],
  assigned:      [{ action:"start",          label:"Start Work",         to:"in_progress",   roles:[ROLES.TM,ROLES.SA], needsComment:false, isReject:false }],
  in_progress:   [{ action:"submit",         label:"Submit for Review",  to:"submitted",     roles:[ROLES.TM,ROLES.SA], needsComment:false, isReject:false }],
  submitted:     [
    { action:"approve_dept", label:"Approve & Escalate", to:"dept_approved", roles:[ROLES.DM,ROLES.SA], needsComment:false, isReject:false },
    { action:"reject_dept",  label:"Request Revision",   to:"in_progress",   roles:[ROLES.DM,ROLES.SA], needsComment:true,  isReject:true  },
  ],
  dept_approved: [{ action:"send_client",    label:"Send to Client",     to:"client_review", roles:[ROLES.PM,ROLES.SA], needsComment:false, isReject:false }],
  client_review: [
    { action:"approve_client", label:"Approve & Complete", to:"completed",     roles:[ROLES.CL,ROLES.PM,ROLES.SA], needsComment:false, isReject:false },
    { action:"reject_client",  label:"Request Changes",    to:"dept_approved", roles:[ROLES.CL,ROLES.PM,ROLES.SA], needsComment:true,  isReject:true  },
  ],
  completed: [],
};

const PRIORITY_CFG = {
  critical:{ label:"Critical", color:"#DC2626", bg:"#FEF2F2" },
  high:    { label:"High",     color:"#EA580C", bg:"#FFF7ED" },
  medium:  { label:"Medium",   color:"#D97706", bg:"#FFFBEB" },
  low:     { label:"Low",      color:"#059669", bg:"#ECFDF5" },
};

const BILLING_CFG = {
  retainer: { label:"Retainer",  color:"#1D4ED8" },
  one_time: { label:"One-Time",  color:"#7C3AED" },
  internal: { label:"Internal",  color:"#6B7280" },
};

// ── DEPARTMENTS (now includes Sales & Customer Support) ──────────
const DEPTS_DEFAULT = [
  { id:"d1", name:"Design",            icon:"🎨", color:"#EC4899" },
  { id:"d2", name:"Video Editing",     icon:"🎬", color:"#F97316" },
  { id:"d3", name:"SEO",               icon:"🔍", color:"#06B6D4" },
  { id:"d4", name:"Web Dev",           icon:"💻", color:"#8B5CF6" },
  { id:"d5", name:"App Dev",           icon:"📱", color:"#3B82F6" },
  { id:"d6", name:"Social Media",      icon:"📣", color:"#F59E0B" },
  { id:"d7", name:"Sales",             icon:"💼", color:"#10B981" },
  { id:"d8", name:"Customer Support",  icon:"🎧", color:"#EF4444" },
];

const AUTOMATION_TRIGGERS = [
  { id:"stage_change",   label:"When stage changes to…" },
  { id:"overdue",        label:"When task becomes overdue" },
  { id:"created",        label:"When a new task is created" },
  { id:"revision_count", label:"When revision count exceeds…" },
];
const AUTOMATION_ACTIONS = [
  { id:"notify_slack",    label:"Send Slack notification" },
  { id:"notify_email",    label:"Send email notification" },
  { id:"assign_to",       label:"Auto-assign to…" },
  { id:"change_priority", label:"Change priority to…" },
  { id:"add_tag",         label:"Add tag" },
];

// ── SEED DATA ────────────────────────────────────────────────────
const SEED_USERS = [
  { id:"u1",  name:"Sarah Chen",    role:ROLES.SA, dept:null, av:"SC", color:"#DC2626", email:"sarah@agency.io",      password:"admin123" },
  { id:"u2",  name:"Marcus Webb",   role:ROLES.PM, dept:null, av:"MW", color:"#7C3AED", email:"marcus@agency.io",     password:"pm123"    },
  { id:"u3",  name:"Priya Sharma",  role:ROLES.DM, dept:"d1", av:"PS", color:"#EC4899", email:"priya@agency.io",      password:"dm123"    },
  { id:"u4",  name:"Jake Torres",   role:ROLES.DM, dept:"d3", av:"JT", color:"#06B6D4", email:"jake@agency.io",       password:"dm123"    },
  { id:"u5",  name:"Aisha Patel",   role:ROLES.DM, dept:"d4", av:"AP", color:"#8B5CF6", email:"aisha@agency.io",      password:"dm123"    },
  { id:"u6",  name:"Leo Kim",       role:ROLES.TM, dept:"d1", av:"LK", color:"#F97316", email:"leo@agency.io",        password:"team123"  },
  { id:"u7",  name:"Nina Rossi",    role:ROLES.TM, dept:"d1", av:"NR", color:"#10B981", email:"nina@agency.io",       password:"team123"  },
  { id:"u8",  name:"Omar Hassan",   role:ROLES.TM, dept:"d3", av:"OH", color:"#3B82F6", email:"omar@agency.io",       password:"team123"  },
  { id:"u9",  name:"Zoe Mitchell",  role:ROLES.TM, dept:"d4", av:"ZM", color:"#F59E0B", email:"zoe@agency.io",        password:"team123"  },
  { id:"u10", name:"TechCorp Ltd",  role:ROLES.CL, dept:null, av:"TC", color:"#64748B", email:"client@techcorp.com",  password:"client123"},
  { id:"u11", name:"FreshMart",     role:ROLES.CL, dept:null, av:"FM", color:"#64748B", email:"client@freshmart.com", password:"client123"},
];

const SEED_CLIENTS = [
  { id:"c1", name:"TechCorp Ltd",    email:"contact@techcorp.com", billing:"retainer", retainer:150000, sla:48, portalUser:"u10", industry:"Technology", gst:"27AABCT1234A1Z5" },
  { id:"c2", name:"FreshMart",       email:"hello@freshmart.com",  billing:"one_time",  retainer:0,      sla:72, portalUser:"u11", industry:"Retail",     gst:"29AADCF5678B1Z3" },
  { id:"c3", name:"Luminar Studios", email:"studio@luminar.co",    billing:"retainer", retainer:240000, sla:24, portalUser:null,  industry:"Media",      gst:"07AABCL9012C1Z1" },
  { id:"c4", name:"NexusPay",        email:"ops@nexuspay.io",      billing:"retainer", retainer:360000, sla:12, portalUser:null,  industry:"Fintech",    gst:"19AACCN3456D1Z7" },
];

const n0 = new Date();
const dA = (d) => new Date(n0 - d*86400000).toISOString();
const dF = (d) => new Date(n0.getTime()+d*86400000).toISOString().slice(0,10);

const SEED_TASKS = [
  { id:"t1",  clientId:"c1", deptId:"d1", title:"Logo Redesign — Primary Mark",      description:"Create 3 concept directions for the primary logo.", stage:"in_progress",   priority:"critical", billingType:"retainer", isBillable:true,  isInvoiced:false, invoiceId:null,           invoiceDate:null,       paymentStatus:null,  estimatedHours:16, actualHours:8,  revisionCount:1, revisionOverheadHours:2,  assignedTo:"u6", createdBy:"u1", dueDate:dF(5),   completedAt:null,   createdAt:dA(10), tags:["branding","logo"],  transitions:[{from:null,to:"created",actor:"u1",comment:null,ts:dA(10)},{from:"created",to:"assigned",actor:"u3",comment:null,ts:dA(9)},{from:"assigned",to:"in_progress",actor:"u6",comment:null,ts:dA(8)},{from:"in_progress",to:"submitted",actor:"u6",comment:null,ts:dA(6)},{from:"submitted",to:"in_progress",actor:"u3",comment:"Concept B needs more contrast. Please revise the colour palette.",ts:dA(5),isRejection:true}]},
  { id:"t2",  clientId:"c1", deptId:"d1", title:"Brand Guidelines Document",         description:"Compile full brand guidelines PDF.", stage:"submitted",     priority:"high",     billingType:"retainer", isBillable:true,  isInvoiced:false, invoiceId:null,           invoiceDate:null,       paymentStatus:null,  estimatedHours:12, actualHours:11, revisionCount:0, revisionOverheadHours:0,  assignedTo:"u7", createdBy:"u1", dueDate:dF(8),   completedAt:null,   createdAt:dA(12), tags:["brand","docs"],     transitions:[{from:null,to:"created",actor:"u1",comment:null,ts:dA(12)},{from:"created",to:"assigned",actor:"u3",comment:null,ts:dA(11)},{from:"assigned",to:"in_progress",actor:"u7",comment:null,ts:dA(10)},{from:"in_progress",to:"submitted",actor:"u7",comment:null,ts:dA(2)}]},
  { id:"t3",  clientId:"c1", deptId:"d3", title:"Technical SEO Audit",               description:"Full crawl audit covering Core Web Vitals.", stage:"dept_approved", priority:"high",     billingType:"retainer", isBillable:true,  isInvoiced:false, invoiceId:null,           invoiceDate:null,       paymentStatus:null,  estimatedHours:20, actualHours:18, revisionCount:0, revisionOverheadHours:0,  assignedTo:"u8", createdBy:"u2", dueDate:dF(2),   completedAt:null,   createdAt:dA(15), tags:["seo","audit"],      transitions:[{from:null,to:"created",actor:"u2",comment:null,ts:dA(15)},{from:"created",to:"assigned",actor:"u4",comment:null,ts:dA(14)},{from:"assigned",to:"in_progress",actor:"u8",comment:null,ts:dA(13)},{from:"in_progress",to:"submitted",actor:"u8",comment:null,ts:dA(5)},{from:"submitted",to:"dept_approved",actor:"u4",comment:null,ts:dA(3)}]},
  { id:"t4",  clientId:"c1", deptId:"d3", title:"Keyword Research & Content Map",    description:"200+ keyword clusters mapped to pages.", stage:"client_review", priority:"high",     billingType:"retainer", isBillable:true,  isInvoiced:false, invoiceId:null,           invoiceDate:null,       paymentStatus:null,  estimatedHours:10, actualHours:10, revisionCount:1, revisionOverheadHours:3,  assignedTo:"u8", createdBy:"u2", dueDate:dF(-1),  completedAt:null,   createdAt:dA(20), tags:["seo","research"],   transitions:[{from:null,to:"created",actor:"u2",comment:null,ts:dA(20)},{from:"created",to:"assigned",actor:"u4",comment:null,ts:dA(19)},{from:"assigned",to:"in_progress",actor:"u8",comment:null,ts:dA(18)},{from:"in_progress",to:"submitted",actor:"u8",comment:null,ts:dA(12)},{from:"submitted",to:"in_progress",actor:"u4",comment:"Please add SERP feature analysis column.",ts:dA(10),isRejection:true},{from:"in_progress",to:"submitted",actor:"u8",comment:null,ts:dA(7)},{from:"submitted",to:"dept_approved",actor:"u4",comment:null,ts:dA(5)},{from:"dept_approved",to:"client_review",actor:"u2",comment:null,ts:dA(3)}]},
  { id:"t5",  clientId:"c2", deptId:"d4", title:"Homepage Wireframes",               description:"Low and mid-fidelity wireframes for homepage redesign.", stage:"completed",     priority:"high",     billingType:"one_time",  isBillable:true,  isInvoiced:true,  invoiceId:"INV-2026-001", invoiceDate:"2026-02-01", paymentStatus:"paid",estimatedHours:14, actualHours:15, revisionCount:0, revisionOverheadHours:0,  assignedTo:"u9", createdBy:"u2", dueDate:dF(-20), completedAt:dA(5),  createdAt:dA(35), tags:["ux","wireframe"],   transitions:[{from:null,to:"created",actor:"u2",comment:null,ts:dA(35)},{from:"created",to:"assigned",actor:"u5",comment:null,ts:dA(34)},{from:"assigned",to:"in_progress",actor:"u9",comment:null,ts:dA(33)},{from:"in_progress",to:"submitted",actor:"u9",comment:null,ts:dA(25)},{from:"submitted",to:"dept_approved",actor:"u5",comment:null,ts:dA(22)},{from:"dept_approved",to:"client_review",actor:"u2",comment:null,ts:dA(18)},{from:"client_review",to:"completed",actor:"u11",comment:null,ts:dA(5)}]},
  { id:"t6",  clientId:"c2", deptId:"d4", title:"Product Category Page — Frontend",  description:"Build responsive frontend for product category pages.", stage:"assigned",      priority:"critical", billingType:"one_time",  isBillable:true,  isInvoiced:false, invoiceId:null,           invoiceDate:null,       paymentStatus:null,  estimatedHours:32, actualHours:0,  revisionCount:0, revisionOverheadHours:0,  assignedTo:"u9", createdBy:"u2", dueDate:dF(14),  completedAt:null,   createdAt:dA(3),  tags:["frontend","react"], transitions:[{from:null,to:"created",actor:"u2",comment:null,ts:dA(3)},{from:"created",to:"assigned",actor:"u5",comment:null,ts:dA(2)}]},
  { id:"t7",  clientId:"c1", deptId:"d1", title:"Business Card Design",              description:"Design business cards for executive team.", stage:"completed",     priority:"medium",   billingType:"retainer", isBillable:true,  isInvoiced:true,  invoiceId:"INV-2026-002", invoiceDate:"2026-02-10", paymentStatus:"paid",estimatedHours:6,  actualHours:6,  revisionCount:0, revisionOverheadHours:0,  assignedTo:"u6", createdBy:"u1", dueDate:dF(-15), completedAt:dA(15), createdAt:dA(30), tags:["print","brand"],    transitions:[{from:null,to:"created",actor:"u1",comment:null,ts:dA(30)},{from:"created",to:"assigned",actor:"u3",comment:null,ts:dA(29)},{from:"assigned",to:"in_progress",actor:"u6",comment:null,ts:dA(28)},{from:"in_progress",to:"submitted",actor:"u6",comment:null,ts:dA(22)},{from:"submitted",to:"dept_approved",actor:"u3",comment:null,ts:dA(20)},{from:"dept_approved",to:"client_review",actor:"u2",comment:null,ts:dA(18)},{from:"client_review",to:"completed",actor:"u10",comment:null,ts:dA(15)}]},
  { id:"t8",  clientId:"c3", deptId:"d2", title:"Product Launch Promo Video",        description:"60-second product launch video.", stage:"created",       priority:"critical", billingType:"one_time",  isBillable:true,  isInvoiced:false, invoiceId:null,           invoiceDate:null,       paymentStatus:null,  estimatedHours:40, actualHours:0,  revisionCount:0, revisionOverheadHours:0,  assignedTo:null, createdBy:"u2", dueDate:dF(20),  completedAt:null,   createdAt:dA(1),  tags:["video","launch"],   transitions:[{from:null,to:"created",actor:"u2",comment:null,ts:dA(1)}]},
  { id:"t9",  clientId:"c1", deptId:"d3", title:"Monthly SEO Report — January",      description:"Comprehensive performance report.", stage:"completed",     priority:"medium",   billingType:"retainer", isBillable:true,  isInvoiced:false, invoiceId:null,           invoiceDate:null,       paymentStatus:null,  estimatedHours:5,  actualHours:4,  revisionCount:0, revisionOverheadHours:0,  assignedTo:"u8", createdBy:"u2", dueDate:dF(-25), completedAt:dA(25), createdAt:dA(40), tags:["seo","report"],     transitions:[{from:null,to:"created",actor:"u2",comment:null,ts:dA(40)},{from:"created",to:"assigned",actor:"u4",comment:null,ts:dA(39)},{from:"assigned",to:"in_progress",actor:"u8",comment:null,ts:dA(38)},{from:"in_progress",to:"submitted",actor:"u8",comment:null,ts:dA(28)},{from:"submitted",to:"dept_approved",actor:"u4",comment:null,ts:dA(27)},{from:"dept_approved",to:"client_review",actor:"u2",comment:null,ts:dA(26)},{from:"client_review",to:"completed",actor:"u10",comment:null,ts:dA(25)}]},
  { id:"t10", clientId:"c4", deptId:"d5", title:"NexusPay Mobile App UI — Phase 1",  description:"Full UI overhaul for iOS and Android.", stage:"in_progress",   priority:"critical", billingType:"retainer", isBillable:true,  isInvoiced:false, invoiceId:null,           invoiceDate:null,       paymentStatus:null,  estimatedHours:80, actualHours:30, revisionCount:0, revisionOverheadHours:0,  assignedTo:"u9", createdBy:"u1", dueDate:dF(30),  completedAt:null,   createdAt:dA(20), tags:["mobile","ui"],      transitions:[{from:null,to:"created",actor:"u1",comment:null,ts:dA(20)},{from:"created",to:"assigned",actor:"u5",comment:null,ts:dA(19)},{from:"assigned",to:"in_progress",actor:"u9",comment:null,ts:dA(18)}]},
  { id:"t11", clientId:"c3", deptId:"d6", title:"Instagram Content Calendar — March",description:"30 posts for March.", stage:"submitted",     priority:"medium",   billingType:"retainer", isBillable:true,  isInvoiced:false, invoiceId:null,           invoiceDate:null,       paymentStatus:null,  estimatedHours:15, actualHours:14, revisionCount:0, revisionOverheadHours:0,  assignedTo:"u6", createdBy:"u2", dueDate:dF(3),   completedAt:null,   createdAt:dA(8),  tags:["social","content"], transitions:[{from:null,to:"created",actor:"u2",comment:null,ts:dA(8)},{from:"created",to:"assigned",actor:"u3",comment:null,ts:dA(7)},{from:"assigned",to:"in_progress",actor:"u6",comment:null,ts:dA(6)},{from:"in_progress",to:"submitted",actor:"u6",comment:null,ts:dA(1)}]},
];

const SEED_INVOICES = [
  { id:"inv1", number:"INV-2026-001", clientId:"c2", amount:31500,  status:"paid",    issuedDate:"2026-02-01", dueDate:"2026-02-15", paidDate:"2026-02-12", taskIds:["t5"] },
  { id:"inv2", number:"INV-2026-002", clientId:"c1", amount:9000,   status:"paid",    issuedDate:"2026-02-10", dueDate:"2026-02-24", paidDate:"2026-02-20", taskIds:["t7"] },
  { id:"inv3", number:"INV-2026-003", clientId:"c1", amount:150000, status:"sent",    issuedDate:"2026-02-20", dueDate:"2026-03-06", paidDate:null,         taskIds:[] },
  { id:"inv4", number:"INV-2026-004", clientId:"c4", amount:360000, status:"overdue", issuedDate:"2026-01-15", dueDate:"2026-01-30", paidDate:null,         taskIds:[] },
];

const SEED_AUTOMATIONS = [
  { id:"a1", name:"Notify PM on Dept Approval", trigger:"stage_change", triggerValue:"dept_approved", action:"notify_email",    actionValue:"pm",       active:true  },
  { id:"a2", name:"Flag overdue tasks critical", trigger:"overdue",      triggerValue:"",              action:"change_priority", actionValue:"critical",  active:true  },
  { id:"a3", name:"Slack on client review",      trigger:"stage_change", triggerValue:"client_review", action:"notify_slack",    actionValue:"#updates", active:false },
];

// ═══════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════
const Ctx = createContext(null);
const useApp = () => useContext(Ctx);

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════
const getUser   = (id, currentUsers=null) => (currentUsers || SEED_USERS).find(u => u.id === id);
const getDept   = (id, depts) => (depts || DEPTS_DEFAULT).find(d => d.id === id);
const getClient = (id, cls)  => (cls || SEED_CLIENTS).find(c => c.id === id);
const isOverdue = (t)        => t.stage !== "completed" && t.dueDate && new Date(t.dueDate) < new Date();
const relTime   = (ts)       => ts ? new Date(ts).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const uuid      = ()         => "x" + Math.random().toString(36).slice(2, 10);

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
    primary:   { bg: hov ? "#1E40AF" : T.blue,    color: "#ffffff", border: "none",                          shadow: "0 1px 3px rgba(29,78,216,.3)" },
    secondary: { bg: hov ? "#E8ECF5" : T.surface,  color: T.textMid, border: `1px solid ${T.border}`,        shadow: "none" },
    danger:    { bg: hov ? "#B91C1C" : T.danger,   color: "#ffffff", border: "none",                          shadow: "none" },
    ghost:     { bg: hov ? T.border  : "transparent",color: T.textMid,border: "none",                         shadow: "none" },
    success:   { bg: hov ? "#047857" : T.success,  color: "#ffffff", border: "none",                          shadow: "none" },
    outline:   { bg: "transparent",                color: T.blue,    border: `1.5px solid ${T.blue}`,         shadow: "none" },
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

  const DEMOS = [
    { label: "Super Admin",     email: "sarah@agency.io",       role: "Full access" },
    { label: "Project Manager", email: "marcus@agency.io",      role: "Client & approval mgmt" },
    { label: "Dept. Manager",   email: "priya@agency.io",       role: "Design team (d1)" },
    { label: "Team Member",     email: "leo@agency.io",         role: "Design team member" },
    { label: "Client",          email: "client@techcorp.com",   role: "TechCorp portal" },
  ];

  const handleLogin = () => {
    setError(""); setLoading(true);
    setTimeout(() => {
      const u = SEED_USERS.find(u => u.email === email.trim().toLowerCase() && u.password === password);
      if (u) { onLogin(u); } else { setError("Invalid email or password. Try a demo account below."); }
      setLoading(false);
    }, 600);
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
            <Inp label="Email" value={email} onChange={setEmail} type="email" placeholder="you@agency.io" required />
            <div style={{ position: "relative" }}>
              <Inp label="Password" value={password} onChange={setPassword} type={showPass ? "text" : "password"} placeholder="••••••••" required />
              <button onClick={() => setShowPass(s => !s)} style={{ position: "absolute", right: 10, top: 30, background: "none", border: "none", cursor: "pointer", color: T.textLight, fontSize: 12, fontFamily: T.font }}>{showPass ? "Hide" : "Show"}</button>
            </div>
            <Btn full onClick={handleLogin} disabled={loading || !email || !password} size="lg" sx={{ marginTop: 4 }}>{loading ? "Signing in…" : "Sign In"}</Btn>
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Quick Demo — Click to fill</div>
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
      {task.estimatedHours > 0 && <div style={{ marginTop: 8 }}><Progress value={(task.actualHours / task.estimatedHours) * 100} color={task.actualHours > task.estimatedHours ? T.danger : T.blue} h={4} /><div style={{ fontSize: 9, color: T.textLight, marginTop: 2, fontFamily: T.fontMono }}>{task.actualHours}h / {task.estimatedHours}h</div></div>}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CREATE TASK MODAL — FIX #1 (client search), FIX #6 (billing type conditional)
// ═══════════════════════════════════════════════════════════════════════
function CreateTaskModal({ onClose, initialClient = "" }) {
  const { setTasks, currentUser, stages, clients, depts } = useApp();
  const [f, setF] = useState({ title: "", description: "", clientId: initialClient, deptId: "", priority: "medium", billingType: "retainer", isBillable: true, estimatedHours: 8, dueDate: dF(14), startDate: dF(0), tags: "" });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const ok = f.title && f.clientId && f.deptId && f.dueDate;

  const create = () => {
    if (!ok) return;
    const t = {
      id: uuid(), clientId: f.clientId, deptId: f.deptId, title: f.title, description: f.description,
      stage: "created", priority: f.priority, billingType: f.isBillable ? f.billingType : "internal",
      isBillable: f.isBillable, isInvoiced: false, invoiceId: null, invoiceDate: null, paymentStatus: null,
      estimatedHours: parseFloat(f.estimatedHours) || 0, actualHours: 0, revisionCount: 0, revisionOverheadHours: 0,
      assignedTo: null, createdBy: currentUser.id, dueDate: f.dueDate, completedAt: null,
      createdAt: new Date().toISOString(), tags: f.tags.split(",").map(x => x.trim()).filter(Boolean),
      transitions: [{ from: null, to: "created", actor: currentUser.id, comment: null, ts: new Date().toISOString() }],
    };
    setTasks(p => [...p, t]); onClose();
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
  const { tasks, currentUser, doTransition, updateTask, stages, clients, depts } = useApp();
  const task = tasks.find(t => t.id === taskId);
  const [tab, setTab] = useState("overview");
  const [txnModal, setTxnModal] = useState(null);
  const [logH, setLogH] = useState("");
  const [logN, setLogN] = useState("");
  if (!task) return null;

  const dept = getDept(task.deptId, depts);
  const client = getClient(task.clientId, clients);
  const assignee = getUser(task.assignedTo, typeof useApp === "function" ? useApp()?.users : null);
  const ov = isOverdue(task);
  const S = stages || STAGES_DEFAULT;

  const available = (TRANSITIONS_DEFAULT[task.stage] || []).filter(tx => tx.roles.includes(currentUser.role));

  return (
    <Modal title={task.title} onClose={onClose} width={700}>
      <Pipeline currentStage={task.stage} stages={S} />
      <div style={{ height: 1, background: T.border, margin: "14px 0" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
        {[[dept ? `${dept.icon} ${dept.name}` : "—", "Dept", dept?.color || T.textMid], [PRIORITY_CFG[task.priority]?.label, "Priority", PRIORITY_CFG[task.priority]?.color], [BILLING_CFG[task.billingType]?.label || "—", "Billing", BILLING_CFG[task.billingType]?.color || T.textMid], [client?.name || "—", "Client", T.text]].map(([v, l, c]) => (
          <div key={l} style={{ background: T.bg, borderRadius: T.radiusSm, padding: "9px 11px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 2 }}>{l}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: c }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, marginBottom: 16 }}>
        {[["overview", "Overview"], ["work", "Work & Subtasks"], ["discussion", `Discussion (${task.comments?.length||0})`], ["timeline", `Timeline (${task.transitions.length})`], ["billing", "Billing"]].map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: "8px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === id ? 800 : 500, fontFamily: T.font, color: tab === id ? T.blue : T.textMid, borderBottom: tab === id ? `2px solid ${T.blue}` : "2px solid transparent", marginBottom: -1 }}>{lbl}</button>
        ))}
      </div>
      {tab === "overview" && (
        <>
          {task.description && <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.7, marginBottom: 16, padding: 12, background: T.bg, borderRadius: T.radiusSm }}>{task.description}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div><div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 6 }}>Assignee</div>
              {assignee ? <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Av userId={task.assignedTo} size={28} /><div><div style={{ fontSize: 13, fontWeight: 700 }}>{assignee.name}</div><div style={{ fontSize: 11, color: T.textLight }}>{ROLE_LABELS[assignee.role]}</div></div></div> : <span style={{ fontSize: 12, color: T.textLight }}>Unassigned</span>}
            </div>
            <div><div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 6 }}>Dates</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid }}><span style={{color: T.textLight}}>Start:</span> {task.startDate ? relTime(task.startDate) : "—"}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: ov ? T.danger : T.text }}><span style={{color: T.textLight}}>Due:</span> {task.dueDate ? relTime(task.dueDate) : "—"}{ov && <span style={{ color: T.danger, marginLeft: 6, fontSize: 11, fontWeight: 700 }}>OVERDUE</span>}</div>
            </div>
          </div>
          <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 10 }}>Time Tracking</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 10 }}>
              {[["Logged", `${task.actualHours}h`, T.blue], ["Estimated", `${task.estimatedHours}h`, T.textMid], ["Remaining", `${Math.max(0, task.estimatedHours - task.actualHours)}h`, task.actualHours > task.estimatedHours ? T.danger : T.success]].map(([l, v, c]) => (
                <div key={l} style={{ textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 900, color: c, fontFamily: T.fontMono }}>{v}</div><div style={{ fontSize: 10, color: T.textLight }}>{l}</div></div>
              ))}
            </div>
            <Progress value={(task.actualHours / task.estimatedHours) * 100} color={task.actualHours > task.estimatedHours ? T.danger : T.blue} />
            {task.stage !== "completed" && (
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                {!task.timerStart ? (
                  <Btn size="sm" onClick={() => updateTask(task.id, { timerStart: new Date().toISOString() })}>▶ Start Timer</Btn>
                ) : (
                  <Btn size="sm" variant="danger" onClick={() => {
                    const h = (new Date() - new Date(task.timerStart)) / 3600000;
                    updateTask(task.id, { actualHours: task.actualHours + h, timerStart: null });
                  }}>⏹ Stop Timer</Btn>
                )}
                <div style={{ width: 1, height: 24, background: T.border }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>Manual:</span>
                <input value={logH} onChange={e => setLogH(e.target.value)} type="number" placeholder="hrs" style={{ width: 70, padding: "7px 10px", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 13, fontFamily: T.font }} />
                <input value={logN} onChange={e => setLogN(e.target.value)} placeholder="Note" style={{ flex: 1, padding: "7px 10px", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 13, fontFamily: T.font }} />
                <Btn size="sm" onClick={() => { const h = parseFloat(logH); if (h > 0) { updateTask(task.id, { actualHours: task.actualHours + h }); setLogH(""); setLogN(""); } }}>Log Time</Btn>
              </div>
            )}
          </div>
          {task.revisionCount > 0 && <div style={{ padding: 12, background: T.warningBg, border: `1px solid ${T.warningBorder}`, borderRadius: T.radiusSm, fontSize: 12, color: T.warning, fontWeight: 600 }}>⚠ {task.revisionCount} revision{task.revisionCount > 1 ? "s" : ""} · {task.revisionOverheadHours}h overhead lost</div>}
        </>
      )}
      
      {tab === "work" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: T.bg, padding: 14, borderRadius: T.radiusSm }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: T.text }}>Subtasks</div>
            <div style={{ fontSize: 11, color: T.textMid, marginBottom: 12 }}>Larger tasks divided into components</div>
            {(task.subtasks || []).map(st => (
              <div key={st.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
                <input type="checkbox" checked={st.completed} onChange={e => updateTask(task.id, { subtasks: task.subtasks.map(x => x.id === st.id ? {...x, completed: e.target.checked} : x) })} />
                <span style={{ fontSize: 13, color: st.completed ? T.textLight : T.text, textDecoration: st.completed ? "line-through" : "none", flex: 1 }}>{st.title}</span>
                <Btn size="sm" variant="ghost" onClick={() => updateTask(task.id, { subtasks: task.subtasks.filter(x => x.id !== st.id) })}>×</Btn>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input id="newSt" placeholder="New subtask..." style={{ flex: 1, padding: "6px 8px", fontSize: 12, borderRadius: T.radiusSm, border: `1px solid ${T.border}` }} onKeyDown={(e) => {
                if(e.key === "Enter" && e.target.value) {
                  updateTask(task.id, { subtasks: [...(task.subtasks||[]), { id: uuid(), title: e.target.value, completed: false }] });
                  e.target.value = "";
                }
              }} />
            </div>
          </div>
          <div style={{ background: T.bg, padding: 14, borderRadius: T.radiusSm }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: T.text }}>To-Do List</div>
            <div style={{ fontSize: 11, color: T.textMid, marginBottom: 12 }}>Checklists or minor requirements</div>
            {(task.todos || []).map(td => (
              <div key={td.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
                <input type="checkbox" checked={td.completed} onChange={e => updateTask(task.id, { todos: task.todos.map(x => x.id === td.id ? {...x, completed: e.target.checked} : x) })} />
                <span style={{ fontSize: 13, color: td.completed ? T.textLight : T.text, textDecoration: td.completed ? "line-through" : "none", flex: 1 }}>{td.title}</span>
                <Btn size="sm" variant="ghost" onClick={() => updateTask(task.id, { todos: task.todos.filter(x => x.id !== td.id) })}>×</Btn>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input id="newTd" placeholder="New to-do item..." style={{ flex: 1, padding: "6px 8px", fontSize: 12, borderRadius: T.radiusSm, border: `1px solid ${T.border}` }} onKeyDown={(e) => {
                if(e.key === "Enter" && e.target.value) {
                  updateTask(task.id, { todos: [...(task.todos||[]), { id: uuid(), title: e.target.value, completed: false }] });
                  e.target.value = "";
                }
              }} />
            </div>
          </div>
        </div>
      )}
      {tab === "discussion" && (
        <div style={{ padding: "0 4px" }}>
          {(task.comments || []).map(c => {
             const usr = getUser(c.userId, typeof useApp === "function" ? useApp()?.users : null);
             return (
               <div key={c.id} style={{ marginBottom: 16 }}>
                 <div style={{ display: "flex", gap: 10, background: T.bg, padding: 12, borderRadius: T.radiusSm }}>
                   <Av userId={c.userId} size={28} />
                   <div style={{ flex: 1 }}>
                     <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}><span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{usr?.name || "User"}</span><span style={{ fontSize: 10, color: T.textLight }}>{relTime(c.ts)}</span></div>
                     <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>{c.text}</div>
                     <div style={{ marginTop: 6 }}><span style={{ fontSize: 11, color: T.blue, cursor: "pointer", fontWeight: 700 }} onClick={() => document.getElementById(`reply-${c.id}`).style.display = 'block'}>Reply</span></div>
                   </div>
                 </div>
                 <div style={{ marginLeft: 38, borderLeft: `2px solid ${T.border}` }}>
                   {(c.replies || []).map(rp => {
                     const rUsr = getUser(rp.userId, typeof useApp === "function" ? useApp()?.users : null);
                     return (
                       <div key={rp.id} style={{ display: "flex", gap: 10, padding: "10px 12px", borderBottom: `1px solid ${T.border}` }}>
                         <Av userId={rp.userId} size={20} />
                         <div>
                           <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}><span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{rUsr?.name || "User"}</span><span style={{ fontSize: 10, color: T.textLight }}>{relTime(rp.ts)}</span></div>
                           <div style={{ fontSize: 12, color: T.text }}>{rp.text}</div>
                         </div>
                       </div>
                     );
                   })}
                   <div id={`reply-${c.id}`} style={{ display: "none", padding: "10px 12px" }}>
                     <input placeholder="Write a reply..." style={{ width: "100%", padding: "8px 10px", fontSize: 12, borderRadius: T.radiusSm, border: `1px solid ${T.border}` }} onKeyDown={(e) => {
                       if (e.key === "Enter" && e.target.value) {
                         const repls = c.replies || [];
                         const nComms = task.comments.map(x => x.id === c.id ? {...x, replies: [...repls, { id: uuid(), text: e.target.value, userId: currentUser.id, ts: new Date().toISOString() }]} : x);
                         updateTask(task.id, { comments: nComms });
                         e.target.value = "";
                         e.target.parentElement.style.display = "none";
                       }
                     }} />
                   </div>
                 </div>
               </div>
             )
          })}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <Av userId={currentUser.id} size={32} />
            <input placeholder="Add a comment... (Enter to post)" style={{ flex: 1, padding: "10px 12px", fontSize: 13, borderRadius: T.radiusSm, border: `1px solid ${T.border}` }} onKeyDown={(e) => {
              if (e.key === "Enter" && e.target.value) {
                updateTask(task.id, { comments: [...(task.comments||[]), { id: uuid(), text: e.target.value, userId: currentUser.id, ts: new Date().toISOString(), replies: [] }] });
                e.target.value = "";
              }
            }} />
          </div>
        </div>
      )}

      {tab === "timeline" && (
        <div>
          {[...task.transitions].reverse().map((tr, i) => {
            const actor = getUser(tr.actor, typeof useApp === "function" ? useApp()?.users : null);
            return (
              <div key={i} style={{ display: "flex", gap: 12, paddingBottom: 16, borderLeft: `2px solid ${tr.isRejection ? T.danger : T.border}`, paddingLeft: 14, marginLeft: 6, position: "relative" }}>
                <div style={{ position: "absolute", left: -7, top: 0, width: 12, height: 12, borderRadius: "50%", background: tr.isRejection ? T.danger : T.blue, border: `2px solid ${T.surface}` }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    {actor && <Av userId={tr.actor} size={20} />}
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{actor?.name || "System"}</span>
                    <span style={{ fontSize: 10, color: T.textLight }}>{relTime(tr.ts)}</span>
                    {tr.isRejection && <span style={{ fontSize: 10, fontWeight: 700, color: T.danger, background: T.dangerBg, padding: "1px 6px", borderRadius: 10 }}>REVISION</span>}
                  </div>
                  <div style={{ fontSize: 12, color: T.textMid }}>{tr.from ? <span>Moved → <Badge stage={tr.to} stages={S} /></span> : <span>Created → <Badge stage={tr.to} stages={S} /></span>}</div>
                  {tr.comment && <div style={{ marginTop: 6, padding: "8px 10px", background: tr.isRejection ? T.dangerBg : T.blueLight, borderRadius: T.radiusSm, fontSize: 12, color: T.textMid, borderLeft: `3px solid ${tr.isRejection ? T.danger : T.blue}` }}>{tr.comment}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {tab === "billing" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[["Billable", task.isBillable ? "Yes" : "No", task.isBillable ? T.success : T.textMid], ["Invoiced", task.isInvoiced ? "Yes" : "No", task.isInvoiced ? T.success : T.textMid], ["Invoice ID", task.invoiceId || "—", T.textMid], ["Payment", task.paymentStatus || "—", task.paymentStatus === "paid" ? T.success : T.warning]].map(([l, v, c]) => (
              <div key={l} style={{ background: T.bg, padding: "10px 12px", borderRadius: T.radiusSm }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: c }}>{v}</div>
              </div>
            ))}
          </div>
          {task.isBillable && !task.isInvoiced && task.stage === "completed" && <div style={{ padding: 12, background: T.dangerBg, border: `1px solid ${T.dangerBorder}`, borderRadius: T.radiusSm, fontSize: 12, fontWeight: 700, color: T.danger }}>⚠ Completed & billable but NOT invoiced — revenue leakage risk</div>}
        </div>
      )}
      {task.stage !== "completed" && available.length > 0 && (
        <div style={{ paddingTop: 16, borderTop: `1px solid ${T.border}`, display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.textLight }}>Actions:</span>
          {available.map(tx => <Btn key={tx.action} variant={tx.isReject ? "danger" : tx.action.includes("approve") || tx.action === "send_client" ? "success" : "primary"} size="sm" onClick={() => setTxnModal(tx)}>{tx.label}</Btn>)}
        </div>
      )}
      {task.stage === "completed" && <div style={{ marginTop: 16, padding: 12, background: T.successBg, border: `1px solid ${T.successBorder}`, borderRadius: T.radiusSm, fontSize: 13, fontWeight: 700, color: T.success }}>✓ Task completed & locked.</div>}
      {txnModal && <TxnModal task={task} tx={txnModal} onConfirm={(comment, assigneeId) => { doTransition(task.id, txnModal, comment, assigneeId); setTxnModal(null); onClose(); }} onClose={() => setTxnModal(null)} />}
    </Modal>
  );
}

function TxnModal({ task, tx, onConfirm, onClose }) {
  const [comment, setComment] = useState("");
  const [assignee, setAssignee] = useState("");
  const ctx = typeof useApp === "function" ? useApp() : {};
  const deptMembers = (ctx.users || SEED_USERS).filter(u => u.role === ROLES.TM && (Array.isArray(u.dept) ? u.dept.includes(task.deptId) : u.dept === task.deptId));
  const canSubmit = !tx.needsComment || comment.trim().length >= 10;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(13,27,62,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, backdropFilter: "blur(4px)" }}>
      <div style={{ background: T.surface, borderRadius: T.radiusLg, width: "100%", maxWidth: 420, boxShadow: T.shadowLg, padding: 24, animation: "mIn .2s ease" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 6 }}>{tx.label}</div>
        <div style={{ fontSize: 13, color: T.textMid, marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
          <Badge stage={task.stage} /> → <Badge stage={tx.to} />
        </div>
        {tx.needsAssignee && <Sel label="Assign to" value={assignee} onChange={setAssignee} required options={deptMembers.map(u => ({ value: u.id, label: u.name }))} />}
        {tx.needsComment && <><Inp label="Reason (required, min 10 chars)" value={comment} onChange={setComment} as="textarea" required placeholder="Provide clear feedback…" />{comment.length > 0 && comment.length < 10 && <div style={{ fontSize: 11, color: T.danger, marginTop: -10, marginBottom: 10 }}>Min 10 characters</div>}</>}
        {!tx.needsComment && !tx.needsAssignee && <Inp label="Comment (optional)" value={comment} onChange={setComment} as="textarea" placeholder="Optional note…" />}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn variant={tx.isReject ? "danger" : "primary"} disabled={!canSubmit || (tx.needsAssignee && !assignee)} onClick={() => onConfirm(comment || null, assignee || null)}>Confirm</Btn>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// VIEWS
// ═══════════════════════════════════════════════════════════════════════
function ListView({ tasks, onTaskClick, stages, depts }) {
  if (!tasks.length) return <div style={{ padding: 40, textAlign: "center", color: T.textLight, fontSize: 13 }}>No tasks match your filters.</div>;
  return (
    <Card sx={{ overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr style={{ background: T.bg }}>
          {["Task", "Client", "Created", "Status", "Priority", "Assignee", "Due", "Hours", ""].map(h => (
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
                  {t.assignedTo ? <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Av userId={t.assignedTo} size={22} /><span style={{ fontSize: 11, color: T.textMid }}>{(getUser(t.assignedTo, typeof useApp === "function" ? useApp()?.users : null)?.name || "").split(" ")[0]}</span></div> : <span style={{ fontSize: 11, color: T.textLight }}>—</span>}
                </td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: ov ? T.danger : days && days <= 2 ? T.warning : T.textMid, fontFamily: T.fontMono }}>{t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}</span>
                  {ov && <div style={{ fontSize: 9, color: T.danger, fontWeight: 700 }}>OVERDUE</div>}
                </td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 11, color: T.textMid, fontFamily: T.fontMono, whiteSpace: "nowrap" }}>{t.actualHours}h/{t.estimatedHours}h</td>
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
        updateTask(taskId, { stage: stageId });
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
function Sidebar({ nav, setNav, currentUser, onLogout }) {
  const { tasks } = useApp();
  const badge = (fn) => tasks.filter(fn).length;
  const items = [
    { id: "dashboard", icon: "▣",  label: "Dashboard" },
    { id: "tasks",     icon: "☑",  label: "Tasks", badge: badge(t => t.stage !== "completed" && (currentUser.role === ROLES.TM ? t.assignedTo === currentUser.id : currentUser.role === ROLES.DM ? t.deptId === currentUser.dept : true)) },
    { id: "clients",   icon: "◉",  label: "Clients" },
    { id: "billing",   icon: "◈",  label: "Billing" },
    { id: "reports",   icon: "◫",  label: "Reports" },
    { id: "audit",     icon: "🔒", label: "Audit Log" },
  ];
  if ([ROLES.SA, ROLES.PM].includes(currentUser.role)) items.push({ id: "team", icon: "👤", label: "Team" });
  items.push({ id: "settings", icon: "⚙", label: "Settings" });
  if (currentUser.role === ROLES.TM) { const bIdx = items.findIndex(i => i.id === "billing"); if (bIdx !== -1) items.splice(bIdx, 1); }

  return (
    <div style={{ width: 216, background: T.sidebar, display: "flex", flexDirection: "column", height: "100vh", position: "fixed", left: 0, top: 0, zIndex: 200, flexShrink: 0 }}>
      <div style={{ padding: "20px 16px 14px", borderBottom: `1px solid ${T.sidebarBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
  const { tasks, stages, clients, depts } = useApp();
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
    ? [{ label: "Active Tasks", value: stats.active, sub: `${tasks.length} total`, icon: "📋", color: T.blue }, { label: "Overdue", value: stats.overdue, icon: "⏰", color: T.danger, danger: true, sub: "Need attention" }, { label: "Unbilled Completed", value: stats.unbilled, icon: "💰", color: T.warning, danger: true, sub: "Revenue at risk" }, { label: "Billable Hours", value: `${stats.billHours}h`, icon: "⏱", color: T.success, sub: "Month to date" }]
    : role === ROLES.PM
      ? [{ label: "Active Tasks", value: stats.active, sub: `${myTasks.length} total`, icon: "📋", color: T.blue }, { label: "Awaiting Client", value: stats.awaitClient, icon: "👤", color: T.warning, danger: true, sub: "Need client decision" }, { label: "Overdue", value: stats.overdue, icon: "⏰", color: T.danger, danger: true, sub: "Past due date" }, { label: "Completed", value: stats.completed, icon: "✅", color: T.success, sub: "All time" }]
      : role === ROLES.DM
        ? [{ label: "Dept Tasks", value: myTasks.length, icon: "🏢", color: T.blue, sub: "Total" }, { label: "Under Review", value: stats.unreviewed, icon: "🔍", color: T.warning, danger: true, sub: "Awaiting review" }, { label: "Unassigned", value: stats.unassigned, icon: "👤", color: T.danger, danger: true, sub: "Need assignment" }, { label: "Completed", value: stats.completed, icon: "✅", color: T.success, sub: "All time" }]
        : role === ROLES.TM
          ? [{ label: "My Tasks", value: myTasks.length, sub: `${stats.active} active`, icon: "📋", color: T.blue }, { label: "Overdue", value: stats.overdue, icon: "⏰", color: T.danger, danger: true, sub: "Attention needed" }, { label: "Completed", value: stats.completed, icon: "✅", color: T.success, sub: "All time" }, { label: "Hours Logged", value: `${myTasks.reduce((a, t) => a + t.actualHours, 0)}h`, icon: "⏱", color: T.warning, sub: "Total" }]
          : [{ label: "Awaiting Approval", value: stats.awaitClient, icon: "📋", color: T.blue, sub: "Your deliverables" }, { label: "Completed", value: stats.completed, icon: "✅", color: T.success, sub: "Delivered" }];

  const priorityTasks = (role === ROLES.DM ? myTasks.filter(t => ["submitted", "created"].includes(t.stage)) : role === ROLES.PM ? myTasks.filter(t => ["dept_approved", "client_review"].includes(t.stage)) : role === ROLES.TM ? myTasks.filter(t => t.stage !== "completed") : myTasks.filter(t => isOverdue(t) || ["submitted", "client_review"].includes(t.stage))).slice(0, 6);

  const VIEWS = [["kanban", "⊞ Kanban"], ["list", "☰ List"], ["gantt", "◫ Gantt"], ["calendar", "📅 Calendar"]];

  return (
    <div>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {statCards.map((s, i) => <StatCard key={i} {...s} />)}
      </div>
      {priorityTasks.length > 0 && (
        <Card sx={{ padding: "16px 18px", marginBottom: 24 }}>
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
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>Task Views</span>
        <div style={{ display: "flex", gap: 2, background: T.bg, borderRadius: T.radiusSm, border: `1px solid ${T.border}`, padding: 3, marginLeft: 8 }}>
          {VIEWS.map(([v, l]) => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "6px 13px", borderRadius: 6, border: "none", cursor: "pointer", background: view === v ? T.surface : "transparent", color: view === v ? T.blue : T.textMid, fontSize: 12, fontWeight: 700, fontFamily: T.font, boxShadow: view === v ? T.shadow : "none", transition: "all .15s" }}>{l}</button>
          ))}
        </div>
      </div>
      {view === "list"     && <ListView     tasks={myTasks} onTaskClick={openTask} stages={stages} depts={depts} />}
      {view === "kanban"   && <KanbanView   tasks={myTasks} onTaskClick={openTask} stages={stages} depts={depts} />}
      {view === "gantt"    && <GanttView    tasks={myTasks} />}
      {view === "calendar" && <CalendarView tasks={myTasks} />}
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

  const save = () => {
    let toAdd = [];
    if (csvMode) {
      const lines = csvText.split("\n").map(l => l.trim()).filter(Boolean);
      lines.slice(1).forEach(l => {
        const [title, clientId, deptId, priority] = l.split(",");
        if (title) toAdd.push({ title, clientId: clientId||(clients||SEED_CLIENTS)[0].id, deptId: deptId||(depts||DEPTS_DEFAULT)[0].id, priority: priority||"medium" });
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
    
    setTasks(p => [...p, ...newTasks]);
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
                  <td style={{ padding: "4px 8px" }}><input value={r.title} onChange={e => updateRow(i, "title", e.target.value)} style={{ width: "100%", padding: 6, fontSize: 12 }} placeholder="Task title"/></td>
                  <td style={{ padding: "4px 8px" }}><select value={r.clientId} onChange={e => updateRow(i, "clientId", e.target.value)} style={{ width: "100%", padding: 6, fontSize: 12 }}><option value="">Select</option>{(clients||SEED_CLIENTS).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></td>
                  <td style={{ padding: "4px 8px" }}><select value={r.deptId} onChange={e => updateRow(i, "deptId", e.target.value)} style={{ width: "100%", padding: 6, fontSize: 12 }}><option value="">Select</option>{(depts||DEPTS_DEFAULT).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></td>
                  <td style={{ padding: "4px 8px" }}><select value={r.priority} onChange={e => updateRow(i, "priority", e.target.value)} style={{ width: "100%", padding: 6, fontSize: 12 }}>{Object.entries(PRIORITY_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></td>
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
  const { tasks, stages, clients, depts } = useApp();
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
    <div>
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
      {view === "list"     && <ListView     tasks={f} onTaskClick={openTask} stages={S} depts={D} />}
      {view === "kanban"   && <KanbanView   tasks={f} onTaskClick={openTask} stages={S} depts={D} />}
      {view === "gantt"    && <GanttView    tasks={f} />}
      {view === "calendar" && <CalendarView tasks={f} />}
      {showBulk && <BulkUploadModal onClose={() => setShowBulk(false)} />}
      
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CLIENTS PAGE
// ═══════════════════════════════════════════════════════════════════════
function ClientsPage({ openTask, openCreate }) {
  const { tasks, clients, setClients, depts } = useApp();
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
                <div><div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 3 }}>{cl.name}</div><div style={{ fontSize: 12, color: T.textMid }}>{cl.industry} · {cl.email}</div>{cl.gst && <div style={{ fontSize: 11, color: T.textLight, fontFamily: T.fontMono, marginTop: 2 }}>GST: {cl.gst}</div>}</div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: T.blueLight, color: T.blue, flexShrink: 0 }}>{BILLING_CFG[cl.billing]?.label}</span>
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
          <Inp label="Email" value={nf.email} onChange={v => setNF(p => ({ ...p, email: v }))} type="email" required />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Sel label="Billing Type" value={nf.billing} onChange={v => setNF(p => ({ ...p, billing: v }))} required options={Object.entries(BILLING_CFG).map(([k, v]) => ({ value: k, label: v.label }))} />
            <Inp label="Industry" value={nf.industry} onChange={v => setNF(p => ({ ...p, industry: v }))} />
            <Inp label="Monthly Retainer (₹)" value={nf.retainer} onChange={v => setNF(p => ({ ...p, retainer: v }))} type="number" />
            
          </div>
          <Inp label="GST Number" value={nf.gst} onChange={v => setNF(p => ({ ...p, gst: v }))} placeholder="27AABCT1234A1Z5" />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Btn>
            <Btn onClick={() => { if (nf.name) { setClients(p => [...p, { id: uuid(), ...nf, retainer: parseFloat(nf.retainer) || 0, portalUser: null }]); setShowAdd(false); } }} disabled={!nf.name}>Add Client</Btn>
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
  const { tasks, setTasks, invoices, setInvoices, clients, depts } = useApp();
  const [tab, setTab] = useState("overview");
  const D = depts || DEPTS_DEFAULT;
  const unbilled = tasks.filter(t => t.stage === "completed" && t.isBillable && !t.isInvoiced);
  
  const generateInvoice = (clientId) => {
    const clientUnbilled = unbilled.filter(t => t.clientId === clientId);
    if (!clientUnbilled.length) return;
    const amount = clientUnbilled.reduce((a, t) => a + (t.actualHours * 1000), 0); // Mock rate 1000/hr
    const newInv = { id: uuid(), number: "INV-" + Math.floor(Math.random()*10000), clientId, amount: amount || 5000, status: "sent", issuedDate: dF(0), dueDate: dF(14), paidDate: null, taskIds: clientUnbilled.map(t=>t.id) };
    setInvoices(p => [...p, newInv]);
    setTasks(p => p.map(t => clientUnbilled.find(c => c.id === t.id) ? { ...t, isInvoiced: true, invoiceId: newInv.id } : t));
  };

  const markPaid = (id) => {
    setInvoices(p => p.map(i => i.id === id ? { ...i, status: "paid", paidDate: dF(0) } : i));
  };

  const totalRev = invoices.filter(i => i.status === "paid").reduce((a, i) => a + i.amount, 0);
  const outstanding = invoices.filter(i => ["sent", "overdue"].includes(i.status)).reduce((a, i) => a + i.amount, 0);
  const billH = tasks.filter(t => t.isBillable).reduce((a, t) => a + t.actualHours, 0);
  const nonBillH = tasks.filter(t => !t.isBillable).reduce((a, t) => a + t.actualHours, 0);
  const TABS = [["overview", "Overview"], ["unbilled", `Unbilled (${unbilled.length})`], ["invoices", `Invoices (${invoices.length})`], ["hours", "Hours Report"]];


  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard label="Revenue Collected" value={INR(totalRev)} icon="💰" color={T.success} sub="Paid invoices" />
        <StatCard label="Outstanding" value={INR(outstanding)} icon="📤" color={T.warning} sub="Awaiting payment" />
        <StatCard label="Billable Hours" value={`${billH}h`} icon="⏱" color={T.blue} sub="Total logged" />
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
                    <span style={{ fontSize: 12, color: T.blue, fontFamily: T.fontMono, fontWeight: 800 }}>{bh}h billed</span>
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
                    <span style={{ color: T.blue, fontFamily: T.fontMono, fontWeight: 800 }}>{h}h ({Math.round(pct)}%)</span>
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
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 11, color: inv.paidDate ? T.success : T.textLight }}>{inv.paidDate || (!["paid"].includes(inv.status) ? <Btn size="sm" variant="outline" onClick={()=>markPaid(inv.id)}>Mark Paid</Btn> : "—")}</td>
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
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ fontSize: 12, color: T.textMid }}>{l}</span><span style={{ fontSize: 16, fontWeight: 900, color: c, fontFamily: T.fontMono }}>{v}h</span></div>
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
                    <span style={{ fontSize: 11, color: T.blue, fontFamily: T.fontMono, fontWeight: 800 }}>{bh}h</span>
                    <span style={{ fontSize: 11, color: T.textLight, fontFamily: T.fontMono }}>{h}h total</span>
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
  const { tasks, clients, depts } = useApp();
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
     return Object.entries(groups).map(([k,v]) => ({ label: k, ...v }));
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
            <StatCard label="Billable Hours" value={`${f.filter(t => t.isBillable).reduce((a, t) => a + t.actualHours, 0)}h`} icon="⏱" color={T.blue} sub="Total logged" />
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
                    <td style={{ padding: "9px 8px", borderBottom: `1px solid ${T.border}`, fontSize: 12, color: T.blue, fontFamily: T.fontMono, fontWeight: 700 }}>{dt.reduce((a, t) => a + t.actualHours, 0)}h</td>
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
            <Sel label="Metric to Measure" value={cMetric} onChange={setCMetric} options={[{value:"time", label:"Hours Spent"}, {value:"revisions", label:"Revision Count"}, {value:"tasks", label:"Task Volume"}]} />
            <Sel label="Group By" value={cGroup} onChange={setCGroup} options={[{value:"client", label:"Client"}, {value:"dept", label:"Department"}, {value:"stage", label:"Workflow Stage"}]} />
            <Btn sx={{ alignSelf: "flex-end" }} onClick={() => {}}>Generate Report</Btn>
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
                    <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 14, fontWeight: 800, color: T.blue, fontFamily: T.fontMono }}>{r.val} {cMetric === "time" ? "hrs" : ""}</td>
                    <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                         <span style={{ fontSize: 12, fontWeight: 700, width: 34 }}>{Math.round(pct)}%</span>
                         <Progress value={pct} color={Object.values(PRIORITY_CFG)[i%3].color} />
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
  const { tasks, depts } = useApp();
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
function TeamPage() {
  const { tasks, depts, users, setUsers } = useApp();
  const [showInvite, setShowInvite] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", role: "", dept: [] });
  
  const openInvite = () => { setForm({ name: "", email: "", role: "", dept: [] }); setEditingUser(null); setShowInvite(true); };
  const openEdit = (u) => { setForm({ name: u.name, email: u.email, role: u.role, dept: Array.isArray(u.dept) ? u.dept : (u.dept ? [u.dept] : []) }); setEditingUser(u); setShowInvite(true); };

  const save = () => {
    if(!form.name || !form.email || !form.role) return;
    if (editingUser) {
      setUsers(p => p.map(u => u.id === editingUser.id ? { ...u, ...form, av: form.name.substring(0,2).toUpperCase() } : u));
    } else {
      setUsers(p => [...p, { id: uuid(), ...form, av: form.name.substring(0,2).toUpperCase(), color: "#4F46E5", password: "temp" }]);
    }
    setShowInvite(false);
  };

  const showDept = ![ROLES.SA, ROLES.PM].includes(form.role);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}><Btn onClick={openInvite}>+ Invite Member</Btn></div>
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
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: T.successBg, color: T.success }}>Active</span><Btn size="sm" variant="ghost" onClick={() => openEdit(u)}>Edit</Btn></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                {[["Active", active.length, T.blue], ["Done", done.length, T.success], ["Overdue", ov.length, ov.length > 0 ? T.danger : T.textMid], ["Hours", `${h}h`, T.warning]].map(([l, v, c]) => (
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
  const { stages, setStages, automations, setAutomations, depts, setDepts } = useApp();
  const [tab, setTab] = useState("workflow");

  // Stage form state
  const [showAddStage, setShowAddStage] = useState(false);
  const [editingStage, setEditingStage] = useState(null); // FIX #5
  const [stageForm, setStageForm] = useState({ label: "", color: "#6366F1", bg: "#EEF2FF", approverRole: "" });

  // Dept form state — FIX #4
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: "", icon: "🏢", color: "#6366F1" });

  // Automation form state
  const [showAddAuto, setShowAddAuto] = useState(false);
  const [autoForm, setAutoForm] = useState({ name: "", trigger: "stage_change", triggerValue: "", action: "notify_email", actionValue: "", active: true });
  const [notifState, setNotifState] = useState({"Task assigned to me": true, "Stage updates": true, "Revision requested": true, "Client approval": true, "Overdue alerts": false, "Weekly summary": false});

  const TABS = [["workflow", "⚙ Workflow Builder"], ["automation", "⚡ Automations"], ["departments", "🏢 Departments"], ["roles", "🔒 Roles & Privileges"], ["notifications", "🔔 Notifications"], ["general", "🏢 General"]];

  // ── Stage CRUD ───────────────────────────────────────
  const openAddStage = () => { setEditingStage(null); setStageForm({ label: "", color: "#6366F1", bg: "#EEF2FF", approverRole: "" }); setShowAddStage(true); };
  const openEditStage = (s) => { setEditingStage(s.id); setStageForm({ label: s.label, color: s.color, bg: s.bg, approverRole: s.approverRole || "" }); setShowAddStage(true); };
  const saveStage = () => {
    if (!stageForm.label) return;
    if (editingStage) {
      setStages(p => p.map(s => s.id === editingStage ? { ...s, label: stageForm.label, color: stageForm.color, bg: stageForm.bg, approverRole: stageForm.approverRole } : s));
    } else {
      const ns = { id: uuid(), label: stageForm.label, color: stageForm.color, bg: stageForm.bg, approverRole: stageForm.approverRole, step: stages.length, terminal: false };
      setStages(p => { const arr = [...p]; arr.splice(arr.length - 1, 0, ns); return arr.map((s, i) => ({ ...s, step: i + 1 })); });
    }
    setShowAddStage(false);
  };
  const deleteStage = (id) => { if (["created", "completed"].includes(id)) return; setStages(p => p.filter(s => s.id !== id).map((s, i) => ({ ...s, step: i + 1 }))); };

  // ── Dept CRUD — FIX #4 ──────────────────────────────
  const openAddDept = () => { setEditingDept(null); setDeptForm({ name: "", icon: "🏢", color: "#6366F1" }); setShowDeptModal(true); };
  const openEditDept = (d) => { setEditingDept(d.id); setDeptForm({ name: d.name, icon: d.icon, color: d.color }); setShowDeptModal(true); };
  const saveDept = () => {
    if (!deptForm.name) return;
    if (editingDept) {
      setDepts(p => p.map(d => d.id === editingDept ? { ...d, ...deptForm } : d));
    } else {
      setDepts(p => [...p, { id: uuid(), ...deptForm }]);
    }
    setShowDeptModal(false);
  };
  const deleteDept = (id) => { if (["d1", "d2", "d3", "d4", "d5", "d6"].includes(id)) { alert("Cannot delete default departments. Custom ones can be deleted."); return; } setDepts(p => p.filter(d => d.id !== id)); };

  const addAutomation = () => {
    if (!autoForm.name || !autoForm.trigger || !autoForm.action) return;
    setAutomations(p => [...p, { id: uuid(), ...autoForm }]);
    setShowAddAuto(false); setAutoForm({ name: "", trigger: "stage_change", triggerValue: "", action: "notify_email", actionValue: "", active: true });
  };

  const ICON_OPTS = ["🎨", "🎬", "🔍", "💻", "📱", "📣", "💼", "🎧", "📊", "🛠", "🏢", "⚡", "🌐", "📧", "🤝", "📝", "🚀", "💡"];

  return (
    <div>
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${T.border}`, marginBottom: 24, overflowX: "auto" }}>
        {TABS.map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: "9px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: tab === id ? 800 : 500, fontFamily: T.font, color: tab === id ? T.blue : T.textMid, borderBottom: tab === id ? `2px solid ${T.blue}` : "2px solid transparent", marginBottom: -1, whiteSpace: "nowrap" }}>{lbl}</button>
        ))}
      </div>

      {/* ── WORKFLOW BUILDER ── */}
      {tab === "workflow" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Workflow Stage Builder</div>
              <div style={{ fontSize: 12, color: T.textMid, marginTop: 3 }}>Define task lifecycle stages. "Created" and "Completed" are system-locked (label editable).</div>
            </div>
            <Btn onClick={openAddStage}>+ Add Stage</Btn>
          </div>
          <Card sx={{ padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>Pipeline Preview</div>
            <Pipeline currentStage={stages[2]?.id || "in_progress"} stages={stages} />
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {stages.map(s => (
              <Card key={s.id} sx={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: s.bg, border: `2px solid ${s.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: s.color, fontSize: 14, flexShrink: 0 }}>{s.step}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{s.label}</span>
                      {s.isStart && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: T.blueLight, color: T.blue }}>Start</span>}
                      {s.terminal && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: T.successBg, color: T.success }}>Terminal</span>}
{s.approverRole && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: T.warningBg, color: T.warning }}>🔒 {ROLE_LABELS[s.approverRole]}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: T.textLight, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: s.color, border: `2px solid ${s.bg}`, display: "inline-block" }} />
                      <span style={{ fontFamily: T.fontMono }}>{s.color}</span>
                    </div>
                  </div>
                  {/* FIX #5 — Edit button on ALL stages */}
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn variant="outline" size="sm" onClick={() => openEditStage(s)}>Edit</Btn>
                    {!s.isStart && !s.terminal && <Btn variant="danger" size="sm" onClick={() => deleteStage(s.id)}>Remove</Btn>}
                    {(s.isStart || s.terminal) && <span style={{ fontSize: 11, color: T.textLight, padding: "5px 8px", alignSelf: "center" }}>Cannot remove</span>}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {showAddStage && (
            <Modal title={editingStage ? "Edit Stage" : "Add Workflow Stage"} onClose={() => setShowAddStage(false)}>
              <Inp label="Stage Label" value={stageForm.label} onChange={v => setStageForm(p => ({ ...p, label: v }))} required placeholder="e.g. QA Review" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: T.textMid, display: "block", marginBottom: 5 }}>Stage Color</label>
                  <input type="color" value={stageForm.color} onChange={e => setStageForm(p => ({ ...p, color: e.target.value }))} style={{ width: "100%", height: 42, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, cursor: "pointer", padding: 3 }} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: T.textMid, display: "block", marginBottom: 5 }}>Background Color</label>
                  <input type="color" value={stageForm.bg} onChange={e => setStageForm(p => ({ ...p, bg: e.target.value }))} style={{ width: "100%", height: 42, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, cursor: "pointer", padding: 3 }} />
                </div>
              </div>
              <Sel label="Requires Approval From (Optional)" value={stageForm.approverRole} onChange={v => setStageForm(p => ({ ...p, approverRole: v }))} options={Object.entries(ROLE_LABELS).map(([k,v])=>({value:k,label:v}))} />
              <div style={{ padding: 12, background: T.bg, borderRadius: T.radiusSm, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, marginBottom: 8 }}>Preview</div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, background: stageForm.bg, color: stageForm.color, fontSize: 12, fontWeight: 700, border: `1px solid ${stageForm.color}40` }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: stageForm.color }} />
                  {stageForm.label || "Stage Name"}
                </span>
              </div>
              {!editingStage && <div style={{ fontSize: 12, color: T.textMid, marginBottom: 16 }}>New stage will be inserted before "Completed".</div>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Btn variant="secondary" onClick={() => setShowAddStage(false)}>Cancel</Btn>
                <Btn onClick={saveStage} disabled={!stageForm.label}>{editingStage ? "Save Changes" : "Add Stage"}</Btn>
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* ── AUTOMATIONS ── */}
      {tab === "automation" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div><div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Workflow Automations</div><div style={{ fontSize: 12, color: T.textMid, marginTop: 3 }}>IF [trigger] THEN [action] — runs automatically.</div></div>
            <Btn onClick={() => setShowAddAuto(true)}>+ New Automation</Btn>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {automations.map(auto => (
              <Card key={auto.id} sx={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: auto.active ? T.blueLight : T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>⚡</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 6 }}>{auto.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, background: T.bg, color: T.textMid, border: `1px solid ${T.border}`, fontWeight: 600 }}>IF {AUTOMATION_TRIGGERS.find(t => t.id === auto.trigger)?.label} {auto.triggerValue && `"${auto.triggerValue}"`}</span>
                      <span style={{ fontSize: 13, color: T.blue }}>→</span>
                      <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, background: T.blueLight, color: T.blue, border: `1px solid ${T.blueMid}`, fontWeight: 600 }}>THEN {AUTOMATION_ACTIONS.find(a => a.id === auto.action)?.label} {auto.actionValue && `"${auto.actionValue}"`}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Toggle checked={auto.active} onChange={v => setAutomations(p => p.map(a => a.id === auto.id ? { ...a, active: v } : a))} />
                    <Btn variant="danger" size="sm" onClick={() => setAutomations(p => p.filter(a => a.id !== auto.id))}>Delete</Btn>
                  </div>
                </div>
              </Card>
            ))}
            {automations.length === 0 && <div style={{ padding: 40, textAlign: "center", color: T.textLight, fontSize: 13 }}>No automations yet.</div>}
          </div>
          {showAddAuto && (
            <Modal title="Create Automation" onClose={() => setShowAddAuto(false)} width={560}>
              <Inp label="Automation Name" value={autoForm.name} onChange={v => setAutoForm(p => ({ ...p, name: v }))} required placeholder="e.g. Notify PM on dept approval" />
              <div style={{ padding: 16, background: T.bg, borderRadius: T.radiusSm, marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: T.textLight, textTransform: "uppercase", marginBottom: 10 }}>Trigger (IF)</div>
                <Sel label="When…" value={autoForm.trigger} onChange={v => setAutoForm(p => ({ ...p, trigger: v }))} required options={AUTOMATION_TRIGGERS.map(t => ({ value: t.id, label: t.label }))} />
                {autoForm.trigger === "stage_change" && <Sel label="Stage" value={autoForm.triggerValue} onChange={v => setAutoForm(p => ({ ...p, triggerValue: v }))} options={stages.map(s => ({ value: s.id, label: s.label }))} />}
                {autoForm.trigger === "revision_count" && <Inp label="Exceeds count" value={autoForm.triggerValue} onChange={v => setAutoForm(p => ({ ...p, triggerValue: v }))} type="number" />}
              </div>
              <div style={{ padding: 16, background: T.blueLight, borderRadius: T.radiusSm, marginBottom: 14, border: `1px solid ${T.blueMid}` }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: T.blue, textTransform: "uppercase", marginBottom: 10 }}>Action (THEN)</div>
                <Sel label="Do this…" value={autoForm.action} onChange={v => setAutoForm(p => ({ ...p, action: v }))} required options={AUTOMATION_ACTIONS.map(a => ({ value: a.id, label: a.label }))} />
                {["notify_slack", "notify_email", "assign_to", "add_tag"].includes(autoForm.action) && <Inp label="Value" value={autoForm.actionValue} onChange={v => setAutoForm(p => ({ ...p, actionValue: v }))} placeholder={autoForm.action === "notify_slack" ? "#channel" : autoForm.action === "assign_to" ? "Team member" : "Value"} />}
                {autoForm.action === "change_priority" && <Sel label="Priority" value={autoForm.actionValue} onChange={v => setAutoForm(p => ({ ...p, actionValue: v }))} options={Object.entries(PRIORITY_CFG).map(([k, v]) => ({ value: k, label: v.label }))} />}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Toggle checked={autoForm.active} onChange={v => setAutoForm(p => ({ ...p, active: v }))} />
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Active immediately</span>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Btn variant="secondary" onClick={() => setShowAddAuto(false)}>Cancel</Btn>
                <Btn onClick={addAutomation} disabled={!autoForm.name || !autoForm.trigger || !autoForm.action}>Create</Btn>
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* ── DEPARTMENTS — FIX #3 + FIX #4 ── */}
      {tab === "departments" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Department Management</div>
              <div style={{ fontSize: 12, color: T.textMid, marginTop: 3 }}>Add, edit, or remove departments. Includes Sales & Customer Support by default.</div>
            </div>
            <Btn onClick={openAddDept}>+ Add Department</Btn>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
            {(depts || DEPTS_DEFAULT).map(d => (
              <Card key={d.id} sx={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${d.color}18`, border: `2px solid ${d.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{d.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{d.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: d.color }} />
                      <span style={{ fontSize: 11, color: T.textLight, fontFamily: T.fontMono }}>{d.color}</span>
                      <span style={{ fontSize: 10, color: T.textLight, fontFamily: T.fontMono }}>· id: {d.id}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn variant="outline" size="sm" onClick={() => openEditDept(d)}>Edit</Btn>
                    <Btn variant="danger" size="sm" onClick={() => deleteDept(d.id)}>Remove</Btn>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {showDeptModal && (
            <Modal title={editingDept ? "Edit Department" : "Add Department"} onClose={() => setShowDeptModal(false)}>
              <Inp label="Department Name" value={deptForm.name} onChange={v => setDeptForm(p => ({ ...p, name: v }))} required placeholder="e.g. Quality Assurance" />
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: T.textMid, display: "block", marginBottom: 8 }}>Icon</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {ICON_OPTS.map(ic => (
                    <button key={ic} onClick={() => setDeptForm(p => ({ ...p, icon: ic }))}
                      style={{ width: 38, height: 38, fontSize: 20, borderRadius: T.radiusSm, border: `2px solid ${deptForm.icon === ic ? T.blue : T.border}`, background: deptForm.icon === ic ? T.blueLight : T.surface, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {ic}
                    </button>
                  ))}
                  <input value={deptForm.icon} onChange={e => setDeptForm(p => ({ ...p, icon: e.target.value }))} placeholder="Custom emoji" maxLength={2}
                    style={{ width: 80, padding: "6px 10px", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 18, fontFamily: T.font, outline: "none", textAlign: "center" }} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: T.textMid, display: "block", marginBottom: 5 }}>Color</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input type="color" value={deptForm.color} onChange={e => setDeptForm(p => ({ ...p, color: e.target.value }))} style={{ width: 50, height: 42, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, cursor: "pointer", padding: 3 }} />
                  <input value={deptForm.color} onChange={e => setDeptForm(p => ({ ...p, color: e.target.value }))} style={{ flex: 1, padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 13, fontFamily: T.fontMono, outline: "none" }} />
                </div>
              </div>
              <div style={{ padding: 14, background: T.bg, borderRadius: T.radiusSm, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, marginBottom: 8 }}>Preview</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${deptForm.color}18`, border: `2px solid ${deptForm.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{deptForm.icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{deptForm.name || "Department Name"}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: deptForm.color }}>{deptForm.icon} {deptForm.name || "Name"}</div>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Btn variant="secondary" onClick={() => setShowDeptModal(false)}>Cancel</Btn>
                <Btn onClick={saveDept} disabled={!deptForm.name}>{editingDept ? "Save Changes" : "Add Department"}</Btn>
              </div>
            </Modal>
          )}
        </div>
      )}

      
      {tab === "roles" && (
        <Card sx={{ padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>Roles & Privileges</div>
          <div style={{ fontSize: 12, color: T.textMid, marginBottom: 20 }}>Customize permissions for each user role in the system.</div>
          {Object.entries(ROLE_LABELS).map(([k,v]) => (
            <div key={k} style={{ marginBottom: 16, padding: 14, border: `1px solid ${T.border}`, borderRadius: T.radiusSm }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 10 }}>{v} ({k})</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {["Create Tasks", "Edit Organization", "Approve Stages", "View Financials", "Manage Users", "Access Settings"].map(priv => {
                  const hasPriv = ["super_admin"].includes(k) || (k === "project_manager" && !["Manage Users", "Edit Organization"].includes(priv)) || (k === "dept_manager" && ["Create Tasks", "Approve Stages"].includes(priv));
                  return (
                    <div key={priv} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="checkbox" checked={hasPriv} onChange={()=>{}} style={{ accentColor: T.blue }} />
                      <span style={{ fontSize: 13, color: T.textMid }}>{priv}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <Btn sx={{ marginTop: 10 }}>Save Permissions</Btn>
        </Card>
      )}

      {tab === "notifications" && (
        <Card sx={{ padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>Notification Settings</div>
          <div style={{ fontSize: 12, color: T.textMid, marginBottom: 20 }}>Configure when and how you receive notifications.</div>
          {[["Task assigned to me", "When a dept manager assigns you a task"], ["Stage updates", "When a task you created moves stages"], ["Revision requested", "When submitted work is sent back"], ["Client approval", "When a client approves or rejects"], ["Overdue alerts", "Daily digest of overdue tasks"], ["Weekly summary", "Monday morning open-work summary"]].map(([lbl, desc]) => (
              <div key={lbl} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${T.border}` }}>
                <div><div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{lbl}</div><div style={{ fontSize: 11, color: T.textLight, marginTop: 2 }}>{desc}</div></div>
                <Toggle checked={notifState[lbl]} onChange={v => setNotifState(p => ({ ...p, [lbl]: v }))} />
              </div>
          ))}
        </Card>
      )}

      {tab === "general" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <Card sx={{ padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 16 }}>Agency Profile</div>
            <Inp label="Agency Name" value="PixelForge Agency" onChange={() => {}} />
            <Inp label="Email" value="hello@pixelforge.io" onChange={() => {}} type="email" />
            <Sel label="Currency" value="INR" onChange={() => {}} options={[{ value: "INR", label: "₹ INR — Indian Rupee" }, { value: "USD", label: "$ USD — US Dollar" }]} />
            <Inp label="GST Number" value="29AADCP9876A1Z2" onChange={() => {}} placeholder="GSTIN" />
            <Btn sx={{ marginTop: 4 }}>Save Changes</Btn>
          </Card>
          <Card sx={{ padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 16 }}>Work Hours & SLA</div>
            <Inp label="Default SLA (hours)" value="48" onChange={() => {}} type="number" />
            <Inp label="Daily Work Hours" value="8" onChange={() => {}} type="number" />
            <Sel label="Financial Year" value="apr" onChange={() => {}} options={[{ value: "apr", label: "April – March (India)" }, { value: "jan", label: "January – December" }]} />
            <Inp label="GST Rate (%)" value="18" onChange={() => {}} type="number" />
            <Btn sx={{ marginTop: 4 }}>Save Changes</Btn>
          </Card>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState(SEED_USERS);
  const [nav, setNav] = useState("dashboard");
  const [tasks, setTasks] = useState(SEED_TASKS);
  const [invoices, setInvoices] = useState(SEED_INVOICES);
  const [clients, setClients] = useState(SEED_CLIENTS);
  const [stages, setStages] = useState(STAGES_DEFAULT);
  const [depts, setDepts] = useState(DEPTS_DEFAULT); // FIX #3 & #4 — depts now in state
  const [automations, setAutomations] = useState(SEED_AUTOMATIONS);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [prefilledClient, setPrefilledClient] = useState("");

  const PAGE_TITLES = { dashboard: "Dashboard", tasks: "Tasks", clients: "Clients", billing: "Billing & Invoices", reports: "Reports", audit: "Audit Log", team: "Team", settings: "Settings" };

  const doTransition = useCallback((taskId, tx, comment, assigneeId) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const newTr = { from: t.stage, to: tx.to, actor: currentUser.id, comment: comment || null, ts: new Date().toISOString(), isRejection: !!tx.isReject };
      return { ...t, stage: tx.to, revisionCount: tx.isReject ? t.revisionCount + 1 : t.revisionCount, revisionOverheadHours: tx.isReject ? t.revisionOverheadHours + 2 : t.revisionOverheadHours, completedAt: tx.to === "completed" ? new Date().toISOString() : t.completedAt, assignedTo: tx.action === "assign" ? (assigneeId || t.assignedTo) : t.assignedTo, transitions: [...t.transitions, newTr] };
    }));
  }, [currentUser]);

  const updateTask = useCallback((id, updates) => setTasks(p => p.map(t => t.id === id ? { ...t, ...updates } : t)), []);

  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} />;

  const isClient = currentUser.role === ROLES.CL;
  const ctx = { tasks, setTasks, invoices, setInvoices, clients, setClients, stages, setStages, depts, setDepts, automations, setAutomations, users, setUsers, currentUser, doTransition, updateTask };

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
        {!isClient && <Sidebar nav={nav} setNav={setNav} currentUser={currentUser} onLogout={() => { setCurrentUser(null); setNav("dashboard"); }} />}
        <div style={{ flex: 1, marginLeft: isClient ? 0 : 216, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          <TopBar title={PAGE_TITLES[nav] || "Dashboard"} actions={
            <div style={{ display: "flex", gap: 8 }}>
              {[ROLES.SA, ROLES.PM, ROLES.DM].includes(currentUser.role) && <Btn size="sm" onClick={() => setShowCreate(true)}>+ New Task</Btn>}
            </div>
          } />
          <main style={{ flex: 1, padding: 24, overflow: "auto" }}>
            {nav === "dashboard" && <Dashboard currentUser={currentUser} setNav={setNav} openTask={setSelectedTask} />}
            {nav === "tasks"     && <TasksPage currentUser={currentUser} openTask={setSelectedTask} showCreate={showCreate} setShowCreate={setShowCreate} />}
            {nav === "tasks" && showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} />}
            {nav === "clients"   && <ClientsPage openTask={setSelectedTask} openCreate={(cId) => { setPrefilledClient(cId); setShowCreate(true); }} />}
            {nav === "billing"   && <BillingPage />}
            {nav === "reports"   && <ReportsPage />}
            {nav === "audit"     && <AuditPage />}
            {nav === "team"      && <TeamPage />}
            {nav === "settings"  && <SettingsPage />}
          </main>
        </div>
      </div>
      {selectedTask && <TaskDetail taskId={selectedTask} onClose={() => setSelectedTask(null)} />}
      {showCreate && nav !== "tasks" && <CreateTaskModal onClose={() => { setShowCreate(false); setPrefilledClient(""); }} initialClient={prefilledClient} />}
    </Ctx.Provider>
  );
}
