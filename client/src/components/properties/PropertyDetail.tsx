import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConditionBadge } from "@/components/condition-badge";
import { PropertyCard } from "./PropertyCard";
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
  Share2,
  ExternalLink,
  ArrowLeft,
  BedDouble,
  Building,
  Tag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon
} from "lucide-react";
import type { Property } from "./types";

interface PropertyDetailProps {
  property: Property;
  relatedProperties?: Property[];
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onShare?: () => void;
}

export function PropertyDetail({
  property,
  relatedProperties = [],
  isFavorite = false,
  onToggleFavorite,
  onShare,
}: PropertyDetailProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  const photos = property.media?.photos || [];
  const hasPhotos = photos.length > 0;
  const primaryImage = hasPhotos 
    ? photos[selectedImageIndex]?.url 
    : "https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=800&h=600&fit=crop";
  
  const title = property.translations?.titleDisplay || property.title?.display || property.title?.en || "Untitled Property";
  const description = property.description?.en || property.description?.original || "No description available.";
  const location = property.translations?.locationDisplay || property.location?.display || 
    `${property.location?.municipality || ""}, ${property.location?.prefecture || ""}`;
  
  const isFreeTransfer = property.pricing?.priceJpy === 0;
  const conditionScore = property.features?.conditionScore || 3;
  
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <Link href="/properties">
        <Button variant="ghost" size="sm" className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Properties
        </Button>
      </Link>

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {isFreeTransfer && (
              <Badge className="bg-primary">Free Transfer</Badge>
            )}
            {property.features?.hasLand && (
              <Badge variant="secondary" className="bg-emerald-600 text-white">With Land</Badge>
            )}
            <ConditionBadge score={conditionScore} />
            
            {property.metadata?.tags?.map((tag) => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>
          
          <h1 className="text-2xl lg:text-3xl font-bold">{title}</h1>
          
          <div className="flex items-center gap-2 text-muted-foreground mt-2">
            <MapPin className="h-5 w-5" />
            <span className="text-lg">{location}</span>
            {property.location?.coordinates && (
              <span className="text-sm">
                ({property.location.coordinates.lat.toFixed(5)}, {property.location.coordinates.lon.toFixed(5)})
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-start lg:items-end gap-3">
          <div className="text-3xl lg:text-4xl font-bold text-primary">
            {formatPriceUsd(property.pricing?.priceJpy)}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={isFavorite ? "default" : "outline"}
              size="sm"
              onClick={onToggleFavorite}
            >
              <Heart className={`h-4 w-4 mr-1 ${isFavorite ? "fill-current" : ""}`} />
              {isFavorite ? "Saved" : "Save"}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onShare}
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            
            {property.metadata?.sourceUrl && (
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a 
                  href={property.metadata.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Source
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      <Card className="overflow-hidden">
        <div className="relative aspect-video lg:aspect-[21/9] bg-muted">
          <img
            src={primaryImage}
            alt={title}
            className="w-full h-full object-cover"
          />
          
          {!hasPhotos && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center text-muted-foreground">
                <ImageIcon className="h-16 w-16 mx-auto mb-2" />
                <p>No images available</p>
              </div>
            </div>
          )}
        </div>
        
        {photos.length > 1 && (
          <div className="p-4 bg-background border-t">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {photos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`flex-shrink-0 relative rounded-md overflow-hidden border-2 transition-all ${
                    selectedImageIndex === index 
                      ? "border-primary" 
                      : "border-transparent hover:border-muted-foreground"
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || `Photo ${index + 1}`}
                    className="w-20 h-20 object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="location">Location</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {description}
                  </p>
                  
                  {property.description?.original && property.description?.en && (
                    <div className="mt-4 p-3 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Original (Japanese):</p>
                      <p className="text-sm text-muted-foreground">{property.description.original}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Key Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-md">
                        <Home className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Layout</p>
                        <p className="font-medium">{property.features?.ldk || "N/A"}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-md">
                        <BedDouble className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Bedrooms</p>
                        <p className="font-medium">{property.features?.bedrooms || "N/A"}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-md">
                        <Building className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">House Size</p>
                        <p className="font-medium">{formatHouseSqft(property.features?.houseSqm)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-md">
                        <Maximize className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Land Size</p>
                        <p className="font-medium">{formatLandSqft(property.features?.landSqm)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-md">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Year Built</p>
                        <p className="font-medium">{property.features?.yearBuilt || "Unknown"}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-md">
                        <Tag className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Price Type</p>
                        <p className="font-medium capitalize">{property.pricing?.priceType?.replace("_", " ") || "Unknown"}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="features">
              <Card>
                <CardHeader>
                  <CardTitle>Property Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {property.features?.hasLand && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span>Includes Land</span>
                      </div>
                    )}
                    
                    {property.features?.landSqm && property.features.landSqm > 500 && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span>Large Land ({formatLandSqft(property.features.landSqm)})</span>
                      </div>
                    )}
                    
                    {property.features?.yearBuilt && property.features.yearBuilt >= 2000 && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span>Modern Construction (Built {property.features.yearBuilt})</span>
                      </div>
                    )}
                    
                    {property.features?.yearBuilt && property.features.yearBuilt < 1950 && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        <span>Historic Property (Built {property.features.yearBuilt})</span>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium mb-2">Condition Assessment</h4>
                    <div className="flex items-center gap-2">
                      <ConditionBadge score={conditionScore} />
                      <span className="text-sm text-muted-foreground">
                        {conditionScore >= 4 ? "Good condition, move-in ready" :
                         conditionScore >= 3 ? "Average condition, may need minor work" :
                         conditionScore >= 2 ? "Poor condition, significant renovation needed" :
                         "Major structural issues, extensive work required"}
                      </span>
                    </div>
                  </div>
                  
                  {property.metadata?.tags && property.metadata.tags.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {property.metadata.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="location">
              <Card>
                <CardHeader>
                  <CardTitle>Location Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prefecture</span>
                      <span>{property.location?.prefectureEn || property.location?.prefecture || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Municipality</span>
                      <span>{property.location?.municipality || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Locality</span>
                      <span>{property.location?.locality || "N/A"}</span>
                    </div>
                    {property.location?.island && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Island</span>
                        <span>{property.location.islandEn || property.location.island}</span>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  {property.nearestAirportName && (
                    <div className="flex items-center gap-3">
                      <Plane className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">{property.nearestAirportName}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceMiles(property.nearestAirportKm)} away
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {property.location?.coordinates && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground mb-2">Coordinates</p>
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {property.location.coordinates.lat.toFixed(6)}, {property.location.coordinates.lon.toFixed(6)}
                      </code>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Right Column - Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Listing Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Listed:</span>
                <span>{formatDate(property.metadata?.listedAt)}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Last Updated:</span>
                <span>{formatDate(property.metadata?.lastSeenAt)}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={property.metadata?.status === "active" ? "default" : "secondary"}>
                  {property.metadata?.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Interested?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full">
                Contact About This Property
              </Button>
              
              <Button variant="outline" className="w-full">
                Schedule a Viewing
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Related Properties */}
      {relatedProperties.length > 0 && (
        <div className="pt-6 border-t">
          <h2 className="text-xl font-semibold mb-4">Similar Properties</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedProperties.slice(0, 4).map((related) => (
              <PropertyCard
                key={related.id}
                property={related}
                variant="compact"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PropertyDetail;
