/** 任意の週（月曜日文字列 "YYYY-MM-DD"）の JST 境界を返す */
export function getWeekBoundsFromMonday(mondayStr: string): {
  mondayUtc: Date;
  sundayEndUtc: Date;
  sundayStr: string;
} {
  const monday = new Date(`${mondayStr}T00:00:00+09:00`);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const sundayJst = new Date(sunday.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const sundayStr = [
    sundayJst.getFullYear(),
    String(sundayJst.getMonth() + 1).padStart(2, "0"),
    String(sundayJst.getDate()).padStart(2, "0"),
  ].join("-");
  return {
    mondayUtc: monday,
    sundayEndUtc: new Date(`${sundayStr}T23:59:59+09:00`),
    sundayStr,
  };
}
