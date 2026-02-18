# 🚀 Deploying ANIMA to the Web

This guide will help you put ANIMA online so anyone can use it in their browser!

## Step 1: Set Up Supabase (Free Cloud Storage)

ANIMA needs a place to store projects and audio files. We'll use Supabase (it's free!).

1. **Go to [supabase.com](https://supabase.com)** and sign up (free account)
2. **Create a new project:**
   - Click "New Project"
   - Name it "anima" (or whatever you like)
   - Choose a password (save it!)
   - Pick a region close to you
   - Click "Create new project" (takes 2 minutes)

3. **Get your keys:**
   - Go to Settings → API
   - Copy the "Project URL" (looks like `https://xxxxx.supabase.co`)
   - Copy the "service_role" key (the long secret one - keep it safe!)

4. **Set up the database:**
   - Go to SQL Editor
   - Click "New Query"
   - Paste this SQL and run it:

```sql
-- Create the main database table
CREATE TABLE IF NOT EXISTS anima_db (
  id TEXT PRIMARY KEY DEFAULT 'main',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('anima-assets', 'anima-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policy (allow uploads/downloads)
CREATE POLICY IF NOT EXISTS "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'anima-assets');

CREATE POLICY IF NOT EXISTS "Public Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'anima-assets');
```

## Step 2: Add Your Keys to the Project

1. **Copy `.env.example` to `.env`:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` and add your Supabase keys:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

## Step 3: Deploy to Vercel (Easiest Way!)

1. **Push your code to GitHub:**
   - Create a new repository on GitHub
   - Push your code there

2. **Go to [vercel.com](https://vercel.com)** and sign up (free)

3. **Import your project:**
   - Click "Add New Project"
   - Select your GitHub repository
   - Vercel will detect it's a Next.js app automatically

4. **Add environment variables:**
   - In the project settings, go to "Environment Variables"
   - Add:
     - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
     - `SUPABASE_SERVICE_ROLE_KEY` = your service role key

5. **Deploy!**
   - Click "Deploy"
   - Wait 2-3 minutes
   - You'll get a URL like `anima-xxxxx.vercel.app` 🎉

## Alternative: Deploy to Other Platforms

### Netlify
1. Sign up at [netlify.com](https://netlify.com)
2. Connect your GitHub repo
3. Build command: `npm run build`
4. Publish directory: `.next`
5. Add environment variables in site settings

### Railway
1. Sign up at [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Add environment variables
4. Deploy!

## Testing Locally First (Optional)

If you want to test before deploying:

1. Install Node.js from [nodejs.org](https://nodejs.org)
2. In your project folder, run:
   ```bash
   npm install
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser

## Troubleshooting

**"Storage bucket not found"**
- Make sure you ran the SQL commands in Supabase
- Check the bucket name is exactly `anima-assets`

**"Environment variables missing"**
- Double-check your `.env` file (local) or Vercel settings (deployed)
- Make sure `NEXT_PUBLIC_SUPABASE_URL` starts with `https://`

**"Can't connect to Supabase"**
- Check your internet connection
- Verify your Supabase project is running (check dashboard)

## What Happens After Deployment?

Once deployed, ANIMA will:
- ✅ Store all projects in Supabase (cloud database)
- ✅ Store all audio files in Supabase Storage
- ✅ Work for anyone with the URL (no installation needed!)
- ✅ Save everything safely in the cloud

## Need Help?

If you get stuck, check:
- Supabase logs (Dashboard → Logs)
- Vercel deployment logs (Project → Deployments → Click a deployment)
- Browser console (F12 → Console tab)

You've got this! 🎵✨
