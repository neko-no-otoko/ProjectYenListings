import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Search, 
  MapPin, 
  Home, 
  Maximize, 
  Calendar,
  DollarSign,
  RotateCcw,
  SlidersHorizontal,
  X,
  Check
} from "lucide-react";
import { PRICE_STEPS, getPriceLabel, sliderValueToJpy } from "@/lib/conversions";
import type { PropertyFilters } from "./types";

interface PropertyFiltersProps {
  filters: PropertyFilters;
  onFiltersChange: (filters: PropertyFilters) => void;
  onApply?: () => void;
  onReset?: () => void;
  availablePrefectures?: string[];
  availableIslands?: string[];
  totalResults?: number;
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
  showMobileToggle?: boolean;
}

const PREFECTURES = [
  "Hokkaido",
  "Aomori",
  "Iwate",
  "Miyagi",
  "Akita",
  "Yamagata",
  "Fukushima",
  "Ibaraki",
  "Tochigi",
  "Gunma",
  "Saitama",
  "Chiba",
  "Tokyo",
  "Kanagawa",
  "Niigata",
  "Toyama",
  "Ishikawa",
  "Fukui",
  "Yamanashi",
  "Nagano",
  "Gifu",
  "Shizuoka",
  "Aichi",
  "Mie",
  "Shiga",
  "Kyoto",
  "Osaka",
  "Hyogo",
  "Nara",
  "Wakayama",
  "Tottori",
  "Shimane",
  "Okayama",
  "Hiroshima",
  "Yamaguchi",
  "Tokushima",
  "Kagawa",
  "Ehime",
  "Kochi",
  "Fukuoka",
  "Saga",
  "Nagasaki",
  "Kumamoto",
  "Oita",
  "Miyazaki",
  "Kagoshima",
  "Okinawa",
];

const ISLANDS = [
  "Honshu",
  "Hokkaido",
  "Kyushu",
  "Shikoku",
  "Okinawa",
];

export function PropertyFiltersComponent({
  filters,
  onFiltersChange,
  onApply,
  onReset,
  availablePrefectures = PREFECTURES,
  availableIslands = ISLANDS,
  totalResults,
  className = "",
  isOpen = true,
  onClose,
  showMobileToggle = false,
}: PropertyFiltersProps) {
  const [localFilters, setLocalFilters] = useState<PropertyFilters>(filters);
  const [isExpanded, setIsExpanded] = useState(isOpen);

  const handleFilterChange = useCallback((key: keyof PropertyFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  }, [localFilters]);

  const handleApply = useCallback(() => {
    onFiltersChange(localFilters);
    onApply?.();
  }, [localFilters, onFiltersChange, onApply]);

  const handleReset = useCallback(() => {
    const resetFilters: PropertyFilters = {
      page: 1,
      limit: 20,
      sortBy: "newest",
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    onReset?.();
  }, [onFiltersChange, onReset]);

  const handlePriceChange = useCallback((values: number[]) => {
    const maxPrice = sliderValueToJpy(values[0]);
    handleFilterChange("maxPrice", maxPrice);
  }, [handleFilterChange]);

  const activeFiltersCount = Object.entries(localFilters).filter(([key, value]) => {
    if (["page", "limit", "sortBy"].includes(key)) return false;
    if (value === undefined || value === null || value === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }).length;

  const currentMaxPriceIndex = localFilters.maxPrice 
    ? PRICE_STEPS.findIndex(step => step.jpy >= (localFilters.maxPrice || Infinity)) - 1
    : PRICE_STEPS.length - 1;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Search Query */}
      <div className="space-y-2">
        <Label htmlFor="search-query" className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Search
        </Label>
        <Input
          id="search-query"
          placeholder="Search properties..."
          value={localFilters.query || ""}
          onChange={(e) => handleFilterChange("query", e.target.value)}
        />
      </div>

      <Separator />

      {/* Location Filters */}
      <Accordion type="multiple" defaultValue={["location"]} className="w-full">
        <AccordionItem value="location" className="border-none">
          <AccordionTrigger className="py-2 hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4" />
              Location
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Prefecture</Label>
              <Select 
                value={localFilters.prefecture || ""} 
                onValueChange={(value) => handleFilterChange("prefecture", value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Prefectures" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="">All Prefectures</SelectItem>
                  {availablePrefectures.map((pref) => (
                    <SelectItem key={pref} value={pref}>{pref}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Island</Label>
              <Select 
                value={localFilters.island || ""} 
                onValueChange={(value) => handleFilterChange("island", value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Islands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Islands</SelectItem>
                  {availableIslands.map((island) => (
                    <SelectItem key={island} value={island}>{island}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="municipality" className="text-xs text-muted-foreground">Municipality/City</Label>
              <Input
                id="municipality"
                placeholder="Enter city name..."
                value={localFilters.municipality || ""}
                onChange={(e) => handleFilterChange("municipality", e.target.value || undefined)}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="price" className="border-none">
          <AccordionTrigger className="py-2 hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4" />
              Price Range
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Any Price</span>
                <span className="font-medium">{getPriceLabel(currentMaxPriceIndex)}</span>
              </div>
              <Slider
                value={[currentMaxPriceIndex]}
                onValueChange={handlePriceChange}
                max={PRICE_STEPS.length - 1}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Drag to set maximum price
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="free-transfer"
                checked={localFilters.maxPrice === 0}
                onCheckedChange={(checked) => {
                  handleFilterChange("maxPrice", checked ? 0 : undefined);
                }}
              />
              <Label htmlFor="free-transfer" className="text-sm cursor-pointer">
                Free Transfer Only
              </Label>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="features" className="border-none">
          <AccordionTrigger className="py-2 hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Home className="h-4 w-4" />
              Property Features
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Layout (LDK)</Label>
              <Select 
                value={localFilters.minLdk?.toString() || ""} 
                onValueChange={(value) => handleFilterChange("minLdk", value ? parseInt(value) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any Layout" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any Layout</SelectItem>
                  <SelectItem value="1">1K/1R or larger</SelectItem>
                  <SelectItem value="2">2K/2DK or larger</SelectItem>
                  <SelectItem value="3">3K/3DK or larger</SelectItem>
                  <SelectItem value="4">4K/4DK or larger</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="has-land"
                checked={localFilters.mustHaveLand || false}
                onCheckedChange={(checked) => {
                  handleFilterChange("mustHaveLand", checked);
                }}
              />
              <Label htmlFor="has-land" className="text-sm cursor-pointer">
                Must Have Land
              </Label>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Minimum Condition Score</Label>
              <Select 
                value={localFilters.minConditionScore?.toString() || ""} 
                onValueChange={(value) => handleFilterChange("minConditionScore", value ? parseInt(value) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any Condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any Condition</SelectItem>
                  <SelectItem value="4">Good (4+)</SelectItem>
                  <SelectItem value="3">Average (3+)</SelectItem>
                  <SelectItem value="2">Poor (2+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="size" className="border-none">
          <AccordionTrigger className="py-2 hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Maximize className="h-4 w-4" />
              Size & Year
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Minimum House Size (m²)</Label>
              <Select 
                value={localFilters.minHouseSqm?.toString() || ""} 
                onValueChange={(value) => handleFilterChange("minHouseSqm", value ? parseInt(value) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any Size</SelectItem>
                  <SelectItem value="50">50+ m²</SelectItem>
                  <SelectItem value="100">100+ m²</SelectItem>
                  <SelectItem value="150">150+ m²</SelectItem>
                  <SelectItem value="200">200+ m²</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Minimum Land Size (m²)</Label>
              <Select 
                value={localFilters.minLandSqm?.toString() || ""} 
                onValueChange={(value) => handleFilterChange("minLandSqm", value ? parseInt(value) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any Size</SelectItem>
                  <SelectItem value="100">100+ m²</SelectItem>
                  <SelectItem value="300">300+ m²</SelectItem>
                  <SelectItem value="500">500+ m²</SelectItem>
                  <SelectItem value="1000">1000+ m²</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Built After Year</Label>
              <Select 
                value={localFilters.minYearBuilt?.toString() || ""} 
                onValueChange={(value) => handleFilterChange("minYearBuilt", value ? parseInt(value) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any Year</SelectItem>
                  <SelectItem value="2000">2000 or newer</SelectItem>
                  <SelectItem value="1990">1990 or newer</SelectItem>
                  <SelectItem value="1980">1980 or newer</SelectItem>
                  <SelectItem value="1960">1960 or newer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Separator />

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button onClick={handleApply} className="w-full">
          <Check className="h-4 w-4 mr-1" />
          Apply Filters
          {totalResults !== undefined && (
            <span className="ml-1">({totalResults.toLocaleString()})</span>
          )}
        </Button>
        
        <Button variant="outline" onClick={handleReset} className="w-full">
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset Filters
        </Button>
      </div>

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <div className="pt-2">
          <p className="text-xs text-muted-foreground mb-2">Active filters:</p>
          <div className="flex flex-wrap gap-1">
            {localFilters.query && (
              <Badge variant="secondary" className="text-xs">
                Search: {localFilters.query}
              </Badge>
            )}
            {localFilters.prefecture && (
              <Badge variant="secondary" className="text-xs">
                {localFilters.prefecture}
              </Badge>
            )}
            {localFilters.island && (
              <Badge variant="secondary" className="text-xs">
                {localFilters.island}
              </Badge>
            )}
            {localFilters.maxPrice !== undefined && (
              <Badge variant="secondary" className="text-xs">
                Max: {getPriceLabel(currentMaxPriceIndex)}
              </Badge>
            )}
            {localFilters.mustHaveLand && (
              <Badge variant="secondary" className="text-xs">Has Land</Badge>
            )}
            {localFilters.minConditionScore && (
              <Badge variant="secondary" className="text-xs">
                Condition {localFilters.minConditionScore}+
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Mobile view with toggle
  if (showMobileToggle) {
    return (
      <>
        <Button
          variant="outline"
          className="lg:hidden w-full mb-4"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2">{activeFiltersCount}</Badge>
          )}
        </Button>
        
        {isExpanded && (
          <Card className={`lg:hidden mb-4 ${className}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Filters</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <FilterContent />
            </CardContent>
          </Card>
        )}
        
        <div className="hidden lg:block">
          <Card className={className}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Filters</CardTitle>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary">{activeFiltersCount} active</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <FilterContent />
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Desktop sidebar view
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary">{activeFiltersCount} active</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <FilterContent />
      </CardContent>
    </Card>
  );
}

export default PropertyFiltersComponent;
