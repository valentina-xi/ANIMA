# How to Run ANIMA

Two ways: **in the browser (no installs)** or **on your laptop (Node.js)**.

---

## Can't install anything? Use the browser only

**→ See [docs/RUN-IN-BROWSER.md](docs/RUN-IN-BROWSER.md)** for Replit, StackBlitz, and GitHub Codespaces. You can build and run ANIMA 100% in the browser — no Node.js, no Git, no installs.

---

## If you can install Node.js (local run)

---

## Step 1: Install Node.js (Free)

ANIMA is a web app built with Node.js. You need Node.js to run it.

1. **Download Node.js:** https://nodejs.org/
   - Choose the **LTS version** (e.g. "20.x.x LTS" or "22.x.x LTS")
   - Download the Windows installer (.msi)
   - Run the installer (use default settings)

2. **Verify it worked:**
   - Open a new terminal (PowerShell or Command Prompt)
   - Run: `node --version`
   - You should see something like `v20.x.x` or `v22.x.x`
   - Also run: `npm --version` (should show `10.x.x` or similar)

---

## Step 2: Set Up the Project

1. **Open a terminal** in your ANIMA folder:
   - In Cursor: **Terminal → New Terminal** (usually opens in project root)
   - Or open PowerShell/Command Prompt and navigate:
     ```bash
     cd "c:\Users\v_LaurenBruzual\OneDrive - Everon LLC\Apps\Projects\ANIMA"
     ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   This downloads all the libraries ANIMA needs (React, Vite, etc.). It may take a few minutes.

---

## Step 3: Run the Development Server

After `npm install` finishes, run:

```bash
npm run dev
```

You should see output like:
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**Open your browser** and go to: **http://localhost:5173/**

You should see the ANIMA app (or a blank page if you haven't built the UI yet).

**To stop the server:** Press `Ctrl+C` in the terminal.

---

## Step 4: Start Building (Follow the Docs)

Now you can start coding! Follow the architecture docs:

1. Read **[ARCHITECTURE.md](ARCHITECTURE.md)** for overview
2. Read **[docs/03-TECH-STACK.md](docs/03-TECH-STACK.md)** for tech setup
3. Follow **[docs/08-MVP-IMPLEMENTATION.md](docs/08-MVP-IMPLEMENTATION.md)** for build order

The dev server will **auto-reload** when you save files, so you can see changes instantly.

---

## Alternative: Use GitHub Codespaces (Free, No Install)

If you can't install Node.js, you can use **GitHub Codespaces** (free tier):

1. Create a GitHub account (free)
2. Create a new repository on GitHub (even empty is fine)
3. Upload your files via GitHub web interface (drag & drop)
4. Open the repo → **Code → Codespaces → Create codespace**
5. It runs in your browser — no install needed!

**Note:** You still need a GitHub account, but you don't need to install Git on your laptop.

---

## Alternative: Use Replit (Free, No Install)

1. Go to **https://replit.com** (free account)
2. Create a new **Repl** → choose "Node.js" or "Vite + React"
3. Upload your files (drag & drop or copy/paste)
4. Run `npm install` then `npm run dev` in Replit's terminal
5. Replit will give you a URL to view your app

---

## Alternative: Use VS Code Dev Containers (If You Have Docker)

If you have Docker Desktop installed, you can use VS Code Dev Containers to run everything in a container (no local Node.js install needed).

---

## Backing Up Without Git

If you want to back up your work without Git:

1. **OneDrive:** Your files are already syncing to OneDrive (since they're in OneDrive folder)
2. **Google Drive / Dropbox:** Copy the ANIMA folder to another cloud drive
3. **USB drive:** Copy the folder to a USB stick periodically
4. **Email yourself:** Zip the folder and email it as backup

---

## Troubleshooting

**"npm is not recognized"**
- Node.js isn't installed or isn't in your PATH
- Restart your terminal after installing Node.js
- Or reinstall Node.js and check "Add to PATH" during install

**"Port 5173 already in use"**
- Another app is using that port
- Change the port: `npm run dev -- --port 3000`

**"Cannot find module"**
- Run `npm install` again
- Delete `node_modules` folder and `package-lock.json`, then run `npm install`

---

## Next Steps

Once the dev server is running, start building per **[docs/08-MVP-IMPLEMENTATION.md](docs/08-MVP-IMPLEMENTATION.md)**.
