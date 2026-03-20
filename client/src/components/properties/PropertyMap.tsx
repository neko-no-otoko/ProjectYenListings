import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MapPin, 
  Navigation, 
  Plus, 
  Minus, 
  Layers,
  X,
  Maximize2,
  Minimize2
} from "lucide-react";
import { formatPriceUsd, formatHouseSqft } from "@/lib/conversions";
import type { Property } from "./types";

// Google Maps types
declare global {
  interface Window {
    google?: typeof google;
  }
}

interface PropertyMapProps {
  properties: Property[];
  selectedPropertyId?: string;
  onPropertySelect?: (property: Property) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  showControls?: boolean;
  showPropertyList?: boolean;
  isLoading?: boolean;
  error?: Error | null;
  className?: string;
  googleMapsApiKey?: string;
}

// Default center (Japan)
const DEFAULT_CENTER = { lat: 36.2048, lng: 138.2529 };
const DEFAULT_ZOOM = 6;

export function PropertyMap({
  properties,
  selectedPropertyId,
  onPropertySelect,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  height = "500px",
  showControls = true,
  showPropertyList = true,
  isLoading = false,
  error = null,
  className = "",
  googleMapsApiKey,
}: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Load Google Maps script
  useEffect(() => {
    if (!googleMapsApiKey) return;
    if (window.google?.maps) {
      setIsMapLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsMapLoaded(true);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [googleMapsApiKey]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded || !window.google?.maps) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: false,
      zoomControl: false,
    });

    mapInstanceRef.current = map;

    // Add custom styles for property markers
    map.setOptions({
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    });

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };
  }, [isMapLoaded, center.lat, center.lng, zoom]);

  // Update markers when properties change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    properties.forEach((property) => {
      const coords = property.location?.coordinates;
      if (!coords) return;

      const marker = new window.google.maps.Marker({
        position: { lat: coords.lat, lng: coords.lon },
        map: mapInstanceRef.current,
        title: property.title?.display || property.title?.en || "Property",
        animation: property.id === selectedPropertyId 
          ? window.google.maps.Animation.BOUNCE 
          : undefined,
        icon: {
          url: property.id === selectedPropertyId
            ? "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
            : "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
          scaledSize: new window.google.maps.Size(40, 40),
        },
      });

      // Info window content
      const infoContent = `
        <div style="padding: 8px; max-width: 200px;">
          <div style="font-weight: bold; margin-bottom: 4px;">${formatPriceUsd(property.pricing?.priceJpy)}</div>
          <div style="font-size: 12px; color: #666;">${property.location?.display || ""}</div>
        </div>
      `;

      const infoWindow = new window.google.maps.InfoWindow({
        content: infoContent,
      });

      marker.addListener("click", () => {
        infoWindow.open(mapInstanceRef.current, marker);
        setSelectedProperty(property);
        onPropertySelect?.(property);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if there are properties with coordinates
    const propertiesWithCoords = properties.filter((p) => p.location?.coordinates);
    if (propertiesWithCoords.length > 0 && propertiesWithCoords.length < 100) {
      const bounds = new window.google.maps.LatLngBounds();
      propertiesWithCoords.forEach((property) => {
        const coords = property.location!.coordinates!;
        bounds.extend({ lat: coords.lat, lng: coords.lon });
      });
      mapInstanceRef.current.fitBounds(bounds);
    }
  }, [properties, selectedPropertyId, onPropertySelect]);

  // Handle map controls
  const handleZoomIn = useCallback(() => {
    mapInstanceRef.current?.setZoom((mapInstanceRef.current.getZoom() || zoom) + 1);
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    mapInstanceRef.current?.setZoom((mapInstanceRef.current.getZoom() || zoom) - 1);
  }, [zoom]);

  const handleRecenter = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter(center);
      mapInstanceRef.current.setZoom(zoom);
    }
  }, [center, zoom]);

  const handleLayerToggle = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    
    const currentType = map.getMapTypeId();
    map.setMapTypeId(currentType === "satellite" ? "roadmap" : "satellite");
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <Card className={`overflow-hidden ${className}`}>
        <Skeleton className="w-full" style={{ height }} />
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={`overflow-hidden ${className}`}>
        <div 
          className="w-full flex items-center justify-center bg-muted"
          style={{ height }}
        >
          <div className="text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Failed to load map</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
        </div>
      </Card>
    );
  }

  // No API key fallback - show a placeholder with property list
  if (!googleMapsApiKey) {
    return (
      <Card className={`overflow-hidden ${className}`}>
        <div 
          className="w-full relative bg-muted flex flex-col"
          style={{ height }}
        >
          {/* Map Placeholder */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Map View Coming Soon</h3>
              <p className="text-muted-foreground max-w-md px-4">
                Google Maps integration requires an API key. 
                Property locations are available in the list view below.
              </p>
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {properties.length} properties
              </div>
            </div>
          </div>

          {/* Property List */}
          {showPropertyList && properties.length > 0 && (
            <div className="border-t bg-background p-4 max-h-48 overflow-y-auto">
              <p className="text-sm font-medium mb-2">Properties with locations:</p>
              <div className="space-y-2">
                {properties
                  .filter((p) => p.location?.coordinates)
                  .slice(0, 10)
                  .map((property) => (
                    <div 
                      key={property.id}
                      className="flex items-center justify-between p-2 bg-muted rounded cursor-pointer hover:bg-muted/80"
                      onClick={() => onPropertySelect?.(property)}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="text-sm truncate">
                          {property.location?.display || property.location?.municipality}
                        </span>
                      </div>
                      <Badge variant="secondary">
                        {formatPriceUsd(property.pricing?.priceJpy)}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden relative ${isExpanded ? "fixed inset-4 z-50" : ""} ${className}`}>
      {/* Map Container */}
      <div 
        ref={mapRef}
        className="w-full"
        style={{ height: isExpanded ? "calc(100vh - 2rem)" : height }}
      />

      {/* Loading overlay */}
      {!isMapLoaded && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-muted"
        >
          <div className="text-center">
            <Skeleton className="h-12 w-12 rounded-full mx-auto mb-2" />
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map Controls */}
      {showControls && isMapLoaded && (
        <>
          {/* Zoom Controls */}
          <div className="absolute right-4 top-4 flex flex-col gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="shadow-md"
              onClick={handleZoomIn}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="shadow-md"
              onClick={handleZoomOut}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>

          {/* Secondary Controls */}
          <div className="absolute left-4 top-4 flex flex-col gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="shadow-md"
              onClick={handleRecenter}
              title="Recenter"
            >
              <Navigation className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="shadow-md"
              onClick={handleLayerToggle}
              title="Toggle Satellite View"
            >
              <Layers className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="shadow-md"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Minimize" : "Expand"}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>

          {/* Property Counter */}
          <div className="absolute right-4 bottom-4">
            <Badge variant="secondary" className="shadow-md">
              <MapPin className="h-3 w-3 mr-1 inline" />
              {properties.filter((p) => p.location?.coordinates).length} properties
            </Badge>
          </div>

          {/* Selected Property Popup */}
          {selectedProperty && (
            <div className="absolute left-4 bottom-4 right-20">
              <Card className="p-3 shadow-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{formatPriceUsd(selectedProperty.pricing?.priceJpy)}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedProperty.location?.display}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedProperty.features?.ldk} • {formatHouseSqft(selectedProperty.features?.houseSqm)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setSelectedProperty(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Button 
                  className="w-full mt-2" 
                  size="sm"
                  onClick={() => onPropertySelect?.(selectedProperty)}
                >
                  View Details
                </Button>
              </Card>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export default PropertyMap;
