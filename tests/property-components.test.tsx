import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropertyCard } from "../components/properties/PropertyCard";
import { PropertyList } from "../components/properties/PropertyList";
import type { Property } from "../components/properties/types";

// Mock wouter Link
vi.mock("wouter", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Test property data
const mockProperty: Property = {
  id: "test-1",
  title: {
    en: "Test Property",
    original: "テスト物件",
    display: "Test Property",
  },
  description: {
    en: "A beautiful test property",
    original: null,
  },
  location: {
    prefecture: "Tokyo",
    prefectureEn: "Tokyo",
    municipality: "Shibuya",
    locality: null,
    island: "Honshu",
    islandEn: "Honshu",
    address: {
      original: null,
      en: null,
    },
    coordinates: {
      lat: 35.6762,
      lon: 139.6503,
    },
    display: "Shibuya, Tokyo",
  },
  pricing: {
    priceJpy: 5000000,
    priceType: "purchase_price",
    formattedPrice: "¥500万",
  },
  features: {
    ldk: "3LDK",
    bedrooms: 3,
    houseSqm: 100,
    landSqm: 150,
    hasLand: true,
    yearBuilt: 1995,
    conditionScore: 4,
  },
  media: {
    photos: [
      {
        url: "https://example.com/photo1.jpg",
        caption: "Main photo",
      },
    ],
  },
  metadata: {
    sourceId: null,
    sourceUrl: null,
    listedAt: new Date("2024-01-01"),
    lastSeenAt: new Date("2024-01-15"),
    status: "active",
    tags: ["renovated", "parking"],
  },
  translations: {
    titleDisplay: "Test Property",
    locationDisplay: "Shibuya, Tokyo",
  },
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe("Property Components", () => {
  describe("PropertyCard", () => {
    it("renders property title and price", () => {
      render(
        <PropertyCard property={mockProperty} />
      );

      expect(screen.getByText("Test Property")).toBeInTheDocument();
      expect(screen.getByText("$33,500")).toBeInTheDocument();
    });

    it("renders property location", () => {
      render(
        <PropertyCard property={mockProperty} />
      );

      expect(screen.getByText("Shibuya, Tokyo")).toBeInTheDocument();
    });

    it("renders property features", () => {
      render(
        <PropertyCard property={mockProperty} />
      );

      expect(screen.getByText("3LDK")).toBeInTheDocument();
      expect(screen.getByText(/1,076 sq ft/)).toBeInTheDocument();
    });

    it("renders free transfer badge for free properties", () => {
      const freeProperty = {
        ...mockProperty,
        pricing: { ...mockProperty.pricing, priceJpy: 0 },
      };

      render(
        <PropertyCard property={freeProperty} />
      );

      expect(screen.getByText("Free Transfer")).toBeInTheDocument();
    });
  });

  describe("PropertyList", () => {
    it("renders loading state", () => {
      render(
        <PropertyList
          properties={[]}
          pagination={{ total: 0, limit: 20, offset: 0, hasMore: false }}
          isLoading={true}
        />
      );

      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("renders empty state", () => {
      render(
        <PropertyList
          properties={[]}
          pagination={{ total: 0, limit: 20, offset: 0, hasMore: false }}
        />
      );

      expect(screen.getByText("No properties found")).toBeInTheDocument();
    });

    it("renders list of properties", () => {
      const properties = [mockProperty, { ...mockProperty, id: "test-2" }];

      render(
        <PropertyList
          properties={properties}
          pagination={{ total: 2, limit: 20, offset: 0, hasMore: false }}
        />
      );

      expect(screen.getAllByText("Test Property")).toHaveLength(2);
    });

    it("displays correct result count", () => {
      render(
        <PropertyList
          properties={[mockProperty]}
          pagination={{ total: 1, limit: 20, offset: 0, hasMore: false }}
        />
      );

      expect(screen.getByText("1 properties found")).toBeInTheDocument();
    });
  });
});
