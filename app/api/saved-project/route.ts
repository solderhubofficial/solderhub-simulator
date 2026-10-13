import { NextRequest, NextResponse } from "next/server"

const SOLDERHUB_PROJECT_API = "https://www.solderhub.com/api/simulator/projects"

/**
 * Same-origin proxy for public SolderHub simulator projects.
 * Keeping the upstream request server-side avoids browser CORS and redirect
 * behavior between simulator.solderhub.com and www.solderhub.com.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim()
  if (!id || id.length > 100) {
    return NextResponse.json({ error: "A valid project ID is required" }, { status: 400 })
  }

  try {
    const upstream = await fetch(`${SOLDERHUB_PROJECT_API}?id=${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "follow",
    })

    const contentType = upstream.headers.get("content-type") ?? ""
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: `SolderHub project API returned a non-JSON response (HTTP ${upstream.status})` },
        { status: upstream.ok ? 502 : upstream.status },
      )
    }

    const body = await upstream.json()
    return NextResponse.json(body, {
      status: upstream.status,
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    return NextResponse.json(
      { error: "The simulator server could not reach the SolderHub project API" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    )
  }
}
