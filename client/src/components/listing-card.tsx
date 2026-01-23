import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConditionBadge } from "@/components/condition-badge";
import { formatPriceUsd, formatHouseSqft, formatLandSqft, formatDistanceMiles } from "@/lib/conversions";
import { MapPin, Home, Maximize, Plane, Calendar } from "lucide-react";
import type { Listing } from "@shared/schema";

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const photos = listing.photos as Array<{ url: string; caption?: string }> | null;
  const primaryPhoto = photos?.[0]?.url || "https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=400&h=300&fit=crop";

  return (
    <Link href={`/listing/${listing.id}`} data-testid={`link-listing-${listing.id}`}>
      <Card 
        className="overflow-visible cursor-pointer hover-elevate active-elevate-2 transition-all duration-200"
        data-testid={`card-listing-${listing.id}`}
      >
        <div className="relative">
          <img
            src={primaryPhoto}
            alt={listing.titleEn}
            className="w-full h-48 object-cover rounded-t-md"
            loading="lazy"
          />
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {listing.priceJpy === 0 && (
              <Badge className="bg-primary text-primary-foreground">
                Free Transfer
              </Badge>
            )}
            {listing.hasLand && (
              <Badge variant="secondary" className="bg-emerald-600 text-white border-0">
                With Land
              </Badge>
            )}
          </div>
          <div className="absolute top-2 right-2">
            <ConditionBadge score={listing.conditionScore || 3} showLabel={false} />
          </div>
          <div className="absolute bottom-2 left-2">
            <span className="bg-black/70 text-white px-2 py-1 rounded text-lg font-semibold" data-testid={`text-price-${listing.id}`}>
              {formatPriceUsd(listing.priceJpy)}
            </span>
          </div>
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-base line-clamp-2 mb-2" data-testid={`text-listing-title-${listing.id}`}>
            {listing.titleEn}
          </h3>

          <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {listing.municipality || listing.prefecture}
              {listing.island && `, ${listing.island}`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Home className="h-4 w-4" />
              <span>{listing.ldk || "—"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Maximize className="h-4 w-4" />
              <span>{formatHouseSqft(listing.houseSqm)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Maximize className="h-4 w-4" />
              <span>Land: {formatLandSqft(listing.landSqm)}</span>
            </div>
            {listing.yearBuilt && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Built {listing.yearBuilt}</span>
              </div>
            )}
          </div>

          {listing.nearestAirportName && (
            <div className="mt-3 pt-3 border-t flex items-center gap-1.5 text-sm text-muted-foreground">
              <Plane className="h-4 w-4" />
              <span>
                {formatDistanceMiles(listing.nearestAirportKm)} to {listing.nearestAirportName}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
