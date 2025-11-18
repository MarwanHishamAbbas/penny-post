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
