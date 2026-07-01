export function calcAge(birthday) {
  if (!birthday) return null;
  const b = new Date(birthday);
  if (isNaN(b.getTime())) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - b.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - b.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < b.getUTCDate())) {
    age--;
  }
  return age;
}
