import { getRateLimiter } from "./rateLimiter";

export interface HttpClientConfig {
  baseUrl: string;
  apiKey?: string;
  apiKeyHeader?: string;
  rateLimitPerMin?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
  timeout?: number;
}

export interface HttpResponse<T> {
  success: boolean;
  status: number;
  data?: T;
  error?: string;
  headers?: Record<string, string>;
}

export class HttpClient {
  private readonly config: Required<HttpClientConfig>;
  private readonly rateLimiter: ReturnType<typeof getRateLimiter>;

  constructor(config: HttpClientConfig) {
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ""),
      apiKey: config.apiKey ?? "",
      apiKeyHeader: config.apiKeyHeader ?? "X-API-Key",
      rateLimitPerMin: config.rateLimitPerMin ?? 60,
      retryAttempts: config.retryAttempts ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1000,
      timeout: config.timeout ?? 30000,
    };

    const host = new URL(this.config.baseUrl).host;
    this.rateLimiter = getRateLimiter(host, this.config.rateLimitPerMin);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      "Accept": "application/json",
      "User-Agent": "AkiyaFinder/1.0 (data aggregator; contact@akiyafinder.jp)",
      ...customHeaders,
    };

    if (this.config.apiKey) {
      headers[this.config.apiKeyHeader] = this.config.apiKey;
    }

    return headers;
  }

  async get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    customHeaders?: Record<string, string>
  ): Promise<HttpResponse<T>> {
    const cleanPath = path.replace(/^\/+/, "");
    const baseWithSlash = this.config.baseUrl.endsWith("/") 
      ? this.config.baseUrl 
      : `${this.config.baseUrl}/`;
    const url = new URL(cleanPath, baseWithSlash);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        await this.rateLimiter.acquire();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: this.buildHeaders(customHeaders),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        if (!response.ok) {
          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get("Retry-After") || "60", 10);
            await this.sleep(retryAfter * 1000);
            continue;
          }

          if (response.status >= 500 && attempt < this.config.retryAttempts - 1) {
            await this.sleep(this.config.retryDelayMs * Math.pow(2, attempt));
            continue;
          }

          return {
            success: false,
            status: response.status,
            error: `HTTP ${response.status}: ${response.statusText}`,
            headers: responseHeaders,
          };
        }

        const contentType = response.headers.get("content-type") || "";
        let data: T;

        if (contentType.includes("application/json")) {
          data = await response.json() as T;
        } else {
          data = await response.text() as unknown as T;
        }

        return {
          success: true,
          status: response.status,
          data,
          headers: responseHeaders,
        };
      } catch (error) {
        lastError = error as Error;
        
        if ((error as Error).name === "AbortError") {
          return {
            success: false,
            status: 0,
            error: "Request timeout",
          };
        }

        if (attempt < this.config.retryAttempts - 1) {
          await this.sleep(this.config.retryDelayMs * Math.pow(2, attempt));
          continue;
        }
      }
    }

    return {
      success: false,
      status: 0,
      error: lastError?.message ?? "Unknown error",
    };
  }

  async downloadFile(url: string): Promise<{ success: boolean; data?: Buffer; error?: string; contentType?: string }> {
    try {
      await this.rateLimiter.acquire();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout * 2);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "AkiyaFinder/1.0 (data aggregator; contact@akiyafinder.jp)",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "";

      return {
        success: true,
        data: Buffer.from(arrayBuffer),
        contentType,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}
