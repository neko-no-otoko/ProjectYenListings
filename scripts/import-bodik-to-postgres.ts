import { db } from "../server/db";
import { propertyEntities, listingVariants, listings, syncCursors } from "../shared/schema";
import { sql, eq } from "drizzle-orm";
import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import path from "path";

const BODIK_DB_PATH = path.join(process.cwd(), "data", "bodik_akiya.db");

interface BodikRecord {
  id: string;
  source_municipality: string;
  dataset_title: string;
  property_address: string | null;
  price: string | null;
  listing_url: string | null;
  resource_id: string;
  last_updated: string | null;
  raw_data: string;
}

function parsePrice(priceStr: string | null): number | null {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[^\d]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

function extractPrefecture(municipality: string): string | null {
  const prefectures = [
    "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
    "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
    "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
    "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
    "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
    "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
    "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
  ];
  
  for (const pref of prefectures) {
    if (municipality.includes(pref.replace(/[都府県]$/, ""))) {
      return pref;
    }
  }
  
  if (municipality.endsWith("県") || municipality.endsWith("府") || 
      municipality.endsWith("都") || municipality === "北海道") {
    return municipality;
  }
  
  return null;
}

async function importBodikData() {
  console.log("Opening BODIK SQLite database...");
  
  const sqlite = new Database(BODIK_DB_PATH, { readonly: true });
  const records = sqlite.prepare("SELECT * FROM listings").all() as BodikRecord[];
  
  console.log(`Found ${records.length} BODIK records to import`);
  
  let entitiesCreated = 0;
  let variantsCreated = 0;
  let skipped = 0;
  
  for (const record of records) {
    try {
      const entityId = randomUUID();
      const variantId = randomUUID();
      
      const prefecture = extractPrefecture(record.source_municipality);
      const municipality = record.source_municipality;
      const address = record.property_address || record.dataset_title;
      const priceJpy = parsePrice(record.price);
      
      let rawData: Record<string, unknown> = {};
      try {
        rawData = JSON.parse(record.raw_data);
      } catch {}
      
      await db.insert(propertyEntities).values({
        id: entityId,
        prefecture: prefecture,
        municipality: municipality,
        locality: null,
        canonicalAddressJp: address,
        canonicalAddressEn: null,
        canonicalLat: null,
        canonicalLon: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();
      
      entitiesCreated++;
      
      await db.insert(listingVariants).values({
        id: variantId,
        propertyEntityId: entityId,
        sourceType: "bodik",
        sourceKey: record.id,
        sourceUrl: record.listing_url,
        titleJp: record.dataset_title,
        titleEn: `[BODIK] ${record.dataset_title}`,
        descJp: JSON.stringify(rawData, null, 2),
        descEn: null,
        addressJp: address,
        priceJpy: priceJpy,
        landAreaM2: null,
        buildingAreaM2: null,
        yearBuilt: null,
        hasLand: null,
        ldk: null,
        conditionScore: null,
        photos: [],
        status: "active",
        translateStatus: "skipped",
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      }).onConflictDoNothing();
      
      variantsCreated++;
      
    } catch (error) {
      console.error(`Error importing record ${record.id}:`, error);
      skipped++;
    }
  }
  
  sqlite.close();
  
  console.log(`\nImport complete:`);
  console.log(`  Entities created: ${entitiesCreated}`);
  console.log(`  Variants created: ${variantsCreated}`);
  console.log(`  Skipped: ${skipped}`);
  
  console.log("\nResetting sync cursor to force full sync...");
  await db
    .insert(syncCursors)
    .values({ name: "sync_listings", cursorTs: new Date(0) })
    .onConflictDoUpdate({
      target: syncCursors.name,
      set: { cursorTs: new Date(0) },
    });
  
  console.log("Done! Run 'npx tsx scripts/sync-listings.ts' to sync to listings table.");
}

importBodikData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Import failed:", err);
    process.exit(1);
  });
