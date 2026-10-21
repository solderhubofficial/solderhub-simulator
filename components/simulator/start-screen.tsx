"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { ProjectThumbnail } from "@/components/simulator/project-thumbnail"
import { boardLabel, loadProjects, type ProjectCard } from "@/components/simulator/public-projects-panel"
import { getBoardSupport } from "@/lib/simulator/board-support"

/** First-run start screen: blank bench, import, or a working example. Shown only over an empty canvas. */
export function StartScreen() {
  const { state } = useSimulator()
  const [dismissed, setDismissed] = useState(true)
  const [cards, setCards] = useState<ProjectCard[]>([])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setDismissed(["saved", "project", "embed", "circuit", "demo"].some((key) => params.has(key)))
  }, [])
  useEffect(() => {
    if (dismissed) return
    let live = true
    loadProjects().then((all) => { if (live) setCards(all.slice(0, 8)) }).catch(() => {})
    return () => { live = false }
  }, [dismissed])

  if (dismissed || state.components.length > 0) return null

  return (
    <div className="absolute inset-0 z-20 overflow-y-auto bg-background">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-10 px-5 pb-12 pt-10 sm:px-8 sm:pt-14">
        <section className="flex flex-wrap items-end gap-6">
          <div className="min-w-0 flex-1 basis-[480px]">
            <h1 className="mb-2.5 text-3xl font-semibold leading-tight tracking-tight sm:text-[40px]">Wire it. Code it. Run it.</h1>
            <p className="max-w-[56ch] text-[17px] leading-relaxed text-muted-foreground">
              Build a circuit, write the sketch and watch it run in your browser. Pick a starting point below, or begin with a blank bench.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button type="button" onClick={() => setDismissed(true)} className="flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-[15px] font-semibold text-primary-foreground hover:opacity-90">
              <Plus className="size-4" strokeWidth={2.6} />
              Blank project
            </button>
            <button
              type="button"
              onClick={() => document.querySelector<HTMLInputElement>('input[type="file"][accept*="json"]')?.click()}
              className="h-12 rounded-xl border border-border px-5 text-[15px] font-medium hover:bg-muted"
            >
              Import file
            </button>
          </div>
        </section>

        <section aria-labelledby="start-h">
          <div className="mb-3.5 flex flex-wrap items-baseline gap-3">
            <h2 id="start-h" className="text-lg font-semibold">Start from a working example</h2>
            <span className="text-[13px] text-muted-foreground">Each one runs as soon as you open it</span>
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("simulator:open-public-projects"))} className="ml-auto text-[13px] font-medium text-primary hover:underline">
              Browse all examples
            </button>
          </div>
          {cards.length === 0 && <p className="text-sm text-muted-foreground">Examples appear here once the project library has loaded.</p>}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
            {cards.map((card) => {
              const support = getBoardSupport(card.boardType)?.support
              return (
                <a key={card.id} href={`/?saved=${encodeURIComponent(card.id)}`} className="flex flex-col overflow-hidden rounded-[14px] border border-border bg-card transition-colors hover:border-primary">
                  <div className="h-[130px] bg-background">
                    <ProjectThumbnail family={card.family} boardType={card.boardType} imageUrl={card.imageUrl} components={card.components} wires={card.wires} />
                  </div>
                  <div className="px-4 pb-4 pt-3.5">
                    <div className="truncate text-[15px] font-semibold">{card.name}</div>
                    <div className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">{card.description || "Working example"}</div>
                    <span className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${support === "runtime" ? "bg-status-running/15 text-status-running" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"}`}>
                      {boardLabel(card)} · {support === "runtime" ? "Runs" : "Preview only"}
                    </span>
                  </div>
                </a>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
