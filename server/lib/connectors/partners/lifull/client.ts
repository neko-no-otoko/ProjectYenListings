import { getEnvString, getEnvNumber } from "../../index";
import { getAccessToken, isLifullEnabled, isLifullConfigured } from "./oauth";
import { getRateLimiter } from "../../../ingestion/rateLimiter";

export interface LifullListing {
  id: string;
  title?: string;
  price?: number;
  address?: string;
  lat?: number;
  lon?: number;
  ldk?: string;
  landAreaM2?: number;
  buildingAreaM2?: number;
  yearBuilt?: number;
  description?: string;
  images?: string[];
  url?: string;
}

export interface LifullSearchResponse {
  results: LifullListing[];
  total: number;
  page: number;
  perPage: number;
}

export class LifullClient {
  private readonly apiBase: string;
  private readonly rateLimiter: ReturnType<typeof getRateLimiter>;

  constructor() {
    this.apiBase = getEnvString("LIFULL_API_BASE", "https://api.homes.co.jp/v1");
    const host = new URL(this.apiBase).host;
    this.rateLimiter = getRateLimiter(host, getEnvNumber("INGESTION_RATE_LIMIT_PER_HOST", 60));
  }

  isConfigured(): boolean {
    return isLifullConfigured();
  }

  isEnabled(): boolean {
    return isLifullEnabled();
  }

  async searchListings(params?: {
    prefecture?: string;
    priceMax?: number;
    page?: number;
    perPage?: number;
  }): Promise<{ success: boolean; data?: LifullSearchResponse; error?: string }> {
    if (!this.isEnabled()) {
      return { success: false, error: "LIFULL connector is not enabled" };
    }

    const token = await getAccessToken();
    if (!token) {
      return { success: false, error: "Failed to obtain access token" };
    }

    try {
      await this.rateLimiter.acquire();

      const url = new URL(`${this.apiBase}/properties/search`);
      if (params?.prefecture) url.searchParams.set("prefecture", params.prefecture);
      if (params?.priceMax) url.searchParams.set("price_max", String(params.priceMax));
      if (params?.page) url.searchParams.set("page", String(params.page));
      if (params?.perPage) url.searchParams.set("per_page", String(params.perPage));

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        return { success: false, error: `API error: ${response.status}` };
      }

      const data = await response.json() as LifullSearchResponse;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getListingDetails(listingId: string): Promise<{ success: boolean; data?: LifullListing; error?: string }> {
    if (!this.isEnabled()) {
      return { success: false, error: "LIFULL connector is not enabled" };
    }

    const token = await getAccessToken();
    if (!token) {
      return { success: false, error: "Failed to obtain access token" };
    }

    try {
      await this.rateLimiter.acquire();

      const response = await fetch(`${this.apiBase}/properties/${listingId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        return { success: false, error: `API error: ${response.status}` };
      }

      const data = await response.json() as LifullListing;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}

let lifullClientInstance: LifullClient | null = null;

export function getLifullClient(): LifullClient {
  if (!lifullClientInstance) {
    lifullClientInstance = new LifullClient();
  }
  return lifullClientInstance;
}
