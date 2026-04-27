# Apply-thon

A personal job application tracker with AI-powered resume tailoring, cover letters, and cold emails — all running locally on your machine.

![Dashboard showing job cards with status badges and AI action buttons]

---

## What it does

- **Track applications** — add jobs by pasting a URL (Greenhouse, Ashby, LinkedIn) or entering details manually
- **Tailor your resume** — Claude rewrites your base resume to match each job's keywords while keeping your real experience intact
- **Generate cover letters & cold emails** — one click, specific to the role and company
- **Download ready-to-send PDFs** — named `resume-{company}-{role}.pdf`

---

## Prerequisites

You need four things installed before you start:

| Tool | What it's for | Install |
|------|--------------|---------|
| Python 3.11+ | Backend server | [python.org](https://python.org) |
| Node.js 18+ | Frontend | [nodejs.org](https://nodejs.org) |
| Claude Code | AI (uses your existing subscription) | `npm install -g @anthropic-ai/claude-code` |
| MacTeX / TeX Live | Compiling resumes to PDF | `brew install --cask mactex` |
| pandoc | Converting your DOCX resume to LaTeX | `brew install pandoc` |

> **macOS only for now.** On Linux, replace `brew install --cask mactex` with your distro's TeX Live package.

---

## Setup

**1. Clone or download the project**

```bash
cd ~/Desktop/Apply-thon
```

**2. Install Python dependencies**

```bash
pip install -r backend/requirements.txt
```

**3. Install frontend dependencies**

```bash
cd frontend && npm install && cd ..
```

That's it — no database setup, no environment variables, no accounts needed.

---

## Running the app

```bash
./start.sh
```

This starts both servers:
- **Backend API** → `http://localhost:8000`
- **Dashboard** → `http://localhost:5173` ← open this in your browser

---

## First-time setup

### 1. Upload your resume

Click **Upload Resume** in the top-right corner and upload your resume as a `.docx` file. It gets converted to LaTeX internally — this is what Claude edits when tailoring for each job.

> You only need to do this once. Your original file is never modified.

### 2. Add your first job

Click **+ Add Job** and paste a job posting URL:

```
https://boards.greenhouse.io/stripe/jobs/12345
https://jobs.ashbyhq.com/linear/abc-123
https://www.linkedin.com/jobs/view/12345
```

The app fetches the company name, role, and full job description automatically. For LinkedIn (which blocks scrapers), use the **Manual Entry** tab and paste the job description yourself.

### 3. Tailor and apply

Open any job card to see the detail panel. From here you can:

- **Re-tailor with AI** — generates a version of your resume optimized for this role (~30–60 seconds)
- **Cover Letter** — writes a 3-paragraph cover letter specific to the company
- **Cold Email** — writes a short outreach email (<150 words)
- **Download Resume** — saves as `resume-{company}-{role}.pdf`

All generated text is editable before you use it.

---

## Project structure

```
Apply-thon/
├── backend/          # Python + FastAPI (API server)
├── frontend/         # React + Vite (dashboard UI)
├── resumes/
│   ├── base/         # Your converted LaTeX resume
│   └── tailored/     # One PDF per job application
├── apply_thon.db     # SQLite database (created on first run)
└── start.sh          # Starts both servers
```

---

## Tips

- **Status tracking** — update a job's status (Saved → Applied → Interview → Offer / Rejected) directly from the detail panel
- **Notes** — use the notes field to track recruiter names, interview rounds, or follow-up dates
- **Edit LaTeX** — if the tailored resume has a formatting issue, click "Edit LaTeX" to fix it and recompile without re-running AI
- **Regenerate anytime** — cover letters and cold emails can be regenerated as many times as you want; each run overwrites the previous version

---

## Troubleshooting

**Backend won't start**
```bash
cd backend && python3 -m uvicorn main:app --reload --port 8000
```
Check the terminal output for missing packages — run `pip install -r requirements.txt` again.

**Resume PDF not generating**
Make sure `pdflatex` is in your PATH:
```bash
which pdflatex   # should print a path
```
If not, restart your terminal after installing MacTeX, or run `sudo tlmgr update --self`.

**LinkedIn jobs not fetching**
LinkedIn blocks automated requests. Use **Manual Entry** → paste the job description from the LinkedIn page.

**Claude isn't responding**
Make sure you're logged in to Claude Code:
```bash
claude --version   # should print a version number
```
