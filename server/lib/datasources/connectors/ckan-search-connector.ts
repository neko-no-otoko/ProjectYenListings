/**
 * CKAN Search Japan Connector
 * 
 * A unified search connector for the Akiya Japan app to query
 * the CKAN Search Japan meta-search portal for akiya (vacant house)
 * and property-related datasets.
 * 
 * Portal: https://search.ckan.jp
 * API Base: https://search.ckan.jp/backend/api/
 */

export interface CKANDataset {
  xckan_id: string;
  xckan_title: string;
  xckan_site_name: string;
  xckan_site_url: string;
  xckan_description?: string;
  xckan_last_updated: string;
  xckan_tags?: string[];
  author?: string;
  author_email?: string;
  creator_user_id?: string;
  id: string;
  isopen: boolean;
  license_id?: string;
  license_title?: string;
  license_url?: string;
  maintainer?: string;
  maintainer_email?: string;
  metadata_created: string;
  metadata_modified: string;
  name: string;
  notes?: string;
  num_resources: number;
  num_tags: number;
  organization: {
    id: string;
    name: string;
    title: string;
    type: string;
    description?: string;
    image_url?: string;
    created?: string;
    is_organization?: boolean;
    approval_status?: string;
    state?: string;
  };
  owner_org: string;
  private: boolean;
  state: string;
  title: string;
  type: string;
  url?: string;
  version?: string;
  groups?: Array<{
    description?: string;
    display_name: string;
    id: string;
    image_display_url?: string;
    name: string;
    title: string;
  }>;
  resources: Array<{
    cache_last_updated?: string | null;
    cache_url?: string | null;
    created: string;
    datastore_active?: boolean | string;
    description?: string;
    encoding?: string;
    format: string;
    hash?: string;
    id: string;
    last_modified?: string;
    metadata_modified: string;
    mimetype?: string;
    mimetype_inner?: string | null;
    name: string;
    package_id: string;
    position: number;
    resource_type?: string | null;
    size?: number;
    state: string;
    url: string;
    url_type?: string;
  }>;
  tags?: Array<{
    display_name: string;
    id: string;
    name: string;
    state: string;
    vocabulary_id: string | null;
  }>;
  score?: number;
}

export interface CKANSearchResult {
  help: string;
  success: boolean;
  result: {
    q: {
      q: string[];
      rows: string[];
    };
    count: number;
    facets: {
      facet_queries: Record<string, unknown>;
      facet_fields: {
        xckan_site_name?: (string | number)[];
        organization?: (string | number)[];
        res_format?: (string | number)[];
        xckan_tags?: (string | number)[];
        tags?: (string | number)[];
        groups?: (string | number)[];
      };
      facet_ranges: Record<string, unknown>;
      facet_intervals: Record<string, unknown>;
      facet_heatmaps: Record<string, unknown>;
    };
    qtime: number;
    results: CKANDataset[];
  };
}

export interface CKANSearchOptions {
  query: string;
  rows?: number;
  start?: number;
  sort?: string;
  fq?: string;
}

export class CKANSearchJapanConnector {
  private readonly baseUrl = 'https://search.ckan.jp/backend/api';
  private readonly defaultRows = 20;
  private readonly requestDelay = 1000; // 1 second between requests

  /**
   * Search for datasets using the CKAN Search Japan API
   */
  async search(options: CKANSearchOptions): Promise<CKANSearchResult> {
    const params = new URLSearchParams();
    params.append('q', options.query);
    params.append('rows', (options.rows ?? this.defaultRows).toString());
    
    if (options.start !== undefined) {
      params.append('start', options.start.toString());
    }
    if (options.sort) {
      params.append('sort', options.sort);
    }
    if (options.fq) {
      params.append('fq', options.fq);
    }

    const url = `${this.baseUrl}/package_search?${params.toString()}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: CKANSearchResult = await response.json();
      return data;
    } catch (error) {
      console.error('CKAN Search Japan API error:', error);
      throw error;
    }
  }

  /**
   * Search for akiya (vacant house) datasets
   */
  async searchAkiya(rows: number = 20): Promise<CKANSearchResult> {
    return this.search({
      query: '空き家',
      rows,
      sort: 'score desc'
    });
  }

  /**
   * Search for building/house datasets
   */
  async searchBuildings(rows: number = 20): Promise<CKANSearchResult> {
    return this.search({
      query: '家屋',
      rows,
      sort: 'score desc'
    });
  }

  /**
   * Search for unclaimed inheritance properties
   */
  async searchUnclaimedProperties(rows: number = 20): Promise<CKANSearchResult> {
    return this.search({
      query: '相続人未決定',
      rows,
      sort: 'score desc'
    });
  }

  /**
   * Search for fixed asset tax data
   */
  async searchFixedAssetData(rows: number = 20): Promise<CKANSearchResult> {
    return this.search({
      query: '固定資産税',
      rows,
      sort: 'score desc'
    });
  }

  /**
   * Search by municipality/organization name
   */
  async searchByMunicipality(municipality: string, rows: number = 20): Promise<CKANSearchResult> {
    return this.search({
      query: `家屋 ${municipality}`,
      rows,
      sort: 'score desc'
    });
  }

  /**
   * Get all results across multiple pages
   */
  async searchAll(options: Omit<CKANSearchOptions, 'start'>): Promise<CKANDataset[]> {
    const allResults: CKANDataset[] = [];
    let start = 0;
    const rows = options.rows ?? this.defaultRows;
    let hasMore = true;

    while (hasMore) {
      const result = await this.search({
        ...options,
        rows,
        start
      });

      allResults.push(...result.result.results);
      
      hasMore = result.result.results.length === rows && 
                allResults.length < result.result.count;
      start += rows;

      // Rate limiting
      if (hasMore) {
        await this.delay(this.requestDelay);
      }
    }

    return allResults;
  }

  /**
   * Get available facets (sites, organizations, formats)
   */
  async getFacets(query: string = '*:*'): Promise<{
    sites: string[];
    organizations: string[];
    formats: string[];
  }> {
    const result = await this.search({
      query,
      rows: 0 // We only need facets, not results
    });

    const facetFields = result.result.facets.facet_fields;

    return {
      sites: this.parseFacetArray(facetFields.xckan_site_name),
      organizations: this.parseFacetArray(facetFields.organization),
      formats: this.parseFacetArray(facetFields.res_format)
    };
  }

  /**
   * Extract CSV resources from datasets
   */
  extractCSVResources(datasets: CKANDataset[]): Array<{
    dataset: CKANDataset;
    resource: CKANDataset['resources'][0];
  }> {
    const csvResources: Array<{
      dataset: CKANDataset;
      resource: CKANDataset['resources'][0];
    }> = [];

    for (const dataset of datasets) {
      for (const resource of dataset.resources) {
        if (resource.format.toUpperCase() === 'CSV') {
          csvResources.push({ dataset, resource });
        }
      }
    }

    return csvResources;
  }

  /**
   * Extract Excel resources from datasets
   */
  extractExcelResources(datasets: CKANDataset[]): Array<{
    dataset: CKANDataset;
    resource: CKANDataset['resources'][0];
  }> {
    const excelResources: Array<{
      dataset: CKANDataset;
      resource: CKANDataset['resources'][0];
    }> = [];

    for (const dataset of datasets) {
      for (const resource of dataset.resources) {
        const format = resource.format.toUpperCase();
        if (format === 'XLSX' || format === 'XLS') {
          excelResources.push({ dataset, resource });
        }
      }
    }

    return excelResources;
  }

  /**
   * Get the direct download URL for a resource
   */
  getResourceUrl(resource: CKANDataset['resources'][0]): string {
    return resource.url;
  }

  /**
   * Filter datasets by site name
   */
  filterBySite(datasets: CKANDataset[], siteName: string): CKANDataset[] {
    return datasets.filter(d => 
      d.xckan_site_name.toLowerCase().includes(siteName.toLowerCase())
    );
  }

  /**
   * Filter datasets by organization
   */
  filterByOrganization(datasets: CKANDataset[], orgName: string): CKANDataset[] {
    return datasets.filter(d => 
      d.organization.title.toLowerCase().includes(orgName.toLowerCase()) ||
      d.organization.name.toLowerCase().includes(orgName.toLowerCase())
    );
  }

  /**
   * Sort datasets by last updated date
   */
  sortByLastUpdated(datasets: CKANDataset[], descending: boolean = true): CKANDataset[] {
    return [...datasets].sort((a, b) => {
      const dateA = new Date(a.xckan_last_updated).getTime();
      const dateB = new Date(b.xckan_last_updated).getTime();
      return descending ? dateB - dateA : dateA - dateB;
    });
  }

  /**
   * Parse facet array from CKAN format
   * Format: [name1, count1, name2, count2, ...]
   */
  private parseFacetArray(facetData?: (string | number)[]): string[] {
    if (!facetData) return [];
    
    const result: string[] = [];
    for (let i = 0; i < facetData.length; i += 2) {
      const name = facetData[i];
      if (typeof name === 'string') {
        result.push(name);
      }
    }
    return result;
  }

  /**
   * Delay utility for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const ckanSearchJapan = new CKANSearchJapanConnector();

// Default export
export default CKANSearchJapanConnector;
