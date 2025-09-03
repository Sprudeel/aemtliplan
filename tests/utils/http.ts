import { createApp, eventHandler, toNodeListener } from "h3";
import supertest from "supertest";

import groupPost from "../../server/api/groups/group.post";
import groupsGet from "../../server/api/groups/groups.get";
import setupGet from "../../server/api/setup.get"; // if you have it

export function createTestAgent() {
  const app = createApp();

  app.use("/api/groups", eventHandler(groupsGet));
  app.use("/api/group", eventHandler(groupPost));
  app.use("/api/setup", eventHandler(setupGet));

  const listener = toNodeListener(app);
  return supertest(listener);
}
