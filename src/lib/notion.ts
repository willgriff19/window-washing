import { Client } from '@notionhq/client';

if (!process.env.NOTION_API_KEY) {
  throw new Error('NOTION_API_KEY is not set');
}

if (!process.env.NOTION_DATABASE_ID) {
  throw new Error('NOTION_DATABASE_ID is not set');
}

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export interface JobFormData {
  name: string;
  address: string;
  phone: string;
  description: string;
  quote: number;
  scheduledBy: string;
  jobDateTime: string;
}

export async function createPage(formData: JobFormData, googleEventLink: string) {
  const response = await notion.pages.create({
    parent: {
      database_id: process.env.NOTION_DATABASE_ID!,
    },
    properties: {
      Name: {
        title: [
          {
            text: {
              content: formData.name,
            },
          },
        ],
      },
      Address: {
        url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.address)}`,
      },
      'Phone #': {
        rich_text: [
          {
            text: {
              content: formData.phone,
            },
          },
        ],
      },
      Description: {
        rich_text: [
          {
            text: {
              content: formData.description,
            },
          },
        ],
      },
      Quote: {
        number: formData.quote,
      },
      'Scheduled By': {
        select: {
          name: formData.scheduledBy,
        },
      },
      'Job Date/Time': {
        date: {
          start: formData.jobDateTime,
        },
      },
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
          name: 'Job Not Finished …',
        },
      },
      'Google Event': {
        url: googleEventLink,
      },
    },
  });

  return response;
} 