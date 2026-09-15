// Run manually whenever the public URL changes (new tunnel session, or
// first deploy to Railway/Fly):
//   npm run set-webhook

import { config, webhookPath } from '../src/config.js';
import { setWebhook, getWebhookInfo } from '../src/telegramApi.js';

if (!config.publicUrl) {
  console.error('PUBLIC_URL is not set in .env - set it to your tunnel or prod HTTPS URL first.');
  process.exit(1);
}

const url = `${config.publicUrl}${webhookPath}`;
console.log(`Setting webhook to: ${url}`);

const result = await setWebhook(url, config.webhookSecret);
if (result) {
  console.log('Webhook set successfully.');
} else {
  console.error('Failed to set webhook - see error above.');
  process.exit(1);
}

const info = await getWebhookInfo();
console.log('Current webhook info:', info);
