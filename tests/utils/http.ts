import { createApp, eventHandler, toNodeListener, createError } from "h3";
import supertest from "supertest";

import groupPost from "../../server/api/groups/group.post";
import groupsGet from "../../server/api/groups/groups.get";
import groupDelete from "~/server/api/groups/group.delete";
import groupGet from "~/server/api/groups/group.get";
import setupGet from "../../server/api/setup.get";
import authLogin from "~/server/api/auth/login.post";
import jobsGet from "~/server/api/jobs/jobs.get";
import jobPost from "~/server/api/jobs/job.post";
import jobDelete from "~/server/api/jobs/job.delete";
import jobUpdate from "~/server/api/jobs/job.update";
import rotationOrderPost from "~/server/api/jobs/rotationorder.post";
import matchingsGet from "~/server/api/matchings/matchings.get";
import matchingPost from "~/server/api/matchings/matching.post";
import matchingDelete from "~/server/api/matchings/matching.delete";
import matchingsNew from "~/server/api/matchings/matchings.new";
import matchingsPreview from "~/server/api/matchings/matchings-preview.get";
import matchingsRotate from "~/server/api/matchings/matchings.rotate";

export function createTestAgent() {
  const app = createApp();

  app.use("/api/groups", eventHandler(groupsGet));
  app.use("/api/group/delete", eventHandler(groupDelete));
  app.use("/api/group/get", eventHandler(groupGet));
  app.use("/api/group", eventHandler(groupPost));
  app.use("/api/setup", eventHandler(setupGet));
  app.use("/api/auth/login", eventHandler(authLogin));
  app.use("/api/jobs/jobs", eventHandler(jobsGet));
  app.use("/api/jobs/job.update", eventHandler(jobUpdate));
  app.use(
    "/api/jobs/job",
    eventHandler((event) => {
      if (event.method === "POST") return jobPost(event);
      if (event.method === "DELETE") return jobDelete(event);
      throw createError({
        statusCode: 405,
        statusMessage: "Method Not Allowed",
      });
    }),
  );
  app.use("/api/jobs/rotationorder", eventHandler(rotationOrderPost));
  app.use("/api/matchings/matchings-preview", eventHandler(matchingsPreview));
  app.use("/api/matchings/matchings", eventHandler(matchingsGet));
  app.use("/api/matchings/matchings.new", eventHandler(matchingsNew));
  app.use(
    "/api/matchings/matching",
    eventHandler((event) => {
      if (event.method === "POST") return matchingPost(event);
      if (event.method === "DELETE") return matchingDelete(event);
      throw createError({
        statusCode: 405,
        statusMessage: "Method Not Allowed",
      });
    }),
  );
  app.use("/api/matchings/matchings.rotate", eventHandler(matchingsRotate));

  const listener = toNodeListener(app);
  return supertest.agent(listener);
}
