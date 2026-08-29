import redis from '../../../infrastructure/cache/redisClient.js';
import logger from '../../../config/logger.js';

const TTL_SECONDS = 24 * 60 * 60; // 24h
const PREFIX = 'chatbot';

function key(companyId, phone) {
  return `${PREFIX}:${companyId}:${phone}`;
}

export async function setFlowState(companyId, phone, state) {
  try {
    await redis.set(key(companyId, phone), JSON.stringify({ ...state, updatedAt: new Date().toISOString() }), { EX: TTL_SECONDS });
    return true;
  } catch (error) {
    logger.error({ error: error.message }, 'Redis setFlowState failed');
    return false;
  }
}

export async function getFlowState(companyId, phone) {
  try {
    const raw = await redis.get(key(companyId, phone));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    logger.error({ error: error.message }, 'Redis getFlowState failed');
    return null;
  }
}

export async function clearFlowState(companyId, phone) {
  try {
    await redis.del(key(companyId, phone));
    return true;
  } catch (error) {
    logger.error({ error: error.message }, 'Redis clearFlowState failed');
    return false;
  }
}

export async function nextRoundRobin(companyId, groupId, size) {
  if (size <= 0) return 0;
  try {
    const rrKey = `chatbot:rr:${companyId}:${groupId}`;
    const current = Number(await redis.get(rrKey)) || 0;
    await redis.set(rrKey, String((current + 1) % size), { EX: TTL_SECONDS });
    return current % size;
  } catch (error) {
    logger.error({ error: error.message }, 'Redis nextRoundRobin failed');
    return Math.floor(Math.random() * size);
  }
}

export default { setFlowState, getFlowState, clearFlowState, nextRoundRobin };