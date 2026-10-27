# Ringcraft

Round-by-round boxing analysis. Log your rounds on a judge-style scorecard, or import a CSV from your tracker. Ringcraft shows where your energy went, flags what to fix, and an AI coach writes you a plan for your next session.

Built with **Next.js**, the **AI SDK** and **Vercel AI Gateway**, deployed on **Vercel**.

## Deploy it (no coding needed)

1. **Put the code on GitHub.** Create a free account at github.com, click **New repository**, name it `ringcraft`, then click **Create repository**. On the next screen click **uploading an existing file**. Drag in everything *inside* this folder (the `app`, `components` and `lib` folders plus the loose files), then click **Commit changes**.
2. **Deploy on Vercel.** Sign up at vercel.com using **Continue with GitHub** (the Hobby plan is free). Click **Add New → Project**, pick `ringcraft`, and click **Deploy**. Vercel detects Next.js by itself. After about a minute you get a live link like `ringcraft-yourname.vercel.app`.
3. **Switch on the AI coach.** In your Vercel dashboard, open the **AI Gateway** tab once. On Vercel the coach signs in to the gateway automatically, so there is no API key to paste. You get $5 of free AI Gateway credit every 30 days, which covers a lot of coaching requests. If the coach says it is not connected, go to **Deployments**, open the latest one, and click **Redeploy**.
4. **Share it.** Open your link, press **Get coaching** on the sample session, then clear it and log your own.

From now on, every change you commit on GitHub redeploys automatically, and each change gets its own preview link before it goes live.

## Run it on your own computer (optional)

You need Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local   # then paste an AI Gateway API key into it
npm run dev                  # open http://localhost:3000
```

Create the key in the Vercel dashboard under **AI Gateway → API Keys**.

## How the numbers work

| Number | How it is worked out |
| --- | --- |
| Missed | What you typed, or thrown minus landed if you leave it blank |
| Accuracy | Landed ÷ thrown |
| Punches per minute | Thrown ÷ round length in minutes |
| Heartbeats per landed punch | Average heart rate × round minutes ÷ punches landed. The energy price of each scoring shot: lower is better |
| Early vs late | The first half of your rounds against the second half (the middle round is skipped when there is an odd number) |

The quick-read rules and their thresholds live in `lib/insights.js`. Tune them as you learn what normal looks like for you.

Accuracy, shot selection and ring position are only judged for sparring and fights, because bag, pad and shadow work have no live opponent.

## Importing tracker data

Click **Download template** to get a CSV with these columns:

`round, duration, thrown, landed_head, landed_body, missed, avg_hr, max_hr, breaths_per_min, defensive_moves, ring_position`

Only `thrown` is required. Ringcraft also understands common alternatives (for example `Punches Thrown`, `Head Shots`, `Average Heart Rate`). Add more column names in `lib/csv.js` when you meet a new export format.

## Change the AI model

In Vercel go to **Settings → Environment Variables** and add `AI_MODEL` with any model ID from the AI Gateway model list (for example `anthropic/claude-sonnet-4.6`), then redeploy.

## Where things live

| File | What it does |
| --- | --- |
| `app/page.jsx` | The page |
| `components/RingcraftApp.jsx` | Session setup, import and export, saving to the browser |
| `components/Scorecard.jsx` | The editable scorecard |
| `components/Insights.jsx` | The quick read |
| `components/Coach.jsx` | The AI coach panel |
| `components/Charts.jsx` | The three charts (plain SVG, no chart library) |
| `app/api/coach/route.js` | Sends the session to the AI model through AI Gateway |
| `lib/metrics.js` | All the maths |
| `lib/insights.js` | The quick-read rules |
| `lib/csv.js` | CSV import and the template |
| `lib/sample.js` | The sample sparring session |

## Ideas for version 2

- Pull data straight from a tracker's API instead of a CSV export.
- Count punches and spot a dropped guard from phone video with pose estimation.
- Accounts and session history with a database from the Vercel Marketplace, so you can see trends across weeks.
- Let boxers ask the coach follow-up questions in a chat.
- A shareable link for each session to send to your coach.
