import { ROUTINE_COLORS } from '@/constants/styles';

// ID generation
export const generateId = () => crypto.randomUUID();

// Random color selection
export const getRandomColor = () => ROUTINE_COLORS[Math.floor(Math.random() * ROUTINE_COLORS.length)];

// ローカル時刻でYYYY-MM-DD形式の日付文字列を生成
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Date utilities
export const getTodayString = () => {
  return formatLocalDate(new Date());
};

export const getWeekDates = (offset = 0) => {
  const today = new Date();
  const currentDay = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + (offset * 7));

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(formatLocalDate(date));
  }
  return dates;
};

export const getMonthDates = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const dates = [];

  // Add padding for days before the first of the month
  const startPadding = (firstDay.getDay() + 6) % 7; // Monday = 0
  for (let i = startPadding - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    dates.push({ date: formatLocalDate(date), isCurrentMonth: false });
  }

  // Add all days of the month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    dates.push({ date: formatLocalDate(date), isCurrentMonth: true });
  }

  // Add padding for days after the last of the month
  const endPadding = (7 - (dates.length % 7)) % 7;
  for (let i = 1; i <= endPadding; i++) {
    const date = new Date(year, month + 1, i);
    dates.push({ date: formatLocalDate(date), isCurrentMonth: false });
  }

  return dates;
};

export const getDayLabel = (index: number) => ['月', '火', '水', '木', '金', '土', '日'][index];
