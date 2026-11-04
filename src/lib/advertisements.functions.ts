import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { publicClient } from "./public-client.server";
import { advertisementSchema } from "./advertisements";

export const getAdvertisements = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient(process.env["SUPABASE_URL"], process.env["SUPABASE_PUBLISHABLE_KEY"]);
  const { data, error } = await sb.from("advertisements").select("id,name,headline,image_url,target_url,placement,is_active,sort_order,duration_seconds").eq("is_active", true).order("sort_order");
  if (error) throw new Error("Could not load advertisements");
  return (data ?? []).map((ad) => advertisementSchema.parse(ad));
});

export const adsQuery = queryOptions({ queryKey: ["advertisements"], queryFn: () => getAdvertisements(), staleTime: 30_000 });