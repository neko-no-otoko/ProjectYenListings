/**
 * BODIK CKAN API Connector
 * 
 * A TypeScript connector for the BODIK (Big Data & Open Data Initiative Kyushu) CKAN API.
 * Provides access to vacant home (akiya) datasets and other municipal open data.
 * 
 * @see https://odcs.bodik.jp/developers/
 * @see https://docs.ckan.org/en/2.10/api/
 */

export interface BODIKConfig {
  baseUrl: string;
  apiVersion: string;
  timeoutMs: number;
}

export interface PackageSearchParams {
  query?: string;
  rows?: number;
  start?: number;
  sort?: string;
  fq?: string;
  organization?: string;
}

export interface DatastoreSearchParams {
  resourceId: string;
  limit?: number;
  offset?: number;
  filters?: Record<string, string>;
}

export interface BODIKResponse<T> {
  success: boolean;
  result: T;
  error?: {
    message: string;
    __type: string;
  };
}

export interface PackageListResult {
  count: number;
  results: Dataset[];
  facets?: Record<string, any>;
  sort?: string;
  search_facets?: Record<string, any>;
}

export interface Dataset {
  id: string;
  name: string;
  title: string;
  notes?: string;
  author?: string;
  author_email?: string;
  maintainer?: string;
  maintainer_email?: string;
  license_id?: string;
  license_title?: string;
  license_url?: string;
  isopen?: boolean;
  private: boolean;
  state: string;
  type: string;
  url?: string;
  version?: string;
  metadata_created: string;
  metadata_modified: string;
  creator_user_id: string;
  owner_org: string;
  num_resources: number;
  num_tags: number;
  organization: Organization;
  resources: Resource[];
  tags: Tag[];
  groups: Group[];
  extras?: Extra[];
}

export interface Organization {
  id: string;
  name: string;
  title: string;
  description?: string;
  type: string;
  image_url?: string;
  created: string;
  is_organization: boolean;
  approval_status: string;
  state: string;
}

export interface Resource {
  id: string;
  name?: string;
  description?: string;
  format: string;
  url: string;
  url_type?: string;
  resource_type?: string;
  mimetype?: string;
  mimetype_inner?: string;
  size?: number;
  created: string;
  last_modified?: string;
  metadata_modified: string;
  cache_url?: string;
  cache_last_updated?: string;
  datastore_active?: boolean;
  package_id: string;
  position: number;
  state: string;
  hash?: string;
  // Custom BODIK fields
  Downloads?: number;
  ダウンロード数?: number;
  Comments?: number;
  コメント数?: number;
  Rating?: number;
  評価?: number;
}

export interface Tag {
  id: string;
  name: string;
  display_name: string;
  state: string;
  vocabulary_id?: string;
}

export interface Group {
  id: string;
  name: string;
  title: string;
  display_name: string;
  description?: string;
  image_display_url?: string;
}

export interface Extra {
  key: string;
  value: string;
}

export interface DatastoreSearchResult {
  resource_id: string;
  fields: DatastoreField[];
  records: Record<string, any>[];
  include_total: boolean;
  total?: number;
  total_was_estimated?: boolean;
  limit: number;
  offset?: number;
  records_format?: string;
  _links?: {
    start?: string;
    next?: string;
    prev?: string;
  };
}

export interface DatastoreField {
  id: string;
  type: string;
}

export interface AkiyaDataset {
  datasetId: string;
  title: string;
  municipality: string;
  organizationId: string;
  description?: string;
  dataFormat: string;
  resourceUrl: string;
  resourceId?: string;
  lastModified?: Date;
  metadataModified: Date;
  tags: string[];
  hasDatastore: boolean;
  license?: string;
}

/**
 * Default configuration for BODIK CKAN API
 */
const DEFAULT_CONFIG: BODIKConfig = {
  baseUrl: 'https://data.bodik.jp',
  apiVersion: '3',
  timeoutMs: 30000,
};

/**
 * Known akiya-related search terms in Japanese
 */
export const AKIYA_SEARCH_TERMS = [
  '空き家',
  'あき家',
  '空家',
  ' vacant house',
  'akiya',
  '家屋',
  '住宅',
  '住居',
];

/**
 * BODIK CKAN API Connector class
 */
export class BODIKConnector {
  private config: BODIKConfig;

  constructor(config: Partial<BODIKConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get the base API URL
   */
  private getApiUrl(): string {
    return `${this.config.baseUrl}/api/${this.config.apiVersion}`;
  }

  /**
   * Make an API request to BODIK CKAN
   */
  private async request<T>(
    action: string,
    params?: Record<string, any>
  ): Promise<T> {
    const url = new URL(`${this.getApiUrl()}/action/${action}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BODIK-Connector/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: BODIKResponse<T> = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'API request failed');
      }

      return data.result;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeoutMs}ms`);
      }
      throw error;
    }
  }

  /**
   * List all dataset IDs
   */
  async listDatasets(): Promise<string[]> {
    return this.request<string[]>('package_list');
  }

  /**
   * List all organizations (municipalities)
   */
  async listOrganizations(): Promise<string[]> {
    return this.request<string[]>('organization_list');
  }

  /**
   * Get organization details
   */
  async getOrganization(id: string): Promise<Organization> {
    return this.request<Organization>('organization_show', { id });
  }

  /**
   * Search for datasets
   */
  async searchPackages(params: PackageSearchParams = {}): Promise<PackageListResult> {
    const searchParams: Record<string, any> = {};

    // Build query string
    const queryParts: string[] = [];
    if (params.query) {
      queryParts.push(params.query);
    }
    if (params.organization) {
      queryParts.push(`organization:${params.organization}`);
    }
    
    if (queryParts.length > 0) {
      searchParams.q = queryParts.join(' ');
    }

    if (params.rows) searchParams.rows = params.rows;
    if (params.start) searchParams.start = params.start;
    if (params.sort) searchParams.sort = params.sort;
    if (params.fq) searchParams.fq = params.fq;

    return this.request<PackageListResult>('package_search', searchParams);
  }

  /**
   * Get dataset details by ID or name
   */
  async getPackage(id: string): Promise<Dataset> {
    return this.request<Dataset>('package_show', { id });
  }

  /**
   * Search resources
   */
  async searchResources(query: string): Promise<Resource[]> {
    const result = await this.request<{ results: Resource[]; count: number }>(
      'resource_search',
      { query }
    );
    return result.results;
  }

  /**
   * Access datastore data for a resource
   */
  async searchDatastore(params: DatastoreSearchParams): Promise<DatastoreSearchResult> {
    const searchParams: Record<string, any> = {
      resource_id: params.resourceId,
    };

    if (params.limit) searchParams.limit = params.limit;
    if (params.offset) searchParams.offset = params.offset;
    if (params.filters) {
      searchParams.filters = JSON.stringify(params.filters);
    }

    return this.request<DatastoreSearchResult>('datastore_search', searchParams);
  }

  /**
   * List all tags
   */
  async listTags(): Promise<string[]> {
    return this.request<string[]>('tag_list');
  }

  /**
   * Search for akiya (vacant home) datasets
   */
  async searchAkiyaDatasets(rows: number = 50): Promise<AkiyaDataset[]> {
    // Search using Japanese term for vacant house
    const result = await this.searchPackages({
      query: '空き家',
      rows,
      sort: 'score desc, metadata_modified desc',
    });

    return this.transformToAkiyaDatasets(result.results);
  }

  /**
   * Search datasets by municipality
   */
  async searchByMunicipality(
    organizationId: string,
    query?: string,
    rows: number = 50
  ): Promise<AkiyaDataset[]> {
    const result = await this.searchPackages({
      organization: organizationId,
      query,
      rows,
    });

    return this.transformToAkiyaDatasets(result.results);
  }

  /**
   * Search datasets by prefecture code
   * Prefecture codes: 40=Fukuoka, 41=Saga, 42=Nagasaki, 43=Kumamoto, 44=Oita, 45=Miyazaki, 46=Kagoshima, 47=Okinawa
   */
  async searchByPrefecture(
    prefectureCode: string,
    query?: string,
    rows: number = 50
  ): Promise<AkiyaDataset[]> {
    // Wildcard search for organization IDs starting with prefecture code
    const fq = `organization:${prefectureureCode}*`;
    
    const searchParams: PackageSearchParams = {
      query,
      rows,
      fq,
    };

    const result = await this.searchPackages(searchParams);
    return this.transformToAkiyaDatasets(result.results);
  }

  /**
   * Get datastore data for a specific akiya resource
   */
  async getAkiyaData(
    resourceId: string,
    limit: number = 100,
    offset?: number
  ): Promise<DatastoreSearchResult> {
    return this.searchDatastore({
      resourceId,
      limit,
      offset,
    });
  }

  /**
   * Transform CKAN datasets to AkiyaDataset format
   */
  private transformToAkiyaDatasets(datasets: Dataset[]): AkiyaDataset[] {
    return datasets.map((dataset) => {
      // Find the best resource (prefer CSV with datastore)
      const resource = this.selectBestResource(dataset.resources);

      return {
        datasetId: dataset.id,
        title: dataset.title,
        municipality: dataset.organization?.title || 'Unknown',
        organizationId: dataset.organization?.name || '',
        description: dataset.notes,
        dataFormat: resource?.format || 'Unknown',
        resourceUrl: resource?.url || '',
        resourceId: resource?.id,
        lastModified: resource?.last_modified
          ? new Date(resource.last_modified)
          : undefined,
        metadataModified: new Date(dataset.metadata_modified),
        tags: dataset.tags.map((t) => t.name),
        hasDatastore: resource?.datastore_active || false,
        license: dataset.license_title,
      };
    });
  }

  /**
   * Select the best resource from a dataset
   * Priority: CSV with datastore > XLSX with datastore > CSV > XLSX > other
   */
  private selectBestResource(resources: Resource[]): Resource | undefined {
    if (!resources || resources.length === 0) return undefined;

    // Priority order
    const priority = ['CSV', 'XLSX', 'XLS', 'JSON', 'HTML'];

    // First, try to find a datastore-enabled resource
    for (const format of priority) {
      const resource = resources.find(
        (r) => r.format?.toUpperCase() === format && r.datastore_active
      );
      if (resource) return resource;
    }

    // Then, any resource in priority order
    for (const format of priority) {
      const resource = resources.find((r) => r.format?.toUpperCase() === format);
      if (resource) return resource;
    }

    // Fall back to first resource
    return resources[0];
  }

  /**
   * Get datasets updated after a specific date
   */
  async getRecentlyUpdated(
    since: Date,
    rows: number = 50
  ): Promise<AkiyaDataset[]> {
    const sinceStr = since.toISOString().split('T')[0]; // YYYY-MM-DD
    const fq = `metadata_modified:[${sinceStr}T00:00:00Z TO NOW]`;

    const result = await this.searchPackages({
      query: '空き家',
      rows,
      fq,
      sort: 'metadata_modified desc',
    });

    return this.transformToAkiyaDatasets(result.results);
  }

  /**
   * Download resource data
   * Note: For datastore-enabled resources, use getAkiyaData instead
   */
  async downloadResource(url: string): Promise<Blob> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BODIK-Connector/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    return response.blob();
  }
}

/**
 * Helper functions for working with akiya data
 */
export const AkiyaHelpers = {
  /**
   * Check if a dataset is likely related to vacant houses
   */
  isAkiyaRelated(dataset: AkiyaDataset): boolean {
    const keywords = [
      '空き家',
      'あき家',
      '空家',
      'akiya',
      'vacant',
      '家屋',
      '住宅',
      '住居',
    ];
    const text = `${dataset.title} ${dataset.description || ''} ${dataset.tags.join(' ')}`.toLowerCase();
    return keywords.some((k) => text.includes(k.toLowerCase()));
  },

  /**
   * Convert UTC timestamp to JST (Japan Standard Time)
   * Note: BODIK returns UTC timestamps
   */
  toJST(utcDate: Date | string): Date {
    const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
    return new Date(date.getTime() + 9 * 60 * 60 * 1000);
  },

  /**
   * Format organization ID from prefecture and city codes
   */
  formatOrganizationId(prefectureCode: string, cityCode: string): string {
    return `${prefectureCode}${cityCode}`;
  },

  /**
   * Extract prefecture code from organization ID
   */
  getPrefectureCode(orgId: string): string {
    return orgId.substring(0, 2);
  },
};

/**
 * Prefecture codes for Kyushu region
 */
export const KYUSHU_PREFECTURES = {
  '40': '福岡県 (Fukuoka)',
  '41': '佐賀県 (Saga)',
  '42': '長崎県 (Nagasaki)',
  '43': '熊本県 (Kumamoto)',
  '44': '大分県 (Oita)',
  '45': '宮崎県 (Miyazaki)',
  '46': '鹿児島県 (Kagoshima)',
  '47': '沖縄県 (Okinawa)',
};

/**
 * Other prefectures with BODIK presence
 */
export const OTHER_PREFECTURES = {
  '01': '北海道 (Hokkaido)',
  '05': '秋田県 (Akita)',
  '09': '栃木県 (Tochigi)',
  '10': '群馬県 (Gunma)',
  '12': '千葉県 (Chiba)',
  '13': '東京都 (Tokyo)',
  '14': '神奈川県 (Kanagawa)',
  '20': '長野県 (Nagano)',
  '22': '静岡県 (Shizuoka)',
  '23': '愛知県 (Aichi)',
  '24': '三重県 (Mie)',
  '25': '滋賀県 (Shiga)',
  '26': '京都府 (Kyoto)',
  '27': '大阪府 (Osaka)',
  '28': '兵庫県 (Hyogo)',
  '29': '奈良県 (Nara)',
  '30': '和歌山県 (Wakayama)',
  '32': '島根県 (Shimane)',
  '38': '愛媛県 (Ehime)',
};

export default BODIKConnector;
