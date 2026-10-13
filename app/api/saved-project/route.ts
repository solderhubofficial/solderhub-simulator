import { NextRequest, NextResponse } from "next/server"

const SOLDERHUB_PROJECT_API = "https://www.solderhub.com/api/simulator/projects"

/**
 * Same-origin proxy for SolderHub's public saved-project API.
 * Browser requests stay on the simulator origin to avoid CORS/redirect issues.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim()
  const visibility = req.nextUrl.searchParams.get("visibility")
  if ((!id && visibility !== "public") || (id && id.length > 100)) {
    return NextResponse.json({ error: "A valid project ID or visibility=public is required" }, { status: 400 })
  }

  const query = id
    ? `id=${encodeURIComponent(id)}`
    : "visibility=public"

  try {
    const upstream = await fetch(`${SOLDERHUB_PROJECT_API}?${query}`, {
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
