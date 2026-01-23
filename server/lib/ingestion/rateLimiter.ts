export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;

  constructor(requestsPerMinute: number) {
    this.maxTokens = requestsPerMinute;
    this.tokens = requestsPerMinute;
    this.refillRate = requestsPerMinute / 60;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  async acquire(): Promise<void> {
    this.refill();
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    const waitTime = ((1 - this.tokens) / this.refillRate) * 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    this.tokens = 0;
  }

  release(): void {
    this.tokens = Math.min(this.maxTokens, this.tokens + 1);
  }

  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

const rateLimiters: Map<string, RateLimiter> = new Map();

export function getRateLimiter(host: string, requestsPerMinute = 60): RateLimiter {
  let limiter = rateLimiters.get(host);
  if (!limiter) {
    limiter = new RateLimiter(requestsPerMinute);
    rateLimiters.set(host, limiter);
  }
  return limiter;
}

export function clearRateLimiters(): void {
  rateLimiters.clear();
}
