"use client"

import { useEffect, useState } from "react"
import { ArrowUpRight, FolderOpen, Loader2, RefreshCw, X } from "lucide-react"

const API = "/api/saved-project?visibility=public"

type PublicProject = {
  id: string
  name: string
  description: string | null
  visibility: "public"
  updated_at: string
  firmware_status: string
  firmware_target: string | null
}

export function PublicProjectsPanel() {
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<PublicProject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(API, { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Couldn't load public projects.")
      setProjects(Array.isArray(data.projects) ? data.projects : [])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't connect to the project library.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener("simulator:open-public-projects", show)
    return () => window.removeEventListener("simulator:open-public-projects", show)
  }, [])

  useEffect(() => {
    if (open) void refresh()
    // refresh is intentionally invoked whenever the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/60 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
      <section role="dialog" aria-modal="true" aria-labelledby="public-projects-title" className="flex max-h-[min(88dvh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><FolderOpen className="size-4" /></div>
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-primary">SolderHub cloud / 01</p>
              <h2 id="public-projects-title" className="text-base font-bold tracking-tight">Public Projects</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Ready-made circuits shared by the community.</p>
            </div>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close public projects" className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-4" /></button>
        </header>
        <div className="sim-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading public projects…</div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/25 p-4 text-sm text-destructive"><p>{error}</p><button type="button" onClick={() => void refresh()} className="mt-3 inline-flex items-center gap-2 underline"><RefreshCw className="size-3.5" /> Try again</button></div>
          ) : projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center"><FolderOpen className="mx-auto size-7 text-muted-foreground/50" /><p className="mt-3 text-sm font-semibold">No public cloud projects yet</p><p className="mt-1 text-xs text-muted-foreground">Public projects saved to SolderHub will appear here.</p></div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {projects.map((project, index) => (
                <button key={project.id} type="button" onClick={() => { window.location.href = `/?saved=${encodeURIComponent(project.id)}` }} className="group flex min-h-32 flex-col items-start justify-between rounded-xl border border-border/80 bg-background/50 p-3 text-left transition-all hover:border-primary/50 hover:bg-primary/[0.04] focus-visible:border-primary">
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 font-mono text-[10px] font-bold text-primary">{String(index + 1).padStart(2, "0")}</span>
                    <ArrowUpRight className="size-3.5 text-muted-foreground group-hover:text-primary" />
                  </span>
                  <span className="mt-3 block w-full">
                    <span className="block text-sm font-semibold text-foreground">{project.name}</span>
                    <span className="mt-1 block line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{project.description || "Public SolderHub circuit project."}</span>
                    <span className="mt-2 block font-mono text-[9px] uppercase tracking-wide text-muted-foreground">{project.firmware_status === "compiled" ? "Firmware cached" : "Compile in simulator"}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <footer className="flex items-center justify-between border-t border-border px-4 py-3 text-[10px] text-muted-foreground"><span>{projects.length} public project{projects.length === 1 ? "" : "s"}</span><button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-1.5 underline underline-offset-2 disabled:opacity-50"><RefreshCw className="size-3" /> Refresh</button></footer>
      </section>
    </div>
  )
}
