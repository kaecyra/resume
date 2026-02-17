import { randomUUID } from "node:crypto";

console.log(randomUUID().replace(/-/g, "").slice(0, 8));
