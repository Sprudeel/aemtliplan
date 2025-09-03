import { config } from "dotenv";
config({ path: ".env.test" });


import { readBody, createError, defineEventHandler, eventHandler } from "h3";
// make them available like Nitro does
// @ts-ignore
globalThis.defineEventHandler = defineEventHandler;
// @ts-ignore
globalThis.eventHandler = eventHandler;
// @ts-ignore
globalThis.readBody = readBody;
// @ts-ignore
globalThis.createError = createError;
