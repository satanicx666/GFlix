export const tmdbImg = (path: string | null | undefined, size: "w185" | "w342" | "w500" | "w780" | "original" = "w342") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
