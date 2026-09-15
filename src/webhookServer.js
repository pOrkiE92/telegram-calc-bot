import express from 'express';
import { config, webhookPath } from './config.js';
import { handleUpdate } from './botLogic.js';

export function createServer() {
  const app = express();
  app.use(express.json());

  // Simple health check - handy for Railway/Fly health checks and for
  // sanity-checking the tunnel URL in dev.
  app.get('/', (req, res) => res.status(200).send('telegram-calc-bot: ok'));

  app.post(webhookPath, async (req, res) => {
    // Defense in depth: the secret is already in the URL path, but if
    // setWebhook was called with a secret_token, also check the header
    // Telegram sends on every request.
    const headerToken = req.get('X-Telegram-Bot-Api-Secret-Token');
    if (headerToken && headerToken !== config.webhookSecret) {
      return res.sendStatus(401);
    }

    // Always ack 200 quickly so Telegram doesn't queue/retry the update -
    // errors are logged, not surfaced back to Telegram as a webhook failure.
    res.sendStatus(200);

    try {
      await handleUpdate(req.body);
    } catch (err) {
      console.error('[webhook] error handling update:', err);
    }
  });

  return app;
}
