// All per-chat state lives in Redis (Upstash REST client) instead of an
// in-memory Map, so it stays consistent across multiple bot instances.
//
// Keys (as per the design doc):
//   chat:{id}:expr    -> current expression string
//   chat:{id}:msgid   -> message_id of the calculator message we keep editing
//   chat:{id}:lock    -> throttle cooldown marker, TTL 300ms
//   chat:{id}:pending -> "a tap arrived while locked" flag for the trailing render

import { Redis } from '@upstash/redis';
import { config } from './config.js';

const redis = new Redis({
  url: config.upstashUrl,
  token: config.upstashToken,
});

const IDLE_TTL_SECONDS = 60 * 60; // expire idle chat state after 1h so Redis doesn't grow forever

export async function getExpr(chatId) {
  const v = await redis.get(`chat:${chatId}:expr`);
  return v == null ? '' : String(v);
}

export async function setExpr(chatId, expr) {
  await redis.set(`chat:${chatId}:expr`, expr, { ex: IDLE_TTL_SECONDS });
}

export async function getMsgId(chatId) {
  return await redis.get(`chat:${chatId}:msgid`);
}

export async function setMsgId(chatId, msgId) {
  await redis.set(`chat:${chatId}:msgid`, msgId, { ex: IDLE_TTL_SECONDS });
}

/**
 * Try to acquire the per-chat throttle lock.
 * Uses SET NX PX so only the first tap in a window wins the lock -
 * that instance is the one responsible for the render + the trailing check.
 * Returns true if the lock was acquired (i.e. this is the "leading" tap).
 */
export async function tryAcquireLock(chatId) {
  const res = await redis.set(`chat:${chatId}:lock`, '1', {
    nx: true,
    px: config.throttleMs,
  });
  return res === 'OK' || res === true;
}

/** Mark that a tap arrived while the lock was held, so the trailing check re-renders. */
export async function markPending(chatId) {
  // small safety margin over the lock TTL in case of scheduling jitter
  await redis.set(`chat:${chatId}:pending`, '1', { px: config.throttleMs + 500 });
}

/** Read + clear the pending flag. Returns true if there was a pending tap. */
export async function popPending(chatId) {
  const key = `chat:${chatId}:pending`;
  const v = await redis.get(key);
  if (v) await redis.del(key);
  return !!v;
}

export default redis;
