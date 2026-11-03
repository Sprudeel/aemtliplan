import { withDefaults } from "../../shared/wall-design";
import { notFound } from "./errors";
import { fileUrl } from "./plan-data";
import prisma from "./prisma";

/** Settings of a plan that is publicly visible under `slug`; 404 otherwise. */
export async function findPublicPlan(slug: string) {
  const settings = await prisma.planSettings.findUnique({
    where: { publicSlug: slug },
    include: { plan: { select: { name: true } } },
  });
  if (!settings || settings.visibility !== "public") throw notFound("Plan");
  return settings;
}

export async function publicPlanView(slug: string) {
  const settings = await findPublicPlan(slug);
  const jobs = await prisma.job.findMany({
    where: { planId: settings.planId },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    include: { assignment: { include: { group: { include: { members: true } } } } },
  });

  return {
    name: settings.plan.name,
    backgroundUrl: settings.backgroundKey ? fileUrl(settings.backgroundKey) : null,
    updatedAt: settings.assignmentsChangedAt,
    nextRotationAt: settings.rotationEnabled ? settings.nextRotationAt : null,
    design: withDefaults(settings.wallDesign),
    items: jobs.map((job) => {
      const group = job.assignment?.group;
      return {
        key: `job:${job.id}`, // matches the layout keys of the wall design
        job: { name: job.name, icon: job.icon, description: job.description },
        group: group
          ? {
              name: group.name,
              color: group.color,
              // Names of (often underage) members only if the admin allows it.
              ...(settings.showMemberNames && {
                members: group.members.map((member) => member.name).sort((a, b) => a.localeCompare(b, "de")),
              }),
            }
          : null,
      };
    }),
  };
}
