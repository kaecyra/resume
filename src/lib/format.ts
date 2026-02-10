const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function format_bold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export function format_date(date_str: string): string {
  const [year, month] = date_str.split("-");
  const month_index = parseInt(month, 10) - 1;
  return `${MONTHS[month_index]} ${year}`;
}

export function format_date_range(start: string, end: string | null): string {
  const start_formatted = format_date(start);
  const end_formatted = end ? format_date(end) : "Present";
  return `${start_formatted} - ${end_formatted}`;
}
