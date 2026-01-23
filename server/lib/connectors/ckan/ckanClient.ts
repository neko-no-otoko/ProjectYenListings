import { HttpClient } from "../../ingestion/httpClient";
import type { CkanPackageSearchResult, CkanPackage, CkanResourceMeta } from "../types";
import { getEnvString, getEnvNumber } from "../index";

export interface CkanApiResponse<T> {
  success: boolean;
  result: T;
  error?: { message: string; __type: string };
}

export interface CkanConnectivityResult {
  success: boolean;
  error?: string;
  responsePreview?: string;
}

export class CkanClient {
  private readonly client: HttpClient;
  private readonly baseUrl: string;
  private readonly isBackendApi: boolean;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.isBackendApi = this.baseUrl.includes("/backend/api");
    this.client = new HttpClient({
      baseUrl: this.baseUrl,
      rateLimitPerMin: getEnvNumber("INGESTION_RATE_LIMIT_PER_HOST", 60),
      retryAttempts: 3,
      retryDelayMs: 1000,
      timeout: 30000,
    });
  }

  private getPath(action: string): string {
    if (this.isBackendApi) {
      return `/${action}`;
    }
    return `/api/3/action/${action}`;
  }

  async testConnectivity(): Promise<CkanConnectivityResult> {
    const path = this.getPath("package_list");
    const response = await this.client.get<CkanApiResponse<string[]>>(
      path,
      { rows: 1 }
    );

    if (!response.success) {
      const isHtml = response.error?.includes("<!DOCTYPE") || 
                     response.error?.includes("<html") ||
                     response.error?.includes("Nuxt");
      
      if (isHtml) {
        return {
          success: false,
          error: "CKAN base URL points to frontend, not backend API. Expected: https://search.ckan.jp/backend/api",
          responsePreview: response.error?.substring(0, 200),
        };
      }
      
      return {
        success: false,
        error: response.error ?? "Failed to connect to CKAN API",
        responsePreview: response.error?.substring(0, 200),
      };
    }

    if (!response.data?.success) {
      return {
        success: false,
        error: response.data?.error?.message ?? "API returned success=false",
        responsePreview: JSON.stringify(response.data).substring(0, 200),
      };
    }

    return {
      success: true,
      responsePreview: JSON.stringify(response.data).substring(0, 200),
    };
  }

  async packageList(options?: { rows?: number }): Promise<{ success: boolean; data?: string[]; error?: string }> {
    const params: Record<string, string | number> = {};
    if (options?.rows) {
      params.rows = options.rows;
    }

    const response = await this.client.get<CkanApiResponse<string[]>>(
      this.getPath("package_list"),
      params
    );

    if (!response.success || !response.data) {
      return { success: false, error: response.error ?? "Failed to list packages" };
    }

    if (!response.data.success) {
      return { success: false, error: response.data.error?.message ?? "API error" };
    }

    return { success: true, data: response.data.result };
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
      this.getPath("package_search"),
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
      this.getPath("package_show"),
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
      this.getPath("resource_show"),
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

const CKAN_BACKEND_API_URL = "https://search.ckan.jp/backend/api";

let searchCkanJpClient: CkanClient | null = null;

export function getSearchCkanJpClient(): CkanClient {
  if (!searchCkanJpClient) {
    const baseUrl = getEnvString("CKAN_SEARCH_BASE_URL", CKAN_BACKEND_API_URL);
    searchCkanJpClient = new CkanClient(baseUrl);
  }
  return searchCkanJpClient;
}

export function resetSearchCkanJpClient(): void {
  searchCkanJpClient = null;
}
