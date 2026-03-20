import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConditionBadge } from "@/components/condition-badge";
import { 
  formatPriceUsd, 
  formatHouseSqft, 
  formatLandSqft, 
  formatDistanceMiles 
} from "@/lib/conversions";
import { 
  MapPin, 
  Home, 
  Maximize, 
  Plane, 
  Calendar, 
  Heart,
  ExternalLink,
  BedDouble
} from "lucide-react";
import type { Property } from "./types";

interface PropertyCardProps {
  property: Property;
  variant?: "default" | "compact" | "featured";
  showActions?: boolean;
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
}

export function PropertyCard({ 
  property, 
  variant = "default",
  showActions = true,
  onFavorite,
  isFavorite = false
}: PropertyCardProps) {
  const photos = property.media?.photos || [];
  const primaryPhoto = photos[0]?.url || "https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=400&h=300&fit=crop";
  
  const title = property.translations?.titleDisplay || property.title?.display || property.title?.en || "Untitled Property";
  const location = property.translations?.locationDisplay || property.location?.display || 
    `${property.location?.municipality || property.location?.prefecture || ""}`;
  
  const isFreeTransfer = property.pricing?.priceJpy === 0;
  const hasLand = property.features?.hasLand;
  const conditionScore = property.features?.conditionScore || 3;
  
  // Compact variant for dense lists
  if (variant === "compact") {
    return (
      <Link href={`/properties/${property.id}`}>
        <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow duration-200">
          <div className="flex">
            <div className="relative w-32 h-24 flex-shrink-0">
              <img
                src={primaryPhoto}
                alt={title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {isFreeTransfer && (
                <Badge className="absolute top-1 left-1 text-[10px] px-1 py-0 bg-primary">
                  Free
                </Badge>
              )}
            </div>
            <div className="p-3 flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{title}</h4>
              <p className="text-xs text-muted-foreground truncate">{location}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="font-semibold text-sm">
                  {formatPriceUsd(property.pricing?.priceJpy)}
                </span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {property.features?.ldk && (
                    <span className="flex items-center gap-0.5">
                      <Home className="h-3 w-3" />
                      {property.features.ldk}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  // Featured variant for hero sections
  if (variant === "featured") {
    return (
      <Link href={`/properties/${property.id}`}>
        <Card className="overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 group">
          <div className="relative">
            <img
              src={primaryPhoto}
              alt={title}
              className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            
            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
              {isFreeTransfer && (
                <Badge className="bg-primary text-primary-foreground">
                  Free Transfer
                </Badge>
              )}
              {hasLand && (
                <Badge variant="secondary" className="bg-emerald-600 text-white border-0">
                  With Land
                </Badge>
              )}
              <Badge variant="outline" className="bg-black/50 text-white border-white/30">
                Featured
              </Badge>
            </div>
            
            <div className="absolute top-3 right-3">
              <ConditionBadge score={conditionScore} showLabel={false} />
            </div>

            {showActions && onFavorite && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-12 bg-black/50 hover:bg-black/70 text-white"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onFavorite(property.id);
                }}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
              </Button>
            )}
            
            <div className="absolute bottom-3 left-3 right-3">
              <span className="text-white text-2xl font-bold">
                {formatPriceUsd(property.pricing?.priceJpy)}
              </span>
              <h3 className="text-white font-semibold text-lg mt-1 line-clamp-2">
                {title}
              </h3>
              <div className="flex items-center gap-1 text-white/80 text-sm mt-1">
                <MapPin className="h-4 w-4" />
                <span className="truncate">{location}</span>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  // Default variant
  return (
    <Link href={`/properties/${property.id}`} data-testid={`link-property-${property.id}`}>
      <Card 
        className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 h-full flex flex-col"
        data-testid={`card-property-${property.id}`}
      >
        <div className="relative">
          <img
            src={primaryPhoto}
            alt={title}
            className="w-full h-48 object-cover"
            loading="lazy"
          />
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {isFreeTransfer && (
              <Badge className="bg-primary text-primary-foreground">
                Free Transfer
              </Badge>
            )}
            {hasLand && (
              <Badge variant="secondary" className="bg-emerald-600 text-white border-0">
                With Land
              </Badge>
            )}
          </div>
          <div className="absolute top-2 right-2">
            <ConditionBadge score={conditionScore} showLabel={false} />
          </div>
          <div className="absolute bottom-2 left-2">
            <span className="bg-black/70 text-white px-2 py-1 rounded text-lg font-semibold" data-testid={`text-price-${property.id}`}>
              {formatPriceUsd(property.pricing?.priceJpy)}
            </span>
          </div>
          
          {showActions && onFavorite && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-10 bg-black/50 hover:bg-black/70 text-white h-7 w-7"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFavorite(property.id);
              }}
            >
              <Heart className={`h-3.5 w-3.5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
            </Button>
          )}
        </div>

        <CardContent className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-base line-clamp-2 mb-2" data-testid={`text-property-title-${property.id}`}>
            {title}
          </h3>

          <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {location}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm mt-auto">
            {property.features?.ldk && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Home className="h-4 w-4" />
                <span>{property.features.ldk}</span>
              </div>
            )}
            {property.features?.bedrooms && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <BedDouble className="h-4 w-4" />
                <span>{property.features.bedrooms} BR</span>
              </div>
            )}
            {property.features?.houseSqm && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Maximize className="h-4 w-4" />
                <span>{formatHouseSqft(property.features.houseSqm)}</span>
              </div>
            )}
            {property.features?.landSqm && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Maximize className="h-4 w-4" />
                <span>Land: {formatLandSqft(property.features.landSqm)}</span>
              </div>
            )}
            {property.features?.yearBuilt && (
              <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                <Calendar className="h-4 w-4" />
                <span>Built {property.features.yearBuilt}</span>
              </div>
            )}
          </div>

          {(property.nearestAirportName || property.location?.coordinates) && (
            <div className="mt-3 pt-3 border-t flex items-center gap-1.5 text-sm text-muted-foreground">
              <Plane className="h-4 w-4" />
              <span>
                {property.nearestAirportName 
                  ? `${formatDistanceMiles(property.nearestAirportKm)} to ${property.nearestAirportName}`
                  : property.location?.coordinates && `${property.location.coordinates.lat.toFixed(4)}, ${property.location.coordinates.lon.toFixed(4)}`
                }
              </span>
            </div>
          )}
          
          {property.metadata?.sourceUrl && showActions && (
            <div className="mt-3 pt-3 border-t">
              <a 
                href={property.metadata.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                View Source
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default PropertyCard;
