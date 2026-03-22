/**
 * MLIT National Land Numerical Information Connector
 * 
 * Provides access to GIS data from the National Land Numerical Information
 * Download Service (国土数値情報ダウンロードサービス).
 * 
 * Data Source: https://nlftp.mlit.go.jp/
 * License: CC-BY 4.0 (Open Data)
 * No API key required
 */

import type {
  Connector,
  ConnectorStatus,
  FetchResult,
  NormalizedListing,
} from "../../connectors/types";

export interface NationalLandConfig {
  enabled?: boolean;
  rateLimitPerMin?: number;
  baseUrl?: string;
}

export interface LandPriceData {
  /** Location code */
  locCode: string;
  /** Prefecture name */
  prefecture: string;
  /** Municipality */
  municipality: string;
  /** District name */
  district: string;
  /** Land use type */
  landUse: string;
  /** Price per square meter (JPY) */
  pricePerSqm: number;
  /** Year of survey */
  surveyYear: number;
  /** Coordinates (if available) */
  lat?: number;
  lon?: number;
}

export interface UrbanPlanningZone {
  /** Zone type */
  zoneType: string;
  /** Zone name */
  zoneName: string;
  /** Purpose (e.g., residential, commercial) */
  purpose: string;
  /** Area in square meters */
  areaSqm: number;
  /** Coordinates of zone boundary */
  coordinates?: Array<{ lat: number; lon: number }>;
}

export interface DisasterRiskZone {
  /** Risk type: flood, landslide, tsunami */
  riskType: "flood" | "landslide" | "tsunami" | "earthquake";
  /** Risk level */
  level: "high" | "medium" | "low";
  /** Description */
  description: string;
  /** Area in square meters */
  areaSqm?: number;
}

export interface NationalLandDataset {
  /** Dataset identifier */
  id: string;
  /** Dataset name in Japanese */
  name: string;
  /** Dataset name in English */
  nameEn: string;
  /** Data category */
  category: string;
  /** Last update date */
  lastUpdated: string;
  /** Download URL */
  downloadUrl: string;
  /** File format (GML, Shapefile, etc.) */
  format: string;
  /** Coordinate system */
  crs: string;
}

/**
 * Available National Land datasets relevant to akiya research
 */
export const RELEVANT_DATASETS: NationalLandDataset[] = [
  {
    id: "L01",
    name: "行政区域",
    nameEn: "Administrative Areas",
    category: "boundaries",
    lastUpdated: "2024-01-01",
    downloadUrl: "https://nlftp.mlit.go.jp/ksj/gml/data/L01/L01-2024/L01-2024_GML.zip",
    format: "GML",
    crs: "JGD2011",
  },
  {
    id: "L02",
    name: "湖沼",
    nameEn: "Lakes and Marshes",
    category: "geography",
    lastUpdated: "2024-01-01",
    downloadUrl: "https://nlftp.mlit.go.jp/ksj/gml/data/L02/L02-2024/L02-2024_GML.zip",
    format: "GML",
    crs: "JGD2011",
  },
  {
    id: "L03-a",
    name: "河川中心線",
    nameEn: "River Center Lines",
    category: "geography",
    lastUpdated: "2024-01-01",
    downloadUrl: "https://nlftp.mlit.go.jp/ksj/gml/data/L03-a/L03-a-2024/L03-a-2024_GML.zip",
    format: "GML",
    crs: "JGD2011",
  },
  {
    id: "L04-b",
    name: "鉄道",
    nameEn: "Railways",
    category: "transportation",
    lastUpdated: "2024-01-01",
    downloadUrl: "https://nlftp.mlit.go.jp/ksj/gml/data/L04-b/L04-b-2024/L04-b-2024_GML.zip",
    format: "GML",
    crs: "JGD2011",
  },
  {
    id: "L05",
    name: "道路",
    nameEn: "Roads",
    category: "transportation",
    lastUpdated: "2024-01-01",
    downloadUrl: "https://nlftp.mlit.go.jp/ksj/gml/data/L05/L05-2024/L05-2024_GML.zip",
    format: "GML",
    crs: "JGD2011",
  },
  {
    id: "L06",
    name: "駅",
    nameEn: "Railway Stations",
    category: "transportation",
    lastUpdated: "2024-01-01",
    downloadUrl: "https://nlftp.mlit.go.jp/ksj/gml/data/L06/L06-2024/L06-2024_GML.zip",
    format: "GML",
    crs: "JGD2011",
  },
  {
    id: "L07",
    name: "海岸線",
    nameEn: "Coastlines",
    category: "geography",
    lastUpdated: "2024-01-01",
    downloadUrl: "https://nlftp.mlit.go.jp/ksj/gml/data/L07/L07-2024/L07-2024_GML.zip",
    format: "GML",
    crs: "JGD2011",
  },
  {
    id: "L08",
    name: "等高線",
    nameEn: "Contour Lines",
    category: "geography",
    lastUpdated: "2024-01-01",
    downloadUrl: "https://nlftp.mlit.go.jp/ksj/gml/data/L08/L08-2024/L08-2024_GML.zip",
    format: "GML",
    crs: "JGD2011",
  },
  {
    id: "L12",
    name: "人口集中地区",
    nameEn: "Densely Inhabited Districts",
    category: "demographics",
    lastUpdated: "2020-01-01",
    downloadUrl: "https://nlftp.mlit.go.jp/ksj/gml/data/L12/L12-2020/L12-2020_GML.zip",
    format: "GML",
    crs: "JGD2011",
  },
  {
    id: "A29",
    name: "都市計画決定情報",
    nameEn: "Urban Planning Decision Information",
    category: "urban_planning",
    lastUpdated: "2024-01-01",
    downloadUrl: "https://nlftp.mlit.go.jp/ksj/gml/data/A29/A29-2024/A29-2024_GML.zip",
    format: "GML",
    crs: "JGD2011",
  },
  {
    id: "A30a5",
    name: "洪水浸水想定区域（想定最大規模）",
    nameEn: "Flood Inundation Area (Max Scale)",
    category: "disaster_risk",
    lastUpdated: "2024-01-01",
    downloadUrl: "https://nlftp.mlit.go.jp/ksj/gml/data/A30a5/A30a5-2024/A30a5-2024_GML.zip",
    format: "GML",
    crs: "JGD2011",
  },
  {
    id: "A31",
    name: "土砂災害警戒区域",
    nameEn: "Sediment Disaster Warning Area",
    category: "disaster_risk",
    lastUpdated: "2024-01-01",
    downloadUrl: "https://nlftp.mlit.go.jp/ksj/gml/data/A31/A31-2024/A31-2024_GML.zip",
    format: "GML",
    crs: "JGD2011",
  },
  {
    id: "A32",
    name: "高潮浸水想定区域",
    nameEn: "Storm Surge Inundation Area",
    category: "disaster_risk",
    lastUpdated: "2024-01-01",
    downloadUrl: "https://nlftp.mlit.go.jp/ksj/gml/data/A32/A32-2024/A32-2024_GML.zip",
    format: "GML",
    crs: "JGD2011",
  },
  {
    id: "A33",
    name: "地震動の予測分布図",
    nameEn: "Predicted Seismic Intensity Distribution",
    category: "disaster_risk",
    lastUpdated: "2024-01-01",
    downloadUrl: "https://nlftp.mlit.go.jp/ksj/gml/data/A33/A33-2024/A33-2024_GML.zip",
    format: "GML",
    crs: "JGD2011",
  },
  {
    id: "A38",
    name: "都道府県地価調査",
    nameEn: "Prefectural Land Price Survey",
    category: "land_price",
    lastUpdated: "2024-01-01",
    downloadUrl: "https://nlftp.mlit.go.jp/ksj/gml/data/A38/A38-2024/A38-2024_GML.zip",
    format: "GML",
    crs: "JGD2011",
  },
  {
    id: "N03",
    name: "総括市区町村",
    nameEn: "Administrative Districts (Detailed)",
    category: "boundaries",
    lastUpdated: "2024-01-01",
    downloadUrl: "https://nlftp.mlit.go.jp/ksj/gml/data/N03/N03-2024/N03-2024_GML.zip",
    format: "GML",
    crs: "JGD2011",
  },
  {
    id: "P13",
    name: "公園",
    nameEn: "Parks",
    category: "facilities",
    lastUpdated: "2024-01-01",
    downloadUrl: "https://nlftp.mlit.go.jp/ksj/gml/data/P13/P13-2024/P13-2024_GML.zip",
    format: "GML",
    crs: "JGD2011",
  },
  {
    id: "P14",
    name: "医療機関",
    nameEn: "Medical Facilities",
    category: "facilities",
    lastUpdated: "2024-01-01",
    downloadUrl: "https://nlftp.mlit.go.jp/ksj/gml/data/P14/P14-2024/P14-2024_GML.zip",
    format: "GML",
    crs: "JGD2011",
  },
  {
    id: "P15",
    name: "学校",
    nameEn: "Schools",
    category: "facilities",
    lastUpdated: "2024-01-01",
    downloadUrl: "https://nlftp.mlit.go.jp/ksj/gml/data/P15/P15-2024/P15-2024_GML.zip",
    format: "GML",
    crs: "JGD2011",
  },
  {
    id: "P17",
    name: "文化施設",
    nameEn: "Cultural Facilities",
    category: "facilities",
    lastUpdated: "2024-01-01",
    downloadUrl: "https://nlftp.mlit.go.jp/ksj/gml/data/P17/P17-2024/P17-2024_GML.zip",
    format: "GML",
    crs: "JGD2011",
  },
];

/**
 * MLIT National Land Numerical Information Connector
 * 
 * Provides access to GIS data including:
 * - Land price survey data
 * - Urban planning zones
 * - Disaster risk areas
 * - Transportation networks
 * - Administrative boundaries
 */
export class NationalLandConnector implements Connector {
  readonly name = "mlit_national_land";
  readonly sourceType = "manual" as const;

  private config: Required<NationalLandConfig>;
  private lastRunAt?: Date;
  private lastError?: string;
  private itemsFetched = 0;
  private itemsUpserted = 0;

  private static readonly BASE_URL = "https://nlftp.mlit.go.jp/ksj/gml";

  constructor(config: NationalLandConfig = {}) {
    this.config = {
      enabled: true,
      rateLimitPerMin: 30,
      baseUrl: NationalLandConnector.BASE_URL,
      ...config,
    };
  }

  /**
   * Check if connector is configured
   */
  isConfigured(): boolean {
    return true; // No API key required
  }

  /**
   * Check if connector is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get connector status
   */
  async getStatus(): Promise<ConnectorStatus> {
    return {
      name: this.name,
      configured: this.isConfigured(),
      enabled: this.isEnabled(),
      lastRunAt: this.lastRunAt,
      lastError: this.lastError,
      itemsFetched: this.itemsFetched,
      itemsUpserted: this.itemsUpserted,
    };
  }

  /**
   * Get list of available datasets
   */
  getAvailableDatasets(): NationalLandDataset[] {
    return RELEVANT_DATASETS;
  }

  /**
   * Get datasets by category
   */
  getDatasetsByCategory(category: string): NationalLandDataset[] {
    return RELEVANT_DATASETS.filter((d) => d.category === category);
  }

  /**
   * Get land price data for a prefecture
   * Note: This returns mock data - actual implementation would parse GML files
   */
  async fetchLandPriceData(
    prefectureCode: string
  ): Promise<FetchResult<LandPriceData>> {
    try {
      this.lastRunAt = new Date();

      // Mock data - actual implementation would download and parse GML
      const data = this.getMockLandPriceData(prefectureCode);
      this.itemsFetched += data.length;

      return {
        success: true,
        data,
        metadata: {
          dataset: "A38 - Prefectural Land Price Survey",
          prefectureCode,
          source: "National Land Numerical Information",
          note: "Mock data - implement GML parser for production",
        },
      };
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: this.lastError,
        data: [],
      };
    }
  }

  /**
   * Get disaster risk data for coordinates
   */
  async fetchDisasterRiskData(
    lat: number,
    lon: number
  ): Promise<FetchResult<DisasterRiskZone>> {
    try {
      this.lastRunAt = new Date();

      // Mock data - actual implementation would query GML
      const data = this.getMockDisasterRiskData(lat, lon);
      this.itemsFetched += data.length;

      return {
        success: true,
        data,
        metadata: {
          coordinates: { lat, lon },
          datasets: ["A30a5", "A31", "A32", "A33"],
        },
      };
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: this.lastError,
        data: [],
      };
    }
  }

  /**
   * Get urban planning zones for an area
   */
  async fetchUrbanPlanningZones(
    prefectureCode: string,
    municipality?: string
  ): Promise<FetchResult<UrbanPlanningZone>> {
    try {
      this.lastRunAt = new Date();

      const data = this.getMockUrbanPlanningZones(prefectureCode, municipality);
      this.itemsFetched += data.length;

      return {
        success: true,
        data,
        metadata: {
          dataset: "A29 - Urban Planning Decision Information",
          prefectureCode,
          municipality,
        },
      };
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: this.lastError,
        data: [],
      };
    }
  }

  /**
   * Get download URL for a dataset
   */
  getDatasetDownloadUrl(datasetId: string, year: number = 2024): string | null {
    const dataset = RELEVANT_DATASETS.find((d) => d.id === datasetId);
    if (dataset) {
      return dataset.downloadUrl;
    }

    // Generate URL from pattern
    return `${NationalLandConnector.BASE_URL}/data/${datasetId}/${datasetId}-${year}/${datasetId}-${year}_GML.zip`;
  }

  /**
   * Download a dataset file
   */
  async downloadDataset(
    datasetId: string,
    year: number = 2024
  ): Promise<{ success: boolean; buffer?: Buffer; error?: string }> {
    const url = this.getDatasetDownloadUrl(datasetId, year);
    if (!url) {
      return { success: false, error: "Dataset not found" };
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      return {
        success: true,
        buffer: Buffer.from(arrayBuffer),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Download failed",
      };
    }
  }

  /**
   * Required by Connector interface
   */
  async fetch(): Promise<FetchResult<unknown>> {
    return {
      success: true,
      data: RELEVANT_DATASETS,
      metadata: {
        message: "Use specific methods like fetchLandPriceData() for data retrieval",
        availableDatasets: RELEVANT_DATASETS.length,
      },
    };
  }

  /**
   * Required by Connector interface
   */
  async normalize(data: unknown[]): Promise<NormalizedListing[]> {
    // GIS data doesn't convert directly to property listings
    return [];
  }

  /**
   * Get prefecture code from name
   */
  getPrefectureCode(name: string): string | null {
    const prefectureMap: Record<string, string> = {
      北海道: "01",
      青森県: "02",
      岩手県: "03",
      宮城県: "04",
      秋田県: "05",
      山形県: "06",
      福島県: "07",
      茨城県: "08",
      栃木県: "09",
      群馬県: "10",
      埼玉県: "11",
      千葉県: "12",
      東京都: "13",
      神奈川県: "14",
      新潟県: "15",
      富山県: "16",
      石川県: "17",
      福井県: "18",
      山梨県: "19",
      長野県: "20",
      岐阜県: "21",
      静岡県: "22",
      愛知県: "23",
      三重県: "24",
      滋賀県: "25",
      京都府: "26",
      大阪府: "27",
      兵庫県: "28",
      奈良県: "29",
      和歌山県: "30",
      鳥取県: "31",
      島根県: "32",
      岡山県: "33",
      広島県: "34",
      山口県: "35",
      徳島県: "36",
      香川県: "37",
      愛媛県: "38",
      高知県: "39",
      福岡県: "40",
      佐賀県: "41",
      長崎県: "42",
      熊本県: "43",
      大分県: "44",
      宮崎県: "45",
      鹿児島県: "46",
      沖縄県: "47",
    };

    return prefectureMap[name] ?? null;
  }

  // ========================================================================
  // MOCK DATA (Replace with actual GML parsing)
  // ========================================================================

  private getMockLandPriceData(prefectureCode: string): LandPriceData[] {
    const prefectureNames: Record<string, string> = {
      "13": "東京都",
      "27": "大阪府",
      "40": "福岡県",
      "01": "北海道",
      "32": "島根県",
    };

    const prefecture = prefectureNames[prefectureCode] ?? "Unknown";

    return [
      {
        locCode: `${prefectureCode}-001`,
        prefecture,
        municipality: "市中心部",
        district: "商業区",
        landUse: "商業地",
        pricePerSqm: 500000 + Math.random() * 500000,
        surveyYear: 2024,
        lat: 35.6762 + (Math.random() - 0.5) * 0.1,
        lon: 139.6503 + (Math.random() - 0.5) * 0.1,
      },
      {
        locCode: `${prefectureCode}-002`,
        prefecture,
        municipality: "住宅地",
        district: "住宅區",
        landUse: "住宅用地",
        pricePerSqm: 200000 + Math.random() * 200000,
        surveyYear: 2024,
        lat: 35.6762 + (Math.random() - 0.5) * 0.1,
        lon: 139.6503 + (Math.random() - 0.5) * 0.1,
      },
    ];
  }

  private getMockDisasterRiskData(lat: number, lon: number): DisasterRiskZone[] {
    // Simulate different risk levels based on coordinates
    const risks: DisasterRiskZone[] = [];

    // Random determination for demo
    if (Math.random() > 0.7) {
      risks.push({
        riskType: "flood",
        level: Math.random() > 0.5 ? "high" : "medium",
        description: "洪水浸水想定区域",
      });
    }

    if (Math.random() > 0.8) {
      risks.push({
        riskType: "landslide",
        level: "medium",
        description: "土砂災害警戒区域",
      });
    }

    return risks;
  }

  private getMockUrbanPlanningZones(
    prefectureCode: string,
    municipality?: string
  ): UrbanPlanningZone[] {
    return [
      {
        zoneType: "用途地域",
        zoneName: "第一種低層住居専用地域",
        purpose: "residential",
        areaSqm: 150000,
      },
      {
        zoneType: "用途地域",
        zoneName: "商業地域",
        purpose: "commercial",
        areaSqm: 80000,
      },
      {
        zoneType: "開発地区",
        zoneName: "市街化区域",
        purpose: "urbanization",
        areaSqm: 500000,
      },
    ];
  }

  /**
   * Get documentation URL
   */
  getDocumentationUrl(): string {
    return "https://nlftp.mlit.go.jp/ksj/manual/manual.html";
  }

  /**
   * Get G-Spatial Information Center URL
   */
  getGSpatialUrl(): string {
    return "https://front.geospatial.jp/";
  }
}

/**
 * Create connector from environment
 */
export function createNationalLandConnectorFromEnv(): NationalLandConnector {
  return new NationalLandConnector({
    enabled: true,
  });
}

export default NationalLandConnector;
