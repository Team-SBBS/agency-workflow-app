import sys
import re

def main():
    with open('/home/vishali/Downloads/Project management/agency-workflow-os-v3.jsx', 'r') as f:
        content = f.read()

    # 1. Add Firebase Imports
    firebase_imports = """import { useState, useCallback, useRef, createContext, useContext, useEffect } from "react";
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
"""

    content = re.sub(r'import { useState, useCallback, useRef, createContext, useContext } from "react";', firebase_imports, content)

    # 2. Update useApp to use Firestore
    app_provider_old = """function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(SEED_USERS[0]);
  const [tasks, setTasks] = useState(SEED_TASKS);
  const [invoices, setInvoices] = useState(SEED_INVOICES);
  const [clients, setClients] = useState(SEED_CLIENTS);
  const [users, setUsers] = useState(SEED_USERS);
  const [stages, setStages] = useState(STAGES_DEFAULT);
  const [depts, setDepts] = useState(DEPTS_DEFAULT);

  const updateTask = (id, updates) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };"""

    app_provider_new = """function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(SEED_USERS[0]);
  const [tasks, setTasks] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [stages, setStages] = useState(STAGES_DEFAULT);
  const [depts, setDepts] = useState(DEPTS_DEFAULT);
  const [loading, setLoading] = useState(true);

  // REAL-TIME SYNC
  useEffect(() => {
    const unsubTasks = onSnapshot(collection(db, "tasks"), (s) => {
      const data = s.docs.map(d => ({ ...d.data(), id: d.id }));
      if (data.length === 0 && loading) seedDatabase();
      setTasks(data);
      setLoading(false);
    });
    const unsubInvoices = onSnapshot(collection(db, "invoices"), (s) => setInvoices(s.docs.map(d => ({ ...d.data(), id: d.id }))));
    const unsubClients = onSnapshot(collection(db, "clients"), (s) => setClients(s.docs.map(d => ({ ...d.data(), id: d.id }))));
    const unsubUsers = onSnapshot(collection(db, "users"), (s) => setUsers(s.docs.map(d => ({ ...d.data(), id: d.id }))));
    
    return () => { unsubTasks(); unsubInvoices(); unsubClients(); unsubUsers(); };
  }, []);

  const seedDatabase = async () => {
    console.log("Seeding database...");
    for (const t of SEED_TASKS) await setDoc(doc(db, "tasks", t.id), t);
    for (const c of SEED_CLIENTS) await setDoc(doc(db, "clients", c.id), c);
    for (const u of SEED_USERS) await setDoc(doc(db, "users", u.id), u);
    for (const i of SEED_INVOICES) await setDoc(doc(db, "invoices", i.id), i);
  };

  const updateTask = async (id, updates) => {
    await updateDoc(doc(db, "tasks", id), updates);
  };

  const addClient = async (c) => await addDoc(collection(db, "clients"), c);
  const addInvoice = async (i) => await addDoc(collection(db, "invoices"), i);
  const addUser = async (u) => await addDoc(collection(db, "users"), u);"""

    content = content.replace(app_provider_old, app_provider_new)

    # Replace other state setters to use Firestore
    content = content.replace('setTasks(p => [...p, ...newTasks]);', 'newTasks.forEach(async t => await setDoc(doc(db, "tasks", t.id), t));')
    content = content.replace('setInvoices(p => [...p, newInv]);', 'await addDoc(collection(db, "invoices"), newInv);')
    content = content.replace('setUsers(p => [...p, { id: uuid(), ...nu }]);', 'await addDoc(collection(db, "users"), { ...nu });')
    content = content.replace('setClients(p => [...p, { id: uuid(), ...nf, retainer: parseFloat(nf.retainer) || 0, portalUser: null }]);', 'await addDoc(collection(db, "clients"), { ...nf, retainer: parseFloat(nf.retainer) || 0, portalUser: null });')
    
    # Billing page generateInvoice fix
    content = content.replace(
        'setTasks(p => p.map(t => clientUnbilled.find(c => c.id === t.id) ? { ...t, isInvoiced: true, invoiceId: newInv.id } : t));',
        'clientUnbilled.forEach(async t => await updateDoc(doc(db, "tasks", t.id), { isInvoiced: true, invoiceId: newInv.id }));'
    )
    
    # markPaid fix
    content = content.replace(
        'setInvoices(p => p.map(i => i.id === id ? { ...i, status: "paid", paidDate: dF(0) } : i));',
        'await updateDoc(doc(db, "invoices", id), { status: "paid", paidDate: dF(0) });'
    )

    with open('/home/vishali/Downloads/Project management/agency-workflow-os-v3.jsx', 'w') as f:
        f.write(content)

if __name__ == "__main__":
    main()
