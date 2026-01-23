import { getEnvString, getEnvBoolean } from "../../index";

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: Date;
}

let tokenCache: CachedToken | null = null;

export function isLifullConfigured(): boolean {
  const enabled = getEnvBoolean("LIFULL_ENABLED", false);
  const clientId = getEnvString("LIFULL_CLIENT_ID");
  const clientSecret = getEnvString("LIFULL_CLIENT_SECRET");
  const tokenUrl = getEnvString("LIFULL_TOKEN_URL");
  
  return enabled && !!clientId && !!clientSecret && !!tokenUrl;
}

export function isLifullEnabled(): boolean {
  return getEnvBoolean("LIFULL_ENABLED", false) && isLifullConfigured();
}

export async function getAccessToken(): Promise<string | null> {
  if (!isLifullConfigured()) {
    return null;
  }
  
  if (tokenCache && tokenCache.expiresAt > new Date()) {
    return tokenCache.accessToken;
  }
  
  const clientId = getEnvString("LIFULL_CLIENT_ID");
  const clientSecret = getEnvString("LIFULL_CLIENT_SECRET");
  const tokenUrl = getEnvString("LIFULL_TOKEN_URL");
  
  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
      }),
    });
    
    if (!response.ok) {
      console.error(`[LIFULL OAuth] Token request failed: ${response.status}`);
      return null;
    }
    
    const data: TokenResponse = await response.json();
    
    const bufferSeconds = 60;
    const expiresAt = new Date(Date.now() + (data.expires_in - bufferSeconds) * 1000);
    
    tokenCache = {
      accessToken: data.access_token,
      expiresAt,
    };
    
    return data.access_token;
  } catch (error) {
    console.error(`[LIFULL OAuth] Error: ${(error as Error).message}`);
    return null;
  }
}

export function clearTokenCache(): void {
  tokenCache = null;
}
