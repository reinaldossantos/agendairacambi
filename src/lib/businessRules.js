export function vehicleBookingError({ startAt, endAt, passengers, capacity }) {
  if (!startAt || !endAt || new Date(endAt) <= new Date(startAt)) return "invalid_period";
  if (!Number.isFinite(Number(passengers)) || Number(passengers) < 1) return "invalid_passengers";
  if (Number(passengers) > Number(capacity)) return "capacity_exceeded";
  return null;
}

export function canAdminister(profile) {
  return profile?.is_active !== false && !profile?.locked_at && profile?.access_role === "admin";
}

export function canEditExpense(report, profile, approverIds = []) {
  if (!profile?.id || profile.is_active === false || profile.locked_at) return false;
  if (canAdminister(profile) || approverIds.includes(profile.id)) return true;
  return report?.person_id === profile.id && ["draft", "changes_requested"].includes(report?.status);
}

export function canManageProject(project, profile) {
  if (!profile?.id || profile.is_active === false || profile.locked_at) return false;
  return canAdminister(profile) || project?.created_by === profile.id || project?.manager_id === profile.id || project?.team_ids?.includes(profile.id);
}

