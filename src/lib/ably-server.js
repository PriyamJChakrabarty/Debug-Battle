import Ably from "ably";

const REST_KEY      = "__ablyRestClient";
const REALTIME_KEY  = "__ablyRealtimeClient";

function getRestClient() {
  if (!process.env.ABLY_API_KEY) throw new Error("ABLY_API_KEY is not configured");
  if (!globalThis[REST_KEY]) {
    globalThis[REST_KEY] = new Ably.Rest(process.env.ABLY_API_KEY);
  }
  return globalThis[REST_KEY];
}

function getRealtimeClient() {
  if (!process.env.ABLY_API_KEY) throw new Error("ABLY_API_KEY is not configured");
  if (!globalThis[REALTIME_KEY]) {
    globalThis[REALTIME_KEY] = new Ably.Realtime({ key: process.env.ABLY_API_KEY });
  }
  return globalThis[REALTIME_KEY];
}

export function getRaidChannelName(matchId) {
  const prefix = process.env.ABLY_CHANNEL_PREFIX || "debug-battle";
  return `${prefix}:raid:${matchId}`;
}

// REST channel — for publishing only (no WebSocket overhead)
export function getAblyChannel(matchId) {
  const name = getRaidChannelName(matchId);
  console.log(`✋ [ably-server.js] getAblyChannel (REST publish) channel="${name}"`);
  return getRestClient().channels.get(name);
}

// Realtime channel — for subscribing in SSE routes (requires WebSocket)
export function getAblyRealtimeChannel(matchId) {
  const name = getRaidChannelName(matchId);
  console.log(`✋ [ably-server.js] getAblyRealtimeChannel (Realtime subscribe) channel="${name}"`);
  return getRealtimeClient().channels.get(name);
}
