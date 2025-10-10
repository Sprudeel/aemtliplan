import prisma from "~/server/utils/prisma";
import { z } from "zod";
import { defineEventHandler, getQuery, createError } from "h3";

const Query = z.object({
  id: z.coerce.number().int(),
});

export default defineEventHandler(async (event) => {
  const { id } = Query.parse(await getQuery(event));
  const group = await prisma.group.findUnique({
    where: { id },
    include: { members: true },
  });

  if (!group) {
    throw createError({ statusCode: 404, statusMessage: "Group not found" });
  }
  return group;
});
