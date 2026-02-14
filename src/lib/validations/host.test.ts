import { describe, it, expect } from "vitest"
import { updateProfileSchema, slugSchema } from "./host"

describe("slugSchema", () => {
  it("accepts valid slugs", () => {
    expect(slugSchema.safeParse("abc").success).toBe(true)
    expect(slugSchema.safeParse("my-slug").success).toBe(true)
    expect(slugSchema.safeParse("sofia-coaching-42").success).toBe(true)
    expect(slugSchema.safeParse("a1b2c3").success).toBe(true)
  })

  it("rejects slugs shorter than 3 characters", () => {
    expect(slugSchema.safeParse("ab").success).toBe(false)
  })

  it("rejects slugs longer than 30 characters", () => {
    const long = "a".repeat(31)
    expect(slugSchema.safeParse(long).success).toBe(false)
  })

  it("rejects slugs with uppercase letters", () => {
    expect(slugSchema.safeParse("MySlug").success).toBe(false)
  })

  it("rejects slugs with leading hyphen", () => {
    expect(slugSchema.safeParse("-my-slug").success).toBe(false)
  })

  it("rejects slugs with trailing hyphen", () => {
    expect(slugSchema.safeParse("my-slug-").success).toBe(false)
  })

  it("rejects slugs with special characters", () => {
    expect(slugSchema.safeParse("my_slug").success).toBe(false)
    expect(slugSchema.safeParse("my.slug").success).toBe(false)
    expect(slugSchema.safeParse("my slug").success).toBe(false)
  })
})

describe("updateProfileSchema", () => {
  it("accepts valid profile data", () => {
    const result = updateProfileSchema.safeParse({
      name: "Sofia",
      description: "Life coach",
      slug: "sofia-coaching",
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty name", () => {
    const result = updateProfileSchema.safeParse({
      name: "",
      slug: "abc",
    })
    expect(result.success).toBe(false)
  })

  it("allows description to be omitted", () => {
    const result = updateProfileSchema.safeParse({
      name: "Sofia",
      slug: "sofia",
    })
    expect(result.success).toBe(true)
  })

  it("rejects name over 100 characters", () => {
    const result = updateProfileSchema.safeParse({
      name: "a".repeat(101),
      slug: "abc",
    })
    expect(result.success).toBe(false)
  })

  it("rejects description over 500 characters", () => {
    const result = updateProfileSchema.safeParse({
      name: "Sofia",
      description: "a".repeat(501),
      slug: "abc",
    })
    expect(result.success).toBe(false)
  })
})
