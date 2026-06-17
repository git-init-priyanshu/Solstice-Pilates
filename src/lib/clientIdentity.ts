"use client";

const userIdStorageKey = "solstice_pilates_user_id";

function createUuid() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getOrCreateUserId() {
  const existingUserId = localStorage.getItem(userIdStorageKey);

  if (existingUserId) {
    return existingUserId;
  }

  const userId = createUuid();
  localStorage.setItem(userIdStorageKey, userId);

  return userId;
}

export function createChatId() {
  return createUuid();
}
