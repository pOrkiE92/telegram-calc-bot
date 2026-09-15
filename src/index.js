import { config, webhookPath } from './config.js';
import { createServer } from './webhookServer.js';

const app = createServer();

app.listen(config.port, () => {
  console.log(`[server] listening on port ${config.port}`);
  console.log(`[server] webhook path: ${webhookPath}`);
  if (config.publicUrl) {
    console.log(`[server] expected webhook URL: ${config.publicUrl}${webhookPath}`);
  } else {
    console.log('[server] PUBLIC_URL not set - set it in .env, then run "npm run set-webhook"');
  }
});
