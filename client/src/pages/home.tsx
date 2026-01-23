import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { DevBanner } from "@/components/dev-banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  Home as HomeIcon, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  MapPin,
  Bed,
  Square,
  Clock
} from "lucide-react";
import { formatPriceUsd, formatHouseSqft, formatLandSqft } from "@/lib/conversions";

interface NewestListing {
  id: string;
  titleEn: string | null;
  prefecture: string | null;
  municipality: string | null;
  locality: string | null;
  priceJpy: number | null;
  priceType: string | null;
  ldk: string | null;
  houseSqm: number | null;
  landSqm: number | null;
  photos: string[] | null;
  listedAt: string | null;
  lastSeenAt: string | null;
  status: string | null;
}

function getDaysOnSite(listing: NewestListing): number | null {
  const date = listing.listedAt || listing.lastSeenAt;
  if (!date) return null;
  const diffMs = Date.now() - new Date(date).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function getPriceTypeBadge(priceType: string | null): string | null {
  switch (priceType) {
    case "transfer_fee":
      return "Transfer Fee";
    case "purchase_price":
      return "For Sale";
    case "negotiable":
      return "Negotiable";
    default:
      return null;
  }
}

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const carouselRef = useRef<HTMLDivElement>(null);

  const { data: newestListings, isLoading } = useQuery<NewestListing[]>({
    queryKey: ["/api/home/newest"],
    queryFn: async () => {
      const res = await fetch("/api/home/newest?limit=7");
      if (!res.ok) throw new Error("Failed to fetch newest listings");
      return res.json();
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      setLocation("/search");
    }
  };

  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const scrollAmount = 320;
    carouselRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <DevBanner />
      
      <header className="absolute top-0 left-0 right-0 z-40 bg-transparent">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded-md bg-white/90 flex items-center justify-center shadow-sm">
                  <HomeIcon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white drop-shadow-md">YenLow</span>
              </Link>
              <nav className="hidden sm:flex items-center gap-4">
                <Link href="/search" className="text-sm font-medium text-white/90 hover:text-white transition-colors drop-shadow">
                  Buy
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <section className="relative h-[500px] md:h-[550px] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1480796927426-f609979314bd?auto=format&fit=crop&w=1920&q=80')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />
        
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg max-w-3xl">
            Cheap homes in Japan, in English.
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl drop-shadow">
            Search live listings from municipal open data and partners.
          </p>
          
          <form onSubmit={handleSearch} className="w-full max-w-2xl px-4">
            <div className="relative flex items-center">
              <Input
                type="text"
                placeholder="Enter a prefecture, city, town, or keyword"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 pl-5 pr-14 text-lg rounded-full bg-white shadow-xl border-0 focus-visible:ring-2 focus-visible:ring-primary"
                data-testid="input-hero-search"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-2 h-10 w-10 rounded-full"
                data-testid="button-hero-search"
              >
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </form>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold" data-testid="text-newest-homes-title">Newest homes</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scrollCarousel("left")}
              className="hidden md:flex"
              data-testid="button-carousel-left"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scrollCarousel("right")}
              className="hidden md:flex"
              data-testid="button-carousel-right"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[300px]">
                <Skeleton className="h-48 w-full rounded-t-lg" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : newestListings && newestListings.length > 0 ? (
          <div
            ref={carouselRef}
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {newestListings.map((listing) => {
              const daysOnSite = getDaysOnSite(listing);
              const priceTypeBadge = getPriceTypeBadge(listing.priceType);
              const photoUrl = listing.photos?.[0] || null;
              const location = [listing.prefecture, listing.municipality, listing.locality]
                .filter(Boolean)
                .join(", ");

              return (
                <Card
                  key={listing.id}
                  className="flex-shrink-0 w-[300px] overflow-hidden hover-elevate cursor-pointer snap-start"
                  onClick={() => setLocation(`/listing/${listing.id}`)}
                  data-testid={`card-listing-${listing.id}`}
                >
                  <div className="relative h-48 bg-muted">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={listing.titleEn || "Property"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <HomeIcon className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                    
                    <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                      {priceTypeBadge && (
                        <Badge variant="secondary" className="bg-white/90 text-xs">
                          {priceTypeBadge}
                        </Badge>
                      )}
                      {daysOnSite !== null && daysOnSite <= 14 && (
                        <Badge className="bg-primary text-primary-foreground text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {daysOnSite === 0 ? "New today" : `${daysOnSite}d ago`}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="text-xl font-bold text-primary mb-1" data-testid={`text-price-${listing.id}`}>
                      {formatPriceUsd(listing.priceJpy)}
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                      {listing.ldk && (
                        <span className="flex items-center gap-1">
                          <Bed className="h-3.5 w-3.5" />
                          {listing.ldk}
                        </span>
                      )}
                      {listing.houseSqm && (
                        <span className="flex items-center gap-1">
                          <Square className="h-3.5 w-3.5" />
                          {formatHouseSqft(listing.houseSqm)}
                        </span>
                      )}
                      {listing.landSqm && (
                        <span className="text-xs">
                          {formatLandSqft(listing.landSqm)} land
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-start gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{location || "Japan"}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <HomeIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Listings Yet</h3>
            <p className="text-muted-foreground mb-4">
              Check back soon for new properties
            </p>
            <Button variant="outline" asChild>
              <Link href="/search">Browse All Properties</Link>
            </Button>
          </div>
        )}
      </section>

      <footer className="border-t py-8 mt-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <HomeIcon className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">YenLow</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Data sourced from municipal akiya banks and partner feeds. Prices and availability subject to change.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
