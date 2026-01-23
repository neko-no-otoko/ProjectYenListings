import { db } from "./db";
import { airports, listings, sources } from "@shared/schema";
import { sql } from "drizzle-orm";

const MAJOR_AIRPORTS = [
  { iata: "NRT", name: "Narita International Airport", nameEn: "Narita International Airport", lat: 35.7647, lon: 140.3864, isMajor: true },
  { iata: "HND", name: "Tokyo Haneda Airport", nameEn: "Tokyo Haneda Airport", lat: 35.5494, lon: 139.7798, isMajor: true },
  { iata: "KIX", name: "Kansai International Airport", nameEn: "Kansai International Airport", lat: 34.4347, lon: 135.2441, isMajor: true },
  { iata: "ITM", name: "Osaka Itami Airport", nameEn: "Osaka Itami Airport", lat: 34.7855, lon: 135.4388, isMajor: true },
  { iata: "CTS", name: "New Chitose Airport", nameEn: "New Chitose Airport (Sapporo)", lat: 42.7752, lon: 141.6925, isMajor: true },
  { iata: "FUK", name: "Fukuoka Airport", nameEn: "Fukuoka Airport", lat: 33.5859, lon: 130.4511, isMajor: true },
  { iata: "NGO", name: "Chubu Centrair International Airport", nameEn: "Chubu Centrair (Nagoya)", lat: 34.8583, lon: 136.8054, isMajor: true },
  { iata: "OKA", name: "Naha Airport", nameEn: "Naha Airport (Okinawa)", lat: 26.1958, lon: 127.6458, isMajor: true },
  { iata: "HIJ", name: "Hiroshima Airport", nameEn: "Hiroshima Airport", lat: 34.4361, lon: 132.9194, isMajor: true },
  { iata: "SDJ", name: "Sendai Airport", nameEn: "Sendai Airport", lat: 38.1397, lon: 140.9169, isMajor: true },
  { iata: "KMQ", name: "Komatsu Airport", nameEn: "Komatsu Airport (Ishikawa)", lat: 36.3946, lon: 136.4067, isMajor: true },
  { iata: "TAK", name: "Takamatsu Airport", nameEn: "Takamatsu Airport", lat: 34.2142, lon: 134.0156, isMajor: true },
  { iata: "KOJ", name: "Kagoshima Airport", nameEn: "Kagoshima Airport", lat: 31.8034, lon: 130.7194, isMajor: true },
  { iata: "KMI", name: "Miyazaki Airport", nameEn: "Miyazaki Airport", lat: 31.8772, lon: 131.4486, isMajor: true },
  { iata: "OIT", name: "Oita Airport", nameEn: "Oita Airport", lat: 33.4794, lon: 131.7372, isMajor: true },
];

const SAMPLE_LISTINGS = [
  {
    titleEn: "Charming Traditional Farmhouse with Large Garden",
    titleOriginal: "広い庭付き伝統的な農家",
    descriptionEn: "A beautiful traditional Japanese farmhouse (kominka) located in a peaceful rural area of Niigata Prefecture. The property features a spacious garden with mature trees and a small vegetable plot. The house has been well-maintained and retains many original features including wooden beams and tatami rooms. Perfect for those seeking a quiet countryside lifestyle.",
    descriptionOriginal: "新潟県の静かな農村地域に位置する美しい伝統的な日本の農家（古民家）。広々とした庭園には成熟した木々と小さな野菜畑があります。",
    prefecture: "Niigata",
    municipality: "Murakami",
    island: "Honshu",
    lat: 38.2234,
    lon: 139.4803,
    priceJpy: 0,
    priceType: "transfer_fee" as const,
    ldk: "5LDK",
    houseSqm: 145,
    landSqm: 850,
    hasLand: true,
    yearBuilt: 1965,
    conditionScore: 4,
    conditionReasonsEn: ["Well-maintained traditional structure", "Original wooden beams intact", "Tatami rooms in good condition", "Some minor repairs needed on exterior"],
    photos: [
      { url: "https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=800&h=600&fit=crop", caption: "Main house exterior" },
      { url: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&h=600&fit=crop", caption: "Garden view" },
    ],
    tags: ["kominka", "garden", "rural", "traditional"],
    status: "active" as const,
  },
  {
    titleEn: "Mountain View Cottage in Nagano",
    titleOriginal: "長野の山の眺めのコテージ",
    descriptionEn: "A cozy cottage nestled in the mountains of Nagano Prefecture with stunning views of the Japanese Alps. This property offers 3 bedrooms and a modern kitchen that was renovated in 2015. The land includes a small forest area perfect for nature lovers. Just 30 minutes from ski resorts.",
    descriptionOriginal: "日本アルプスの素晴らしい眺めを持つ長野県の山々に佇む居心地の良いコテージ。",
    prefecture: "Nagano",
    municipality: "Hakuba",
    island: "Honshu",
    lat: 36.6983,
    lon: 137.8617,
    priceJpy: 50000,
    priceType: "transfer_fee" as const,
    ldk: "3LDK",
    houseSqm: 95,
    landSqm: 420,
    hasLand: true,
    yearBuilt: 1988,
    conditionScore: 5,
    conditionReasonsEn: ["Kitchen renovated in 2015", "Good structural condition", "Modern amenities installed", "Move-in ready"],
    photos: [
      { url: "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&h=600&fit=crop", caption: "Cottage exterior" },
      { url: "https://images.unsplash.com/photo-1464146072230-91cabc968266?w=800&h=600&fit=crop", caption: "Mountain views" },
    ],
    tags: ["mountain", "ski-access", "renovated", "nature"],
    status: "active" as const,
  },
  {
    titleEn: "Seaside House in Shikoku",
    titleOriginal: "四国の海辺の家",
    descriptionEn: "A charming seaside property in Kochi Prefecture with direct access to the beach. This 4-bedroom house features ocean views from the living room and a large deck. The property requires some cosmetic updates but the structure is sound. Ideal for water sports enthusiasts or those seeking a relaxed coastal lifestyle.",
    descriptionOriginal: "ビーチへ直接アクセスできる高知県の魅力的な海辺の物件。",
    prefecture: "Kochi",
    municipality: "Muroto",
    island: "Shikoku",
    lat: 33.2897,
    lon: 134.1522,
    priceJpy: 80000,
    priceType: "purchase_price" as const,
    ldk: "4LDK",
    houseSqm: 110,
    landSqm: 320,
    hasLand: true,
    yearBuilt: 1975,
    conditionScore: 3,
    conditionReasonsEn: ["Sound structural foundation", "Ocean views", "Needs cosmetic updates", "Some window repairs required"],
    photos: [
      { url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop", caption: "House with ocean view" },
      { url: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&h=600&fit=crop", caption: "Beach access" },
    ],
    tags: ["seaside", "beach-access", "ocean-view", "coastal"],
    status: "active" as const,
  },
  {
    titleEn: "Rural Retreat in Tohoku Region",
    titleOriginal: "東北地方の田舎の隠れ家",
    descriptionEn: "A peaceful rural property in Akita Prefecture surrounded by rice paddies and apple orchards. This spacious house includes a large workshop/barn that could be converted to additional living space. The property is perfect for those interested in farming or agriculture.",
    descriptionOriginal: "水田とリンゴ園に囲まれた秋田県の静かな田舎の物件。",
    prefecture: "Akita",
    municipality: "Yokote",
    island: "Honshu",
    lat: 39.3159,
    lon: 140.5533,
    priceJpy: 0,
    priceType: "transfer_fee" as const,
    ldk: "6LDK",
    houseSqm: 180,
    landSqm: 1200,
    hasLand: true,
    yearBuilt: 1958,
    conditionScore: 3,
    conditionReasonsEn: ["Large workshop/barn included", "Extensive land for farming", "Some roof repairs needed", "Traditional style maintained"],
    photos: [
      { url: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop", caption: "Main house" },
      { url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&h=600&fit=crop", caption: "Surrounding farmland" },
    ],
    tags: ["farming", "large-land", "workshop", "rural"],
    status: "active" as const,
  },
  {
    titleEn: "Historic House in Shimane Prefecture",
    titleOriginal: "島根県の歴史的な家",
    descriptionEn: "A historic wooden house in a traditional village near Matsue. This property dates back to the Meiji era and features classic Japanese architecture. The house needs substantial renovation but represents an excellent opportunity for preservation enthusiasts.",
    descriptionOriginal: "松江近くの伝統的な村にある歴史的な木造住宅。",
    prefecture: "Shimane",
    municipality: "Matsue",
    island: "Honshu",
    lat: 35.4723,
    lon: 133.0505,
    priceJpy: 100000,
    priceType: "transfer_fee" as const,
    ldk: "4LDK",
    houseSqm: 120,
    landSqm: 380,
    hasLand: true,
    yearBuilt: 1905,
    conditionScore: 2,
    conditionReasonsEn: ["Historic Meiji-era architecture", "Needs substantial renovation", "Classic Japanese design features", "Foundation inspection recommended"],
    photos: [
      { url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop", caption: "Historic facade" },
      { url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop", caption: "Traditional interior" },
    ],
    tags: ["historic", "meiji-era", "renovation-project", "traditional"],
    status: "active" as const,
  },
  {
    titleEn: "Compact House Near Hot Springs",
    titleOriginal: "温泉近くのコンパクトな家",
    descriptionEn: "A compact but well-designed house located just 10 minutes from famous hot springs in Oita Prefecture. Perfect for a weekend retreat or permanent residence. The house features a small Japanese garden and is in move-in ready condition.",
    descriptionOriginal: "大分県の有名な温泉から車でわずか10分の場所にある、コンパクトながらもよく設計された家。",
    prefecture: "Oita",
    municipality: "Beppu",
    island: "Kyushu",
    lat: 33.2846,
    lon: 131.4913,
    priceJpy: 120000,
    priceType: "purchase_price" as const,
    ldk: "2LDK",
    houseSqm: 65,
    landSqm: 180,
    hasLand: true,
    yearBuilt: 1992,
    conditionScore: 4,
    conditionReasonsEn: ["Move-in ready", "Near hot springs", "Japanese garden included", "Well-maintained property"],
    photos: [
      { url: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop", caption: "House exterior" },
      { url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop", caption: "Japanese garden" },
    ],
    tags: ["onsen", "hot-springs", "compact", "garden"],
    status: "active" as const,
  },
  {
    titleEn: "Forest Cabin in Hokkaido",
    titleOriginal: "北海道の森のキャビン",
    descriptionEn: "A rustic cabin surrounded by pristine forest in central Hokkaido. The property offers complete privacy and is perfect for nature photography or simply escaping the city. Features include a wood-burning stove and outdoor bath.",
    descriptionOriginal: "北海道中央部の原生林に囲まれた素朴なキャビン。",
    prefecture: "Hokkaido",
    municipality: "Kamikawa",
    island: "Hokkaido",
    lat: 43.7647,
    lon: 142.3775,
    priceJpy: 30000,
    priceType: "transfer_fee" as const,
    ldk: "2LDK",
    houseSqm: 55,
    landSqm: 2500,
    hasLand: true,
    yearBuilt: 1995,
    conditionScore: 4,
    conditionReasonsEn: ["Wood-burning stove installed", "Outdoor bath", "Large forested land", "Minor insulation updates recommended"],
    photos: [
      { url: "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&h=600&fit=crop", caption: "Forest cabin" },
      { url: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800&h=600&fit=crop", caption: "Surrounding forest" },
    ],
    tags: ["forest", "cabin", "nature", "privacy", "large-land"],
    status: "active" as const,
  },
  {
    titleEn: "Renovated Townhouse in Yamaguchi",
    titleOriginal: "山口のリノベーション済み町家",
    descriptionEn: "A beautifully renovated machiya (traditional townhouse) in Yamaguchi Prefecture. Modern amenities have been carefully integrated while preserving the historic character. Features include a courtyard garden and updated kitchen.",
    descriptionOriginal: "山口県の美しくリノベーションされた町家。",
    prefecture: "Yamaguchi",
    municipality: "Hagi",
    island: "Honshu",
    lat: 34.4083,
    lon: 131.3997,
    priceJpy: 150000,
    priceType: "purchase_price" as const,
    ldk: "3LDK",
    houseSqm: 85,
    landSqm: 150,
    hasLand: true,
    yearBuilt: 1935,
    conditionScore: 5,
    conditionReasonsEn: ["Fully renovated", "Modern kitchen and bathroom", "Historic character preserved", "Courtyard garden", "Move-in ready"],
    photos: [
      { url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop", caption: "Renovated interior" },
      { url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop", caption: "Courtyard" },
    ],
    tags: ["machiya", "renovated", "historic", "courtyard"],
    status: "active" as const,
  },
];

export async function seedDatabase() {
  console.log("Starting database seed...");

  const seedFakeData = process.env.SEED_FAKE_DATA === "true";

  try {
    const existingAirports = await db.select().from(airports).limit(1);
    if (existingAirports.length === 0) {
      console.log("Seeding airports...");
      for (const airport of MAJOR_AIRPORTS) {
        await db.insert(airports).values(airport).onConflictDoNothing();
      }
      console.log(`Seeded ${MAJOR_AIRPORTS.length} airports`);
    } else {
      console.log("Airports already seeded, skipping...");
    }

    const existingSources = await db.select().from(sources).limit(1);
    if (existingSources.length === 0) {
      console.log("Seeding sources...");
      await db.insert(sources).values({
        name: "Demo Source",
        baseUrl: "https://demo.akiyafinder.com",
        enabled: true,
        notes: "Demo data source for testing",
      });
      console.log("Seeded 1 source");
    }

    if (seedFakeData) {
      const existingListings = await db.select().from(listings).limit(1);
      if (existingListings.length === 0) {
        console.log("Seeding sample listings (SEED_FAKE_DATA=true)...");

        const allAirports = await db.select().from(airports).where(sql`${airports.isMajor} = true`);

        for (const listing of SAMPLE_LISTINGS) {
          let nearestAirport = null;
          let nearestDistance = Infinity;

          if (listing.lat && listing.lon) {
            for (const airport of allAirports) {
              const distance = haversineDistance(listing.lat, listing.lon, airport.lat, airport.lon);
              if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestAirport = airport;
              }
            }
          }

          await db.insert(listings).values({
            ...listing,
            nearestAirportIata: nearestAirport?.iata || null,
            nearestAirportName: nearestAirport?.nameEn || null,
            nearestAirportKm: nearestAirport ? nearestDistance : null,
            lastSeenAt: new Date(),
          });
        }

        console.log(`Seeded ${SAMPLE_LISTINGS.length} listings`);
      } else {
        console.log("Listings already seeded, skipping...");
      }
    } else {
      console.log("Skipping sample listings (SEED_FAKE_DATA not set to 'true')");
    }

    console.log("Database seed completed!");
  } catch (error) {
    console.error("Seed error:", error);
    throw error;
  }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
