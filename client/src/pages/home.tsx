import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { SearchFilters } from "@/components/search-filters";
import { ListingCard } from "@/components/listing-card";
import { ListingMap } from "@/components/listing-map";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Grid, Map, Home as HomeIcon, ChevronLeft, ChevronRight } from "lucide-react";
import type { SearchFilters as SearchFiltersType, Listing } from "@shared/schema";

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState<SearchFiltersType>({
    maxPrice: 150000,
    mustHaveLand: true,
    includeUnknownLand: false,
    sortBy: "price_asc",
    page: 1,
    limit: 20,
  });
  const [selectedListingId, setSelectedListingId] = useState<string>();
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  const buildQueryString = (f: SearchFiltersType) => {
    const params = new URLSearchParams();
    if (f.prefecture) params.set("prefecture", f.prefecture);
    if (f.island) params.set("island", f.island);
    if (f.municipality) params.set("municipality", f.municipality);
    if (f.maxPrice !== undefined) params.set("maxPrice", String(f.maxPrice));
    if (f.minLdk) params.set("minLdk", String(f.minLdk));
    if (f.maxLdk) params.set("maxLdk", String(f.maxLdk));
    if (f.minHouseSqm) params.set("minHouseSqm", String(f.minHouseSqm));
    if (f.maxHouseSqm) params.set("maxHouseSqm", String(f.maxHouseSqm));
    if (f.minLandSqm) params.set("minLandSqm", String(f.minLandSqm));
    if (f.maxLandSqm) params.set("maxLandSqm", String(f.maxLandSqm));
    if (f.minYearBuilt) params.set("minYearBuilt", String(f.minYearBuilt));
    if (f.minConditionScore) params.set("minConditionScore", String(f.minConditionScore));
    if (f.mustHaveLand !== undefined) params.set("mustHaveLand", String(f.mustHaveLand));
    if (f.includeUnknownLand !== undefined) params.set("includeUnknownLand", String(f.includeUnknownLand));
    if (f.sortBy) params.set("sortBy", f.sortBy);
    if (f.page) params.set("page", String(f.page));
    if (f.limit) params.set("limit", String(f.limit));
    return params.toString();
  };

  const { data, isLoading, refetch } = useQuery<{
    listings: Listing[];
    total: number;
    page: number;
    totalPages: number;
  }>({
    queryKey: ["/api/search", filters],
    queryFn: async () => {
      const res = await fetch(`/api/search?${buildQueryString(filters)}`);
      if (!res.ok) throw new Error("Failed to fetch listings");
      return res.json();
    },
  });

  const handleSearch = () => {
    setFilters((f) => ({ ...f, page: 1 }));
    refetch();
  };

  const handlePageChange = (newPage: number) => {
    setFilters((f) => ({ ...f, page: newPage }));
  };

  const handleListingSelect = (id: string) => {
    setSelectedListingId(id);
    setLocation(`/listing/${id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
                <HomeIcon className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">AkiyaFinder</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Affordable Homes in Japan
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "grid" | "map")}>
                <TabsList>
                  <TabsTrigger value="grid" data-testid="tab-grid-view">
                    <Grid className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Grid</span>
                  </TabsTrigger>
                  <TabsTrigger value="map" data-testid="tab-map-view">
                    <Map className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Map</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-80 flex-shrink-0">
            <SearchFilters
              filters={filters}
              onFiltersChange={setFilters}
              onSearch={handleSearch}
              isLoading={isLoading}
            />
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold" data-testid="text-results-count">
                  {isLoading ? (
                    <Skeleton className="h-6 w-32" />
                  ) : (
                    `${data?.total || 0} Properties Found`
                  )}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Showing properties under ¥150,000 with land
                </p>
              </div>
            </div>

            {viewMode === "grid" ? (
              <>
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="space-y-3">
                        <Skeleton className="h-48 w-full rounded-md" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : data?.listings && data.listings.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {data.listings.map((listing) => (
                      <ListingCard key={listing.id} listing={listing} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <HomeIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Properties Found</h3>
                    <p className="text-muted-foreground mb-4">
                      Try adjusting your filters to find more listings
                    </p>
                    <Button variant="outline" onClick={() => setFilters({
                      maxPrice: 150000,
                      mustHaveLand: true,
                      includeUnknownLand: false,
                      sortBy: "price_asc",
                      page: 1,
                      limit: 20,
                    })}>
                      Reset Filters
                    </Button>
                  </div>
                )}

                {data && data.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={data.page <= 1}
                      onClick={() => handlePageChange(data.page - 1)}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-4">
                      Page {data.page} of {data.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={data.page >= data.totalPages}
                      onClick={() => handlePageChange(data.page + 1)}
                      data-testid="button-next-page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="h-[calc(100vh-220px)] min-h-[500px]">
                <ListingMap
                  listings={data?.listings || []}
                  selectedListingId={selectedListingId}
                  onListingSelect={handleListingSelect}
                  className="h-full"
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
