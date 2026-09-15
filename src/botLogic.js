import { config } from './config.js';
import { buildKeyboard } from './keyboard.js';
import { applyButton, renderText } from './calculator.js';
import {
  getExpr,
  setExpr,
  getMsgId,
  setMsgId,
  tryAcquireLock,
  markPending,
  popPending,
} from './state.js';
import { sendMessage, editMessageText, answerCallbackQuery } from './telegramApi.js';

/** /start (or any plain message): reset state and send a fresh calculator card. */
async function handleMessage(message) {
  const chatId = message.chat.id;
  await setExpr(chatId, '');
  const sent = await sendMessage(chatId, renderText(''), { reply_markup: buildKeyboard() });
  if (sent?.message_id) await setMsgId(chatId, sent.message_id);
}

async function renderNow(chatId, messageId, expr) {
  if (!messageId) return; // nothing to edit yet (shouldn't normally happen)
  await editMessageText(chatId, messageId, renderText(expr), {
    reply_markup: buildKeyboard(),
  });
}

/**
 * Leading + trailing throttle, per chat:
 * - First tap in a window renders immediately and takes a 300ms lock.
 * - Taps while locked only update Redis state and flag "pending".
 * - When the lock expires, if a tap was pending, render once more with
 *   whatever the latest state is - this is what catches up if several
 *   taps landed in the same window.
 */
async function handleCallback(callbackQuery) {
  const chatId = callbackQuery.message?.chat?.id;
  const messageId = callbackQuery.message?.message_id;
  const data = callbackQuery.data;
  if (!chatId || !data) return;

  // Keep Redis's copy of the message id fresh - the trailing render fires
  // from a setTimeout with no fresh callback to read it from.
  if (messageId) await setMsgId(chatId, messageId);

  const current = await getExpr(chatId);
  const { expr: newExpr, evalError } = applyButton(current, data);
  await setExpr(chatId, newExpr);

  // Always answer the callback so Telegram clears the button's loading spinner.
  await answerCallbackQuery(callbackQuery.id, evalError ? { text: 'Invalid expression' } : {});

  const acquired = await tryAcquireLock(chatId);
  if (acquired) {
    await renderNow(chatId, messageId, newExpr);
    scheduleTrailingCheck(chatId);
  } else {
    await markPending(chatId);
  }
}

function scheduleTrailingCheck(chatId) {
  setTimeout(async () => {
    try {
      const hadPending = await popPending(chatId);
      if (!hadPending) return;
      const [latestExpr, latestMsgId] = await Promise.all([getExpr(chatId), getMsgId(chatId)]);
      await renderNow(chatId, latestMsgId, latestExpr);
    } catch (err) {
      console.error('[throttle] trailing render failed:', err);
    }
  }, config.throttleMs);
}

/** Entry point for the webhook route. */
export async function handleUpdate(update) {
  if (update.callback_query) {
    await handleCallback(update.callback_query);
  } else if (update.message) {
    await handleMessage(update.message);
  }
}
