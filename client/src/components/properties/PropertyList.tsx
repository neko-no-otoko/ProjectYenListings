import { useState, useCallback } from "react";
import { PropertyCard } from "./PropertyCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Grid3X3, 
  List, 
  Map, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  SlidersHorizontal
} from "lucide-react";
import type { Property, ViewMode, PaginationInfo } from "./types";

interface PropertyListProps {
  properties: Property[];
  pagination: PaginationInfo;
  isLoading?: boolean;
  error?: Error | null;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  onPageChange?: (page: number) => void;
  onSortChange?: (sort: string) => void;
  onToggleFilters?: () => void;
  favorites?: string[];
  onToggleFavorite?: (id: string) => void;
  emptyMessage?: string;
  showHeader?: boolean;
  showPagination?: boolean;
  className?: string;
}

export function PropertyList({
  properties,
  pagination,
  isLoading = false,
  error = null,
  viewMode = "grid",
  onViewModeChange,
  onPageChange,
  onSortChange,
  onToggleFilters,
  favorites = [],
  onToggleFavorite,
  emptyMessage = "No properties found matching your criteria.",
  showHeader = true,
  showPagination = true,
  className = "",
}: PropertyListProps) {
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>(viewMode);
  
  const currentViewMode = onViewModeChange ? viewMode : internalViewMode;
  
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else {
      setInternalViewMode(mode);
    }
  }, [onViewModeChange]);

  const handlePageChange = useCallback((newPage: number) => {
    if (onPageChange && newPage >= 1 && newPage <= (pagination.totalPages || Math.ceil(pagination.total / pagination.limit))) {
      onPageChange(newPage);
    }
  }, [onPageChange, pagination]);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={className}>
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <div className="text-red-500 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-1">Error loading properties</h3>
        <p className="text-muted-foreground text-center max-w-md">
          {error.message || "Something went wrong. Please try again."}
        </p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  // Empty state
  if (properties.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <div className="text-muted-foreground mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">No properties found</h3>
        <p className="text-muted-foreground text-center max-w-md mb-4">
          {emptyMessage}
        </p>
        {onToggleFilters && (
          <Button onClick={onToggleFilters}>
            Adjust Filters
          </Button>
        )}
      </div>
    );
  }

  const totalPages = pagination.totalPages || Math.ceil(pagination.total / pagination.limit);
  const currentPage = pagination.page || Math.floor(pagination.offset / pagination.limit) + 1;

  return (
    <div className={className}>
      {/* Header */}
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {pagination.total.toLocaleString()} properties found
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {onToggleFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleFilters}
                className="lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4 mr-1" />
                Filters
              </Button>
            )}
            
            {onSortChange && (
              <Select onValueChange={onSortChange} defaultValue="newest">
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            <div className="flex border rounded-md overflow-hidden">
              <Button
                variant={currentViewMode === "grid" ? "default" : "ghost"}
                size="sm"
                className="rounded-none h-9 px-2"
                onClick={() => handleViewModeChange("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={currentViewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="rounded-none h-9 px-2"
                onClick={() => handleViewModeChange("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={currentViewMode === "map" ? "default" : "ghost"}
                size="sm"
                className="rounded-none h-9 px-2"
                onClick={() => handleViewModeChange("map")}
              >
                <Map className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Property Grid/List */}
      <div className={`
        ${currentViewMode === "grid" 
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
          : currentViewMode === "list"
          ? "flex flex-col gap-3"
          : "grid grid-cols-1 lg:grid-cols-2 gap-4"
        }
      `}>
        {properties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            variant={currentViewMode === "list" ? "compact" : "default"}
            isFavorite={isFavorite(property.id)}
            onFavorite={onToggleFavorite}
          />
        ))}
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isLoading}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default PropertyList;
