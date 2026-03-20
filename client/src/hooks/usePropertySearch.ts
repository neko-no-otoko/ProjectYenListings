import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Property, PropertyFilters, PropertyListResponse } from "@/components/properties/types";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Build query string from filters
function buildQueryString(filters: PropertyFilters): string {
  const params = new URLSearchParams();

  // Search query
  if (filters.query) params.set("q", filters.query);
  if (filters.q) params.set("q", filters.q);

  // Location filters
  if (filters.prefecture) params.set("prefecture", filters.prefecture);
  if (filters.municipality) params.set("municipality", filters.municipality);
  if (filters.locality) params.set("locality", filters.locality);
  if (filters.island) params.set("island", filters.island);
  if (filters.location) params.set("location", filters.location);

  // Price filters
  if (filters.minPrice !== undefined) params.set("minPrice", filters.minPrice.toString());
  if (filters.maxPrice !== undefined) params.set("maxPrice", filters.maxPrice.toString());

  // Property type
  if (filters.propertyType) params.set("propertyType", filters.propertyType);

  // Size filters
  if (filters.minHouseSqm !== undefined) params.set("minHouseSqm", filters.minHouseSqm.toString());
  if (filters.maxHouseSqm !== undefined) params.set("maxHouseSqm", filters.maxHouseSqm.toString());
  if (filters.minLandSqm !== undefined) params.set("minLandSqm", filters.minLandSqm.toString());
  if (filters.maxLandSqm !== undefined) params.set("maxLandSqm", filters.maxLandSqm.toString());

  // Year built
  if (filters.minYearBuilt !== undefined) params.set("minYearBuilt", filters.minYearBuilt.toString());
  if (filters.maxYearBuilt !== undefined) params.set("maxYearBuilt", filters.maxYearBuilt.toString());

  // Features
  if (filters.hasLand !== undefined) params.set("hasLand", filters.hasLand.toString());
  if (filters.mustHaveLand !== undefined) params.set("hasLand", "true");
  if (filters.minConditionScore !== undefined) params.set("minConditionScore", filters.minConditionScore.toString());

  // LDK filters
  if (filters.minLdk !== undefined) params.set("minLdk", filters.minLdk.toString());
  if (filters.maxLdk !== undefined) params.set("maxLdk", filters.maxLdk.toString());

  // Sorting
  if (filters.sortBy) {
    // Map frontend sort values to API values
    const sortMap: Record<string, string> = {
      price_asc: "price_asc",
      price_desc: "price_desc",
      newest: "newest",
      oldest: "oldest",
    };
    params.set("sort", sortMap[filters.sortBy] || filters.sortBy);
  }

  // Pagination
  if (filters.limit) params.set("limit", filters.limit.toString());
  if (filters.offset !== undefined) params.set("offset", filters.offset.toString());
  if (filters.page !== undefined) {
    const offset = (filters.page - 1) * (filters.limit || 20);
    params.set("offset", offset.toString());
    params.set("limit", (filters.limit || 20).toString());
  }

  return params.toString();
}

// Query keys
export const propertySearchKeys = {
  all: ["propertySearch"] as const,
  search: (filters: PropertyFilters) => [...propertySearchKeys.all, filters] as const,
};

interface UsePropertySearchOptions {
  debounceMs?: number;
  enabled?: boolean;
}

interface UsePropertySearchReturn {
  // Data
  properties: Property[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;

  // Filters
  filters: PropertyFilters;
  setFilters: React.Dispatch<React.SetStateAction<PropertyFilters>>;
  updateFilter: <K extends keyof PropertyFilters>(key: K, value: PropertyFilters[K]) => void;
  resetFilters: () => void;

  // Search (debounced)
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Pagination
  page: number;
  setPage: (page: number) => void;
  totalPages: number;

  // Sort
  sortBy: PropertyFilters["sortBy"];
  setSortBy: (sort: PropertyFilters["sortBy"]) => void;

  // Refetch
  refetch: () => void;
}

const defaultFilters: PropertyFilters = {
  page: 1,
  limit: 20,
  sortBy: "newest",
};

export function usePropertySearch(
  initialFilters: PropertyFilters = {},
  options: UsePropertySearchOptions = {}
): UsePropertySearchReturn {
  const { debounceMs = 300, enabled = true } = options;

  // State for filters
  const [filters, setFilters] = useState<PropertyFilters>({
    ...defaultFilters,
    ...initialFilters,
  });

  // Separate state for search query (debounced)
  const [searchQuery, setSearchQuery] = useState(initialFilters.query || initialFilters.q || "");
  const debouncedSearchQuery = useDebounce(searchQuery, debounceMs);

  // Update filters when debounced search query changes
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      query: debouncedSearchQuery,
      q: debouncedSearchQuery,
      page: 1, // Reset to first page on search change
    }));
  }, [debouncedSearchQuery]);

  // Calculate offset from page
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  // Build API query string
  const queryString = buildQueryString({
    ...filters,
    offset,
  });

  // Fetch data
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<PropertyListResponse>({
    queryKey: propertySearchKeys.search(filters),
    queryFn: async () => {
      const response = await fetch(`/api/properties/search?${queryString}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch properties: ${response.statusText}`);
      }

      return response.json();
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Extract data
  const properties = data?.data?.properties || [];
  const total = data?.data?.pagination?.total || 0;
  const hasMore = data?.data?.pagination?.hasMore || false;
  const totalPages = Math.ceil(total / limit);

  // Update a single filter
  const updateFilter = useCallback(<K extends keyof PropertyFilters>(
    key: K,
    value: PropertyFilters[K]
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      // Reset to first page when filters change (except for page itself)
      ...(key !== "page" ? { page: 1 } : {}),
    }));
  }, []);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setFilters(defaultFilters);
  }, []);

  // Set page
  const setPage = useCallback((newPage: number) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  }, []);

  // Set sort
  const setSortBy = useCallback((sort: PropertyFilters["sortBy"]) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: sort,
      page: 1,
    }));
  }, []);

  return {
    // Data
    properties,
    total,
    hasMore,
    isLoading,
    isFetching,
    error: error as Error | null,

    // Filters
    filters,
    setFilters,
    updateFilter,
    resetFilters,

    // Search
    searchQuery,
    setSearchQuery,

    // Pagination
    page,
    setPage,
    totalPages,

    // Sort
    sortBy: filters.sortBy,
    setSortBy,

    // Refetch
    refetch,
  };
}

// Hook for listing all properties (non-search)
export function usePropertyList(
  initialFilters: PropertyFilters = {},
  options: UsePropertySearchOptions = {}
) {
  const { debounceMs = 300, enabled = true } = options;

  const [filters, setFilters] = useState<PropertyFilters>({
    ...defaultFilters,
    ...initialFilters,
  });

  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  const queryString = buildQueryString({
    ...filters,
    offset,
  });

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<PropertyListResponse>({
    queryKey: ["properties", "list", filters],
    queryFn: async () => {
      const response = await fetch(`/api/properties?${queryString}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch properties: ${response.statusText}`);
      }

      return response.json();
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const properties = data?.data?.properties || [];
  const total = data?.data?.pagination?.total || 0;
  const hasMore = data?.data?.pagination?.hasMore || false;
  const totalPages = Math.ceil(total / limit);

  const updateFilter = useCallback(<K extends keyof PropertyFilters>(
    key: K,
    value: PropertyFilters[K]
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key !== "page" ? { page: 1 } : {}),
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const setPage = useCallback((newPage: number) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  }, []);

  const setSortBy = useCallback((sort: PropertyFilters["sortBy"]) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: sort,
      page: 1,
    }));
  }, []);

  return {
    properties,
    total,
    hasMore,
    isLoading,
    isFetching,
    error: error as Error | null,
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    page,
    setPage,
    totalPages,
    sortBy: filters.sortBy,
    setSortBy,
    refetch,
  };
}

export default usePropertySearch;
