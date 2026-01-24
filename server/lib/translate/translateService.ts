import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface TranslationResult {
  titleEn: string | null;
  prefectureEn: string | null;
  municipalityEn: string | null;
  localityEn: string | null;
  islandEn: string | null;
}

const PREFECTURE_TRANSLATIONS: Record<string, string> = {
  "北海道": "Hokkaido",
  "青森県": "Aomori",
  "岩手県": "Iwate",
  "宮城県": "Miyagi",
  "秋田県": "Akita",
  "山形県": "Yamagata",
  "福島県": "Fukushima",
  "茨城県": "Ibaraki",
  "栃木県": "Tochigi",
  "群馬県": "Gunma",
  "埼玉県": "Saitama",
  "千葉県": "Chiba",
  "東京都": "Tokyo",
  "神奈川県": "Kanagawa",
  "新潟県": "Niigata",
  "富山県": "Toyama",
  "石川県": "Ishikawa",
  "福井県": "Fukui",
  "山梨県": "Yamanashi",
  "長野県": "Nagano",
  "岐阜県": "Gifu",
  "静岡県": "Shizuoka",
  "愛知県": "Aichi",
  "三重県": "Mie",
  "滋賀県": "Shiga",
  "京都府": "Kyoto",
  "大阪府": "Osaka",
  "兵庫県": "Hyogo",
  "奈良県": "Nara",
  "和歌山県": "Wakayama",
  "鳥取県": "Tottori",
  "島根県": "Shimane",
  "岡山県": "Okayama",
  "広島県": "Hiroshima",
  "山口県": "Yamaguchi",
  "徳島県": "Tokushima",
  "香川県": "Kagawa",
  "愛媛県": "Ehime",
  "高知県": "Kochi",
  "福岡県": "Fukuoka",
  "佐賀県": "Saga",
  "長崎県": "Nagasaki",
  "熊本県": "Kumamoto",
  "大分県": "Oita",
  "宮崎県": "Miyazaki",
  "鹿児島県": "Kagoshima",
  "沖縄県": "Okinawa",
};

const ISLAND_TRANSLATIONS: Record<string, string> = {
  "本州": "Honshu",
  "北海道": "Hokkaido",
  "九州": "Kyushu",
  "四国": "Shikoku",
  "沖縄本島": "Okinawa Main Island",
  "淡路島": "Awaji Island",
  "佐渡島": "Sado Island",
  "対馬": "Tsushima",
  "壱岐": "Iki",
  "種子島": "Tanegashima",
  "屋久島": "Yakushima",
  "奄美大島": "Amami Oshima",
  "石垣島": "Ishigaki Island",
  "宮古島": "Miyako Island",
  "小豆島": "Shodoshima",
};

export function translatePrefecture(japanese: string | null): string | null {
  if (!japanese) return null;
  const normalized = japanese.trim();
  return PREFECTURE_TRANSLATIONS[normalized] || null;
}

export function translateIsland(japanese: string | null): string | null {
  if (!japanese) return null;
  const normalized = japanese.trim();
  return ISLAND_TRANSLATIONS[normalized] || null;
}

export async function translateTitle(japaneseTitle: string | null): Promise<string | null> {
  if (!japaneseTitle) return null;
  
  const cleaned = japaneseTitle.replace(/^\[BODIK\]\s*/i, "").trim();
  if (!cleaned) return null;
  
  if (/^[a-zA-Z0-9\s\-_.,!?]+$/.test(cleaned)) {
    return cleaned;
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a Japanese to English translator for real estate listings. Translate the property title/name concisely. If it's a dataset name or statistical data, translate it descriptively. Output only the English translation, nothing else."
        },
        {
          role: "user",
          content: cleaned
        }
      ],
      max_tokens: 100,
      temperature: 0.1,
    });
    
    return response.choices[0]?.message?.content?.trim() || cleaned;
  } catch (error) {
    console.error("Translation error:", error);
    return cleaned;
  }
}

export async function translateMunicipality(japanese: string | null): Promise<string | null> {
  if (!japanese) return null;
  
  const cleaned = japanese.trim();
  if (!cleaned) return null;
  
  if (/^[a-zA-Z0-9\s\-]+$/.test(cleaned)) {
    return cleaned;
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Translate this Japanese city/town/village name to English. Use the standard romanization (e.g., 草津市 → Kusatsu City, 高山町 → Takayama Town). Output only the English name."
        },
        {
          role: "user",
          content: cleaned
        }
      ],
      max_tokens: 50,
      temperature: 0.1,
    });
    
    return response.choices[0]?.message?.content?.trim() || cleaned;
  } catch (error) {
    console.error("Translation error:", error);
    return cleaned;
  }
}

export async function translateListing(listing: {
  titleEn: string | null;
  titleOriginal: string | null;
  prefecture: string | null;
  municipality: string | null;
  locality: string | null;
  island: string | null;
}): Promise<TranslationResult> {
  const prefectureEn = translatePrefecture(listing.prefecture);
  const islandEn = translateIsland(listing.island);
  
  let titleEn = listing.titleEn;
  if (!titleEn || titleEn.startsWith("[BODIK]")) {
    titleEn = await translateTitle(listing.titleOriginal || listing.titleEn);
  }
  
  let municipalityEn: string | null = null;
  if (listing.municipality) {
    municipalityEn = await translateMunicipality(listing.municipality);
  }
  
  let localityEn: string | null = null;
  if (listing.locality) {
    localityEn = await translateMunicipality(listing.locality);
  }
  
  return {
    titleEn,
    prefectureEn,
    municipalityEn,
    localityEn,
    islandEn,
  };
}

function containsJapanese(text: string): boolean {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
}

export function getQuickTranslation(listing: {
  titleEn: string | null;
  prefecture: string | null;
  municipality: string | null;
  island: string | null;
}): {
  titleDisplay: string;
  locationDisplay: string;
} {
  let titleDisplay = listing.titleEn || "Untitled Property";
  
  if (titleDisplay.startsWith("[BODIK]")) {
    titleDisplay = titleDisplay.replace(/^\[BODIK\]\s*/i, "").trim() || "Property Listing";
  }
  
  if (containsJapanese(titleDisplay)) {
    const prefectureEn = translatePrefecture(listing.prefecture);
    if (prefectureEn) {
      titleDisplay = `Property in ${prefectureEn}`;
    } else {
      titleDisplay = "Property in Japan";
    }
  }
  
  const prefectureEn = translatePrefecture(listing.prefecture) || listing.prefecture;
  const islandEn = translateIsland(listing.island);
  
  const locationParts: string[] = [];
  if (prefectureEn) {
    locationParts.push(prefectureEn);
  }
  if (islandEn) {
    locationParts.push(islandEn);
  }
  
  const locationDisplay = locationParts.join(", ") || "Japan";
  
  return { titleDisplay, locationDisplay };
}
