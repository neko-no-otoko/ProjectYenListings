import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ConditionBadge } from "@/components/condition-badge";
import { ListingMap } from "@/components/listing-map";
import { formatPrice, formatArea, CONDITION_LABELS } from "@/lib/constants";
import {
  ArrowLeft,
  MapPin,
  Home,
  Maximize,
  Calendar,
  Plane,
  ExternalLink,
  ChevronDown,
  Check,
  AlertTriangle,
  Building,
  TreePine,
} from "lucide-react";
import type { Listing } from "@shared/schema";
import { useState } from "react";

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);

  const { data: listing, isLoading, error } = useQuery<Listing>({
    queryKey: ["/api/listings", id],
    queryFn: async () => {
      const res = await fetch(`/api/listings/${id}`);
      if (!res.ok) throw new Error("Failed to fetch listing");
      return res.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-96 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Listing Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This property may no longer be available.
          </p>
          <Link href="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Search
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const photos = (listing.photos as Array<{ url: string; caption?: string; attribution?: string }>) || [
    { url: "https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=800&h=600&fit=crop" },
  ];
  const conditionReasons = listing.conditionReasonsEn || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Search
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="relative rounded-lg overflow-hidden bg-muted">
              <img
                src={photos[currentPhotoIndex]?.url}
                alt={listing.titleEn}
                className="w-full h-[400px] object-cover"
                data-testid="img-main-photo"
              />
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setCurrentPhotoIndex((i) =>
                        i === 0 ? photos.length - 1 : i - 1
                      )
                    }
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
                    data-testid="button-prev-photo"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPhotoIndex((i) =>
                        i === photos.length - 1 ? 0 : i + 1
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
                    data-testid="button-next-photo"
                  >
                    <ArrowLeft className="h-5 w-5 rotate-180" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {photos.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPhotoIndex(i)}
                        className={`w-2 h-2 rounded-full transition ${
                          i === currentPhotoIndex ? "bg-white" : "bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
              {photos[currentPhotoIndex]?.attribution && (
                <div className="absolute bottom-4 right-4 text-xs text-white/70 bg-black/50 px-2 py-1 rounded">
                  {photos[currentPhotoIndex].attribution}
                </div>
              )}
            </div>

            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {photos.map((photo, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPhotoIndex(i)}
                    className={`flex-shrink-0 rounded-md overflow-hidden border-2 transition ${
                      i === currentPhotoIndex
                        ? "border-primary"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={photo.url}
                      alt={`Photo ${i + 1}`}
                      className="w-20 h-16 object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-2xl mb-2" data-testid="text-listing-title">
                      {listing.titleEn}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span>
                        {[listing.municipality, listing.prefecture, listing.island]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary" data-testid="text-price">
                      {formatPrice(listing.priceJpy || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {listing.priceType === "transfer_fee"
                        ? "Transfer Fee"
                        : listing.priceType === "purchase_price"
                        ? "Purchase Price"
                        : "Price Type Unknown"}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-6">
                  <ConditionBadge score={listing.conditionScore || 3} />
                  {listing.hasLand && (
                    <Badge variant="secondary" className="bg-emerald-600 text-white border-0">
                      Includes Land
                    </Badge>
                  )}
                  {listing.priceJpy === 0 && (
                    <Badge className="bg-primary text-primary-foreground">
                      Free Transfer
                    </Badge>
                  )}
                  {listing.tags?.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <Home className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <div className="font-semibold">{listing.ldk || "—"}</div>
                    <div className="text-xs text-muted-foreground">Layout</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <Building className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <div className="font-semibold">{formatArea(listing.houseSqm)}</div>
                    <div className="text-xs text-muted-foreground">House Size</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <TreePine className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <div className="font-semibold">{formatArea(listing.landSqm)}</div>
                    <div className="text-xs text-muted-foreground">Land Size</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <Calendar className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <div className="font-semibold">{listing.yearBuilt || "—"}</div>
                    <div className="text-xs text-muted-foreground">Year Built</div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Description</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {listing.descriptionEn ||
                      "No description available for this property."}
                  </p>

                  {listing.descriptionOriginal && (
                    <Collapsible open={showOriginal} onOpenChange={setShowOriginal}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-muted-foreground">
                          <ChevronDown
                            className={`h-4 w-4 mr-1 transition ${
                              showOriginal ? "rotate-180" : ""
                            }`}
                          />
                          {showOriginal ? "Hide" : "Show"} Original Japanese
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3">
                        <div className="p-4 bg-muted rounded-lg text-sm">
                          {listing.descriptionOriginal}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Condition Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className={`w-16 h-16 rounded-lg flex items-center justify-center text-white text-2xl font-bold ${
                      CONDITION_LABELS[listing.conditionScore || 3]?.color || "bg-yellow-500"
                    }`}
                  >
                    {listing.conditionScore || 3}
                  </div>
                  <div>
                    <div className="font-semibold text-lg">
                      {CONDITION_LABELS[listing.conditionScore || 3]?.label || "Fair"} Condition
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Based on listing description analysis
                    </div>
                  </div>
                </div>
                {conditionReasons.length > 0 && (
                  <ul className="space-y-2">
                    {conditionReasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {listing.lat && listing.lon ? (
                  <div className="h-48 rounded-lg overflow-hidden">
                    <ListingMap
                      listings={[listing]}
                      className="h-full"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                    <MapPin className="h-8 w-8" />
                  </div>
                )}

                <div className="space-y-3">
                  {listing.addressEn && (
                    <div>
                      <div className="text-sm text-muted-foreground">Address</div>
                      <div className="font-medium">{listing.addressEn}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-muted-foreground">Region</div>
                    <div className="font-medium">
                      {[listing.municipality, listing.prefecture]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Island</div>
                    <div className="font-medium">{listing.island || "—"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {listing.nearestAirportName && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plane className="h-5 w-5" />
                    Nearest Airport
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold">
                    {listing.nearestAirportName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {listing.nearestAirportIata && `(${listing.nearestAirportIata})`}
                  </div>
                  <div className="mt-2 text-2xl font-bold text-primary">
                    {listing.nearestAirportKm?.toFixed(0)} km
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Approximate driving distance
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Price Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {listing.priceType === "transfer_fee"
                      ? "Transfer Fee"
                      : "Purchase Price"}
                  </span>
                  <span className="font-semibold">
                    {formatPrice(listing.priceJpy || 0)}
                  </span>
                </div>
                <Separator />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    <strong>Note:</strong> Additional costs may include:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Registration tax (approximately 2%)</li>
                    <li>Real estate acquisition tax</li>
                    <li>Judicial scrivener fees</li>
                    <li>Property tax (annual)</li>
                  </ul>
                  <p className="mt-2">
                    For non-residents, consider brokerage guidance and legal
                    consultation fees.
                  </p>
                </div>
              </CardContent>
            </Card>

            {listing.sourceUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Source</CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={listing.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                    data-testid="link-source"
                  >
                    View Original Listing
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  {listing.lastSeenAt && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Last updated:{" "}
                      {new Date(listing.lastSeenAt).toLocaleDateString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
