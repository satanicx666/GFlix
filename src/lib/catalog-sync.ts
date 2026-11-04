export const SYNC_BATCH_SIZE = 4;
export const EXPORT_BATCH_SIZE = 1000;
export function exportFile(type: "movie" | "tv", date: string) {
  const [year, month, day] = date.split("-");
  return `${type === "movie" ? "movie" : "tv_series"}_ids_${month}_${day}_${year}.json.gz`;
}
export function changesWindow(since: string, today: string) {
  const oldest = new Date(`${today}T00:00:00Z`);
  oldest.setUTCDate(oldest.getUTCDate() - 13);
  return { start_date: since < oldest.toISOString().slice(0, 10) ? oldest.toISOString().slice(0, 10) : since, end_date: today };
}