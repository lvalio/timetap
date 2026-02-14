import { describe, it, expect } from "vitest"
import { formatCurrency } from "./utils"

describe("formatCurrency", () => {
  it("formats whole euros without decimals", () => {
    expect(formatCurrency(80000)).toBe("€800")
  })

  it("formats cents with decimals", () => {
    expect(formatCurrency(8050)).toBe("€80.50")
  })

  it("returns 'Free' for zero", () => {
    expect(formatCurrency(0)).toBe("Free")
  })

  it("formats single euro amounts", () => {
    expect(formatCurrency(100)).toBe("€1")
  })

  it("formats large amounts", () => {
    expect(formatCurrency(150000)).toBe("€1,500")
  })
})
