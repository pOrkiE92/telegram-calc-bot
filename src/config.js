import 'dotenv/config';
// Central place to read + validate environment variables.
// Fails fast on boot if something required is missing, instead of
// surfacing a confusing error later on the first webhook call.

const required = [
  'BOT_TOKEN',
  'WEBHOOK_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
];

for (const key of required) {
  if (!process.env[key]) {
    // eslint-disable-next-line no-console
    console.error(`[config] Missing required env var: ${key} (see .env.example)`);
    process.exit(1);
  }
}

export const config = {
  botToken: process.env.BOT_TOKEN,
  webhookSecret: process.env.WEBHOOK_SECRET,
  publicUrl: (process.env.PUBLIC_URL || '').replace(/\/+$/, ''), // strip trailing slash
  upstashUrl: process.env.UPSTASH_REDIS_REST_URL,
  upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  port: parseInt(process.env.PORT || '3000', 10),

  // Throttle tuning - matches the design doc (300ms leading+trailing lock)
  throttleMs: 300,
};

export const webhookPath = `/webhook/${config.webhookSecret}`;
