# 📦 Getting ANIMA into GitHub (Simple Guide)

You don't need to "download" anything - your code is already on your computer! We just need to upload it to GitHub.

## Step 1: Create a GitHub Account (If You Don't Have One)

1. Go to **[github.com](https://github.com)** and sign up (it's free!)
2. Choose a username (like "yourname" or "anima-music")
3. Verify your email

## Step 2: Create a New Repository on GitHub

1. After logging in, click the **"+"** button in the top right
2. Click **"New repository"**
3. Name it: `anima` (or whatever you like)
4. Make it **Public** (so Vercel can access it)
5. **DON'T** check "Initialize with README" (we already have files)
6. Click **"Create repository"**

## Step 3: Install GitHub Desktop (Easiest Way!)

**Option A: GitHub Desktop (Recommended - No Command Line!)**

1. Download **GitHub Desktop** from: [desktop.github.com](https://desktop.github.com)
2. Install it
3. Sign in with your GitHub account
4. Click **"File" → "Add Local Repository"**
5. Click **"Choose..."** and navigate to your project folder:
   ```
   C:\Users\v_LaurenBruzual\OneDrive - Everon LLC\Apps\src
   ```
6. Click **"Add Repository"**
7. You'll see all your files listed
8. At the bottom, type a message like: "Initial commit - ANIMA MVP"
9. Click **"Commit to main"**
10. Click **"Publish repository"** (top right)
11. Make sure it says "Publish to GitHub" and click **"Publish"**
12. ✅ Done! Your code is now on GitHub!

**Option B: Using Git Commands (If You Prefer)**

1. Install **Git** from: [git-scm.com](https://git-scm.com/download/win)
2. Open **Command Prompt** or **PowerShell**
3. Navigate to your project:
   ```bash
   cd "C:\Users\v_LaurenBruzual\OneDrive - Everon LLC\Apps\src"
   ```
4. Initialize git:
   ```bash
   git init
   ```
5. Add all files:
   ```bash
   git add .
   ```
6. Commit:
   ```bash
   git commit -m "Initial commit - ANIMA MVP"
   ```
7. Connect to GitHub (replace YOUR_USERNAME with your GitHub username):
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/anima.git
   ```
8. Push:
   ```bash
   git push -u origin main
   ```
9. Enter your GitHub username and password when asked
10. ✅ Done!

## Step 4: Connect GitHub to Vercel

1. Go to **[vercel.com](https://vercel.com)** and sign up (use "Continue with GitHub")
2. Click **"Add New Project"**
3. You'll see your GitHub repositories listed
4. Find **"anima"** (or whatever you named it) and click **"Import"**
5. Vercel will detect it's a Next.js app automatically
6. Click **"Deploy"** (but wait - we need to add Supabase keys first!)

## Step 5: Add Supabase Keys to Vercel

**Before clicking Deploy, add environment variables:**

1. In the Vercel project setup page, find **"Environment Variables"**
2. Click **"Add"** and add these two:

   **Variable 1:**
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: Your Supabase URL (from Supabase dashboard → Settings → API)
   - Click "Add"

   **Variable 2:**
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: Your Supabase service role key (from Supabase dashboard → Settings → API)
   - Click "Add"

3. **NOW** click **"Deploy"**
4. Wait 2-3 minutes...
5. 🎉 You'll get a URL like `anima-xxxxx.vercel.app`!

## Troubleshooting

**"Repository not found"**
- Make sure you made the repository Public (not Private)
- Make sure you're logged into the right GitHub account

**"Can't find my repository"**
- Refresh the Vercel page
- Make sure you clicked "Publish" in GitHub Desktop

**"Build failed"**
- Check that you added both Supabase environment variables
- Make sure your Supabase project is set up (see DEPLOYMENT.md)

## What Files Are Being Uploaded?

All the files in your `Apps/src` folder:
- ✅ All the code files (`.ts`, `.tsx` files)
- ✅ Configuration files (`package.json`, `tsconfig.json`, etc.)
- ✅ The `.env.example` file (but NOT `.env` - that stays local for security!)

## Need Help?

- GitHub Desktop help: [help.github.com/desktop](https://help.github.com/desktop)
- Vercel help: [vercel.com/docs](https://vercel.com/docs)

You've got this! 🚀
