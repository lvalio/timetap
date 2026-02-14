export class TTLCache<T> {
  private cache = new Map<string, { value: T; expiresAt: number }>()

  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: T, ttlMs: number): void {
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }
}

export const GCAL_CACHE_TTL_MS = 300_000 // 5 minutes
