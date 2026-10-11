import Link from "next/link"

export default function LicensePage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 text-foreground sm:px-8">
      <Link href="/" className="text-sm font-medium text-primary hover:underline">← Back to simulator</Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">License and source code</h1>
      <p className="mt-4 leading-7 text-muted-foreground">
        SolderHub Simulator is licensed under the GNU Affero General Public License, version 3 or (at your option) any later version (AGPL-3.0-or-later).
      </p>
      <section className="mt-6 rounded-xl border border-border p-5">
        <h2 className="text-lg font-semibold">Your AGPL rights</h2>
        <p className="mt-2 leading-7 text-muted-foreground">
          You may use, study, modify, and redistribute this software under the license terms. If you interact with a modified version over a network, the operator must offer access to the corresponding source code for that version at no charge.
        </p>
        <p className="mt-3 leading-7 text-muted-foreground">This software is provided without warranty; see the complete license for details.</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium">
          <a className="text-primary hover:underline" href="https://github.com/solderhubofficial/solderhub-simulator" target="_blank" rel="noreferrer">View source repository</a>
          <a className="text-primary hover:underline" href="https://github.com/solderhubofficial/solderhub-simulator/blob/feat/velxio-agpl-board-expansion/LICENSE" target="_blank" rel="noreferrer">Read full AGPL license</a>
        </div>
      </section>
      <p className="mt-6 text-sm leading-6 text-muted-foreground">Third-party libraries, board artwork, and component assets may have their own license and attribution requirements. See the repository's THIRD_PARTY_NOTICES.md and docs/AGPL-COMPLIANCE.md.</p>
    </main>
  )
}
