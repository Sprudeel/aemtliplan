import { createApp, eventHandler, toNodeListener } from "h3";
import supertest from "supertest";

import groupPost from "../../server/api/groups/group.post";
import groupsGet from "../../server/api/groups/groups.get";
import groupDelete from "~/server/api/groups/group.delete";
import groupGet from "~/server/api/groups/group.get";
import setupGet from "../../server/api/setup.get";

export function createTestAgent() {
  const app = createApp();

  app.use("/api/groups", eventHandler(groupsGet));
  app.use("/api/group/delete", eventHandler(groupDelete));
  app.use("/api/group/get", eventHandler(groupGet));
  app.use("/api/group", eventHandler(groupPost));
  app.use("/api/setup", eventHandler(setupGet));

  const listener = toNodeListener(app);
  return supertest(listener);
}
