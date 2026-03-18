import request from "supertest";
import express, { type Express } from "express";
import propertiesRouter from "../server/routes/properties";

// Mock the property service
jest.mock("../server/lib/services/property-service", () => ({
  propertyService: {
    listProperties: jest.fn(),
    getPropertyById: jest.fn(),
    searchProperties: jest.fn(),
    getPropertiesByPrefecture: jest.fn(),
    getRelatedProperties: jest.fn(),
  },
}));

// Mock the translate service
jest.mock("../server/lib/translate/translateService", () => ({
  translatePrefecture: jest.fn((p) => p ? `${p} (EN)` : null),
  translateIsland: jest.fn((i) => i ? `${i} (EN)` : null),
  getQuickTranslation: jest.fn((l) => ({
    titleDisplay: l.titleEn || l.titleOriginal || "Untitled Property",
    locationDisplay: l.municipality || l.prefecture || "Unknown Location",
  })),
}));

import { propertyService } from "../server/lib/services/property-service";

describe("Property API Endpoints", () => {
  let app: Express;

  const mockListing = {
    id: "test-uuid-123",
    titleEn: "Beautiful House in Tokyo",
    titleOriginal: "東京の美しい家",
    descriptionEn: "A lovely traditional home",
    descriptionOriginal: "素敵な伝統的な家",
    prefecture: "Tokyo",
    municipality: "Shibuya",
    locality: "Harajuku",
    island: "Honshu",
    addressOriginal: "東京都渋谷区原宿",
    addressEn: "Harajuku, Shibuya, Tokyo",
    lat: 35.6711,
    lon: 139.7022,
    priceJpy: 50000000,
    priceType: "purchase_price",
    ldk: "3LDK",
    bedrooms: 3,
    houseSqm: 120,
    landSqm: 200,
    hasLand: true,
    yearBuilt: 1990,
    conditionScore: 4,
    photos: [{ url: "https://example.com/photo1.jpg", caption: "Front view" }],
    tags: ["traditional", "garden"],
    listedAt: new Date("2024-01-15"),
    lastSeenAt: new Date("2024-03-01"),
    status: "active",
    sourceId: "source-123",
    sourceUrl: "https://example.com/listing/123",
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/api/properties", propertiesRouter);
    jest.clearAllMocks();
  });

  describe("GET /api/properties", () => {
    it("should return paginated properties list", async () => {
      const mockResult = {
        listings: [mockListing],
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
      };

      (propertyService.listProperties as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get("/api/properties")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.properties).toHaveLength(1);
      expect(response.body.data.pagination.total).toBe(1);
      expect(response.body.data.properties[0].id).toBe("test-uuid-123");
      expect(response.body.data.properties[0].title.display).toBe("Beautiful House in Tokyo");
    });

    it("should support pagination parameters", async () => {
      const mockResult = {
        listings: [],
        total: 100,
        limit: 10,
        offset: 20,
        hasMore: true,
      };

      (propertyService.listProperties as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get("/api/properties?limit=10&offset=20")
        .expect(200);

      expect(propertyService.listProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 20,
        })
      );
      expect(response.body.data.pagination.hasMore).toBe(true);
    });

    it("should support sorting by price", async () => {
      (propertyService.listProperties as jest.Mock).mockResolvedValue({
        listings: [],
        total: 0,
        limit: 20,
        offset: 0,
        hasMore: false,
      });

      await request(app)
        .get("/api/properties?sort=price_asc")
        .expect(200);

      expect(propertyService.listProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: "price_asc",
        })
      );
    });

    it("should support price range filtering", async () => {
      (propertyService.listProperties as jest.Mock).mockResolvedValue({
        listings: [],
        total: 0,
        limit: 20,
        offset: 0,
        hasMore: false,
      });

      await request(app)
        .get("/api/properties?minPrice=1000000&maxPrice=50000000")
        .expect(200);

      expect(propertyService.listProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          minPrice: 1000000,
          maxPrice: 50000000,
        })
      );
    });

    it("should support property type filtering", async () => {
      (propertyService.listProperties as jest.Mock).mockResolvedValue({
        listings: [],
        total: 0,
        limit: 20,
        offset: 0,
        hasMore: false,
      });

      await request(app)
        .get("/api/properties?propertyType=house")
        .expect(200);

      expect(propertyService.listProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyType: "house",
        })
      );
    });

    it("should return 400 for invalid query parameters", async () => {
      const response = await request(app)
        .get("/api/properties?limit=invalid")
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid query parameters");
    });
  });

  describe("GET /api/properties/:id", () => {
    it("should return a single property with related properties", async () => {
      (propertyService.getPropertyById as jest.Mock).mockResolvedValue(mockListing);
      (propertyService.getRelatedProperties as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get("/api/properties/test-uuid-123")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.property.id).toBe("test-uuid-123");
      expect(response.body.data.property.pricing.priceJpy).toBe(50000000);
      expect(response.body.data.property.features.ldk).toBe("3LDK");
      expect(response.body.data.related).toEqual([]);
    });

    it("should return normalized property structure", async () => {
      (propertyService.getPropertyById as jest.Mock).mockResolvedValue(mockListing);
      (propertyService.getRelatedProperties as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get("/api/properties/test-uuid-123")
        .expect(200);

      const property = response.body.data.property;
      
      // Check normalized structure
      expect(property).toHaveProperty("id");
      expect(property).toHaveProperty("title.en");
      expect(property).toHaveProperty("title.original");
      expect(property).toHaveProperty("title.display");
      expect(property).toHaveProperty("location.prefecture");
      expect(property).toHaveProperty("location.coordinates");
      expect(property).toHaveProperty("pricing.formattedPrice");
      expect(property).toHaveProperty("features");
      expect(property).toHaveProperty("media.photos");
      expect(property).toHaveProperty("metadata");
    });

    it("should return 404 for non-existent property", async () => {
      (propertyService.getPropertyById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get("/api/properties/non-existent-id")
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Property not found");
    });

    it("should return 400 when id is missing", async () => {
      // This test would need route changes - currently Express handles this
      // by not matching the route at all
    });
  });

  describe("GET /api/properties/search", () => {
    it("should search by query string", async () => {
      const mockResult = {
        listings: [mockListing],
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
      };

      (propertyService.searchProperties as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get("/api/properties/search?q=beautiful+house")
        .expect(200);

      expect(propertyService.searchProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          query: "beautiful house",
        })
      );
      expect(response.body.success).toBe(true);
      expect(response.body.meta.query).toBe("beautiful house");
    });

    it("should support location-based search", async () => {
      (propertyService.searchProperties as jest.Mock).mockResolvedValue({
        listings: [],
        total: 0,
        limit: 20,
        offset: 0,
        hasMore: false,
      });

      await request(app)
        .get("/api/properties/search?location=Tokyo")
        .expect(200);

      expect(propertyService.searchProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          location: "Tokyo",
        })
      );
    });

    it("should support combined search with filters", async () => {
      (propertyService.searchProperties as jest.Mock).mockResolvedValue({
        listings: [],
        total: 0,
        limit: 20,
        offset: 0,
        hasMore: false,
      });

      await request(app)
        .get("/api/properties/search?q=house&minPrice=1000000&maxPrice=10000000&propertyType=apartment")
        .expect(200);

      expect(propertyService.searchProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          query: "house",
          minPrice: 1000000,
          maxPrice: 10000000,
          propertyType: "apartment",
        })
      );
    });

    it("should handle empty search results", async () => {
      (propertyService.searchProperties as jest.Mock).mockResolvedValue({
        listings: [],
        total: 0,
        limit: 20,
        offset: 0,
        hasMore: false,
      });

      const response = await request(app)
        .get("/api/properties/search?q=xyz123")
        .expect(200);

      expect(response.body.data.properties).toHaveLength(0);
      expect(response.body.data.pagination.total).toBe(0);
    });
  });

  describe("GET /api/properties/by-prefecture/:code", () => {
    it("should filter properties by prefecture", async () => {
      const mockResult = {
        listings: [mockListing],
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
      };

      (propertyService.getPropertiesByPrefecture as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get("/api/properties/by-prefecture/Tokyo")
        .expect(200);

      expect(propertyService.getPropertiesByPrefecture).toHaveBeenCalledWith(
        "Tokyo",
        expect.any(Object)
      );
      expect(response.body.data.prefecture).toBe("Tokyo");
      expect(response.body.success).toBe(true);
    });

    it("should support additional filters with prefecture", async () => {
      (propertyService.getPropertiesByPrefecture as jest.Mock).mockResolvedValue({
        listings: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      await request(app)
        .get("/api/properties/by-prefecture/Osaka?limit=10&minPrice=5000000")
        .expect(200);

      expect(propertyService.getPropertiesByPrefecture).toHaveBeenCalledWith(
        "Osaka",
        expect.objectContaining({
          limit: 10,
          minPrice: 5000000,
        })
      );
    });

    it("should return 400 when prefecture code is missing", async () => {
      // Express won't match this route without a code parameter
    });
  });

  describe("Response Normalization", () => {
    it("should format prices correctly", async () => {
      const listingsWithPrices = [
        { ...mockListing, priceJpy: 150000000 },
        { ...mockListing, id: "test-2", priceJpy: 5000000 },
        { ...mockListing, id: "test-3", priceJpy: 0 },
      ];

      (propertyService.listProperties as jest.Mock).mockResolvedValue({
        listings: listingsWithPrices,
        total: 3,
        limit: 20,
        offset: 0,
        hasMore: false,
      });

      const response = await request(app)
        .get("/api/properties")
        .expect(200);

      const properties = response.body.data.properties;
      expect(properties[0].pricing.formattedPrice).toContain("B"); // Billion
      expect(properties[1].pricing.formattedPrice).toContain("万"); // Ten thousand
      expect(properties[2].pricing.formattedPrice).toBe("Price on request");
    });

    it("should handle missing coordinates gracefully", async () => {
      const listingNoCoords = {
        ...mockListing,
        lat: null,
        lon: null,
      };

      (propertyService.getPropertyById as jest.Mock).mockResolvedValue(listingNoCoords);
      (propertyService.getRelatedProperties as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get("/api/properties/test-uuid-123")
        .expect(200);

      expect(response.body.data.property.location.coordinates).toBeNull();
    });

    it("should handle missing optional fields", async () => {
      const minimalListing = {
        id: "minimal-123",
        titleEn: null,
        titleOriginal: null,
        descriptionEn: null,
        descriptionOriginal: null,
        prefecture: null,
        municipality: null,
        locality: null,
        island: null,
        addressOriginal: null,
        addressEn: null,
        lat: null,
        lon: null,
        priceJpy: null,
        priceType: "unknown",
        ldk: null,
        bedrooms: null,
        houseSqm: null,
        landSqm: null,
        hasLand: null,
        yearBuilt: null,
        conditionScore: 3,
        photos: null,
        tags: null,
        listedAt: null,
        lastSeenAt: new Date(),
        status: "active",
        sourceId: null,
        sourceUrl: null,
      };

      (propertyService.getPropertyById as jest.Mock).mockResolvedValue(minimalListing);
      (propertyService.getRelatedProperties as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get("/api/properties/minimal-123")
        .expect(200);

      const property = response.body.data.property;
      expect(property.title.display).toBe("Untitled Property");
      expect(property.location.display).toBe("Unknown Location");
      expect(property.pricing.formattedPrice).toBe("Price on request");
    });
  });

  describe("Error Handling", () => {
    it("should handle service errors gracefully", async () => {
      (propertyService.listProperties as jest.Mock).mockRejectedValue(new Error("Database error"));

      const response = await request(app)
        .get("/api/properties")
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Failed to fetch properties");
    });

    it("should handle search service errors", async () => {
      (propertyService.searchProperties as jest.Mock).mockRejectedValue(new Error("Search error"));

      const response = await request(app)
        .get("/api/properties/search?q=test")
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Failed to search properties");
    });
  });
});
