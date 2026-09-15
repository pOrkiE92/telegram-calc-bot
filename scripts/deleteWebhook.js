// npm run delete-webhook
import { deleteWebhook } from '../src/telegramApi.js';

const result = await deleteWebhook();
console.log(result !== null ? 'Webhook deleted.' : 'Failed to delete webhook - see error above.');
