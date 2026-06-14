function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(dateKey: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return null;
  }

  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (toDateKey(date) !== dateKey) {
    return null;
  }

  return date;
}

export function getTodayDateKey(): string {
  return toDateKey(new Date());
}

export function clampReferenceDate(dateKey?: string): Date {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  if (!dateKey) {
    return today;
  }

  const parsed = parseDateKey(dateKey);

  if (!parsed) {
    return today;
  }

  parsed.setHours(12, 0, 0, 0);

  if (parsed > today) {
    return today;
  }

  return parsed;
}

export function formatDisplayDate(dateKey: string): string {
  const date = parseDateKey(dateKey);

  if (!date) {
    return dateKey;
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatMonthYear(date: Date): string {
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
