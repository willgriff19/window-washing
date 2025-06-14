# Window Washing Job Manager

A Next.js application for managing window washing jobs, including quote calculation, job scheduling, and integration with Google Calendar and Notion.

## Features

- Quote calculator based on number of panes
- Job creation form with validation
- Google Calendar integration for scheduling
- Notion database integration for job tracking
- Mobile-first responsive design
- Modern UI with Tailwind CSS and shadcn/ui

## Prerequisites

- Node.js 18+ and pnpm
- Google Calendar API credentials
- Notion API key and database ID

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Create a `.env` file in the root directory with the following variables:
   ```
   NOTION_API_KEY=your_notion_api_key
   NOTION_DATABASE_ID=201747f6-322d-8094-89f9-e6d940abb74f

   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REFRESH_TOKEN=your_google_refresh_token
   GOOGLE_CALENDAR_ID=primary
   APP_TIMEZONE=America/Denver
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

1. Push your code to a Git repository.

2. Deploy to Vercel:
   - Connect your repository to Vercel
   - Add all environment variables in the Vercel project settings
   - Deploy!

## Google Calendar Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials
5. Generate a refresh token for the service account

## Notion Setup

1. Create a new integration in [Notion Integrations](https://www.notion.so/my-integrations)
2. Share your database with the integration
3. Copy the integration token and database ID

## License

MIT
