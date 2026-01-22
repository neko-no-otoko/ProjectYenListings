import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/constants";
import { Maximize2, Minimize2, MapPin, AlertCircle } from "lucide-react";
import type { Listing } from "@shared/schema";

interface ListingMapProps {
  listings: Listing[];
  selectedListingId?: string;
  onListingSelect?: (id: string) => void;
  className?: string;
}

export function ListingMap({
  listings,
  selectedListingId,
  onListingSelect,
  className = "",
}: ListingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            },
          },
          layers: [
            {
              id: "osm",
              type: "raster",
              source: "osm",
            },
          ],
        },
        center: [138.2529, 36.2048],
        zoom: 5,
      });

      map.current.on("error", (e) => {
        console.error("Map error:", e);
        setMapError("Map could not be loaded");
      });

      map.current.addControl(new maplibregl.NavigationControl(), "top-right");
    } catch (error) {
      console.error("Failed to initialize map:", error);
      setMapError("Map is not available in this environment");
    }

    return () => {
      try {
        map.current?.remove();
      } catch (e) {
        console.error("Error removing map:", e);
      }
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || mapError) return;

    markersRef.current.forEach((marker) => {
      try {
        marker.remove();
      } catch (e) {
        console.error("Error removing marker:", e);
      }
    });
    markersRef.current = [];

    const bounds = new maplibregl.LngLatBounds();
    let hasValidCoords = false;

    listings.forEach((listing) => {
      if (!listing.lat || !listing.lon) return;

      hasValidCoords = true;
      bounds.extend([listing.lon, listing.lat]);

      const el = document.createElement("div");
      el.className = "listing-marker";
      el.innerHTML = `
        <div class="relative cursor-pointer transform transition-transform hover:scale-110">
          <div class="bg-primary text-white px-2 py-1 rounded-md text-xs font-semibold shadow-lg whitespace-nowrap
            ${selectedListingId === listing.id ? "ring-2 ring-white ring-offset-2 ring-offset-primary" : ""}">
            ${formatPrice(listing.priceJpy || 0).replace("¥", "").replace(" (Free Transfer)", "")}
          </div>
          <div class="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-primary rotate-45"></div>
        </div>
      `;

      el.addEventListener("click", () => {
        onListingSelect?.(listing.id);
      });

      try {
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([listing.lon, listing.lat])
          .addTo(map.current!);

        markersRef.current.push(marker);
      } catch (e) {
        console.error("Error adding marker:", e);
      }
    });

    if (hasValidCoords && listings.length > 0) {
      try {
        if (listings.length === 1 && listings[0].lat && listings[0].lon) {
          map.current.flyTo({
            center: [listings[0].lon, listings[0].lat],
            zoom: 12,
          });
        } else {
          map.current.fitBounds(bounds, { padding: 50, maxZoom: 10 });
        }
      } catch (e) {
        console.error("Error fitting bounds:", e);
      }
    }
  }, [listings, selectedListingId, onListingSelect, mapError]);

  if (mapError) {
    return (
      <Card
        className={`relative overflow-hidden ${
          isExpanded ? "fixed inset-4 z-50" : className
        }`}
      >
        <div 
          className="w-full h-full min-h-[400px] bg-muted flex flex-col items-center justify-center text-center p-6"
          data-testid="map-container"
        >
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Map Unavailable</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Interactive map could not be loaded in this environment.
          </p>
          {listings.length > 0 && (
            <div className="text-sm">
              <p className="font-medium mb-2">Property Locations:</p>
              <div className="space-y-1">
                {listings.slice(0, 5).map((listing) => (
                  <div key={listing.id} className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{listing.municipality || listing.prefecture}, {listing.island}</span>
                  </div>
                ))}
                {listings.length > 5 && (
                  <span className="text-xs">...and {listings.length - 5} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={`relative overflow-hidden ${
        isExpanded ? "fixed inset-4 z-50" : className
      }`}
    >
      <div
        ref={mapContainer}
        className="w-full h-full min-h-[400px]"
        data-testid="map-container"
      />
      <Button
        size="icon"
        variant="secondary"
        className="absolute top-2 left-2 z-10"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="button-map-expand"
      >
        {isExpanded ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
      </Button>
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/50 -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </Card>
  );
}
