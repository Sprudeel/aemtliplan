import { defineEventHandler, getRouterParam, setResponseHeader } from "h3";
import { notFound } from "../../utils/errors";
import { mimeForKey } from "../../utils/images";

// Serves uploaded files (only plan backgrounds). Keys contain a random UUID.
export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, "key") ?? "";
  if (!/^backgrounds\/[\w-]+\/[\w-]+\.(png|jpg|webp)$/.test(key)) throw notFound("File");

  const data = await useStorage("uploads").getItemRaw(key);
  if (!data) throw notFound("File");

  setResponseHeader(event, "Content-Type", mimeForKey(key));
  setResponseHeader(event, "Cache-Control", "public, max-age=31536000, immutable");
  return data;
});
