import { getEnvString, getEnvBoolean } from "../../index";
import { getRateLimiter } from "../../../ingestion/rateLimiter";
import { parseCSV, parseJSON } from "../../ckan/datasetParsers";

export interface AtHomeFeedConfig {
  enabled: boolean;
  feedUrl: string;
  format: "json" | "csv";
}

export function getAtHomeConfig(): AtHomeFeedConfig {
  return {
    enabled: getEnvBoolean("ATHOME_ENABLED", false),
    feedUrl: getEnvString("ATHOME_FEED_URL", ""),
    format: getEnvString("ATHOME_FEED_FORMAT", "json") as "json" | "csv",
  };
}

export function isAtHomeConfigured(): boolean {
  const config = getAtHomeConfig();
  return config.enabled && !!config.feedUrl;
}

export function isAtHomeEnabled(): boolean {
  return getEnvBoolean("ATHOME_ENABLED", false) && isAtHomeConfigured();
}

export async function fetchAtHomeFeed(): Promise<{
  success: boolean;
  data?: Buffer;
  error?: string;
  contentType?: string;
}> {
  const config = getAtHomeConfig();
  
  if (!isAtHomeEnabled()) {
    return { success: false, error: "AtHome feed is not enabled" };
  }
  
  const url = config.feedUrl;
  
  if (url.startsWith("https://") || url.startsWith("http://")) {
    return fetchHttpFeed(url);
  }
  
  if (url.startsWith("s3://")) {
    return { success: false, error: "S3 feed fetching not implemented (TODO)" };
  }
  
  if (url.startsWith("ftp://") || url.startsWith("sftp://")) {
    return { success: false, error: "FTP/SFTP feed fetching not implemented (TODO)" };
  }
  
  return { success: false, error: `Unsupported feed URL scheme: ${url}` };
}

async function fetchHttpFeed(url: string): Promise<{
  success: boolean;
  data?: Buffer;
  error?: string;
  contentType?: string;
}> {
  try {
    const host = new URL(url).host;
    const rateLimiter = getRateLimiter(host, 60);
    await rateLimiter.acquire();
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "AkiyaFinder/1.0 (licensed feed client)",
        "Accept": "application/json, text/csv, */*",
      },
    });
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "";
    
    return {
      success: true,
      data: Buffer.from(arrayBuffer),
      contentType,
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export function parseAtHomeFeed(data: Buffer, format: string): ReturnType<typeof parseCSV | typeof parseJSON> {
  if (format.toLowerCase() === "csv") {
    return parseCSV(data);
  }
  return parseJSON(data);
}
