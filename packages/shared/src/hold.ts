export const HOLD_LUA_SCRIPT = `
-- KEYS = seat keys; ARGV[1] = bookingId; ARGV[2] = ttl in ms
for i = 1, #KEYS do
  if redis.call('EXISTS', KEYS[i]) == 1 then return 0 end
end
for i = 1, #KEYS do
  redis.call('SET', KEYS[i], ARGV[1], 'PX', ARGV[2])
end
return 1
`;

export const RELEASE_LUA_SCRIPT = `
-- KEYS = seat keys; ARGV[1] = bookingId
for i = 1, #KEYS do
  if redis.call('GET', KEYS[i]) == ARGV[1] then
    redis.call('DEL', KEYS[i])
  end
end
return 1
`;

export interface RedisLike {
  eval(script: string, numkeys: number, ...args: (string | number)[]): Promise<unknown>;
  mget(...keys: string[]): Promise<(string | null)[]>;
  get(key: string): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
}

export function getSeatHoldKey(showId: string, seatId: string): string {
  return `hold:${showId}:${seatId}`;
}

/**
 * Atomically acquires a hold on all requested seats using Redis Lua script.
 * Returns true if ALL seats were successfully held, or false if ANY seat was already held.
 */
export async function acquireSeatHold(
  redis: RedisLike,
  showId: string,
  seatIds: string[],
  bookingId: string,
  ttlSeconds = 300
): Promise<boolean> {
  if (seatIds.length === 0) {
    return false;
  }

  const keys = seatIds.map((seatId) => getSeatHoldKey(showId, seatId));
  const ttlMs = ttlSeconds * 1000;

  const result = await redis.eval(
    HOLD_LUA_SCRIPT,
    keys.length,
    ...keys,
    bookingId,
    ttlMs
  );

  return Number(result) === 1;
}

/**
 * Releases seats from Redis only if they are held by the specified bookingId.
 */
export async function releaseSeatHold(
  redis: RedisLike,
  showId: string,
  seatIds: string[],
  bookingId: string
): Promise<boolean> {
  if (seatIds.length === 0) {
    return true;
  }

  const keys = seatIds.map((seatId) => getSeatHoldKey(showId, seatId));

  const result = await redis.eval(
    RELEASE_LUA_SCRIPT,
    keys.length,
    ...keys,
    bookingId
  );

  return Number(result) === 1;
}
