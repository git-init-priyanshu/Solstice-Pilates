import { useDatabase as sheetApi } from "@/lib/database";

const { findUserById } = sheetApi();

export function isAllowlistedAdmin(userId: string) {
  if (!userId) {
    return false;
  }

  const allowlist = (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return allowlist.includes(userId);
}

export async function isAdminUser(userId: string) {
  if (!userId) {
    return false;
  }

  if (isAllowlistedAdmin(userId)) {
    return true;
  }

  const user = await findUserById(userId);

  return user?.role === "admin";
}
