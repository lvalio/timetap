import { describe, it, expect } from "vitest"
import { createPackageSchema, updatePackageSchema } from "./package"

describe("createPackageSchema", () => {
  it("accepts valid input", () => {
    const result = createPackageSchema.safeParse({
      name: "5 Coaching Sessions",
      sessionCount: 5,
      priceInCents: 40000,
    })
    expect(result.success).toBe(true)
  })

  it("accepts free package (price = 0)", () => {
    const result = createPackageSchema.safeParse({
      name: "Free Intro Call",
      sessionCount: 1,
      priceInCents: 0,
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty name", () => {
    const result = createPackageSchema.safeParse({
      name: "",
      sessionCount: 1,
      priceInCents: 0,
    })
    expect(result.success).toBe(false)
  })

  it("rejects name over 100 characters", () => {
    const result = createPackageSchema.safeParse({
      name: "a".repeat(101),
      sessionCount: 1,
      priceInCents: 0,
    })
    expect(result.success).toBe(false)
  })

  it("rejects sessionCount = 0", () => {
    const result = createPackageSchema.safeParse({
      name: "Test",
      sessionCount: 0,
      priceInCents: 0,
    })
    expect(result.success).toBe(false)
  })

  it("rejects sessionCount > 100", () => {
    const result = createPackageSchema.safeParse({
      name: "Test",
      sessionCount: 101,
      priceInCents: 0,
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative price", () => {
    const result = createPackageSchema.safeParse({
      name: "Test",
      sessionCount: 1,
      priceInCents: -100,
    })
    expect(result.success).toBe(false)
  })

  it("rejects float price (must be int)", () => {
    const result = createPackageSchema.safeParse({
      name: "Test",
      sessionCount: 1,
      priceInCents: 99.5,
    })
    expect(result.success).toBe(false)
  })
})

describe("updatePackageSchema", () => {
  it("accepts valid update input with isActive", () => {
    const result = updatePackageSchema.safeParse({
      name: "Updated Package",
      sessionCount: 3,
      priceInCents: 15000,
      isActive: false,
    })
    expect(result.success).toBe(true)
  })

  it("accepts update without isActive (optional)", () => {
    const result = updatePackageSchema.safeParse({
      name: "Updated Package",
      sessionCount: 3,
      priceInCents: 15000,
    })
    expect(result.success).toBe(true)
  })
})
