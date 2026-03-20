import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { 
  Property, 
  PropertyFilters, 
  PropertyListResponse, 
  PropertySearchResponse, 
  PropertyDetailResponse 
} from "../components/properties/types";

// Query keys
export const propertyKeys = {
  all: ["properties"] as const,
  lists: () => [...propertyKeys.all, "list"] as const,
  list: (filters: PropertyFilters) => [...propertyKeys.lists(), filters] as const,
  search: (query: string, filters?: PropertyFilters) => 
    [...propertyKeys.all, "search", query, filters] as const,
  details: () => [...propertyKeys.all, "detail"] as const,
  detail: (id: string) => [...propertyKeys.details(), id] as const,
};

// Hook to fetch properties list
export function useProperties(filters: PropertyFilters = {}) {
  return useQuery<PropertyListResponse>({
    queryKey: propertyKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters.limit) params.set("limit", filters.limit.toString());
      if (filters.offset !== undefined) params.set("offset", filters.offset.toString());
      if (filters.sortBy) params.set("sort", filters.sortBy);
      if (filters.prefecture) params.set("prefecture", filters.prefecture);
      if (filters.municipality) params.set("municipality", filters.municipality);
      if (filters.locality) params.set("locality", filters.locality);
      if (filters.minPrice !== undefined) params.set("minPrice", filters.minPrice.toString());
      if (filters.maxPrice !== undefined) params.set("maxPrice", filters.maxPrice.toString());
      if (filters.propertyType) params.set("propertyType", filters.propertyType);
      if (filters.hasLand !== undefined) params.set("hasLand", filters.hasLand.toString());
      if (filters.minLandSqm !== undefined) params.set("minLandSqm", filters.minLandSqm.toString());
      if (filters.maxLandSqm !== undefined) params.set("maxLandSqm", filters.maxLandSqm.toString());
      if (filters.minHouseSqm !== undefined) params.set("minHouseSqm", filters.minHouseSqm.toString());
      if (filters.maxHouseSqm !== undefined) params.set("maxHouseSqm", filters.maxHouseSqm.toString());
      if (filters.minYearBuilt !== undefined) params.set("minYearBuilt", filters.minYearBuilt.toString());
      if (filters.maxYearBuilt !== undefined) params.set("maxYearBuilt", filters.maxYearBuilt.toString());

      const response = await fetch(`/api/properties?${params.toString()}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch properties: ${response.statusText}`);
      }
      
      return response.json();
    },
  });
}

// Hook to search properties
export function usePropertySearch(query: string, filters: PropertyFilters = {}) {
  return useQuery<PropertySearchResponse>({
    queryKey: propertyKeys.search(query, filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (query) params.set("q", query);
      if (filters.location) params.set("location", filters.location);
      if (filters.limit) params.set("limit", filters.limit.toString());
      if (filters.offset !== undefined) params.set("offset", filters.offset.toString());
      if (filters.sortBy) params.set("sort", filters.sortBy);
      if (filters.prefecture) params.set("prefecture", filters.prefecture);
      if (filters.municipality) params.set("municipality", filters.municipality);
      if (filters.minPrice !== undefined) params.set("minPrice", filters.minPrice.toString());
      if (filters.maxPrice !== undefined) params.set("maxPrice", filters.maxPrice.toString());

      const response = await fetch(`/api/properties/search?${params.toString()}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to search properties: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: query.length > 0 || Object.keys(filters).length > 0,
  });
}

// Hook to fetch a single property
export function useProperty(id: string | undefined) {
  return useQuery<PropertyDetailResponse>({
    queryKey: propertyKeys.detail(id || ""),
    queryFn: async () => {
      if (!id) throw new Error("Property ID is required");
      
      const response = await fetch(`/api/properties/${id}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Property not found");
        }
        throw new Error(`Failed to fetch property: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!id,
  });
}

// Hook to prefetch property details
export function usePrefetchProperty() {
  const queryClient = useQueryClient();
  
  return async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: propertyKeys.detail(id),
      queryFn: async () => {
        const response = await fetch(`/api/properties/${id}`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch property");
        return response.json();
      },
    });
  };
}

// Hook for managing favorites
export function usePropertyFavorites() {
  const queryClient = useQueryClient();
  
  // Get favorites from localStorage
  const getFavorites = (): string[] => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem("propertyFavorites");
    return stored ? JSON.parse(stored) : [];
  };
  
  // Add to favorites
  const addFavorite = (id: string) => {
    const favorites = getFavorites();
    if (!favorites.includes(id)) {
      const newFavorites = [...favorites, id];
      localStorage.setItem("propertyFavorites", JSON.stringify(newFavorites));
      queryClient.invalidateQueries({ queryKey: propertyKeys.all });
    }
  };
  
  // Remove from favorites
  const removeFavorite = (id: string) => {
    const favorites = getFavorites();
    const newFavorites = favorites.filter((fav) => fav !== id);
    localStorage.setItem("propertyFavorites", JSON.stringify(newFavorites));
    queryClient.invalidateQueries({ queryKey: propertyKeys.all });
  };
  
  // Toggle favorite
  const toggleFavorite = (id: string) => {
    const favorites = getFavorites();
    if (favorites.includes(id)) {
      removeFavorite(id);
    } else {
      addFavorite(id);
    }
  };
  
  // Check if is favorite
  const isFavorite = (id: string): boolean => {
    return getFavorites().includes(id);
  };
  
  return {
    getFavorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
  };
}

// Hook for pagination
export function usePropertyPagination(
  totalItems: number,
  itemsPerPage: number = 20,
  currentPage: number = 1
) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const offset = (currentPage - 1) * itemsPerPage;
  
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  
  return {
    totalPages,
    offset,
    hasNextPage,
    hasPreviousPage,
    startItem: offset + 1,
    endItem: Math.min(offset + itemsPerPage, totalItems),
  };
}
