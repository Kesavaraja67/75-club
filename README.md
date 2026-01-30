# 📚 The Bunk Planner

**The Bunk Planner** is a smart attendance management application designed for students to track their classes, calculate safe bunks, and maintain their attendance above the critical 75% threshold.

Built with a **Neo-Brutalist** design aesthetic, it combines bold visuals with powerful tracking features.

![The Bunk Planner](public/icon.png)

## 🚀 Features

- **📊 Smart Dashboard**: visualizes attendance percentage, safe bunks calculation, and status alerts.
- **📸 AI Timetable Scan**: Upload a screenshot of your college timetable/portal, and our OCR + AI engine (Tesseract.js + Gemini Flash) automatically imports your subjects and schedule.
- **📅 Interactive Calendar**: View your attendance history and predict future attendance percentages (Pro Feature).
- **🤖 AI Buddy**: Get personalized advice on when to bunk and when to attend.
- **💸 Pro Subscription**: Integrated with **Razorpay** for payment processing to unlock premium features.
- **📱 PWA Ready**: Installable on Desktop and Mobile. Works offline and feels like a native app.
- **📱 Responsive Design**: Fully optimized for mobile and desktop use.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with Neo-brutalist custom theme.
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL + Auth).
- **AI/OCR**: [Google Gemini 1.5 Flash](https://ai.google.dev/) & [Tesseract.js](https://tesseract.projectnaptha.com/).
- **Payments**: [Razorpay](https://razorpay.com/) (UPI, Cards, Netbanking).
- **Icons**: [Lucide React](https://lucide.dev/).
- **Toast**: [Sonner](https://sonner.emilkowal.ski/).

## ⚙️ Local Development Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/yourusername/the-bunk-planner.git
    cd the-bunk-planner
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Environment Variables:**
    Create a `.env.local` file in the root directory and add the following keys:

    ```bash
    # Supabase (Database & Auth)
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

    # Gemini AI (For AI Buddy & Scan)
    GEMINI_API_KEY=your_gemini_api_key

    # Razorpay (Payments)
    NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
    RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxx
    RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

    # App Config
    NEXT_PUBLIC_APP_URL=http://localhost:3000
    ```

4.  **Database Setup:**
    Run the SQL migrations found in `supabase_payment_migration.sql` and `update_subscription_tiers.sql` in your Supabase SQL Editor to set up the necessary tables (`payment_orders`, `subscriptions`, `user_profiles`, etc.).

5.  **Run the development server:**

    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) to view the app.

## 🚢 Deployment

This project is optimized for deployment on **Vercel**.

1.  Push your code to GitHub.
2.  Import the project in Vercel.
3.  Add the Environment Variables in the Vercel Dashboard.
4.  Deploy!
5.  **Webhooks**: After deployment, configure the Razorpay Webhook URL to `https://your-domain.com/api/payment/webhook` to handle payment success events reliably.

## 📄 License

This project is licensed under the MIT License.

---

_Built with ❤️ to save your semester._
