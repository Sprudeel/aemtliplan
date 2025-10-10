import { createApp, eventHandler, toNodeListener, createError } from "h3";
import supertest from "supertest";

import groupPost from "../../server/api/groups/group.post";
import groupsGet from "../../server/api/groups/groups.get";
import groupDelete from "~/server/api/groups/group.delete";
import groupGet from "~/server/api/groups/group.get";
import setupGet from "../../server/api/setup.get";
import authLogin from "~/server/api/auth/login.post";
import authLogout from "~/server/api/auth/logout.post";
import authRegister from "~/server/api/auth/register.post";
import authPassword from "~/server/api/auth/password.post";
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
import backgroundDelete from "~/server/api/settings/background.delete";
import backgroundGet from "~/server/api/settings/background.get";
import backgroundPost from "~/server/api/settings/background.post";
import cronSettingGet from "~/server/api/settings/cronsetting.get";
import cronSettingPost from "~/server/api/settings/cronsetting.post";
import userGet from "~/server/api/user.get";
import usersGet from "~/server/api/users/users.get";
import userDelete from "~/server/api/users/user.delete";

export function createTestAgent() {
  const app = createApp();

  app.use("/api/groups", eventHandler(groupsGet));
  app.use("/api/group/delete", eventHandler(groupDelete));
  app.use("/api/group/get", eventHandler(groupGet));
  app.use("/api/group", eventHandler(groupPost));
  app.use("/api/setup", eventHandler(setupGet));
  app.use("/api/auth/login", eventHandler(authLogin));
  app.use("/api/auth/logout", eventHandler(authLogout));
  app.use("/api/auth/register", eventHandler(authRegister));
  app.use("/api/auth/password", eventHandler(authPassword));
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
  app.use(
    "/api/settings/background",
    eventHandler((event) => {
      if (event.method === "GET") return backgroundGet(event);
      if (event.method === "POST") return backgroundPost(event);
      if (event.method === "DELETE") return backgroundDelete(event);
      throw createError({
        statusCode: 405,
        statusMessage: "Method Not Allowed",
      });
    }),
  );
  app.use(
    "/api/settings/cronsetting",
    eventHandler((event) => {
      if (event.method === "GET") return cronSettingGet(event);
      if (event.method === "POST") return cronSettingPost(event);
      throw createError({
        statusCode: 405,
        statusMessage: "Method Not Allowed",
      });
    }),
  );
  app.use(
    "/api/users/users",
    eventHandler((event) => {
      if (event.method === "GET") return usersGet(event);
      throw createError({
        statusCode: 405,
        statusMessage: "Method Not Allowed",
      });
    }),
  );
  app.use(
    "/api/users/user",
    eventHandler((event) => {
      if (event.method === "DELETE") return userDelete(event);
      throw createError({
        statusCode: 405,
        statusMessage: "Method Not Allowed",
      });
    }),
  );
  app.use("/api/user", eventHandler(userGet));

  const listener = toNodeListener(app);
  return supertest.agent(listener);
}
