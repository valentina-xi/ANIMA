# How to Put ANIMA on GitHub

Follow these steps to upload this project to GitHub. Your files are already on your PC; you will **push** them to GitHub (not download).

---

## Step 1: Install Git (if needed)

- **Download:** https://git-scm.com/download/win  
- Run the installer (defaults are fine).  
- **Restart Cursor** (or your terminal) after installing so it picks up Git.

Check that it works: open a new terminal and run:

```bash
git --version
```

You should see something like `git version 2.x.x`.

---

## Step 2: Initialize Git and commit your files

Open a terminal in the **ANIMA** project folder (e.g. in Cursor: **Terminal → New Terminal**; it usually opens in the project root).

Run these commands **one at a time**:

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "Initial commit: ANIMA architecture and docs"
```

You now have a local Git repo with all your files committed.

---

## Step 3: Create a new repository on GitHub

1. Go to **https://github.com** and sign in.  
2. Click the **+** (top right) → **New repository**.  
3. **Repository name:** e.g. `ANIMA` (or `anima-app`).  
4. **Description (optional):** e.g. `Interactive Producer/Engineer Co-Pilot`.  
5. Choose **Private** or **Public**.  
6. **Do not** check “Add a README” or “Add .gitignore” (you already have them).  
7. Click **Create repository**.

GitHub will show you a page with setup commands. You’ll use the **remote URL** in the next step (e.g. `https://github.com/YOUR_USERNAME/ANIMA.git` or `git@github.com:YOUR_USERNAME/ANIMA.git`).

---

## Step 4: Connect your folder to GitHub and push

In the same terminal (still in the ANIMA folder), run (replace `YOUR_USERNAME` and `ANIMA` with your GitHub username and repo name):

```bash
git remote add origin https://github.com/YOUR_USERNAME/ANIMA.git
```

If your repo name is different, use that instead of `ANIMA` in the URL.

Then push your commits:

```bash
git branch -M main
git push -u origin main
```

- If GitHub asks for login, use your GitHub username and a **Personal Access Token** as the password (not your normal GitHub password). Create a token: GitHub → **Settings → Developer settings → Personal access tokens**.  
- If you use **GitHub Desktop**, you can do “Add existing repository” and point it to the ANIMA folder, then push from the app.

---

## Step 5: Confirm

Refresh your repository page on GitHub. You should see:

- `README.md`
- `ARCHITECTURE.md`
- `docs/` (with all the architecture docs)
- `.gitignore`

---

## Later: push updates

After you change files:

```bash
git add .
git commit -m "Short description of what you changed"
git push
```

That’s it. Your project is on GitHub.
