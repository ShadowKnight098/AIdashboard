# 🚀 TechScroll AI

> **An Intelligent Short-Form Video Platform for Developers, Engineers, and Tech Enthusiasts** with real-time AI interest profiling, content classification, and personalized recommendation engine.

[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.x-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Storage-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)

---

## 📖 Overview

**TechScroll AI** reimagines short-form technical video content consumption. Unlike traditional social media algorithms optimized solely for mindless watch time, TechScroll AI balances **educational substance** against **hype score**, mapping developer interactions to actionable interest profiles and delivering transparent, explainable recommendations.

---

## ✨ Key Features

- **📱 Dynamic Reels Feed**:
  - Smooth vertical feed with keyboard navigation (`Up`/`Down` arrow keys), auto-play, and seamless video looping.
  - Interactive engagement suite: Likes, Saves, Shares (with direct clipboard URL copying), and sound toggling.
  - Granular telemetry: Precise watch time calculation, completion percentage tracking, and automatic 10-second threshold interaction dispatching.

- **🧠 Real-Time AI Content Analysis**:
  - Automatic evaluation of technical relevance, educational value (0–100), hype score (0–100), intent, context, and key topics.
  - Domain classification across 10 specialized categories: **AI, DSA, Java, HLD, Cybersecurity, Cloud, Hardware, Career, WebDev, DevOps**.
  - Content format tagging: **Explainer, Tutorial, Comparison, Meme, Vlog, News**.

- **🎯 Real-Time Developer Interest Profiling**:
  - Dynamic user profiling powered by engagement signals (watch percentage, likes, bookmarks, and skip velocity).
  - Inferred interest labels with segmented confidence ratings (**High**, **Medium**, **Low**) and concrete behavioral evidence trails.

- **🔮 Smart AI Recommendation Engine**:
  - Multi-candidate ranking algorithm considering topic alignment, difficulty pacing (Beginner, Intermediate, Advanced), educational vs. hype balancing, and format preferences.
  - Transparent **"Why This Recommendation"** explanation breakdowns powered by LLMs (OpenAI GPT-4o / Anthropic Claude / Built-in Deterministic AI Engine fallback).

- **📤 Video Creator Upload Suite**:
  - Direct video uploads to Supabase Storage or external direct-link embedding.
  - Content pillar presets: **Timepass**, **Building**, and **Deep Dive**.
  - Custom category, difficulty, duration, and transcript tagging.

- **📊 Comprehensive Analytics Dashboard**:
  - Live metrics for total watch sessions, engagement rate, average educational index, and hype exposure.
  - Category breakdown visualization and active interest profile summaries.

- **⚡ Dual-Mode Storage Architecture**:
  - **Supabase Cloud**: PostgreSQL database, Supabase Auth, Row Level Security (RLS), and Storage Buckets.
  - **In-Memory Local Fallback**: Instant out-of-the-box local development with zero database setup required.

---

## 🏗️ Architecture & Project Structure

```
techscroll-ai/
├── api/                  # Vercel Serverless Function entry point
├── server/               # Express API Backend & AI Engine
│   ├── ai.ts             # Multi-provider AI analyzer (OpenAI / Claude / Deterministic engine)
│   ├── db.ts             # Database adapter (Supabase with in-memory fallback)
│   ├── index.ts          # Express REST API routes & middleware
│   ├── seed.ts           # Database seeder script
│   └── seed-data.ts      # Curated tech reels dataset
├── shared/
│   └── types.ts          # Single Source of Truth TypeScript interfaces & contracts
├── src/                  # React Frontend Application
│   ├── components/
│   │   ├── AIRecommendation.tsx  # Recommendation card & rationale inspector
│   │   ├── Dashboard.tsx         # Analytics and metrics overview
│   │   ├── InterestProfile.tsx   # Live developer interest breakdown
│   │   ├── LoginPage.tsx         # User authentication & mock bypass
│   │   ├── Navbar.tsx            # Navigation & header controls
│   │   ├── ReelAnalysis.tsx      # Reel metadata & AI classification drawer
│   │   ├── ReelsFeed.tsx         # Vertical video reel feed player
│   │   ├── SegmentedConfidence.tsx # Visual confidence indicator
│   │   └── VideoUploadModal.tsx  # Video upload modal with pillar presets
│   ├── lib/
│   │   └── supabase.ts   # Supabase client initializer
│   ├── api.ts            # Client-side API service layer
│   ├── App.tsx           # Main application view switcher
│   ├── index.css         # Global styles & Tailwind CSS tokens
│   └── main.tsx          # React application root
├── supabase/
│   └── migrations/
│       └── 01_init.sql   # PostgreSQL database schema, tables & RLS policies
├── .env.example          # Environment variables template
├── package.json          # Project dependencies & scripts
├── tsconfig.json         # TypeScript configuration
├── vercel.json           # Vercel deployment configuration
└── vite.config.ts        # Vite configuration
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide React |
| **Backend** | Node.js, Express, TypeScript (`tsx`), CORS, Zod, Dotenv |
| **AI / Inference** | OpenAI SDK (`gpt-4o-mini`), Anthropic Claude SDK (`claude-3-5-sonnet`), Deterministic Fallback Engine |
| **Database & Storage** | Supabase (PostgreSQL, Supabase Storage, Auth) + In-Memory Fallback Adapter |
| **Deployment** | Vercel Serverless Ready |

---

## 🚀 Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (version 18.0.0 or higher recommended)
- `npm` (version 9.0.0 or higher)

### 2. Clone the Repository

```bash
git clone https://github.com/ShadowKnight098/AIdashboard.git
cd AIdashboard
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` to configure your keys (all keys are optional for demo/local mode):

```env
# Backend Port
PORT=3001

# AI Provider Configuration (openai | claude | leave empty for built-in engine)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-key
# ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# Supabase Credentials (optional - falls back to in-memory store if not provided)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Vite Frontend API Base URL
VITE_API_BASE_URL=http://localhost:3001/api
```

### 5. (Optional) Setup Supabase Database

If using Supabase:
1. Create a new Supabase project.
2. Run the SQL script located at `supabase/migrations/01_init.sql` in your Supabase SQL Editor.
3. Seed initial reels into your Supabase database:
   ```bash
   npm run seed
   ```

### 6. Run the Application

Start both the backend server and frontend client concurrently:

```bash
npm run dev:all
```

Alternatively, run them separately:
```bash
# Terminal 1: Start Express API backend (Port 3001)
npm run server

# Terminal 2: Start Vite frontend (Port 5173)
npm run dev
```

Open your browser and navigate to **`http://localhost:5173`**.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/feed` | Retrieve the video feed with candidate recommendations |
| `POST` | `/api/interaction` | Record user interaction telemetry (watch time, like, save, share) |
| `POST` | `/api/analyze` | Request AI analysis for a specific reel |
| `POST` | `/api/infer-interest` | Trigger AI inference across recent interactions to update user profile |
| `POST` | `/api/recommend` | Compute next personalized reel recommendation with reasoning |
| `GET` | `/api/similar-reels/:id` | Fetch similar reels by category & difficulty |
| `GET` | `/api/reels` | Fetch all available reels |
| `POST` | `/api/reels` | Upload a new reel record |
| `GET` | `/api/dashboard` | Fetch user dashboard analytics and interest stats |
| `POST` | `/api/demo/reset` | Reset demo session and seed sample interactions |

---

## 📦 Scripts

- `npm run dev` — Start Vite development server
- `npm run server` — Start Express API with hot reloading (`tsx watch`)
- `npm run dev:all` — Start frontend and backend concurrently
- `npm run seed` — Seed initial curated reels into the database
- `npm run build` — Type-check and build the frontend bundle
- `npm run preview` — Preview the production build locally

---

## 🔒 License

Distributed under the MIT License. See `LICENSE` for more details.
