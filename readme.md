Remove the --rm flag and add a volume
bashdocker run -e POSTGRES_PASSWORD=lol \
 --name=pg \
 -d \
 -p 5432:5432 \
 -v pg_data:/var/lib/postgresql/data \
 postgres:14
Changes made:

Removed --rm: Container persists even after stopping
Added -v pg_data:/var/lib/postgresql/data: Creates a named volume that persists data

Better approach: Use Docker Compose
I recommend using Docker Compose for better management. Create a docker-compose.yml file:

```yml
yamlversion: '3.8'

services:
postgres:
image: postgres:14
container_name: pg
environment:
POSTGRES_PASSWORD: lol
POSTGRES_USER: postgres
POSTGRES_DB: myapp
ports: - "5432:5432"
volumes: - pg_data:/var/lib/postgresql/data
restart: unless-stopped

volumes:
pg_data:
Then use these commands:
```

```bash
# Start the database
docker-compose up -d

# Stop (data persists)

docker-compose stop

# Start again

docker-compose start

# View logs

docker-compose logs -f

# Access psql

docker-compose exec postgres psql -U postgres

# Remove everything (including data)

docker-compose down -v
```

Benefits of this approach:

Data persists across container restarts
Container persists until explicitly removed
restart: unless-stopped means it auto-starts when Docker Desktop launches
Easy to manage and version control
Can add more services (Redis, etc.) easily

The data will now survive Docker Desktop restarts and will only be deleted if you explicitly run docker-compose down -v or docker volume rm pg_data.

# PennyPost - Modern Blog Platform

![PennyPost Logo](https://via.placeholder.com/150x150?text=PennyPost)

**A beautiful, lightweight, and powerful blogging platform built with Next.js**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

[Demo](https://pennypost-demo.vercel.app) · [Documentation](https://docs.pennypost.com) · [Report Bug](https://github.com/yourusername/pennypost/issues)

---

## ✨ Features

- 📝 **Rich Text Editor** - Write beautiful content with an intuitive editor
- 🎨 **Customizable Themes** - Choose from multiple themes or create your own
- 🚀 **Fast & Lightweight** - Built with performance in mind
- 📱 **Fully Responsive** - Perfect experience on all devices
- 🔍 **SEO Optimized** - Built-in SEO best practices
- 💬 **Comments System** - Engage with your readers
- 🏷️ **Tags & Categories** - Organize your content effortlessly
- 📊 **Analytics Dashboard** - Track your blog's performance
- 🌙 **Dark Mode** - Easy on the eyes, day or night
- 🔒 **Secure Authentication** - Protect your content with robust auth

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm
- PostgreSQL (or your preferred database)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/pennypost.git
   cd pennypost
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Update `.env.local` with your configuration:

   ```env
   DATABASE_URL="postgresql://..."
   NEXTAUTH_SECRET="your-secret-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Run database migrations**

   ```bash
   npm run db:push
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Documentation

### Project Structure

```
pennypost/
├── app/                  # Next.js app directory
│   ├── api/             # API routes
│   ├── blog/            # Blog pages
│   └── dashboard/       # Admin dashboard
├── components/          # React components
│   ├── ui/             # UI components
│   └── blog/           # Blog-specific components
├── lib/                # Utility functions
├── styles/             # Global styles
├── public/             # Static assets
└── drizzle/            # Database schema
```
