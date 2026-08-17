const IRACAMBI_DOMAIN = "@iracambi.com";

const LOGIN_ALIASES = {
  robin: "iracambi@iracambi.com",
  "robin@iracambi.com": "iracambi@iracambi.com",
  deivid: "viveiro@iracambi.com",
  "deivid@iracambi.com": "viveiro@iracambi.com",
};

export function completeLoginEmail(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/\s+/g, "");
  if (LOGIN_ALIASES[normalized]) return LOGIN_ALIASES[normalized];
  return normalized.includes("@") ? normalized : `${normalized}${IRACAMBI_DOMAIN}`;
}
