import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { PropertyFiltersComponent } from "@/components/properties/PropertyFilters";
import { PropertyList } from "@/components/properties/PropertyList";
import { PropertyMap } from "@/components/properties/PropertyMap";
import { DevBanner } from "@/components/dev-banner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePropertySearch } from "@/hooks/usePropertySearch";
import { usePropertyFavorites } from "@/hooks/useProperties";
import type { PropertyFilters, ViewMode } from "@/components/properties/types";
import { Grid3X3, List, Map, Search, SlidersHorizontal, X } from "lucide-react";
import yenlowLogo from "@assets/yenlow-logo.png";

export default function PropertiesPage() {
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Use the new search hook with debouncing
  const {
    properties,
    total,
    isLoading,
    isFetching,
    error,
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    totalPages,
    sortBy,
    setSortBy,
  } = usePropertySearch({
    page: 1,
    limit: 20,
    sortBy: "newest",
  });

  // Favorites
  const { toggleFavorite, isFavorite } = usePropertyFavorites();

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: PropertyFilters) => {
    setFilters(newFilters);
  }, [setFilters]);

  // Handle property selection
  const handlePropertySelect = useCallback((id: string) => {
    setLocation(`/listing/${id}`);
  }, [setLocation]);

  // Handle sort change
  const handleSortChange = useCallback((value: string) => {
    setSortBy(value as PropertyFilters["sortBy"]);
  }, [setSortBy]);

  return (
    <div className="min-h-screen bg-background">
      <DevBanner />
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <a 
                href="/" 
                onClick={(e) => { e.preventDefault(); setLocation("/"); }}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <img src={yenlowLogo} alt="YenLow" className="h-8" />
              </a>
              <nav className="hidden sm:flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setLocation("/")}
                >
                  Home
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-primary font-medium"
                >
                  Properties
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setLocation("/search")}
                >
                  Search
                </Button>
              </nav>
            </div>

            <div className="flex items-center gap-2">
              {/* Search Input (Quick) */}
              <div className="hidden md:flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search properties..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 w-64 rounded-md border border-input bg-transparent px-9 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile Filter Toggle */}
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
              >
                <SlidersHorizontal className="h-4 w-4 mr-1" />
                Filters
              </Button>

              {/* View Mode Toggle */}
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <TabsList className="h-9">
                  <TabsTrigger value="grid" className="px-2">
                    <Grid3X3 className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="list" className="px-2">
                    <List className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="map" className="px-2">
                    <Map className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <aside 
            className={`
              lg:w-80 flex-shrink-0
              ${showMobileFilters ? 'block' : 'hidden lg:block'}
            `}
          >
            <PropertyFiltersComponent
              filters={filters}
              onFiltersChange={handleFiltersChange}
              totalResults={total}
              autoApply={false}
              isLoading={isLoading}
            />
          </aside>

          {/* Results Area */}
          <div className="flex-1 min-w-0">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-lg font-semibold">
                  {isLoading ? (
                    <span className="text-muted-foreground">Loading properties...</span>
                  ) : (
                    <>
                      {total.toLocaleString()} Properties
                      {searchQuery && (
                        <span className="text-muted-foreground font-normal">
                          {" "}matching "{searchQuery}"
                        </span>
                      )}
                    </>
                  )}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={sortBy || "newest"}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="newest">Newest First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>

            {/* Results Content */}
            {viewMode === "map" ? (
              <div className="h-[calc(100vh-280px)] min-h-[500px] rounded-lg border overflow-hidden">
                <PropertyMap
                  properties={properties}
                  onPropertySelect={handlePropertySelect}
                />
              </div>
            ) : (
              <PropertyList
                properties={properties}
                pagination={{
                  total,
                  limit: filters.limit || 20,
                  offset: ((page || 1) - 1) * (filters.limit || 20),
                  hasMore: page < totalPages,
                  page,
                  totalPages,
                }}
                isLoading={isLoading}
                error={error}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onPageChange={setPage}
                onSortChange={handleSortChange}
                onToggleFilters={() => setShowMobileFilters(true)}
                favorites={[]}
                onToggleFavorite={toggleFavorite}
                emptyMessage="No properties found matching your search criteria. Try adjusting your filters."
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
