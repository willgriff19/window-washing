import { google } from 'googleapis';

// Define a type for the expected form data, similar to what create-job.ts uses
// We'll primarily use jobDateTimeISO which is already constructed with the -07:00 offset.
interface GCalEventFormData {
  name: string;
  address: string;
  jobDateTimeISO: string; // e.g., "2024-07-15T10:00:00.000-07:00"
  quote: number;
  phone: string;
  description?: string;
  // scheduledBy: string; // Not strictly needed for GCal event content by user spec
}

// Log the environment variable at the time of module load for diagnostics
console.log('[gcal.ts] Loading module. GOOGLE_CLIENT_ID from process.env:', process.env.GOOGLE_CLIENT_ID);
console.log('[gcal.ts] GOOGLE_CLIENT_SECRET from process.env:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET'); // Don't log the secret itself
console.log('[gcal.ts] GOOGLE_REFRESH_TOKEN from process.env:', process.env.GOOGLE_REFRESH_TOKEN ? 'SET' : 'NOT SET'); // Don't log the token
console.log('[gcal.ts] GOOGLE_CALENDAR_ID from process.env:', process.env.GOOGLE_CALENDAR_ID);

// Ensure environment variables are checked (they will be when this module is loaded)
if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error('GOOGLE_CLIENT_ID is not set in .env.local');
}
if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('GOOGLE_CLIENT_SECRET is not set in .env.local');
}
if (!process.env.GOOGLE_REFRESH_TOKEN) {
  throw new Error('GOOGLE_REFRESH_TOKEN is not set in .env.local');
}
if (!process.env.GOOGLE_CALENDAR_ID) {
  throw new Error('GOOGLE_CALENDAR_ID is not set in .env.local (should be seantbaird5@gmail.com)');
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

/**
 * Calculates the event duration in hours, rounded up to the nearest half hour.
 * Duration = quote / 50.
 */
function calculateEventDuration(quote: number): number {
  if (quote <= 0) return 0.5; // Minimum duration, e.g., 30 mins
  const calculatedHours = quote / 60;
  return Math.ceil(calculatedHours * 2) / 2; // Rounds up to the nearest 0.5
}

export async function createCalendarEvent(formData: GCalEventFormData) {
  const { name, address, jobDateTimeISO, quote, phone, description } = formData;

  const startTime = new Date(jobDateTimeISO);
  const durationHours = calculateEventDuration(quote);
  const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

  // Format phone for SMS link: remove non-digits and add +1 if it looks like a US number without it
  let smsPhone = phone.replace(/\D/g, '');
  if (smsPhone.length === 10 && !smsPhone.startsWith('1')) {
    smsPhone = `1${smsPhone}`;
  }
  const smsLink = `sms:+${smsPhone}`;

  const eventSummary = `${name} | $${quote}`;
  const eventDescription = `Job Description: ${description || 'N/A'}\nClient Phone: ${smsLink}`;

  const event = {
    summary: eventSummary,
    location: address,
    description: eventDescription,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Use local timezone
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Use local timezone
    },
    // attendees: [], // Optional: add attendees if needed
    // reminders: { ... }, // Optional: add reminders
  };

  try {
    console.log(`Attempting to create calendar event for: ${eventSummary} on calendar ${process.env.GOOGLE_CALENDAR_ID}`);
    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID, // Target Sean's calendar
      requestBody: event,
    });

    console.log('Calendar event created successfully:', response.data.htmlLink);
    return {
      htmlLink: response.data.htmlLink,
      eventId: response.data.id,
    };
  } catch (error: any) {
    console.error('Error creating Google Calendar event:', error.response ? JSON.stringify(error.response.data) : error.message);
    // Rethrow a more specific error or handle it as needed
    throw new Error(`Failed to create Google Calendar event: ${error.response?.data?.error?.message || error.message}`);
  }
}

// To make the file non-empty and valid, you can add a placeholder export
export const placeholderGcal = {}; 
