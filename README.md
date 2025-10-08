# Tender Management System

A comprehensive tender management application with company-based access control.

## Features

- 🏢 Company-based multi-tenancy
- 🔐 Custom email/password authentication
- 📊 Dashboard with statistics and insights
- 📝 Complete tender CRUD operations
- 👥 User management per company
- 🔍 Advanced filtering and sorting
- 📱 Responsive design

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: TailwindCSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Custom (tender_user table)
- **Build Tool**: Vite

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Supabase**
   - Create a `.env` file from `.env.example`
   - Add your Supabase URL and anon key

3. **Run Database Migrations**
   - Execute the SQL in `database-schema.sql` in your Supabase SQL editor

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## Database Schema

All tables use `tender_` prefix:
- `tender_companies` - Company information
- `tender_users` - User accounts with authentication
- `tender_tenders` - Tender records
- `tender_tender_history` - Audit trail

## Default Admin Account

After running migrations, you can create an admin account using the signup page.
First user of a company becomes the admin automatically.

## Project Structure

```
src/
├── components/       # Reusable UI components
├── contexts/         # React contexts (Auth)
├── hooks/           # Custom React hooks
├── lib/             # Supabase client
├── pages/           # Page components
├── services/        # API service layer
├── types/           # TypeScript types
└── utils/           # Utility functions
```

## License

MIT

