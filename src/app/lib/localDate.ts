// 로컬(사용자 시간대) 기준 YYYY-MM-DD. toISOString()은 UTC라 KST 오전 9시 전에는 하루 전 날짜가 된다.
export function localDateKey(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
