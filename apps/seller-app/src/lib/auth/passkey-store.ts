import type { BackendTokenResponse } from "@/src/lib/auth/backend-auth";

const CHALLENGE_TTL_MS = 5 * 60_000;
const LOGIN_TICKET_TTL_MS = 60_000;

type TimedEntry<T> = {
  expiresAt: number;
  value: T;
};

const challengeStore = new Map<string, TimedEntry<string>>();
const loginTicketStore = new Map<string, TimedEntry<BackendTokenResponse>>();

function saveTimed<T>(
  store: Map<string, TimedEntry<T>>,
  key: string,
  value: T,
  ttlMs: number,
) {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

function getTimed<T>(
  store: Map<string, TimedEntry<T>>,
  key: string,
): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;

  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }

  return entry.value;
}

export function createChallenge(challenge: string): string {
  const challengeId = crypto.randomUUID();
  saveChallenge(challengeId, challenge);
  return challengeId;
}

export function saveChallenge(userId: string, challenge: string) {
  saveTimed(challengeStore, userId, challenge, CHALLENGE_TTL_MS);
}

export function getChallenge(userId: string) {
  return getTimed(challengeStore, userId);
}

export function deleteChallenge(userId: string) {
  challengeStore.delete(userId);
}

export function saveLoginTicket(tokens: BackendTokenResponse): string {
  const ticket = crypto.randomUUID();
  saveTimed(loginTicketStore, ticket, tokens, LOGIN_TICKET_TTL_MS);
  return ticket;
}

export function consumeLoginTicket(
  ticket: string | undefined,
): BackendTokenResponse | undefined {
  if (!ticket) return undefined;

  const value = getTimed(loginTicketStore, ticket);
  loginTicketStore.delete(ticket);
  return value;
}
