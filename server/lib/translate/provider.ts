import { createHash } from "crypto";
import { db } from "../../db";
import { translationCache } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getEnvString } from "../connectors/index";

export type TranslateProvider = "openai" | "deepl" | "google" | "mock";

export interface TranslationResult {
  success: boolean;
  translation?: string;
  notes?: string;
  error?: string;
  cached?: boolean;
}

export function generateCacheKey(
  provider: string,
  text: string,
  sourceLang = "ja",
  targetLang = "en"
): string {
  const content = `${provider}|${sourceLang}|${targetLang}|${text}`;
  return createHash("sha256").update(content).digest("hex");
}

export async function getCachedTranslation(cacheKey: string): Promise<string | null> {
  const [cached] = await db
    .select({ translatedText: translationCache.translatedText })
    .from(translationCache)
    .where(eq(translationCache.cacheKey, cacheKey))
    .limit(1);
  
  return cached?.translatedText ?? null;
}

export async function cacheTranslation(
  cacheKey: string,
  provider: string,
  sourceText: string,
  translatedText: string,
  sourceLang = "ja",
  targetLang = "en",
  notes?: string
): Promise<void> {
  await db
    .insert(translationCache)
    .values({
      cacheKey,
      provider,
      sourceText,
      translatedText,
      sourceLang,
      targetLang,
      notes,
    })
    .onConflictDoUpdate({
      target: translationCache.cacheKey,
      set: {
        translatedText,
        notes,
      },
    });
}

async function translateWithOpenAI(text: string): Promise<TranslationResult> {
  const apiKey = getEnvString("OPENAI_API_KEY");
  
  if (!apiKey) {
    return { success: false, error: "OpenAI API key not configured" };
  }
  
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional Japanese to English translator specializing in real estate listings. 
Translate the following Japanese text to English. 
Return a JSON object with the format: {"translation": "...", "notes": "optional notes about translation choices"}
Be accurate and natural. Do not add information that isn't in the original.`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `OpenAI API error: ${response.status} ${error}` };
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return { success: false, error: "No content in OpenAI response" };
    }
    
    try {
      const parsed = JSON.parse(content);
      return {
        success: true,
        translation: parsed.translation,
        notes: parsed.notes,
      };
    } catch {
      return {
        success: true,
        translation: content,
      };
    }
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

async function translateWithDeepL(text: string): Promise<TranslationResult> {
  const apiKey = getEnvString("DEEPL_API_KEY");
  
  if (!apiKey) {
    return { success: false, error: "DeepL API key not configured" };
  }
  
  try {
    const response = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `DeepL-Auth-Key ${apiKey}`,
      },
      body: new URLSearchParams({
        text,
        source_lang: "JA",
        target_lang: "EN",
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `DeepL API error: ${response.status} ${error}` };
    }
    
    const data = await response.json();
    const translation = data.translations?.[0]?.text;
    
    if (!translation) {
      return { success: false, error: "No translation in DeepL response" };
    }
    
    return { success: true, translation };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

function mockTranslate(text: string): TranslationResult {
  return {
    success: true,
    translation: `[Mock EN] ${text.substring(0, 50)}...`,
    notes: "Mock translation - for testing only",
  };
}

export async function translate(
  text: string,
  sourceLang = "ja",
  targetLang = "en"
): Promise<TranslationResult> {
  if (!text || text.trim().length === 0) {
    return { success: false, error: "Empty text" };
  }
  
  const provider = getEnvString("TRANSLATE_PROVIDER", "mock") as TranslateProvider;
  const cacheKey = generateCacheKey(provider, text, sourceLang, targetLang);
  
  const cached = await getCachedTranslation(cacheKey);
  if (cached) {
    return { success: true, translation: cached, cached: true };
  }
  
  let result: TranslationResult;
  
  switch (provider) {
    case "openai":
      result = await translateWithOpenAI(text);
      break;
    case "deepl":
      result = await translateWithDeepL(text);
      break;
    case "mock":
    default:
      result = mockTranslate(text);
      break;
  }
  
  if (result.success && result.translation) {
    await cacheTranslation(
      cacheKey,
      provider,
      text,
      result.translation,
      sourceLang,
      targetLang,
      result.notes
    );
  }
  
  return result;
}

export function getConfiguredProvider(): TranslateProvider {
  const provider = getEnvString("TRANSLATE_PROVIDER", "mock");
  if (["openai", "deepl", "google", "mock"].includes(provider)) {
    return provider as TranslateProvider;
  }
  return "mock";
}

export function isTranslationConfigured(): boolean {
  const provider = getConfiguredProvider();
  
  switch (provider) {
    case "openai":
      return !!getEnvString("OPENAI_API_KEY");
    case "deepl":
      return !!getEnvString("DEEPL_API_KEY");
    case "mock":
      return true;
    default:
      return false;
  }
}
