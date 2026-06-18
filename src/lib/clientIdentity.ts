"use client";

const userIdStorageKey = "solstice_pilates_user_id";

function createUuid() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getOrCreateUserId(storageKey = userIdStorageKey) {
  const existingUserId = localStorage.getItem(storageKey);

  if (existingUserId) {
    return existingUserId;
  }

  const userId = createUuid();
  localStorage.setItem(storageKey, userId);

  return userId;
}

export function createChatId() {
  return createUuid();
}
