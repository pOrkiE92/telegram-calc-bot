// Minimal Telegram Bot API client. Deliberately not using a library so we
// have full control over the retry_after (429) handling from the design doc.

import { config } from './config.js';

const BASE = `https://api.telegram.org/bot${config.botToken}`;

/**
 * Call a Telegram Bot API method. On HTTP 429, waits the amount of time
 * Telegram tells us (parameters.retry_after) and retries once - it does not
 * spam retries, and does not retry on other error types (bad request, etc).
 */
async function call(method, payload, { allowRetry = true } = {}) {
  const res = await fetch(`${BASE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (res.status === 429 && allowRetry) {
    const retryAfterSec = data?.parameters?.retry_after ?? 1;
    console.warn(`[telegram] 429 on ${method}, retrying after ${retryAfterSec}s`);
    await sleep((retryAfterSec + 0.1) * 1000);
    // Only retry once - if we get flood-controlled twice in a row for the
    // same call, better to drop it than to cascade retries under load.
    return call(method, payload, { allowRetry: false });
  }

  if (!data || data.ok !== true) {
    console.error(`[telegram] ${method} failed:`, data?.description || res.status);
    return null;
  }

  return data.result;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function sendMessage(chatId, text, options = {}) {
  return call('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    ...options,
  });
}

export function editMessageText(chatId, messageId, text, options = {}) {
  return call('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'Markdown',
    ...options,
  });
}

export function answerCallbackQuery(callbackQueryId, options = {}) {
  // Fire-and-forget from the caller's perspective, but still goes through
  // the same retry_after handling as everything else.
  return call('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...options,
  });
}

export function setWebhook(url, secretToken) {
  return call('setWebhook', {
    url,
    allowed_updates: ['message', 'callback_query'],
    ...(secretToken ? { secret_token: secretToken } : {}),
  });
}

export function deleteWebhook() {
  return call('deleteWebhook', {});
}

export function getWebhookInfo() {
  return call('getWebhookInfo', {});
}
