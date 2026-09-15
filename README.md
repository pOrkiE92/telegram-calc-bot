# Telegram Calculator Bot

Scientific calculator over an inline keyboard. Webhook-based, state in Redis
(Upstash) instead of an in-memory `Map`, per-chat leading+trailing throttle,
`retry_after`-aware on Telegram 429s. Replaces the old Map + long-polling
version.

## Project layout

```
src/
  config.js        env vars, fails fast if something required is missing
  state.js         Redis (Upstash) state: expr, msgid, throttle lock/pending
  telegramApi.js   sendMessage / editMessageText / answerCallbackQuery, 429 retry
  keyboard.js      inline keyboard layout
  calculator.js    apply a button press to the expression, mathjs evaluate
  botLogic.js       message + callback handling, the throttle itself
  webhookServer.js Express app, POST /webhook/:secret
  index.js         entry point
scripts/
  setWebhook.js    registers PUBLIC_URL + webhookPath with Telegram
  deleteWebhook.js removes the webhook
```

## 1. Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:
- `BOT_TOKEN` — from @BotFather
- `WEBHOOK_SECRET` — random string, forms part of the webhook URL. Generate with:
  `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — from the Upstash console, REST API section (you said this is already confirmed working)
- `PUBLIC_URL` — set this after you start a tunnel or deploy (step 2/3 below)

## 2. Dev on Termux (tunnel)

```bash
npm start
```

In a second Termux session, start a tunnel to the same port (default 3000)
and grab the HTTPS URL it gives you:

```bash
# Cloudflare Tunnel
cloudflared tunnel --url http://localhost:3000

# or ngrok
ngrok http 3000
```

Put that HTTPS URL in `.env` as `PUBLIC_URL` (no trailing slash), then register it:

```bash
npm run set-webhook
```

Message your bot — `/start` should reply with the calculator keyboard.
Every time the tunnel URL changes (new `cloudflared`/`ngrok` session),
update `PUBLIC_URL` and re-run `npm run set-webhook`.

## 3. Production (Railway / Fly.io)

1. Push this project to a repo, connect it in Railway or Fly.
2. Set the same env vars from `.env` in the platform's dashboard/secrets
   (`PORT` is usually injected automatically — leave it out or let the
   platform override it).
3. Once deployed, set `PUBLIC_URL` to the platform's HTTPS domain and run
   `npm run set-webhook` (from your machine, pointing at the same `.env`
   values, or as a one-off command on the platform).

Both platforms keep the process running 24/7, so the `setTimeout`-based
trailing render in the throttle works the same as in dev — no serverless
cold-start gap to worry about.

## How the throttle works

Per chat, in Redis:

- `chat:{id}:expr` — current expression
- `chat:{id}:msgid` — id of the calculator message to edit
- `chat:{id}:lock` — throttle cooldown marker, `SET NX PX 300`
- `chat:{id}:pending` — set when a tap arrives while locked

Flow on every button tap:
1. Update `expr` in Redis right away (so state is never lost, no matter what).
2. Try to acquire the lock (`NX`, 300ms TTL).
   - **Acquired** (first tap in the window): render immediately, then
     schedule a check for 300ms later.
   - **Not acquired** (still inside someone else's window): just mark
     `pending`, don't render.
3. When the 300ms check fires: if `pending` was set, render once more using
   whatever `expr` is *now* — this catches up to the latest state even if
   several taps landed inside the same window, without rendering once per tap.

This is safe across multiple instances because the lock and the state both
live in Redis — whichever instance wins the `NX` lock renders and owns the
trailing check; every other instance just writes state and answers the
callback query so the button's loading spinner clears.

## Notes

- `editMessageText` calls that don't actually change the text return a
  harmless "message is not modified" error from Telegram — logged, not fatal.
- `answerCallbackQuery` is always called, even on the throttled/non-rendering
  path, so the tapped button doesn't sit in the loading state.
- mathjs errors (e.g. `sin(` with no closing paren) leave the expression
  untouched on `=` and show a small toast instead of corrupting state.
