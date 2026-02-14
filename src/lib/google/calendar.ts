import { google } from "googleapis"
import { createOAuth2Client } from "./auth"

export async function getCalendarBusyTimes(
  refreshToken: string,
  timeMin: Date,
  timeMax: Date
): Promise<{ start: Date; end: Date }[]> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  const calendar = google.calendar({ version: "v3", auth: oauth2Client })
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: "primary" }],
    },
  })

  const busySlots = response.data.calendars?.primary?.busy ?? []
  return busySlots.map((slot) => ({
    start: new Date(slot.start!),
    end: new Date(slot.end!),
  }))
}
