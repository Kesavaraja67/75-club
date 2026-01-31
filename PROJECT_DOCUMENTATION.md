# 📘 75 Club - Project Documentation

## 1. Project Overview

**75 Club** is an advanced, AI-powered attendance management web application designed to help students optimize their academic attendance. The core philosophy is **"Safe Bunking"**—allowing students to calculate exactly how many classes they can skip without falling below the critical attendance threshold (usually 75%).

The application features a modern **Neo-Brutalist** design system, ensuring a high-impact, user-friendly interface that feels premium and engaging.

## 2. Architecture & Tech Stack

The application is built on a modern serverless architecture optimized for performance, scalability, and security.

### 🛠️ Technology Stack

- **Frontend Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/UI (Neo-Brutalist Theme)
- **Database & Auth**: Supabase (PostgreSQL)
- **AI Engine**: Google Gemini 1.5 Flash (via REST API)
- **OCR Engine**: Tesseract.js (Client-side)
- **Payments**: Razorpay (Indian Payment Gateway)
- **Rate Limiting**: In-memory Token Bucket (Server-side)

### 🏗️ Architecture Diagram

```mermaid
graph TD
    Client[Client (PWA)] -->|Next.js Auth| SupabaseAuth[Supabase Auth]
    Client -->|App Router API| NextAPI[Next.js API Routes]
    Client -->|OCR| Tesseract[Tesseract.js (Browser)]

    subgraph "Backend Services"
        NextAPI -->|Rate Limit| RateLimiter[In-Memory Rate Limiter]
        NextAPI -->|Data| SupabaseDB[Supabase DB (PostgreSQL)]
        NextAPI -->|AI Logic| Gemini[Google Gemini AI]
        NextAPI -->|Payment| Razorpay[Razorpay API]
    end
```

## 3. Key Features

### 📊 Intelligence Dashboard

- **Real-time Stats**: Instantly see current attendance %, hours present/total.
- **Bunk Calculator**: "You can safely bunk 3 more classes" or "Attend next 2 classes to reach 75%".
- **Visual Indicators**: Color-coded status (Safe/Danger/Critical).

### 🤖 AI-Powered Timetable Scan

Instead of manual entry, users can upload a screenshot of their college portal.

- **OCR + Parsing**: Extracts raw text using Tesseract.js.
- **Intelligent Parsing**: Custom logic in `api/scan` identifies subject codes, names, total hours, and attended hours, handling various portal formats (SRM, etc.).
- **Privacy Focused**: PII is stripped/gated before logging.

### 📅 Smart Timetable & Calendar

- **Weekly Schedule**: Manage classes by day and time.
- **Conflict Detection**: Prevents overlapping slots.
- **Pro Feature**: Time-aware advice (e.g., "Math is starting in 10 mins!").

### 💬 AI Buddy (Pro)

- **Contextual Chat**: Uses Gemini 1.5 Flash.
- **System Prompt**: The AI knows the user's _exact_ attendance context and _current_ timetable interactively.
- **Persona**: Acts as a "Chill College Buddy".

## 4. Technical Implementation Details

### 🛡️ Security & Rate Limiting

To prevent abuse and ensure stability, we implemented a custom in-memory rate limiter (`lib/rate-limit.ts`).

| Endpoint              | Limit      | Purpose                            |
| :-------------------- | :--------- | :--------------------------------- |
| `/api/scan`           | 5 req/min  | Prevent heavy OCR processing abuse |
| `/api/scan-timetable` | 5 req/min  | Prevent timetable scanning spam    |
| `/api/chat`           | 20 req/min | Prevent AI token exhaustion        |
| `/api/payment/*`      | 5 req/min  | Prevent payment initiation spam    |

### 💳 Subscription Model (Razorpay)

The app runs on a Freemium model managed via `lib/subscription.ts`.

- **Free Tier**: Limited to 4 subjects, basic stats.
- **Pro Tier (₹249/sem)**: Unlimited subjects, AI Scan, AI Buddy, Calendar.
- **Security**: Payment verification happens server-side (`api/payment/verify`) using crypto signature checks.

### 🧠 Pattern Recognition (Regex)

The OCR parsers use hardened Regex patterns to extract data safely:

- **ReDoS Protection**: Dynamic user input is never used directly in RegExp constructors.
- **Format Handling**: Supports multiple formats (Subject names, "12/40" hours, "75%" strings).

## 5. Database Schema (Supabase)

### `subjects` Table

Stores individual course data.

- `id` (UUID), `user_id` (FK)
- `name`, `code`
- `total_hours`, `hours_present`
- `threshold` (default 75)

### `timetable_slots` Table

Stores the weekly schedule.

- `id` (UUID), `user_id` (FK)
- `subject_id` (FK -> subjects)
- `day_of_week` (0-6)
- `start_time`, `end_time`

### `subscriptions` Table

Tracks user plan status.

- `user_id` (PK, FK)
- `plan_type` ('pro', 'free')
- `status` ('active', 'expired')
- `current_period_end` (Timestamp)

## 6. Project Structure

```text
/app
  /api              # Server-side API Routes (Scan, Chat, Payment)
  /dashboard        # Main App UI (Protected Routes)
  /login            # Auth Pages
/components
  /ui               # Reusable primitives (Buttons, Cards - shadcn)
  /scan             # OCR Components
  /calendar         # Calendar Views
/lib
  subscription.ts   # Plan logic
  rate-limit.ts     # Security logic
  razorpay.ts       # Payment config
```

## 7. Setup & Deployment Guide

### Local Development

1.  **Clone**: `git clone <url>`
2.  **Install**: `npm install`
3.  **Env Setup**: Copy `.env.example` to `.env.local` and fill via [Supabase/Gemini/Razorpay dashboards].
4.  **Run**: `npm run dev`

### Production Deployment (Vercel)

1.  **Build**: `npm run build` (Ensures Type safety & Linting pass).
2.  **Env Vars**: Add **all** production keys to Vercel Project Settings.
3.  **Deploy**: Push to `main` branch.
4.  **Webhooks**: Configure Razorpay Webhooks to point to your live URL.

## 8. Recent Enhancements (Changelog)

- **Security**: Fixed potential ReDoS in timetable parser; added payload size limits.
- **Privacy**: Gated all PII logs (OCR text) to development mode only.
- **UX**: Improved Upgrade Dialog with feature highlighting; added "Unlimited" text for Pro users.
- **Reliability**: Added extensive error handling for AI and Payment APIs.

---

_Generated automatically by Agent Antigravity_
