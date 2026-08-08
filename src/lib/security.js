export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function isUsableProfile(profile) {
  return Boolean(profile?.id && profile.is_active !== false && !profile.locked_at);
}

export function isAdministrator(profile) {
  return isUsableProfile(profile) && profile.access_role === "admin";
}

