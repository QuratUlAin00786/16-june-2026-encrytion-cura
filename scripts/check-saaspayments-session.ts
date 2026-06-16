import { db } from "../server/db";
import { saasSubscriptions, saasPayments } from "@shared/schema";
import { sql } from "drizzle-orm";

const SESSION_ID = process.env.SESSION_ID || "";
const ORG_ID = parseInt(process.env.ORG_ID || "3", 10);

if (!SESSION_ID) {
  console.error("SESSION_ID environment variable is required.");
  process.exit(1);
}

async function poll() {
  const [subscription] = await db
    .select()
    .from(saasSubscriptions)
    .where(sql`metadata ->> 'stripeCheckoutSessionId' = ${SESSION_ID}`)
    .orderBy(saasSubscriptions.createdAt, "desc")
    .limit(1);

  const [payment] = await db
    .select()
    .from(saasPayments)
    .where(sql`metadata ->> 'stripeCheckoutSessionId' = ${SESSION_ID}`)
    .orderBy(saasPayments.createdAt, "desc")
    .limit(1);

  console.clear();
  console.log("Polling for session:", SESSION_ID);
  console.log("Subscription row:", subscription);
  console.log("Payment row:", payment);
}

(async function main() {
  console.log("Polling every 3s. Use Ctrl+C to stop.");
  await poll();
  setInterval(poll, 3000);
})();

