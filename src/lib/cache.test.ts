import { describe, it, expect, vi, afterEach } from "vitest"
import { TTLCache } from "./cache"

describe("TTLCache", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns undefined for missing key", () => {
    const cache = new TTLCache<string>()
    expect(cache.get("nonexistent")).toBeUndefined()
  })

  it("set+get returns value before expiry", () => {
    const cache = new TTLCache<string>()
    cache.set("key1", "value1", 60_000)
    expect(cache.get("key1")).toBe("value1")
  })

  it("returns undefined for expired key", () => {
    const cache = new TTLCache<string>()
    const now = Date.now()
    vi.spyOn(Date, "now").mockReturnValueOnce(now) // set call
    cache.set("key1", "value1", 1000)

    vi.spyOn(Date, "now").mockReturnValue(now + 1001) // get call after expiry
    expect(cache.get("key1")).toBeUndefined()
  })

  it("invalidate removes key", () => {
    const cache = new TTLCache<string>()
    cache.set("key1", "value1", 60_000)
    expect(cache.get("key1")).toBe("value1")

    cache.invalidate("key1")
    expect(cache.get("key1")).toBeUndefined()
  })

  it("invalidate on missing key does not throw", () => {
    const cache = new TTLCache<string>()
    expect(() => cache.invalidate("nonexistent")).not.toThrow()
  })

  it("stores different types", () => {
    const cache = new TTLCache<{ start: Date; end: Date }[]>()
    const data = [
      { start: new Date("2026-02-16T09:00:00Z"), end: new Date("2026-02-16T10:00:00Z") },
    ]
    cache.set("host-1", data, 60_000)
    expect(cache.get("host-1")).toEqual(data)
  })
})
