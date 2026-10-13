"use client"
import { requestFitView } from "@/lib/simulator/fit-request"
import { useEffect, useState } from "react"
import { Folder, Save, Trash2, X, ArrowUpRight, Globe, Loader2, Copy } from "lucide-react"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import type { PlacedComponent, Wire } from "@/types/simulator"
import type { ActiveFirmware } from "@/components/simulator/firmware-runner"

const API = "https://www.solderhub.com/api/simulator/projects"
const ITEM_API = "https://www.solderhub.com/api/simulator/project-item"
const SOURCE_KEY = "solderhub-simulator:sketch-draft"
const ACTIVE_KEY = "solderhub-simulator:active-project-id"
type SavedProject = { id: string; name: string; description: string | null; visibility: "private" | "public"; created_at: string; updated_at: string; firmware_status: string; firmware_target: string | null }
type ProjectDetail = SavedProject & { circuit_data: { components?: PlacedComponent[]; wires?: Wire[]; code?: { source?: string }; [key: string]: unknown }; firmware_hex?: string | null; firmware_source_hash?: string | null }
async function sha256(value: string) { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, "0")).join("") }

export function MyProjectsPanel({ open, onClose, onFirmwareLoaded }: { open: boolean; onClose: () => void; onFirmwareLoaded?: (firmware: ActiveFirmware) => void }) {
  const { state, dispatch } = useSimulator()
  const [projects, setProjects] = useState<SavedProject[]>([])
  const [projectName, setProjectName] = useState("My circuit")
  const [isPublic, setIsPublic] = useState(false)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(API, { credentials: "include", cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(res.status === 401 ? "Sign in at solderhub.com in this browser to sync projects." : data.error || "Couldn't load projects.")
      setProjects(Array.isArray(data.projects) ? data.projects : [])
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't connect to SolderHub.") }
    finally { setLoading(false) }
  }
  useEffect(() => { if (open) void refresh() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [open])
  if (!open) return null

  const circuitData = (source: string) => ({ format: "solderhub-simulator-project", version: 1, board: state.components.some(c => c.type === "arduino-uno") ? "arduino-uno" : "custom", components: state.components, wires: state.wires, code: { language: "cpp", board: "arduino-uno", source } })
  const saveCurrent = async () => {
    if (!projectName.trim() || !state.components.length || busy) return
    setBusy(true); setError(null); setNotice(null)
    try {
      const source = window.localStorage.getItem(SOURCE_KEY) ?? ""
      const res = await fetch(API, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: projectName.trim(), description: "Saved from SolderHub Simulator", visibility: isPublic ? "public" : "private", circuit_data: circuitData(source) }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Couldn't save this project.")
      const p = data.project as SavedProject
      window.localStorage.setItem(ACTIVE_KEY, p.id)
      setProjectName("My circuit"); setIsPublic(false)
      setNotice(p.visibility === "public" ? `Public project saved: https://simulator.solderhub.com/?saved=${p.id}` : "Project saved to your SolderHub account.")
      await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't save this project.") }
    finally { setBusy(false) }
  }
  const loadProject = async (p: SavedProject) => {
    setBusy(true); setError(null); setNotice(null)
    try {
      const res = await fetch(`${API}?id=${encodeURIComponent(p.id)}`, { credentials: "include", cache: "no-store" })
      const data = await res.json()
      if (!res.ok || !data.project) throw new Error(data.error || "Couldn't load project.")
      const detail = data.project as ProjectDetail
      const components = detail.circuit_data?.components, wires = detail.circuit_data?.wires
      if (!Array.isArray(components) || !Array.isArray(wires)) throw new Error("Unsupported saved circuit format.")
      dispatch({ type: "LOAD_STATE", state: { components, wires } }); requestFitView()
      const source = detail.circuit_data?.code?.source
      if (typeof source === "string") { window.localStorage.setItem(SOURCE_KEY, source); window.dispatchEvent(new CustomEvent("solderhub:load-sketch", { detail: source })) }
      window.localStorage.setItem(ACTIVE_KEY, detail.id)
      let cached = false
      if (detail.firmware_status === "compiled" && detail.firmware_hex && detail.firmware_source_hash && typeof source === "string" && await sha256(source) === detail.firmware_source_hash) {
        const board = components.find(c => c.type === "arduino-uno")
        if (board) { dispatch({ type: "SET_RUNNING", isRunning: true }); onFirmwareLoaded?.({ componentId: board.id, hex: detail.firmware_hex }); cached = true }
      }
      setNotice(cached ? "Loaded with source-matched cached firmware." : detail.visibility === "public" ? `Public link: https://simulator.solderhub.com/?saved=${detail.id}` : "Project loaded. Compile to build or refresh its firmware.")
      onClose()
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't load project.") }
    finally { setBusy(false) }
  }
  const deleteProject = async (id: string) => {
    if (busy) return
    setBusy(true); setError(null)
    try {
      const res = await fetch(`${ITEM_API}?id=${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Couldn't delete project.")
      if (window.localStorage.getItem(ACTIVE_KEY) === id) window.localStorage.removeItem(ACTIVE_KEY)
      await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't delete project.") }
    finally { setBusy(false) }
  }
  const copyLink = async (id: string) => { const url = `https://simulator.solderhub.com/?saved=${id}`; try { await navigator.clipboard.writeText(url); setNotice("Public link copied.") } catch { setNotice(url) } }

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/55 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="my-projects-title" className="flex max-h-[min(88dvh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5"><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><Folder className="size-4" /></div><div><p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-primary">SolderHub cloud / 02</p><h2 id="my-projects-title" className="text-base font-bold tracking-tight">My Projects</h2></div></div><button type="button" onClick={onClose} aria-label="Close My Projects" className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-4" /></button></header>
      <div className="flex flex-col gap-3 border-b border-border/80 bg-muted/15 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="min-w-0 flex-1"><span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Project name</span><input value={projectName} onChange={e => setProjectName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void saveCurrent() }} maxLength={120} placeholder="e.g. ESP32 motion alarm" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-primary" /></label><button type="button" onClick={() => void saveCurrent()} disabled={busy || !state.components.length || !projectName.trim()} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-mono text-[10px] font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-40">{busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save circuit</button></div><label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} /> Make public for article links</label></div>
      {error && <p role="alert" className="px-4 pt-3 text-xs text-destructive">{error}</p>}
      {notice && <div className="flex items-start gap-2 px-4 pt-3 text-xs text-muted-foreground"><span className="min-w-0 flex-1 break-all">{notice}</span>{notice.includes("https://") && <button type="button" onClick={() => { const m = notice.match(/https:\/\/[^\s]+/); if (m) void navigator.clipboard.writeText(m[0]) }} aria-label="Copy link"><Copy className="size-3.5" /></button>}</div>}
      <div className="sim-scrollbar min-h-0 flex-1 overflow-y-auto p-4">{loading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Syncing projects…</div> : projects.length === 0 ? <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 py-12 text-center"><Folder className="size-7 text-muted-foreground/50" /><p className="mt-3 text-sm font-semibold">No cloud projects yet</p><p className="mt-1 max-w-sm text-xs text-muted-foreground">Sign in at SolderHub, place parts, wire the circuit and save it here.</p></div> : <div className="grid gap-2 sm:grid-cols-2">{projects.map(p => <article key={p.id} className="rounded-xl border border-border/80 bg-background/50 p-3"><div className="flex items-start gap-2"><div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Folder className="size-4" /></div><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold">{p.name}</h3><p className="mt-1 font-mono text-[9px] text-muted-foreground">{p.firmware_status === "compiled" ? "HEX cached" : p.firmware_status.replace("_", " ")} · {p.visibility}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(p.updated_at).toLocaleString()}</p></div></div><div className="mt-3 flex gap-2"><button type="button" disabled={busy} onClick={() => void loadProject(p)} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-primary/25 bg-primary/10 text-xs font-semibold text-primary disabled:opacity-50">Load project <ArrowUpRight className="size-3.5" /></button>{p.visibility === "public" && <button type="button" onClick={() => void copyLink(p.id)} aria-label="Copy public project link" className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground"><Globe className="size-3.5" /></button>}<button type="button" disabled={busy} onClick={() => void deleteProject(p.id)} aria-label={`Delete ${p.name}`} className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive disabled:opacity-50"><Trash2 className="size-3.5" /></button></div></article>)}</div>}</div>
      <footer className="flex items-center justify-between border-t border-border px-4 py-3 text-[10px] text-muted-foreground"><span>Supabase · up to 100 projects per account</span><button type="button" onClick={() => void refresh()} className="underline underline-offset-2">Refresh</button></footer>
    </section>
  </div>
}
