import { NextApiRequest, NextApiResponse } from 'next';
import { Client, APIErrorCode, isNotionClientError, ClientErrorCode } from '@notionhq/client';
import { createCalendarEvent } from '../../lib/gcal'; // Adjusted path
import { sendJobEmail } from '../../lib/email';

// Initialize Notion client
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID || '';

interface JobFormData {
  name: string;
  address: string;
  jobDate: string; // YYYY-MM-DD
  jobTime: string; // HH:mm
  quote: number;
  phone: string;
  description?: string;
  scheduledBy: 'Will Griffioen' | 'Sean Baird';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  if (!DATABASE_ID) {
    console.error('Notion Database ID is not configured.');
    return res.status(500).json({ message: 'Server configuration error: Missing Database ID.' });
  }
  if (!process.env.NOTION_API_KEY) {
    console.error('Notion API Key is not configured.');
    return res.status(500).json({ message: 'Server configuration error: Missing API Key.' });
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN || !process.env.GOOGLE_CALENDAR_ID) {
    console.error('Google Calendar environment variables are not fully configured.');
    return res.status(500).json({ message: 'Server config error: Google Calendar credentials missing or incomplete.' });
  }

  let notionPageId: string | undefined = undefined;

  try {
    const {
      name,
      address,
      jobDate,
      jobTime,
      quote,
      phone,
      description,
      scheduledBy,
    } = req.body as JobFormData;

    // Validate required fields (basic validation)
    if (!name || !address || !jobDate || !jobTime || quote === undefined || !phone || !scheduledBy) {
      return res.status(400).json({ message: 'Missing required form fields.' });
    }

    // Combine date and time with proper timezone handling
    const dateParts = jobDate.split('-').map(Number);
    const timeParts = jobTime.split(':').map(Number);
    // Note: The month is 0-indexed in the Date constructor (0=Jan, 1=Feb, etc.)
    const localDateTime = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1]);
    
    // 2. Get the server's timezone offset in minutes.
    // For MDT (UTC-6), this returns 360. The sign is the reverse of the standard notation.
    const timezoneOffsetMinutes = localDateTime.getTimezoneOffset();
    
    // 3. Convert the offset to the standard +/-HH:mm format.
    const offsetSign = timezoneOffsetMinutes > 0 ? '-' : '+';
    const offsetHours = Math.abs(Math.floor(timezoneOffsetMinutes / 60));
    const offsetMinutes = Math.abs(timezoneOffsetMinutes % 60);
    const formattedOffset = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
    
    // 4. Construct the final ISO string with the local offset.
    // We manually format it because .toISOString() would convert it back to UTC.
    const year = localDateTime.getFullYear();
    const month = String(localDateTime.getMonth() + 1).padStart(2, '0');
    const day = String(localDateTime.getDate()).padStart(2, '0');
    const hours = String(localDateTime.getHours()).padStart(2, '0');
    const minutes = String(localDateTime.getMinutes()).padStart(2, '0');
    const seconds = String(localDateTime.getSeconds()).padStart(2, '0');
    
    const jobDateTimeISO = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${formattedOffset}`;

    const googleMapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(address)}`;

    // 1. Create Notion Page
    const notionPage = await notion.pages.create({
      parent: { database_id: DATABASE_ID },
      properties: {
        // 'Name' is the title property
        'Name': {
          title: [
            {
              text: {
                content: name,
              },
            },
          ],
        },
        'Address': { // Type: URL
          url: googleMapsUrl,
        },
        'Job Date/Time': { // Type: Date
          date: {
            start: jobDateTimeISO,
          },
        },
        'Quote': { // Type: Number, Format: Dollar
          number: quote,
        },
        'Phone #': { // Type: Phone Number
          phone_number: phone.replace(/\D/g, ''), // Remove non-numeric characters for Notion phone type
        },
        'Description': { // Type: Rich Text
          rich_text: [
            {
              text: {
                content: description || '', // Handle potentially undefined description
              },
            },
          ],
        },
        'Scheduled By': { // Type: Rich Text in your schema
          rich_text: [
            {
              text: {
                content: scheduledBy,
              },
            },
          ],
        },
        // Fixed values as per your requirements
        'Scheduled For': {
          rich_text: [
            {
              text: {
                content: 'Sean Baird',
              },
            },
          ],
        },
        'Payment Status': {
          select: {
            name: 'Job Not Finished 😤',
          },
        },
        // 'Google Event' (URL) and 'Commission' (Formula) are not set here
      },
    });
    notionPageId = notionPage.id;
    console.log(`Notion page created: ${notionPageId}`);

    // 2. Create Google Calendar Event
    let gcalEventLink: string | undefined = undefined;
    try {
      const calendarEventData = {
        name,
        address,
        jobDateTimeISO, // Pass the already formatted ISO string with offset
        quote,
        phone,
        description,
      };
      const calendarEvent = await createCalendarEvent(calendarEventData);
      gcalEventLink = calendarEvent.htmlLink ?? undefined;
      console.log(`Google Calendar event created: ${gcalEventLink}`);

      // 3. Update Notion Page with Google Calendar Event Link
      if (gcalEventLink) {
        await notion.pages.update({
          page_id: notionPageId,
          properties: {
            'Google Event': { url: gcalEventLink },
          },
        });
        console.log(`Notion page ${notionPageId} updated with GCal link.`);
      }
    } catch (gcalError: any) {
      // Log GCal error but don't let it fail the entire process if Notion page was created
      // The main response will still indicate Notion success, but we'll log this error.
      console.error(`Failed to create Google Calendar event or update Notion page with GCal link for Notion page ${notionPageId}:`, gcalError.message);
      // Optionally, you could add a partial success message or specific error for GCal to the response
      return res.status(201).json({ 
        message: 'Job created in Notion, but Google Calendar integration failed.',
        notionPageId,
        gcalError: gcalError.message 
      });
    }

    // Send notification email (fire and forget)
    const notionTicketUrl = `https://www.notion.so/${notionPageId?.replace(/-/g, '')}`;
    const recipients = ['willgriff19@gmail.com', 'seantbaird5@gmail.com'];
    const subject = `Job Scheduled: ${name} | $${quote}`;
    const html = `
      <h2>New Job Scheduled</h2>
      <ul>
        <li><strong>Name:</strong> ${name}</li>
        <li><strong>Address:</strong> ${address}</li>
        <li><strong>Date/Time:</strong> ${jobDate} ${jobTime}</li>
        <li><strong>Quote:</strong> $${quote}</li>
        <li><strong>Phone:</strong> ${phone}</li>
        <li><strong>Description:</strong> ${description || 'N/A'}</li>
        <li><strong>Scheduled By:</strong> ${scheduledBy}</li>
        <li><strong>Google Calendar Event:</strong> <a href="${gcalEventLink}">${gcalEventLink}</a></li>
        <li><strong>Notion Ticket:</strong> <a href="${notionTicketUrl}">${notionTicketUrl}</a></li>
      </ul>
    `;
    sendJobEmail({ to: recipients, subject, html }).catch(e => console.error('Failed to send job email:', e));

    return res.status(201).json({ 
      message: 'Job created successfully in Notion and Google Calendar!',
      notionPageId,
      gcalEventLink 
    });

  } catch (error: any) {
    console.error('Error creating Notion page:', JSON.stringify(error, null, 2));
    let errorMessage = 'Failed to create job in Notion.';
    let errorDetails: string | unknown = 'Unknown error';
    let notionErrorCode: APIErrorCode | ClientErrorCode | undefined = undefined;

    if (isNotionClientError(error)) {
        notionErrorCode = error.code;
        errorDetails = error.message;
        switch (error.code) {
            case APIErrorCode.ObjectNotFound:
                errorMessage = 'Notion database not found. Please check your NOTION_DATABASE_ID in .env.local.';
                break;
            case APIErrorCode.Unauthorized:
                errorMessage = 'Notion API key is invalid or lacks permissions for the database. Please check your NOTION_API_KEY and integration permissions.';
                break;
            case APIErrorCode.ValidationError:
                errorMessage = `Notion API validation error: ${error.message}. Please check if all form fields match Notion's property types and constraints.`;
                break;
            case APIErrorCode.RateLimited:
                errorMessage = 'Notion API rate limit exceeded. Please try again later.';
                break;
            default:
                errorMessage = `Notion error: ${error.message} (Code: ${error.code})`;
        }
    } else if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.message;
    }
    
    return res.status(500).json({ 
        message: errorMessage, 
        details: errorDetails,
        notionErrorCode: notionErrorCode
    });
  }
} 
