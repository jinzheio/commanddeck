import fs from "fs";
import os from "os";
import path from "path";
import { upsertAnalytics, upsertCountriesTop3 } from "./store";

type ProjectConfig = {
  name: string;
  path?: string;
  domain?: string;
};

type AnalyticsGroup = {
  dimensions?: { datetime?: string; datetimeHour?: string };
  sum?: {
    requests?: number;
    cachedRequests?: number;
    responseStatusMap?: Array<Record<string, any>>;
    status4xx?: number;
    status5xx?: number;
  };
};

type CountryGroup = {
  dimensions?: { clientCountryName?: string };
  sum?: { requests?: number };
};

const CONFIG_PATH = path.join(os.homedir(), ".commanddeck", "projects.json");
const CF_API = "https://api.cloudflare.com/client/v4";
const CF_GRAPHQL = "https://api.cloudflare.com/client/v4/graphql";

const zoneCache = new Map<string, string>();
let schemaCache: SchemaInfo | null = null;
let adaptiveSchemaCache: AdaptiveSchemaInfo | null = null;

function loadProjects(): ProjectConfig[] {
  if (!fs.existsSync(CONFIG_PATH)) return [];
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data.projects)) return [];
    return data.projects;
  } catch {
    return [];
  }
}

function normalizeDomain(domain?: string): string | null {
  if (!domain) return null;
  const trimmed = domain.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

type SchemaInfo = {
  dimensionField: "datetime" | "datetimeHour";
  hasStatusCounts: boolean;
  responseStatusField: string | null;
};

type AdaptiveSchemaInfo = {
  dimensionField: "clientCountryName" | null;
  requestsField: string | null;
};

async function introspectType(name: string, token: string) {
  const query = `
    query ($name: String!) {
      __type(name: $name) {
        name
        fields {
          name
          type {
            kind
            name
            ofType { kind name ofType { kind name } }
          }
        }
      }
    }
  `;
  const data = await fetchJson(CF_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables: { name } }),
  });
  if (data?.errors?.length) {
    const messages = data.errors.map((err: any) => err.message).join("; ");
    throw new Error(`GraphQL errors: ${messages}`);
  }
  return data?.data?.__type ?? null;
}

function unwrapType(type: any): string | null {
  if (!type) return null;
  if (type.name) return type.name;
  if (type.ofType) return unwrapType(type.ofType);
  return null;
}

async function getSchemaInfo(token: string): Promise<SchemaInfo> {
  if (schemaCache) return schemaCache;
  const sumType = await introspectType("HttpRequests1hGroupSum", token);
  const dimsType = await introspectType("HttpRequests1hGroupDimensions", token);
  const sumFields = new Set<string>(
    (sumType?.fields ?? []).map((field: any) => field.name)
  );
  const dimFields = new Set<string>(
    (dimsType?.fields ?? []).map((field: any) => field.name)
  );

  const dimensionField = dimFields.has("datetime")
    ? "datetime"
    : dimFields.has("datetimeHour")
      ? "datetimeHour"
      : "datetime";

  let responseStatusField: string | null = null;

  if (sumFields.has("responseStatusMap")) {
    const responseField = (sumType.fields ?? []).find(
      (field: any) => field.name === "responseStatusMap"
    );
    const typeName = unwrapType(responseField?.type);
    if (typeName) {
      const mapType = await introspectType(typeName, token);
      const mapFields = new Set<string>(
        (mapType?.fields ?? []).map((field: any) => field.name)
      );
      if (mapFields.has("responseStatus")) responseStatusField = "responseStatus";
      else if (mapFields.has("edgeResponseStatus"))
        responseStatusField = "edgeResponseStatus";
      else if (mapFields.has("status")) responseStatusField = "status";
    }
  }

  const hasStatusCounts = sumFields.has("status4xx") && sumFields.has("status5xx");
  schemaCache = { dimensionField, hasStatusCounts, responseStatusField };
  return schemaCache;
}

async function getAdaptiveSchemaInfo(token: string): Promise<AdaptiveSchemaInfo> {
  if (adaptiveSchemaCache) return adaptiveSchemaCache;
  const sumType = await introspectType("HttpRequestsAdaptiveGroupSum", token);
  const dimsType = await introspectType("HttpRequestsAdaptiveGroupDimensions", token);
  const sumFields = new Set<string>(
    (sumType?.fields ?? []).map((field: any) => field.name)
  );
  const dimFields = new Set<string>(
    (dimsType?.fields ?? []).map((field: any) => field.name)
  );

  const dimensionField = dimFields.has("clientCountryName")
    ? "clientCountryName"
    : null;

  const preferred = ["requests", "edgeRequests", "count", "visits"];
  let requestsField: string | null = null;
  for (const field of preferred) {
    if (sumFields.has(field)) {
      requestsField = field;
      break;
    }
  }

  adaptiveSchemaCache = { dimensionField, requestsField };
  return adaptiveSchemaCache;
}

function getHourStartUtc(date: Date): Date {
  const d = new Date(date);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

function getHourWindow(hours: number) {
  const end = getHourStartUtc(new Date());
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
  return { start, end };
}

function toIso(date: Date): string {
  return date.toISOString();
}

function parseStatusCounts(
  sum: AnalyticsGroup["sum"] | undefined,
  responseStatusField: string | null
) {
  let status4xx = sum?.status4xx ?? 0;
  let status5xx = sum?.status5xx ?? 0;

  if (
    responseStatusField &&
    (status4xx === 0 && status5xx === 0) &&
    sum?.responseStatusMap?.length
  ) {
    for (const entry of sum.responseStatusMap) {
      const status = entry[responseStatusField] ?? "";
      const count = entry.requests ?? 0;
      if (status.startsWith("4")) status4xx += count;
      if (status.startsWith("5")) status5xx += count;
      if (status === "4xx") status4xx += count;
      if (status === "5xx") status5xx += count;
    }
  }

  return { status4xx, status5xx };
}

async function fetchJson(url: string, options: RequestInit) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudflare API ${response.status}: ${text}`);
  }
  return response.json();
}

async function resolveZoneId(domain: string, token: string): Promise<string | null> {
  if (zoneCache.has(domain)) return zoneCache.get(domain) || null;
  const url = `${CF_API}/zones?name=${encodeURIComponent(domain)}&status=active`;
  const result = await fetchJson(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const zone = result?.result?.[0];
  if (!zone?.id) return null;
  zoneCache.set(domain, zone.id);
  return zone.id;
}

async function fetchHourly(
  zoneId: string,
  start: Date,
  end: Date,
  token: string,
  domain: string
) {
  const schema = await getSchemaInfo(token);
  const dimensionField = schema.dimensionField;
  const sumFields = ["requests", "cachedRequests"];
  if (schema.hasStatusCounts) {
    sumFields.push("status4xx", "status5xx");
  } else if (schema.responseStatusField) {
    sumFields.push(
      `responseStatusMap { ${schema.responseStatusField} requests }`
    );
  }

  const query = `
    query ($zoneTag: String!, $since: DateTime!, $until: DateTime!) {
      viewer {
        zones(filter: {zoneTag: $zoneTag}) {
          httpRequests1hGroups(
            limit: 24
            filter: {datetime_geq: $since, datetime_lt: $until}
          ) {
            dimensions { ${dimensionField} }
            sum { ${sumFields.join(" ")} }
          }
        }
      }
    }
  `;

  const data = await fetchJson(CF_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: { zoneTag: zoneId, since: toIso(start), until: toIso(end) },
    }),
  });

  if (data?.errors?.length) {
    const messages = data.errors.map((err: any) => err.message).join("; ");
    throw new Error(`GraphQL errors: ${messages}`);
  }

  if (!data?.data?.viewer?.zones?.length) {
    throw new Error("No zones returned (check token scope/zone access)");
  }

  const groups: AnalyticsGroup[] =
    data?.data?.viewer?.zones?.[0]?.httpRequests1hGroups ?? [];
  if (!groups.length) {
    console.warn(
      `[Cloudflare] Empty hourly data for ${domain} (zone ${zoneId}) ${toIso(
        start
      )} -> ${toIso(end)}`
    );
  }
  if (process.env.CLOUDFLARE_DEBUG === "1") {
    console.info(
      `[Cloudflare] Hourly response for ${domain}: ${JSON.stringify(data).slice(0, 2000)}`
    );
  }
  return { groups, schema };
}

async function fetchTopCountries(
  zoneId: string,
  start: Date,
  end: Date,
  token: string,
  domain: string
) {
  const schema = await getAdaptiveSchemaInfo(token);
  if (!schema.dimensionField || !schema.requestsField) {
    console.warn(
      `[Cloudflare] Adaptive schema missing fields (dimension=${schema.dimensionField ?? "none"}, requests=${schema.requestsField ?? "none"})`
    );
    return [];
  }
  const query = `
    query ($zoneTag: String!, $since: DateTime!, $until: DateTime!) {
      viewer {
        zones(filter: {zoneTag: $zoneTag}) {
          httpRequestsAdaptiveGroups(
            limit: 50
            filter: {datetime_geq: $since, datetime_lt: $until}
          ) {
            dimensions { ${schema.dimensionField} }
            sum { ${schema.requestsField} }
          }
        }
      }
    }
  `;

  const data = await fetchJson(CF_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: { zoneTag: zoneId, since: toIso(start), until: toIso(end) },
    }),
  });

  if (process.env.CLOUDFLARE_DEBUG === "1") {
    console.info(
      `[Cloudflare] Countries response for ${domain}: ${JSON.stringify(data).slice(0, 2000)}`
    );
  }

  if (data?.errors?.length) {
    const messages = data.errors.map((err: any) => err.message).join("; ");
    throw new Error(`GraphQL errors: ${messages}`);
  }

  if (!data?.data?.viewer?.zones?.length) {
    throw new Error("No zones returned (check token scope/zone access)");
  }

  const groups: CountryGroup[] =
    data?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups ?? [];
  return groups
    .map((entry) => ({
      country: entry.dimensions?.[schema.dimensionField as "clientCountryName"] ?? "Unknown",
      requests: entry.sum?.[schema.requestsField as keyof CountryGroup["sum"]] ?? 0,
    }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 3);
}

export async function pollCloudflareOnce() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) return;

  const projects = loadProjects();
  if (!projects.length) return;

  const { start, end } = getHourWindow(24);
  const lastHourStart = new Date(end.getTime() - 60 * 60 * 1000);

  for (const project of projects) {
    const domain = normalizeDomain(project.domain);
    if (!domain) continue;

    let zoneId: string | null = null;
    try {
      zoneId = await resolveZoneId(domain, token);
    } catch {
      console.warn(`[Cloudflare] Failed to resolve zone for ${domain}`);
      continue;
    }
    if (!zoneId) continue;

    let groups: AnalyticsGroup[] = [];
    let schema: SchemaInfo | null = null;
    try {
      const result = await fetchHourly(zoneId, start, end, token, domain);
      groups = result.groups;
      schema = result.schema;
    } catch (error: any) {
      console.warn(
        `[Cloudflare] Failed hourly analytics for ${domain}: ${error?.message ?? "unknown"}`
      );
      continue;
    }

    let stored = 0;
    for (const group of groups) {
      const tsHour =
        group.dimensions?.datetime ?? group.dimensions?.datetimeHour;
      if (!tsHour) continue;
      const requests = group.sum?.requests ?? null;
      const cachedRequests = group.sum?.cachedRequests ?? null;
      const { status4xx, status5xx } = parseStatusCounts(
        group.sum,
        schema?.responseStatusField ?? null
      );
      const cacheHitRatio =
        requests && cachedRequests !== null && requests > 0
          ? cachedRequests / requests
          : null;

      upsertAnalytics({
        project_id: domain,
        zone_id: zoneId,
        ts_hour_utc: tsHour,
        requests,
        status_4xx: status4xx ?? null,
        status_5xx: status5xx ?? null,
        cache_hit_ratio: cacheHitRatio,
        countries_top3: null,
        created_at: new Date().toISOString(),
      });
      stored += 1;
    }

    // Countries data disabled for now (schema mismatch in some accounts)

    if (stored > 0) {
      console.info(`[Cloudflare] Stored ${stored} hourly rows for ${domain}`);
    }
  }
}

export function scheduleCloudflarePolling() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) return;

  const run = async () => {
    await pollCloudflareOnce();
  };

  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setUTCMinutes(60, 0, 0);
  const delay = Math.max(1000, nextHour.getTime() - now.getTime());

  setTimeout(() => {
    run();
    setInterval(run, 60 * 60 * 1000);
  }, delay);

  run();
}

export function getAnalytics(projectId: string, hours: number) {
  const { start } = getHourWindow(hours);
  return getAnalyticsRange(projectId, start.toISOString());
}
