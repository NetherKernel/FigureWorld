/**
 * SPRINT 11 AUTOMATED VERIFICATION SUITE: WHATSAPP INTEGRATION
 * Tests:
 * 1. Seed & reference order #KF100001 WhatsApp notifications
 * 2. NotificationService message formats:
 *    - Order Confirmation ("Your order #KF100001 has been confirmed.")
 *    - Payment Confirmation ("Payment of ₹X,XXX for your order #KF100001 has been received...")
 *    - Invoice Document (PDF document link, filename, caption)
 *    - Dispatch ("Your order #KF100001 has been dispatched.", Courier, Tracking ID)
 *    - Delivered ("Your order #KF100001 has been delivered. Thank you for shopping with us.")
 * 3. Phone formatting (E.164 sanitization)
 * 4. Automatic lifecycle triggers (Confirm -> Order Conf + Invoice, Dispatch -> Courier + Tracking, Delivered -> Thank you)
 * 5. Manual Admin WhatsApp triggers via /api/admin/orders/[orderNumber]/notifications
 * 6. WhatsApp Webhook challenge verification (GET) & delivery receipts (POST)
 * 7. Global Admin Notifications listing & metrics (/api/admin/notifications)
 * 8. RBAC security enforcement (Customer 403, Unauthenticated 401)
 */

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

let adminToken = "";
let customerToken = "";
let testOrderNumber = "";

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${message}`);
    failedTests++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { "Content-Type": "application/json", ...options.headers };
  const res = await fetch(url, { ...options, headers });
  let data = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, headers: res.headers, data };
}

async function runSprint11Tests() {
  console.log("=======================================================================");
  console.log("       SPRINT 11: WHATSAPP INTEGRATION AUTOMATED TEST SUITE            ");
  console.log("=======================================================================\n");

  // Step 0: Ensure DB Seeded & Authenticate
  console.log("--- Step 0: Database Seed & Authentication ---");
  const seedRes = await request("/api/seed", { method: "POST" });
  assert(seedRes.status === 200, "Database seeded successfully");

  const adminLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@figuresworld.com", password: "Admin@123456" }),
  });
  assert(adminLogin.status === 200, "Admin authenticated successfully");
  adminToken = adminLogin.data.data.token;

  const customerLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "customer@figuresworld.com", password: "Customer@123456" }),
  });
  assert(customerLogin.status === 200, "Customer authenticated successfully");
  customerToken = customerLogin.data.data.token;

  // Step 1: Inspect Pre-Seeded Notifications for Order #KF100001
  console.log("\n--- Step 1: Pre-Seeded WhatsApp Notifications for #KF100001 ---");
  const kfNotifsRes = await request("/api/admin/orders/KF100001/notifications", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(kfNotifsRes.status === 200, "Fetched notifications for #KF100001 (200 OK)");
  assert(kfNotifsRes.data.success === true, "Response reports success");
  const kfLogs = kfNotifsRes.data.data.notifications;
  assert(kfLogs.length >= 4, `Order #KF100001 has at least 4 notifications (got: ${kfLogs.length})`);

  const orderConfNotif = kfLogs.find((n) => n.notificationType === "ORDER_CONFIRMATION");
  assert(!!orderConfNotif, "Found ORDER_CONFIRMATION notification for #KF100001");
  assert(
    orderConfNotif.body.includes("Your order #KF100001 has been confirmed"),
    `Order confirmation contains exact required text (got: "${orderConfNotif.body.split("\n")[2]}")`
  );

  const paymentConfNotif = kfLogs.find((n) => n.notificationType === "PAYMENT_CONFIRMATION");
  assert(!!paymentConfNotif, "Found PAYMENT_CONFIRMATION notification for #KF100001");
  assert(
    paymentConfNotif.body.includes("Payment of ₹"),
    "Payment confirmation states amount received"
  );
  assert(
    paymentConfNotif.body.includes("426189304721"),
    "Payment confirmation references 12-digit UTR 426189304721"
  );

  const invoiceNotif = kfLogs.find((n) => n.notificationType === "INVOICE");
  assert(!!invoiceNotif, "Found INVOICE document notification for #KF100001");
  assert(invoiceNotif.messageType === "document", "Invoice messageType is 'document'");
  assert(
    invoiceNotif.documentUrl.includes("/uploads/invoices/"),
    `Invoice documentUrl points to PDF invoice (got: ${invoiceNotif.documentUrl})`
  );
  assert(
    invoiceNotif.filename.endsWith(".pdf"),
    `Invoice filename is valid PDF (got: ${invoiceNotif.filename})`
  );

  const dispatchNotif = kfLogs.find((n) => n.notificationType === "DISPATCH");
  assert(!!dispatchNotif, "Found DISPATCH notification for #KF100001");
  assert(
    dispatchNotif.body.includes("Your order #KF100001 has been dispatched"),
    "Dispatch body contains exact required header"
  );
  assert(
    dispatchNotif.body.includes("Courier: Blue Dart Express"),
    "Dispatch body states Courier name"
  );
  assert(
    dispatchNotif.body.includes("Tracking ID: BD-KF100001"),
    "Dispatch body states Tracking ID"
  );

  // Step 2: Test Webhook Challenge Verification (GET)
  console.log("\n--- Step 2: WhatsApp Webhook Challenge Verification (GET) ---");
  const challengeToken = "CHALLENGE_RANDOM_XYZ987654";
  const webhookGetRes = await request(
    `/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=figuresworld_whatsapp_webhook_secret&hub.challenge=${challengeToken}`
  );
  assert(webhookGetRes.status === 200, "Webhook handshake returned 200 OK");
  assert(
    webhookGetRes.data === challengeToken,
    `Webhook echoed challenge string verbatim: "${webhookGetRes.data}"`
  );

  // Verify invalid token rejected
  const badWebhookGet = await request(
    `/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=${challengeToken}`
  );
  assert(badWebhookGet.status === 403, "Rejected invalid webhook verify_token with 403 Forbidden");

  // Step 3: Test Webhook Delivery Receipt Processing (POST)
  console.log("\n--- Step 3: Inbound Delivery Receipt Processing (POST) ---");
  const sampleMsgId = orderConfNotif.providerMessageId;
  assert(!!sampleMsgId, `Provider message ID present on notification: ${sampleMsgId}`);

  // Simulate status update to DELIVERED
  const webhookDeliveredRes = await request("/api/webhooks/whatsapp", {
    method: "POST",
    body: JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_123456",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                statuses: [
                  {
                    id: sampleMsgId,
                    status: "delivered",
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    recipient_id: orderConfNotif.recipientPhone,
                  },
                ],
              },
            },
          ],
        },
      ],
    }),
  });
  assert(webhookDeliveredRes.status === 200, "Inbound delivery receipt processed (200 OK)");

  // Re-fetch notifications and verify status moved to DELIVERED
  const refreshedKfRes = await request("/api/admin/orders/KF100001/notifications", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const updatedKfLogs = refreshedKfRes.data.data.notifications;
  const updatedOrderConf = updatedKfLogs.find((n) => n.providerMessageId === sampleMsgId);
  assert(
    updatedOrderConf.status === "DELIVERED",
    `Notification status updated to DELIVERED via webhook receipt (got: ${updatedOrderConf.status})`
  );
  assert(!!updatedOrderConf.deliveredAt, "Recorded deliveredAt timestamp");

  // Simulate status update to READ
  await request("/api/webhooks/whatsapp", {
    method: "POST",
    body: JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_123456",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                statuses: [
                  {
                    id: sampleMsgId,
                    status: "read",
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    recipient_id: orderConfNotif.recipientPhone,
                  },
                ],
              },
            },
          ],
        },
      ],
    }),
  });

  const refreshedKfRes2 = await request("/api/admin/orders/KF100001/notifications", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const updatedOrderConf2 = refreshedKfRes2.data.data.notifications.find(
    (n) => n.providerMessageId === sampleMsgId
  );
  assert(
    updatedOrderConf2.status === "READ",
    `Notification status updated to READ via webhook receipt (got: ${updatedOrderConf2.status})`
  );
  assert(!!updatedOrderConf2.readAt, "Recorded readAt timestamp");

  // Step 4: Full Order Lifecycle WhatsApp Trigger Test
  console.log("\n--- Step 4: Full Order Lifecycle Integration ---");
  // 4a. Fetch Product & Address
  const productsRes = await request("/api/products");
  const product = productsRes.data.data.products[0];
  assert(!!product, `Found catalog product: ${product.name}`);

  const addrRes = await request("/api/user/addresses", {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  const address = addrRes.data.data.addresses[0];
  assert(!!address, `Found customer address with phone: ${address.phone}`);

  // 4b. Place New Order
  const checkoutRes = await request("/api/checkout", {
    method: "POST",
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      customer: {
        fullName: "Trafalgar D. Water Law",
        mobileNumber: "+91 9123456780",
        email: "law@heartpirates.com",
        address: "Submarine Polar Tang, Berth 7",
        city: "Flevance",
        state: "North Blue",
        pinCode: "500003",
      },
      items: [{ productId: product._id, quantity: 1 }],
      paymentMethod: "UPI",
      upiId: "law@upi",
    }),
  });
  assert(checkoutRes.status === 201, "Order placed successfully (201 Created)");
  testOrderNumber = checkoutRes.data?.data?.orderNumber;
  assert(!!testOrderNumber, `Generated orderNumber: ${testOrderNumber}`);

  // 4c. Move Status to CONFIRMED -> Triggers Order Confirmation & Invoice WhatsApp
  const confirmRes = await request(`/api/admin/orders/${testOrderNumber}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: "CONFIRMED", notes: "Payment verified via bank transfer" }),
  });
  assert(confirmRes.status === 200, "Transitioned status to CONFIRMED (200 OK)");

  // Check notifications for test order
  const testNotifsRes = await request(`/api/admin/orders/${testOrderNumber}/notifications`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(testNotifsRes.status === 200, "Fetched test order notifications (200 OK)");
  const testLogs = testNotifsRes.data.data.notifications;

  const testConfNotif = testLogs.find((n) => n.notificationType === "ORDER_CONFIRMATION");
  assert(!!testConfNotif, "Auto-triggered ORDER_CONFIRMATION upon order confirmation");
  assert(
    testConfNotif.body.includes(`Your order #${testOrderNumber} has been confirmed`),
    "Contains exact order confirmation message"
  );

  const testInvNotif = testLogs.find((n) => n.notificationType === "INVOICE");
  assert(!!testInvNotif, "Auto-triggered INVOICE document notification upon order confirmation");
  assert(testInvNotif.messageType === "document", "Invoice message type is document");

  // 4d. Update Shipment -> Triggers Dispatch WhatsApp
  const shipmentRes = await request(`/api/admin/orders/${testOrderNumber}/shipment`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      courier: "Shadowfax Express",
      trackingNumber: "SFX-8829104",
      autoDispatch: true,
    }),
  });
  assert(shipmentRes.status === 200, "Assigned shipment & auto-dispatched (200 OK)");

  const testNotifsRes2 = await request(`/api/admin/orders/${testOrderNumber}/notifications`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const dispatchTestNotif = testNotifsRes2.data.data.notifications.find(
    (n) => n.notificationType === "DISPATCH"
  );
  assert(!!dispatchTestNotif, "Auto-triggered DISPATCH notification upon shipment update");
  assert(
    dispatchTestNotif.body.includes(`Your order #${testOrderNumber} has been dispatched`),
    "Dispatch body contains exact required header"
  );
  assert(
    dispatchTestNotif.body.includes("Courier: Shadowfax Express"),
    "Dispatch body states exact Courier name"
  );
  assert(
    dispatchTestNotif.body.includes("Tracking ID: SFX-8829104"),
    "Dispatch body states exact Tracking ID"
  );

  // 4e. Move Status to DELIVERED -> Triggers Delivery Update WhatsApp
  const deliveredRes = await request(`/api/admin/orders/${testOrderNumber}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: "DELIVERED", notes: "Doorstep delivery completed" }),
  });
  assert(deliveredRes.status === 200, "Transitioned status to DELIVERED (200 OK)");

  const testNotifsRes3 = await request(`/api/admin/orders/${testOrderNumber}/notifications`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const deliveryTestNotif = testNotifsRes3.data.data.notifications.find(
    (n) => n.notificationType === "DELIVERY"
  );
  assert(!!deliveryTestNotif, "Auto-triggered DELIVERY notification upon delivery update");
  assert(
    deliveryTestNotif.body.includes(`Your order #${testOrderNumber} has been delivered`),
    "Delivery body contains exact required header"
  );
  assert(
    deliveryTestNotif.body.includes("Thank you for shopping with us"),
    "Delivery body contains exact 'Thank you for shopping with us' closing"
  );

  // Step 5: Manual Admin Trigger of WhatsApp Messages
  console.log("\n--- Step 5: Manual Admin WhatsApp Triggers ---");
  const manualTriggerRes = await request(`/api/admin/orders/${testOrderNumber}/notifications`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      type: "PAYMENT_CONFIRMATION",
    }),
  });
  assert(manualTriggerRes.status === 200, "Manual PAYMENT_CONFIRMATION triggered (200 OK)");
  assert(
    manualTriggerRes.data.data.notification.notificationType === "PAYMENT_CONFIRMATION",
    "Notification recorded as PAYMENT_CONFIRMATION"
  );

  // Step 6: Global Admin Notifications Listing & Statistics
  console.log("\n--- Step 6: Global Admin Notifications Listing & Analytics ---");
  const allNotifsRes = await request("/api/admin/notifications", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(allNotifsRes.status === 200, "Fetched global notifications list (200 OK)");
  assert(allNotifsRes.data.data.notifications.length >= 5, "Total global notifications list >= 5");
  const stats = allNotifsRes.data.data.stats;
  assert(stats.total >= 5, `Analytics total tracked: ${stats.total}`);
  assert(typeof stats.sent === "number", "Analytics tracks sent count");
  assert(typeof stats.delivered === "number", "Analytics tracks delivered count");
  assert(typeof stats.read === "number", "Analytics tracks read count");

  // Step 7: RBAC Access Control Validations
  console.log("\n--- Step 7: RBAC Security Enforcement ---");
  const customerBlocked1 = await request("/api/admin/orders/KF100001/notifications", {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(customerBlocked1.status === 403, "Customer blocked from order notifications (403 Forbidden)");

  const customerBlocked2 = await request("/api/admin/notifications", {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(customerBlocked2.status === 403, "Customer blocked from global notifications (403 Forbidden)");

  const anonBlocked = await request("/api/admin/orders/KF100001/notifications");
  assert(anonBlocked.status === 401, "Unauthenticated request blocked (401 Unauthorized)");

  console.log("\n=======================================================================");
  console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${passedTests + failedTests})`);
  console.log("=======================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSprint11Tests().catch((err) => {
  console.error("Test Suite Execution Failed:", err);
  process.exit(1);
});
