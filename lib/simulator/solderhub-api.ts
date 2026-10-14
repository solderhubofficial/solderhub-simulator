/**
 * Base URL of the SolderHub site API (saved projects, firmware cache).
 *
 * Must be the site's canonical host. The session cookie is host-only, and a
 * `www.` -> apex redirect makes credentialed cross-origin PATCH/POST requests
 * fail their CORS preflight (browsers refuse redirected preflights), which
 * silently stopped compiled HEX from being saved. Same variable the login
 * check (use-solderhub-session) uses, so cookie host and API host always match.
 */
export const SOLDERHUB_API_BASE = (process.env.NEXT_PUBLIC_SOLDERHUB_URL || "https://solderhub.com").replace(/\/+$/, "")

export const SOLDERHUB_PROJECTS_API = `${SOLDERHUB_API_BASE}/api/simulator/projects`
export const SOLDERHUB_PROJECT_ITEM_API = `${SOLDERHUB_API_BASE}/api/simulator/project-item`
