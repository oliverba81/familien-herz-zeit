export function getChildAgeMonths(birthDate: Date): number {
  const today = new Date();
  const monthsDiff =
    (today.getFullYear() - birthDate.getFullYear()) * 12 +
    (today.getMonth() - birthDate.getMonth());

  return monthsDiff >= 0 ? monthsDiff : 0;
}

