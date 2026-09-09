export const normalizePersonName = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
export const isRestaurantOperator = (person) => ["laiza", "luciana"].includes(normalizePersonName(person?.name));
export const canManageRestaurant = (person) => person?.access_role === "admin" || ["thais", "arielle"].includes(normalizePersonName(person?.name));
