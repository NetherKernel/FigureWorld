/**
 * Copies the MongoDB data that the Supabase migration had not moved yet:
 * delivery settings, the published landing page, real (non-test) user accounts,
 * customers' saved addresses, shipment records and notification history.
 *
 * Idempotent and additive: rows that already exist in Supabase are skipped, nothing
 * is deleted or overwritten. Also adds the delivery_rules columns the app writes to.
 *
 *   node --env-file=.env.local scripts/migrate-remaining-to-supabase.js --dry-run
 *   node --env-file=.env.local scripts/migrate-remaining-to-supabase.js
 */
const { Client } = require("pg");
const mongoose = require("mongoose");

const DRY_RUN = process.argv.includes("--dry-run");
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/figuresworld";
// Accounts created by the automated test scripts — not migrated
const TEST_ACCOUNT = /^(collector|buggy)_\d+@/i;

const log = (msg) => console.log(`${DRY_RUN ? "[dry-run] " : ""}${msg}`);

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (run with --env-file=.env.local)");
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const mongo = mongoose.connection.db;
  const q = (text, params) => pg.query(text, params).then((r) => r.rows);

  try {
    if (!DRY_RUN) await pg.query("begin");

    // 1. Delivery settings — the app stores the whole rule object in delivery_rules.settings
    if (!DRY_RUN) {
      await pg.query(`alter table delivery_rules
        add column if not exists rule_name text,
        add column if not exists settings jsonb,
        add column if not exists updated_by text`);
    }
    const hasSettingsColumn = (await q("select 1 from information_schema.columns where table_name = 'delivery_rules' and column_name = 'settings'")).length > 0;
    const ruleRows = hasSettingsColumn ? await q("select id from delivery_rules where settings is not null limit 1") : [];
    const rule = await mongo.collection("deliveryrules").findOne();
    if (rule && ruleRows.length === 0) {
      const { _id, __v, createdAt, updatedAt, updatedBy, ...settings } = rule;
      log(`delivery settings: copying rule (${(settings.partnerPresets || []).length} partner presets, ${(settings.pincodeRates || []).length} pincode overrides)`);
      if (!DRY_RUN) {
        await pg.query(
          `insert into delivery_rules (rule_name, settings, updated_by, created_at, updated_at) values ($1, $2, $3, $4, $5)`,
          ["Default Store Delivery", JSON.stringify(settings), updatedBy || null, createdAt || new Date(), updatedAt || new Date()]
        );
      }
    } else {
      log("delivery settings: already in Supabase, skipped");
    }

    // 2. Landing page (published + draft) — site_contents.content holds the whole document
    const landing = await mongo.collection("sitecontents").findOne({ key: "landing" });
    const landingRows = await q("select id from site_contents where key = 'landing'");
    if (landing && landingRows.length === 0) {
      const { published, draft, draftUpdatedAt, draftUpdatedBy, publishedAt, publishedBy } = landing;
      log(`landing page: copying (${published?.sections?.length || 0} published sections)`);
      if (!DRY_RUN) {
        await pg.query(`insert into site_contents (key, content, created_at, updated_at) values ('landing', $1, $2, $3)`, [
          JSON.stringify({ published, draft, draftUpdatedAt, draftUpdatedBy, publishedAt, publishedBy }),
          landing.createdAt || new Date(),
          landing.updatedAt || new Date(),
        ]);
      }
    } else {
      log("landing page: already in Supabase, skipped");
    }

    // 3. Real user accounts missing from Supabase (keeps the same password hash).
    //    The Developer Console signs in with the DEVELOPER role, so the role check must allow it.
    if (!DRY_RUN) {
      await pg.query(`alter table users drop constraint if exists users_role_check`);
      await pg.query(`alter table users add constraint users_role_check check (role in ('CUSTOMER', 'STAFF', 'ADMIN', 'DEVELOPER'))`);
    }
    const pgUsers = new Map((await q("select id, lower(email) as email from users")).map((u) => [u.email, u.id]));
    const mongoUsers = await mongo.collection("users").find().toArray();
    for (const u of mongoUsers) {
      const email = String(u.email || "").toLowerCase();
      if (!email || pgUsers.has(email) || TEST_ACCOUNT.test(email)) continue;
      log(`user: copying ${email} (${u.role})`);
      if (!DRY_RUN) {
        const [row] = await q(
          `insert into users (email, password_hash, name, phone, role, created_at, updated_at)
           values ($1, $2, $3, $4, $5, $6, $7) returning id`,
          [email, u.passwordHash, u.name, u.phone || null, u.role || "CUSTOMER", u.createdAt || new Date(), u.updatedAt || new Date()]
        );
        pgUsers.set(email, row.id);
      }
    }

    // 4. Saved addresses, for users who have none in Supabase yet (duplicates collapsed)
    const mongoIdToEmail = new Map(mongoUsers.map((u) => [String(u._id), String(u.email || "").toLowerCase()]));
    const withAddresses = new Set((await q("select distinct user_id from addresses where user_id is not null")).map((r) => r.user_id));
    const byUser = new Map();
    for (const a of await mongo.collection("addresses").find().sort({ isDefault: -1, createdAt: 1 }).toArray()) {
      const email = mongoIdToEmail.get(String(a.user));
      const userId = email && pgUsers.get(email);
      if (!userId || withAddresses.has(userId)) continue;
      const key = [a.fullName, a.phone, a.streetLine1, a.streetLine2, a.city, a.state, a.postalCode]
        .map((v) => String(v || "").trim().toLowerCase())
        .join("|");
      if (!byUser.has(userId)) byUser.set(userId, new Map());
      if (!byUser.get(userId).has(key)) byUser.get(userId).set(key, a);
    }
    for (const [userId, addresses] of byUser) {
      const list = [...addresses.values()];
      const defaultIndex = Math.max(0, list.findIndex((a) => a.isDefault));
      log(`addresses: copying ${list.length} for user ${userId}`);
      if (DRY_RUN) continue;
      for (const [i, a] of list.entries()) {
        await pg.query(
          `insert into addresses (user_id, name, phone, street, landmark, city, state, postal_code, country, is_default, created_at, updated_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            userId,
            a.fullName || "",
            a.phone || "",
            a.streetLine1 || "",
            a.streetLine2 || a.landmark || "",
            a.city || "",
            a.state || "",
            a.postalCode || "",
            a.country || "India",
            i === defaultIndex,
            a.createdAt || new Date(),
            a.updatedAt || new Date(),
          ]
        );
      }
    }

    // 5. Shipment records, linked to the migrated orders by order number
    const orderIds = new Map((await q("select id, order_number from orders")).map((o) => [o.order_number, o.id]));
    const existingShipments = new Set((await q("select order_number || '|' || tracking_number as k from shipments")).map((r) => r.k));
    let shipments = 0;
    for (const s of await mongo.collection("shipments").find().toArray()) {
      const orderId = orderIds.get(s.orderNumber);
      if (!orderId || !s.trackingNumber || existingShipments.has(`${s.orderNumber}|${s.trackingNumber}`)) continue;
      shipments++;
      if (DRY_RUN) continue;
      await pg.query(
        `insert into shipments (order_id, order_number, courier, tracking_number, tracking_url, dispatch_date, expected_delivery_date, status, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          orderId,
          s.orderNumber,
          s.courierName || s.carrier || "Courier",
          s.trackingNumber,
          s.trackingUrl || null,
          s.dispatchDate || s.shippedAt || s.createdAt || new Date(),
          s.expectedDeliveryDate || null,
          s.status || "DISPATCHED",
          s.createdAt || new Date(),
          s.updatedAt || new Date(),
        ]
      );
    }
    log(`shipments: copying ${shipments}`);

    // 6. Notification history (WhatsApp / email logs)
    const existingLogs = new Set(
      (await q("select order_number || '|' || coalesce(template, '') || '|' || floor(extract(epoch from created_at))::bigint as k from notification_logs")).map((r) => r.k)
    );
    let logs = 0;
    for (const n of await mongo.collection("notificationlogs").find().toArray()) {
      const createdAt = n.createdAt || n.sentAt || new Date();
      const key = `${n.orderNumber}|${n.notificationType || ""}|${Math.floor(new Date(createdAt).getTime() / 1000)}`;
      if (existingLogs.has(key)) continue;
      logs++;
      if (DRY_RUN) continue;
      const { _id, __v, orderId, ...details } = n;
      await pg.query(
        `insert into notification_logs (order_number, recipient, channel, template, status, details, created_at)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          n.orderNumber || null,
          n.recipientPhone || n.recipientEmail || null,
          String(n.channel || "WHATSAPP").toUpperCase(),
          n.notificationType || null,
          String(n.status || "SENT").toUpperCase(),
          JSON.stringify(details),
          createdAt,
        ]
      );
    }
    log(`notification history: copying ${logs}`);

    // 7. Link migrated orders / invoices to customer accounts (they were copied without user ids,
    //    so "Your Orders" and invoice ownership could not find them). Only fills empty links.
    const [{ n: unlinkedOrders }] = await q(
      `select count(*)::int as n from orders o join users u on lower(u.email) = lower(o.customer_details->>'email') where o.user_id is null`
    );
    log(`orders: linking ${unlinkedOrders} to customer accounts by email`);
    if (!DRY_RUN) {
      await pg.query(
        `update orders o set user_id = u.id from users u where o.user_id is null and lower(u.email) = lower(o.customer_details->>'email')`
      );
    }
    const [{ n: unlinkedInvoices }] = await q(
      `select count(*)::int as n from invoices i join orders o on o.order_number = i.order_number
       where i.customer_id is null and (o.user_id is not null or exists (select 1 from users u where lower(u.email) = lower(o.customer_details->>'email')))`
    );
    log(`invoices: linking ${unlinkedInvoices} to customer accounts / orders`);
    if (!DRY_RUN) {
      await pg.query(
        `update invoices i set customer_id = o.user_id from orders o where i.customer_id is null and o.order_number = i.order_number and o.user_id is not null`
      );
      await pg.query(`update invoices i set order_id = o.id from orders o where i.order_id is null and o.order_number = i.order_number`);
    }

    if (!DRY_RUN) await pg.query("commit");
    log("done");
  } catch (err) {
    if (!DRY_RUN) await pg.query("rollback").catch(() => {});
    throw err;
  } finally {
    await pg.end();
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
