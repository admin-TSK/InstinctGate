import { start } from "./billing-server.js";

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
