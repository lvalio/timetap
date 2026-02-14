import { describe, it, expect, vi, beforeEach } from "vitest"
import { getCalendarBusyTimes } from "./calendar"

const mockQuery = vi.fn()
const mockSetCredentials = vi.fn()

vi.mock("./auth", () => ({
  createOAuth2Client: vi.fn(() => ({
    setCredentials: mockSetCredentials,
  })),
}))

vi.mock("googleapis", () => ({
  google: {
    calendar: vi.fn(() => ({
      freebusy: { query: mockQuery },
    })),
  },
}))

describe("getCalendarBusyTimes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns busy times array from Google Calendar API", async () => {
    mockQuery.mockResolvedValue({
      data: {
        calendars: {
          primary: {
            busy: [
              {
                start: "2026-02-16T09:00:00Z",
                end: "2026-02-16T10:00:00Z",
              },
              {
                start: "2026-02-16T14:00:00Z",
                end: "2026-02-16T15:00:00Z",
              },
            ],
          },
        },
      },
    })

    const result = await getCalendarBusyTimes(
      "refresh-token-123",
      new Date("2026-02-16T00:00:00Z"),
      new Date("2026-02-17T00:00:00Z")
    )

    expect(result).toHaveLength(2)
    expect(result[0].start).toEqual(new Date("2026-02-16T09:00:00Z"))
    expect(result[0].end).toEqual(new Date("2026-02-16T10:00:00Z"))
    expect(result[1].start).toEqual(new Date("2026-02-16T14:00:00Z"))
    expect(result[1].end).toEqual(new Date("2026-02-16T15:00:00Z"))
  })

  it("returns empty array when no busy times", async () => {
    mockQuery.mockResolvedValue({
      data: {
        calendars: {
          primary: {
            busy: [],
          },
        },
      },
    })

    const result = await getCalendarBusyTimes(
      "refresh-token-123",
      new Date("2026-02-16T00:00:00Z"),
      new Date("2026-02-17T00:00:00Z")
    )

    expect(result).toEqual([])
  })

  it("returns empty array when calendars data is missing", async () => {
    mockQuery.mockResolvedValue({
      data: { calendars: {} },
    })

    const result = await getCalendarBusyTimes(
      "refresh-token-123",
      new Date("2026-02-16T00:00:00Z"),
      new Date("2026-02-17T00:00:00Z")
    )

    expect(result).toEqual([])
  })

  it("throws when API call fails", async () => {
    mockQuery.mockRejectedValue(new Error("API quota exceeded"))

    await expect(
      getCalendarBusyTimes(
        "refresh-token-123",
        new Date("2026-02-16T00:00:00Z"),
        new Date("2026-02-17T00:00:00Z")
      )
    ).rejects.toThrow("API quota exceeded")
  })

  it("uses refresh token correctly", async () => {
    mockQuery.mockResolvedValue({
      data: { calendars: { primary: { busy: [] } } },
    })

    await getCalendarBusyTimes(
      "my-refresh-token",
      new Date("2026-02-16T00:00:00Z"),
      new Date("2026-02-17T00:00:00Z")
    )

    expect(mockSetCredentials).toHaveBeenCalledWith({
      refresh_token: "my-refresh-token",
    })
  })

  it("passes correct time range to freebusy query", async () => {
    mockQuery.mockResolvedValue({
      data: { calendars: { primary: { busy: [] } } },
    })

    const timeMin = new Date("2026-02-16T00:00:00Z")
    const timeMax = new Date("2026-02-23T00:00:00Z")

    await getCalendarBusyTimes("refresh-token-123", timeMin, timeMax)

    expect(mockQuery).toHaveBeenCalledWith({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: "primary" }],
      },
    })
  })
})
