import { HttpClient } from "../../ingestion/httpClient";
import { getEnvString, getEnvNumber } from "../index";

export interface ReinfolibTransactionResponse {
  status: string;
  data?: ReinfolibTransactionRecord[];
}

export interface ReinfolibTransactionRecord {
  Type?: string;
  Region?: string;
  MunicipalityCode?: string;
  Prefecture?: string;
  Municipality?: string;
  DistrictName?: string;
  TradePrice?: string;
  PricePerUnit?: string;
  FloorPlan?: string;
  Area?: string;
  UnitPrice?: string;
  LandShape?: string;
  Frontage?: string;
  TotalFloorArea?: string;
  BuildingYear?: string;
  Structure?: string;
  Use?: string;
  Purpose?: string;
  Direction?: string;
  Classification?: string;
  Breadth?: string;
  CityPlanning?: string;
  CoverageRatio?: string;
  FloorAreaRatio?: string;
  Period?: string;
  Renovation?: string;
  Remarks?: string;
}

export class ReinfolibClient {
  private readonly client: HttpClient;
  private readonly apiKey: string;

  constructor() {
    const baseUrl = getEnvString("REINFOLIB_BASE_URL", "https://www.reinfolib.mlit.go.jp/ex-api/external");
    this.apiKey = getEnvString("REINFOLIB_API_KEY", "");
    
    this.client = new HttpClient({
      baseUrl,
      apiKey: this.apiKey,
      apiKeyHeader: "Ocp-Apim-Subscription-Key",
      rateLimitPerMin: getEnvNumber("INGESTION_RATE_LIMIT_PER_HOST", 60),
      retryAttempts: 3,
      retryDelayMs: 2000,
      timeout: 30000,
    });
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async getTransactions(params: {
    year: number;
    quarter: number;
    area?: string;
    city?: string;
  }): Promise<{ success: boolean; data?: ReinfolibTransactionRecord[]; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: "Reinfolib API key not configured" };
    }

    const response = await this.client.get<ReinfolibTransactionResponse>(
      "/XIT001",
      {
        year: params.year,
        quarter: params.quarter,
        area: params.area,
        city: params.city,
      }
    );

    if (!response.success || !response.data) {
      return { success: false, error: response.error ?? "Failed to fetch transactions" };
    }

    if (response.data.status !== "OK") {
      return { success: false, error: `API returned status: ${response.data.status}` };
    }

    return { success: true, data: response.data.data || [] };
  }

  async getMunicipalityCodes(): Promise<{ success: boolean; data?: Array<{ code: string; name: string }>; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: "Reinfolib API key not configured" };
    }

    return { success: true, data: [] };
  }
}

let reinfolibClientInstance: ReinfolibClient | null = null;

export function getReinfolibClient(): ReinfolibClient {
  if (!reinfolibClientInstance) {
    reinfolibClientInstance = new ReinfolibClient();
  }
  return reinfolibClientInstance;
}
