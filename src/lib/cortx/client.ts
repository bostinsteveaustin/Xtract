/**
 * Server-side Cortx API client.
 * Proxies requests to the Cortx marketplace so the API key stays server-side.
 *
 * Cortx base URL priority: APP_URL > NEXTAUTH_URL > http://localhost:3000
 * All API routes are relative: {baseUrl}/api/contexts, {baseUrl}/api/spaces, etc.
 * Set CORTX_BASE_URL in env to override (e.g. "https://app.cortx.ai").
 */

const CORTX_BASE =
  process.env.CORTX_BASE_URL ?? "https://app.cortx.ai";
const API_KEY = process.env.CORTX_API_KEY ?? "";

interface CortxSection {
  type: string;
  title: string;
  content: string;
}

export interface CortxContextSummary {
  id: string;
  title: string;
  description: string;
  contextType: string;
  status: string;
  author?: string;
}

export interface CortxContextFull extends CortxContextSummary {
  sections: CortxSection[];
}

interface BrowseResponse {
  contexts: CortxContextSummary[];
}

async function cortxFetch(path: string, init?: RequestInit) {
  const url = `${CORTX_BASE}/api${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cortx API error ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

/**
 * Browse / search published contexts on the Cortx marketplace.
 */
export async function browseMarketplace(
  search?: string,
  limit = 20
): Promise<CortxContextSummary[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("limit", String(limit));

  const data: BrowseResponse = await cortxFetch(
    `/marketplace/browse?${params.toString()}`
  );
  return data.contexts ?? [];
}

/**
 * Fetch a full context by ID (including all sections).
 */
export async function getContextById(
  contextId: string
): Promise<CortxContextFull> {
  return cortxFetch(`/contexts/${contextId}?format=json`);
}
