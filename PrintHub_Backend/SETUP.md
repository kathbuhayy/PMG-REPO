# PrintHub Backend Setup Guide

A guide to setting up and running the PrintHub backend locally.

---

## Prerequisites

- **Node.js** (v18 or higher recommended)
- **Docker** (for running the PostgreSQL database)
- **Supabase** account (for file storage)
- Required API keys (Gemini, Fal.ai, Meshy, PayMongo)

---

## Step 1: Database Setup

1. Spin up the PostgreSQL database using Docker Compose:
   ```bash
   docker-compose up -d
   ```
2. Copy the sample environment settings to a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://proj_admin:sideproj123@localhost:5432/postgres"
   DIRECT_URL="postgresql://proj_admin:sideproj123@localhost:5432/postgres"

   # Supabase Credentials (Required for startup)
   SUPABASE_URL="your-supabase-project-url"
   SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

   # External API Keys (Optional/Required for AI and Payments)
   FAL_KEY="your-fal-ai-api-key"
   MESHY_API_KEY="your-meshy-api-key"
   GEMINI_API_KEY="your-gemini-api-key"
   PAYMONGO_SECRET_KEY="your-paymongo-secret-key"
   PAYMONGO_WEBHOOK_SECRET="your-paymongo-webhook-secret"
   ```

---

## Step 2: Install Dependencies & Generate Client

Install the node modules and generate the Prisma client:
```bash
# Install dependencies
npm install

# Generate Prisma Client (runs automatically on postinstall)
npm run prisma:generate
```

---

## Step 3: Run Database Migrations

Apply database schema migrations to setup the tables:
```bash
npm run prisma:migrate
```

---

## Step 4: Run the Application

Start the Express backend server:
```bash
# Starts the server via node src/index.js
npm start
```
The server will start listening on the port specified by the `PORT` env
variable (defaults to `3000`).

---

## Helper Scripts

Useful NPM commands defined in [package.json]:

* **`npm run prisma:studio`**: Opens a visual browser tool to inspect/edit
  your database records.
* **`npm run prisma:generate`**: Re-generates the Prisma Client types after
  changing the database schema.
