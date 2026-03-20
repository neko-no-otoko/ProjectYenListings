/**
 * Example Properties Page
 * 
 * This page demonstrates how to use all the property components together.
 * It shows the PropertyFilters sidebar, PropertyList grid, and integrates
 * with the useProperties hook for data fetching.
 */

import { useState } from "react";
import { useRoute } from "wouter";
import { 
  PropertyList, 
  PropertyFilters,
  PropertyDetail,
  PropertyMap,
  type PropertyFilterOptions,
  type ViewMode,
} from "@/components/properties";
import { 
  useProperties, 
  useProperty,
  usePropertyFavorites,
} from "@/hooks/useProperties";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Grid3X3, List, Map } from "lucide-react";

// Default filters
const defaultFilters: PropertyFilterOptions = {
  page: 1,
  limit: 20,
  sortBy: "newest",
};

export default function PropertiesPage() {
  // Check if we're on a detail page
  const [, params] = useRoute("/properties/:id");
  const propertyId = params?.id;

  // State
  const [filters, setFilters] = useState<PropertyFilterOptions>(defaultFilters);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showFilters, setShowFilters] = useState(true);

  // Hooks
  const { data, isLoading, error } = useProperties(filters);
  const { data: propertyData } = useProperty(propertyId);
  const { getFavorites, toggleFavorite, isFavorite } = usePropertyFavorites();

  // Handlers
  const handleFiltersChange = (newFilters: PropertyFilterOptions) => {
    setFilters({ ...newFilters, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleSortChange = (sortBy: string) => {
    setFilters({ ...filters, sortBy: sortBy as any });
  };

  // Property Detail View
  if (propertyId) {
    if (!propertyData) {
      return (
        <div className="container mx-auto py-8 px-4">
          <Skeleton className="h-96 w-full" />
        </div>
      );
    }

    return (
      <div className="container mx-auto py-8 px-4">
        <PropertyDetail
          property={propertyData.data.property}
          relatedProperties={propertyData.data.related}
          isFavorite={isFavorite(propertyId)}
          onToggleFavorite={() => toggleFavorite(propertyId)}
          onShare={() => {
            navigator.clipboard.writeText(window.location.href);
            // Could add toast notification here
          }}
        />
      </div>
    );
  }

  // Property List View
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Akiya Properties</h1>
        <p className="text-muted-foreground">
          Discover abandoned homes and vacant properties across Japan
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters Sidebar */}
        <div className={`lg:w-64 ${showFilters ? "" : "hidden lg:block"}`}>
          <PropertyFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            totalResults={data?.data.pagination.total}
            showMobileToggle={true}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="grid">
                  <Grid3X3 className="h-4 w-4 mr-1" />
                  Grid
                </TabsTrigger>
                <TabsTrigger value="list">
                  <List className="h-4 w-4 mr-1" />
                  List
                </TabsTrigger>
                <TabsTrigger value="map">
                  <Map className="h-4 w-4 mr-1" />
                  Map
                </TabsTrigger>
              </TabsList>

              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden"
              >
                {showFilters ? "Hide" : "Show"} Filters
              </Button>
            </div>

            <TabsContent value="grid" className="mt-0">
              <PropertyList
                properties={data?.data.properties || []}
                pagination={data?.data.pagination || { total: 0, limit: 20, offset: 0, hasMore: false }}
                isLoading={isLoading}
                error={error}
                viewMode="grid"
                onPageChange={handlePageChange}
                onSortChange={handleSortChange}
                favorites={getFavorites()}
                onToggleFavorite={toggleFavorite}
                showHeader={true}
                showPagination={true}
              />
            </TabsContent>

            <TabsContent value="list" className="mt-0">
              <PropertyList
                properties={data?.data.properties || []}
                pagination={data?.data.pagination || { total: 0, limit: 20, offset: 0, hasMore: false }}
                isLoading={isLoading}
                error={error}
                viewMode="list"
                onPageChange={handlePageChange}
                onSortChange={handleSortChange}
                favorites={getFavorites()}
                onToggleFavorite={toggleFavorite}
                showHeader={true}
                showPagination={true}
              />
            </TabsContent>

            <TabsContent value="map" className="mt-0">
              <PropertyMap
                properties={data?.data.properties || []}
                height="600px"
                showControls={true}
                // googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
              />
              
              <div className="mt-4">
                <PropertyList
                  properties={data?.data.properties?.slice(0, 4) || []}
                  pagination={{ total: 0, limit: 4, offset: 0, hasMore: false }}
                  isLoading={isLoading}
                  viewMode="grid"
                  favorites={getFavorites()}
                  onToggleFavorite={toggleFavorite}
                  showHeader={false}
                  showPagination={false}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
