import { HttpClient } from "../../ingestion/httpClient";
import type { CkanPackageSearchResult, CkanPackage, CkanResourceMeta } from "../types";
import { getEnvString, getEnvNumber } from "../index";

export interface CkanApiResponse<T> {
  success: boolean;
  result: T;
  error?: { message: string; __type: string };
}

export class CkanClient {
  private readonly client: HttpClient;
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.client = new HttpClient({
      baseUrl: this.baseUrl,
      rateLimitPerMin: getEnvNumber("INGESTION_RATE_LIMIT_PER_HOST", 60),
      retryAttempts: 3,
      retryDelayMs: 1000,
      timeout: 30000,
    });
  }

  async packageSearch(
    query: string,
    options?: { rows?: number; start?: number; fq?: string }
  ): Promise<{ success: boolean; data?: CkanPackageSearchResult; error?: string }> {
    const params: Record<string, string | number> = {
      q: query,
      rows: options?.rows ?? 100,
      start: options?.start ?? 0,
    };
    
    if (options?.fq) {
      params.fq = options.fq;
    }

    const response = await this.client.get<CkanApiResponse<CkanPackageSearchResult>>(
      "/api/3/action/package_search",
      params
    );

    if (!response.success || !response.data) {
      return { success: false, error: response.error ?? "Failed to search packages" };
    }

    if (!response.data.success) {
      return { success: false, error: response.data.error?.message ?? "API error" };
    }

    return { success: true, data: response.data.result };
  }

  async packageShow(packageId: string): Promise<{ success: boolean; data?: CkanPackage; error?: string }> {
    const response = await this.client.get<CkanApiResponse<CkanPackage>>(
      "/api/3/action/package_show",
      { id: packageId }
    );

    if (!response.success || !response.data) {
      return { success: false, error: response.error ?? "Failed to fetch package" };
    }

    if (!response.data.success) {
      return { success: false, error: response.data.error?.message ?? "API error" };
    }

    return { success: true, data: response.data.result };
  }

  async resourceShow(resourceId: string): Promise<{ success: boolean; data?: CkanResourceMeta; error?: string }> {
    const response = await this.client.get<CkanApiResponse<CkanResourceMeta>>(
      "/api/3/action/resource_show",
      { id: resourceId }
    );

    if (!response.success || !response.data) {
      return { success: false, error: response.error ?? "Failed to fetch resource" };
    }

    if (!response.data.success) {
      return { success: false, error: response.data.error?.message ?? "API error" };
    }

    return { success: true, data: response.data.result };
  }

  async downloadResource(url: string): Promise<{ success: boolean; data?: Buffer; error?: string; contentType?: string }> {
    return this.client.downloadFile(url);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

let searchCkanJpClient: CkanClient | null = null;

export function getSearchCkanJpClient(): CkanClient {
  if (!searchCkanJpClient) {
    const baseUrl = getEnvString("CKAN_SEARCH_BASE_URL", "https://search.ckan.jp");
    searchCkanJpClient = new CkanClient(baseUrl);
  }
  return searchCkanJpClient;
}
