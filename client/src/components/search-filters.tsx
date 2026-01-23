import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PREFECTURES, ISLANDS, SORT_OPTIONS } from "@/lib/constants";
import { Search, ChevronDown, X, Filter } from "lucide-react";
import type { SearchFilters as SearchFiltersType } from "@shared/schema";
import { PRICE_STEPS, jpyToSliderValue, sliderValueToJpy, getPriceLabel, sqmToSqft } from "@/lib/conversions";

interface SearchFiltersProps {
  filters: SearchFiltersType;
  onFiltersChange: (filters: SearchFiltersType) => void;
  onSearch: () => void;
  isLoading?: boolean;
}

export function SearchFilters({ filters, onFiltersChange, onSearch, isLoading }: SearchFiltersProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const updateFilter = <K extends keyof SearchFiltersType>(key: K, value: SearchFiltersType[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      maxPrice: undefined,
      mustHaveLand: false,
      includeUnknownLand: true,
      sortBy: "price_asc",
      page: 1,
      limit: 20,
    });
  };

  const priceSliderValue = jpyToSliderValue(filters.maxPrice);

  const handlePriceChange = (values: number[]) => {
    const newMaxPrice = sliderValueToJpy(values[0]);
    updateFilter("maxPrice", newMaxPrice);
  };

  const activeFiltersCount = [
    filters.prefecture,
    filters.island,
    filters.municipality,
    filters.minLdk,
    filters.maxLdk,
    filters.minHouseSqm,
    filters.maxHouseSqm,
    filters.minLandSqm,
    filters.maxLandSqm,
    filters.minYearBuilt,
    filters.minConditionScore,
  ].filter(Boolean).length;

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Search Filters
          </CardTitle>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground"
              data-testid="button-clear-filters"
            >
              <X className="h-4 w-4 mr-1" />
              Clear ({activeFiltersCount})
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="island">Island</Label>
          <Select
            value={filters.island || "all"}
            onValueChange={(v) => updateFilter("island", v === "all" ? undefined : v)}
          >
            <SelectTrigger id="island" data-testid="select-island">
              <SelectValue placeholder="All Islands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Islands</SelectItem>
              {ISLANDS.map((island) => (
                <SelectItem key={island.value} value={island.value}>
                  {island.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="prefecture">Prefecture</Label>
          <Select
            value={filters.prefecture || "all"}
            onValueChange={(v) => updateFilter("prefecture", v === "all" ? undefined : v)}
          >
            <SelectTrigger id="prefecture" data-testid="select-prefecture">
              <SelectValue placeholder="All Prefectures" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prefectures</SelectItem>
              {PREFECTURES.filter(
                (p) => !filters.island || p.island === filters.island
              ).map((pref) => (
                <SelectItem key={pref.value} value={pref.label}>
                  {pref.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Max Price: {getPriceLabel(priceSliderValue)}</Label>
          <Slider
            value={[priceSliderValue]}
            onValueChange={handlePriceChange}
            max={PRICE_STEPS.length - 1}
            min={0}
            step={1}
            className="py-2"
            data-testid="slider-max-price"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>$0</span>
            <span>Any</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sortBy">Sort By</Label>
          <Select
            value={filters.sortBy}
            onValueChange={(v) => updateFilter("sortBy", v as SearchFiltersType["sortBy"])}
          >
            <SelectTrigger id="sortBy" data-testid="select-sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between" data-testid="button-advanced-filters">
              Advanced Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${isAdvancedOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="minHouseSqft">Min House (sq ft)</Label>
                <Input
                  id="minHouseSqft"
                  type="number"
                  placeholder="0"
                  value={filters.minHouseSqm ? Math.round(filters.minHouseSqm * 10.7639) : ""}
                  onChange={(e) => updateFilter("minHouseSqm", e.target.value ? Math.round(Number(e.target.value) / 10.7639) : undefined)}
                  data-testid="input-min-house-sqft"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxHouseSqft">Max House (sq ft)</Label>
                <Input
                  id="maxHouseSqft"
                  type="number"
                  placeholder="Any"
                  value={filters.maxHouseSqm ? Math.round(filters.maxHouseSqm * 10.7639) : ""}
                  onChange={(e) => updateFilter("maxHouseSqm", e.target.value ? Math.round(Number(e.target.value) / 10.7639) : undefined)}
                  data-testid="input-max-house-sqft"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="minLandSqft">Min Land (sq ft)</Label>
                <Input
                  id="minLandSqft"
                  type="number"
                  placeholder="0"
                  value={filters.minLandSqm ? Math.round(filters.minLandSqm * 10.7639) : ""}
                  onChange={(e) => updateFilter("minLandSqm", e.target.value ? Math.round(Number(e.target.value) / 10.7639) : undefined)}
                  data-testid="input-min-land-sqft"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxLandSqft">Max Land (sq ft)</Label>
                <Input
                  id="maxLandSqft"
                  type="number"
                  placeholder="Any"
                  value={filters.maxLandSqm ? Math.round(filters.maxLandSqm * 10.7639) : ""}
                  onChange={(e) => updateFilter("maxLandSqm", e.target.value ? Math.round(Number(e.target.value) / 10.7639) : undefined)}
                  data-testid="input-max-land-sqft"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minYearBuilt">Min Year Built</Label>
              <Input
                id="minYearBuilt"
                type="number"
                placeholder="e.g., 1980"
                value={filters.minYearBuilt || ""}
                onChange={(e) => updateFilter("minYearBuilt", e.target.value ? Number(e.target.value) : undefined)}
                data-testid="input-min-year"
              />
            </div>

            <div className="space-y-2">
              <Label>Min Condition Score</Label>
              <Slider
                value={[filters.minConditionScore || 1]}
                onValueChange={([v]) => updateFilter("minConditionScore", v)}
                max={5}
                min={1}
                step={1}
                className="py-2"
                data-testid="slider-condition"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 (Poor)</span>
                <span>5 (Excellent)</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="mustHaveLand" className="cursor-pointer">
                Must have land
              </Label>
              <Switch
                id="mustHaveLand"
                checked={filters.mustHaveLand}
                onCheckedChange={(v) => updateFilter("mustHaveLand", v)}
                data-testid="switch-must-have-land"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="includeUnknownLand" className="cursor-pointer">
                Include unknown land info
              </Label>
              <Switch
                id="includeUnknownLand"
                checked={filters.includeUnknownLand}
                onCheckedChange={(v) => updateFilter("includeUnknownLand", v)}
                data-testid="switch-include-unknown"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Button 
          className="w-full" 
          onClick={onSearch} 
          disabled={isLoading}
          data-testid="button-search"
        >
          <Search className="h-4 w-4 mr-2" />
          {isLoading ? "Searching..." : "Search Properties"}
        </Button>
      </CardContent>
    </Card>
  );
}
