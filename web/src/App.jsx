import { useEffect, useMemo, useState } from "react";
import { decryptVault, encryptVault } from "./crypto.js";
import { deleteVault, getVault, saveVault } from "./api.js";
import { consumeDeepLinkCapture } from "./capture/handoff.js";
import "./styles.css";

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const emptyVault = () => ({ version: 1, groups: [], settings: { lastGroupId: null } });
const normalizeUrl = (url) => /^https?:\/\//i.test(url) ? url : `https://${url}`;

function normalizeVault(vault) {
  const safe = vault && typeof vault === "object" ? vault : emptyVault();
  return {
    version: 1,
    settings: { lastGroupId: null, ...(safe.settings || {}) },
    groups: Array.isArray(safe.groups) ? safe.groups.map((g) => ({
      id: String(g.id || uid()), name: String(g.name || "Untitled"), icon: g.icon || "folder",
      createdAt: g.createdAt || now(), updatedAt: g.updatedAt || now(),
      tabs: Array.isArray(g.tabs) ? g.tabs.map((t) => ({
        id: String(t.id || uid()), title: String(t.title || t.url || "Untitled"),
        url: String(t.url || ""), favorite: Boolean(t.favorite),
        browser: t.browser || undefined, browsingMode: t.browsingMode || undefined,
        createdAt: t.createdAt || now(),
      })) : [],
    })) : [],
  };
}

export default function App() {
  const [vault, setVault] = useState(null);
  const [password, setPassword] = useState("");
  const [encrypted, setEncrypted] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [capture, setCapture] = useState(null);
  const [newGroup, setNewGroup] = useState("");
  const [newTab, setNewTab] = useState({ title: "", url: "" });
  const [showTab, setShowTab] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    getVault().then((data) => setEncrypted(data.vault)).catch((e) => setError(e.message)).finally(() => setLoading(false));
    const incoming = consumeDeepLinkCapture();
    if (incoming) setCapture(incoming);
  }, []);

  useEffect(() => {
    const handler = (event) => setCapture(event.detail);
    window.addEventListener("tab-pri:capture", handler);
    return () => window.removeEventListener("tab-pri:capture", handler);
  }, []);

  const persist = async (next, pass = password) => {
    setBusy(true); setError("");
    try {
      const normalized = normalizeVault(next);
      const blob = await encryptVault(normalized, pass);
      await saveVault(blob);
      setVault(normalized); setEncrypted(blob);
      return true;
    } catch (e) { setError(e.message); return false; } finally { setBusy(false); }
  };

  const unlock = async () => {
    setBusy(true); setError("");
    try {
      const data = encrypted ? await decryptVault(encrypted, password) : emptyVault();
      const v = normalizeVault(data);
      setVault(v);
      if (!selectedGroup && v.groups[0]) setSelectedGroup(v.groups[0].id);
    } catch { setError("Wrong master password or corrupted vault."); }
    finally { setBusy(false); }
  };

  const createVault = async () => {
    if (password.length < 8) return setError("Use a master password with at least 8 characters.");
    await persist(emptyVault());
  };

  const mutate = (fn) => {
    if (!vault) return;
    const next = normalizeVault(structuredClone(vault));
    fn(next);
    persist(next);
  };

  const addGroup = () => {
    const name = newGroup.trim(); if (!name) return;
    mutate((v) => { const id = uid(); v.groups.push({ id, name, icon: "folder", tabs: [], createdAt: now(), updatedAt: now() }); v.settings.lastGroupId = id; });
    setNewGroup("");
  };

  const addTab = () => {
    const title = newTab.title.trim(); const url = newTab.url.trim();
    if (!url) return setError("Enter a URL.");
    const groupId = selectedGroup || vault.groups[0]?.id;
    if (!groupId) return setError("Create a group first.");
    mutate((v) => { const g = v.groups.find((x) => x.id === groupId); if (g) { g.tabs.unshift({ id: uid(), title: title || url, url: normalizeUrl(url), favorite: false, createdAt: now() }); g.updatedAt = now(); } });
    setNewTab({ title: "", url: "" }); setShowTab(false);
  };

  const renameGroup = (group) => {
    const name = prompt("Group name", group.name)?.trim(); if (!name) return;
    mutate((v) => { const g = v.groups.find((x) => x.id === group.id); if (g) { g.name = name; g.updatedAt = now(); } });
  };

  const deleteGroup = (group) => {
    if (!confirm(`Delete “${group.name}” and its ${group.tabs.length} tabs?`)) return;
    mutate((v) => { v.groups = v.groups.filter((g) => g.id !== group.id); if (v.settings.lastGroupId === group.id) v.settings.lastGroupId = v.groups[0]?.id || null; });
    if (selectedGroup === group.id) setSelectedGroup(null);
  };

  const deleteTab = (groupId, tabId) => mutate((v) => { const g = v.groups.find((x) => x.id === groupId); if (g) g.tabs = g.tabs.filter((t) => t.id !== tabId); });
  const toggleFavorite = (groupId, tabId) => mutate((v) => { const t = v.groups.find((g) => g.id === groupId)?.tabs.find((x) => x.id === tabId); if (t) t.favorite = !t.favorite; });

  const applyCapture = () => {
    if (!capture?.tabs?.length) return;
    const groupId = selectedGroup || vault.groups[0]?.id;
    if (!groupId) return setError("Create a group before importing captured tabs.");
    mutate((v) => {
      const g = v.groups.find((x) => x.id === groupId); if (!g) return;
      const existing = new Set(g.tabs.map((t) => t.url));
      for (const t of capture.tabs) if (t.url && !existing.has(t.url)) g.tabs.unshift({ id: uid(), title: t.title || t.url, url: t.url, favorite: false, browser: t.browser, browsingMode: t.browsingMode, createdAt: t.capturedAt || now() });
      g.updatedAt = now(); v.settings.lastGroupId = groupId;
    });
    setCapture(null);
  };

  const changePassword = async () => {
    if (newPassword.length < 8) return setError("New password must be at least 8 characters.");
    if (await persist(vault, newPassword)) { setPassword(newPassword); setNewPassword(""); setShowSettings(false); }
  };

  const destroy = async () => {
    if (prompt('Type DELETE to destroy the encrypted vault.') !== "DELETE") return;
    setBusy(true); setError("");
    try { await deleteVault(); setVault(null); setEncrypted(null); setPassword(""); setShowSettings(false); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const active = vault?.groups.find((g) => g.id === selectedGroup) || vault?.groups[0];
  const filtered = useMemo(() => active ? active.tabs.filter((t) => `${t.title} ${t.url}`.toLowerCase().includes(query.toLowerCase())) : [], [active, query]);
  const totalTabs = vault?.groups.reduce((n, g) => n + g.tabs.length, 0) || 0;

  if (loading) return <main className="center">Loading vault…</main>;
  if (!vault) return <main className="center"><section className="lock"><div className="logo">TP</div><h1>Tab-Pri</h1><p>{encrypted ? "Unlock your encrypted vault." : "Create your private tab vault."}</p><input autoFocus type="password" placeholder="Master password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (encrypted ? unlock() : createVault())} /><button disabled={busy} onClick={encrypted ? unlock : createVault}>{busy ? "Working…" : encrypted ? "Unlock" : "Create vault"}</button>{error && <div className="error">{error}</div>}</section></main>;

  return <div className="app">
    <aside><div className="brand"><span className="logo small">TP</span><strong>Tab-Pri</strong></div><button className="new" onClick={() => setShowTab(true)}>＋ Add tab</button><div className="groups">{vault.groups.map((g) => <button className={active?.id === g.id ? "group active" : "group"} key={g.id} onClick={() => setSelectedGroup(g.id)}><span>▱</span><span>{g.name}</span><b>{g.tabs.length}</b></button>)}</div><div className="new-group"><input value={newGroup} onChange={(e) => setNewGroup(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGroup()} placeholder="New group…" /><button onClick={addGroup}>+</button></div></aside>
    <main><header><div><p className="eyebrow">PRIVATE TAB VAULT</p><h2>{active?.name || "No group"}</h2><span>{totalTabs} saved tabs · encrypted client-side</span></div><div className="actions"><input className="search" placeholder="Search tabs…" value={query} onChange={(e) => setQuery(e.target.value)} /><button onClick={() => setShowSettings(true)}>Settings</button><button onClick={() => { setVault(null); setPassword(""); }}>Lock</button></div></header>
      {capture && <section className="capture"><div><strong>Captured browser session</strong><span>{capture.tabs?.length || 0} tabs · {capture.tabs?.filter((t) => t.browsingMode === "private").length || 0} private</span></div><div><button onClick={() => setCapture(null)}>Discard</button><button className="primary" onClick={applyCapture}>Save to {active?.name || "group"}</button></div></section>}
      <div className="toolbar">{active && <><button onClick={() => setShowTab(true)}>＋ New tab</button><button onClick={() => active.tabs.forEach((t) => window.open(t.url, "_blank", "noopener,noreferrer"))}>Open all</button><button onClick={() => renameGroup(active)}>Rename</button><button onClick={() => deleteGroup(active)}>Delete group</button></>}</div>
      <section className="grid">{filtered.map((t) => <article className="tab" key={t.id}><button className="star" onClick={() => toggleFavorite(active.id, t.id)}>{t.favorite ? "★" : "☆"}</button><div className="favicon">{t.title.slice(0,1).toUpperCase()}</div><div className="tabtext"><strong title={t.title}>{t.title}</strong><span title={t.url}>{t.url}</span>{t.browsingMode === "private" && <em>PRIVATE</em>}</div><div className="tabactions"><button onClick={() => window.open(t.url, "_blank", "noopener,noreferrer")}>Open</button><button onClick={() => deleteTab(active.id, t.id)}>×</button></div></article>)}{!filtered.length && <div className="empty"><div>◌</div><h3>{query ? "No matching tabs" : "This group is empty"}</h3><p>Add tabs manually or use the browser capture integration.</p></div>}</section>
    </main>
    {showTab && <div className="modal"><div className="dialog"><h3>Add tab</h3><input autoFocus placeholder="Title (optional)" value={newTab.title} onChange={(e) => setNewTab({ ...newTab, title: e.target.value })} /><input placeholder="https://example.com" value={newTab.url} onChange={(e) => setNewTab({ ...newTab, url: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addTab()} /><div className="dialog-actions"><button onClick={() => setShowTab(false)}>Cancel</button><button className="primary" onClick={addTab}>Save</button></div></div></div>}
    {showSettings && <div className="modal"><div className="dialog"><h3>Vault settings</h3><p className="muted">Your password is used only in this browser to derive the encryption key.</p><input type="password" placeholder="New master password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /><div className="dialog-actions"><button onClick={() => setShowSettings(false)}>Close</button><button className="primary" onClick={changePassword}>Change password</button></div><hr /><button className="danger" onClick={destroy}>Destroy encrypted vault</button></div></div>}
    {error && <div className="toast error">{error}</div>}
    {busy && <div className="busy">Saving…</div>}
  </div>;
}
