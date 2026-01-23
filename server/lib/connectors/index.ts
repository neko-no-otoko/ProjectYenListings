import type { Connector, ConnectorStatus } from "./types";

const connectors: Map<string, Connector> = new Map();

export function registerConnector(connector: Connector): void {
  connectors.set(connector.name, connector);
}

export function getConnector(name: string): Connector | undefined {
  return connectors.get(name);
}

export function getAllConnectors(): Connector[] {
  return Array.from(connectors.values());
}

export async function getConnectorStatuses(): Promise<ConnectorStatus[]> {
  const statuses: ConnectorStatus[] = [];
  const connectorArray = Array.from(connectors.values());
  for (const connector of connectorArray) {
    statuses.push(await connector.getStatus());
  }
  return statuses;
}

export function getEnabledConnectors(): Connector[] {
  return Array.from(connectors.values()).filter(c => c.isEnabled());
}

export function isConnectorEnabled(name: string): boolean {
  const connector = connectors.get(name);
  return connector?.isEnabled() ?? false;
}

export const CONNECTOR_NAMES = {
  CKAN_DISCOVERY: "ckan-discovery",
  CKAN_INGEST: "ckan-ingest", 
  REINFOLIB: "reinfolib",
  LIFULL: "lifull",
  ATHOME: "athome",
} as const;

export const ENV_KEYS = {
  REINFOLIB_API_KEY: "REINFOLIB_API_KEY",
  CKAN_SEARCH_BASE_URL: "CKAN_SEARCH_BASE_URL",
  TRANSLATE_PROVIDER: "TRANSLATE_PROVIDER",
  OPENAI_API_KEY: "OPENAI_API_KEY",
  DEEPL_API_KEY: "DEEPL_API_KEY",
  LIFULL_ENABLED: "LIFULL_ENABLED",
  LIFULL_CLIENT_ID: "LIFULL_CLIENT_ID",
  LIFULL_CLIENT_SECRET: "LIFULL_CLIENT_SECRET",
  LIFULL_TOKEN_URL: "LIFULL_TOKEN_URL",
  LIFULL_API_BASE: "LIFULL_API_BASE",
  ATHOME_ENABLED: "ATHOME_ENABLED",
  ATHOME_FEED_URL: "ATHOME_FEED_URL",
  INGESTION_RATE_LIMIT_PER_HOST: "INGESTION_RATE_LIMIT_PER_HOST",
} as const;

export function getEnvString(key: string, defaultValue = ""): string {
  return process.env[key] ?? defaultValue;
}

export function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function getEnvBoolean(key: string, defaultValue = false): boolean {
  const value = process.env[key]?.toLowerCase();
  if (!value) return defaultValue;
  return value === "true" || value === "1" || value === "yes";
}
