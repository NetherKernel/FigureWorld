/**
 * SPRINT 12 AUTOMATED TEST SUITE: DISPATCH & SHIPPING MANAGEMENT
 * Tests:
 * 1. Database seed & authentication (Admin & Customer)
 * 2. Reference order #KF100001 shipment inspection
 * 3. Packing flow: Order -> Pack (transitions CONFIRMED -> PACKED)
 * 4. Dispatch with 5 parameters:
 *    - Courier Name
 *    - Tracking Number (AWB)
 *    - Dispatch Date
 *    - Expected Delivery Date (ETA)
 *    - Tracking URL
 * 5. Automatic transition: Order -> DISPATCHED
 * 6. Automatic customer notification (WhatsApp & Email) with courier, tracking ID, ETA, and URL
 * 7. Dynamic Tracking URL auto-computation & ETA calculation
 * 8. Shipment model record creation & synchronization
 * 9. Dispatch & Shipping Management Console API (/api/admin/shipments)
 * 10. RBAC security enforcement (Customer 403, Unauthenticated 401)
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

async function runSprint12Tests() {
  console.log("=======================================================================");
  console.log("      SPRINT 12: DISPATCH & SHIPPING MANAGEMENT TEST SUITE             ");
  console.log("=======================================================================\n");

  // Step 0: Seed & Auth
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

  // Step 1: Reference Order #KF100001 Shipment Inspection
  console.log("\n--- Step 1: Inspect Reference Order #KF100001 Shipment ---");
  const kfRes = await request("/api/admin/orders/KF100001", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(kfRes.status === 200, "Fetched Order #KF100001 via /api/admin/orders/[orderNumber]");
  const kfShipment = kfRes.data.data.shipment;
  assert(kfShipment?.courier === "Blue Dart Express", `Courier is Blue Dart Express (got: ${kfShipment?.courier})`);
  assert(kfShipment?.trackingNumber === "BD-KF100001", `Tracking number is BD-KF100001 (got: ${kfShipment?.trackingNumber})`);
  assert(!!kfShipment?.trackingUrl, `Tracking URL present: ${kfShipment?.trackingUrl}`);
  assert(!!kfShipment?.dispatchedAt, `Dispatched date present: ${kfShipment?.dispatchedAt}`);

  // Step 2: Packing Flow (Order -> Pack)
  console.log("\n--- Step 2: Packing Flow (CONFIRMED -> PACKED) ---");
  // 2a. Fetch product and create an order
  const prodRes = await request("/api/products");
  const demoProduct = prodRes.data.data.products[0];
  assert(!!demoProduct, `Found catalog figure: ${demoProduct.name}`);

  const checkoutRes = await request("/api/checkout", {
    method: "POST",
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      customer: {
        fullName: "Roronoa Zoro",
        mobileNumber: "+91 9876543210",
        email: "zoro@strawhats.com",
        address: "Thousand Sunny Crow Nest, Deck 2",
        city: "Wano Country",
        state: "Grand Line",
        pinCode: "400001",
      },
      items: [{ productId: demoProduct._id, quantity: 1 }],
      paymentMethod: "UPI",
      upiId: "zoro@upi",
    }),
  });
  assert(checkoutRes.status === 201, "Test order placed successfully");
  testOrderNumber = checkoutRes.data.data.orderNumber;
  assert(!!testOrderNumber, `Generated orderNumber: ${testOrderNumber}`);

  // 2b. Transition to CONFIRMED
  const confirmRes = await request(`/api/admin/orders/${testOrderNumber}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: "CONFIRMED", notes: "Payment verified" }),
  });
  assert(confirmRes.status === 200, "Order transitioned to CONFIRMED");

  // 2c. Mark Order as PACKED
  const packRes = await request(`/api/admin/orders/${testOrderNumber}/pack`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      notes: "Packed with bubble wrap and corner protectors in Box #4",
      boxSize: "Medium Figure Box",
      packageWeightGrams: 850,
    }),
  });
  assert(packRes.status === 200, "Pack endpoint returned 200 OK");
  assert(packRes.data.data.orderStatus === "PACKED", "Order status transitioned to PACKED");

  // Verify statusHistory captured the packaging event
  const verifyPacked = await request(`/api/admin/orders/${testOrderNumber}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const history = verifyPacked.data.data.statusHistory;
  const packEvent = history.find((h) => h.status === "PACKED");
  assert(!!packEvent, "Status history records PACKED transition event");
  assert(packEvent.notes.includes("Packed with bubble wrap"), "Status history records packing notes");

  // Step 3: Dispatch with All 5 Parameters & Automatic Customer Notification
  console.log("\n--- Step 3: Dispatch Order with Courier Details (PACKED -> DISPATCHED) ---");
  const dispatchDate = new Date("2026-09-22T10:30:00Z").toISOString();
  const expectedDeliveryDate = new Date("2026-09-25T18:00:00Z").toISOString();
  const trackingNumber = "DLV-99887766";
  const courierName = "Delhivery";
  const customTrackingUrl = "https://www.delhivery.com/track/package/DLV-99887766";

  const dispatchRes = await request(`/api/admin/orders/${testOrderNumber}/shipment`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      courier: courierName,
      trackingNumber,
      dispatchDate,
      expectedDeliveryDate,
      trackingUrl: customTrackingUrl,
      shippingNotes: "Signature collector edition figure. Handle with care.",
      autoDispatch: true,
      notifyCustomer: true,
    }),
  });
  assert(dispatchRes.status === 200, "Shipment updated and order dispatched (200 OK)");
  assert(dispatchRes.data.data.orderStatus === "DISPATCHED", "Order status transitioned to DISPATCHED");

  const shipmentData = dispatchRes.data.data.shipment;
  assert(shipmentData.courier === courierName, `Courier recorded: ${shipmentData.courier}`);
  assert(shipmentData.trackingNumber === trackingNumber, `Tracking number recorded: ${shipmentData.trackingNumber}`);
  assert(shipmentData.trackingUrl === customTrackingUrl, `Tracking URL recorded: ${shipmentData.trackingUrl}`);
  assert(!!shipmentData.dispatchedAt, `Dispatch date recorded: ${shipmentData.dispatchedAt}`);
  assert(!!shipmentData.estimatedDelivery, `Expected delivery date recorded: ${shipmentData.estimatedDelivery}`);

  // Step 4: Verify Automatic Customer Notification (WhatsApp & Email)
  console.log("\n--- Step 4: Customer Dispatch Notification Verification ---");
  const notifsRes = await request(`/api/admin/orders/${testOrderNumber}/notifications`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(notifsRes.status === 200, "Fetched order notifications list");
  const notifLogs = notifsRes.data.data.notifications;

  const dispatchNotif = notifLogs.find((n) => n.notificationType === "DISPATCH");
  assert(!!dispatchNotif, "Auto-generated DISPATCH notification for customer");
  assert(
    dispatchNotif.body.includes(`Your order #${testOrderNumber} has been dispatched`),
    "Notification includes exact header 'Your order #... has been dispatched'"
  );
  assert(
    dispatchNotif.body.includes(`Courier: ${courierName}`),
    "Notification states exact Courier name"
  );
  assert(
    dispatchNotif.body.includes(`Tracking ID: ${trackingNumber}`),
    "Notification states exact Tracking ID"
  );
  assert(
    dispatchNotif.body.includes("Dispatch Date:"),
    "Notification includes formatted Dispatch Date"
  );
  assert(
    dispatchNotif.body.includes("Expected Delivery:"),
    "Notification includes formatted Expected Delivery ETA"
  );
  assert(
    dispatchNotif.body.includes(customTrackingUrl),
    "Notification includes live tracking URL"
  );

  // Step 5: Auto-Computation of Tracking URL & Default Delivery Days
  console.log("\n--- Step 5: Auto Tracking URL & ETA Computation ---");
  // Place second test order to test auto-computation
  const checkout2 = await request("/api/checkout", {
    method: "POST",
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      customer: {
        fullName: "Nami Navigator",
        mobileNumber: "+91 9765432109",
        email: "nami@tangerines.com",
        address: "Weather Science Station",
        city: "Mumbai",
        state: "Maharashtra",
        pinCode: "400050",
      },
      items: [{ productId: demoProduct._id, quantity: 1 }],
      paymentMethod: "COD",
    }),
  });
  const order2Num = checkout2.data.data.orderNumber;

  // Confirm and Pack order 2
  await request(`/api/admin/orders/${order2Num}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: "CONFIRMED" }),
  });
  await request(`/api/admin/orders/${order2Num}/pack`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ notes: "Ready for Blue Dart pickup" }),
  });

  // Dispatch without trackingUrl and without expectedDeliveryDate
  const autoDispatchRes = await request(`/api/admin/orders/${order2Num}/shipment`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      courier: "Blue Dart Express",
      trackingNumber: "BD-88990011",
      autoDispatch: true,
    }),
  });
  assert(autoDispatchRes.status === 200, "Auto-dispatch succeeded (200 OK)");
  const autoShipment = autoDispatchRes.data.data.shipment;
  assert(
    autoShipment.trackingUrl === "https://www.bluedart.com/tracking?track=BD-88990011",
    `Auto-generated correct Blue Dart tracking URL (got: ${autoShipment.trackingUrl})`
  );
  assert(
    !!autoShipment.estimatedDelivery,
    `Auto-computed expected delivery ETA (got: ${autoShipment.estimatedDelivery})`
  );

  // Step 6: Dedicated Shipments Console API (/api/admin/shipments)
  console.log("\n--- Step 6: Shipments Console API & Queue Metrics ---");
  const shipmentsRes = await request("/api/admin/shipments", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(shipmentsRes.status === 200, "Fetched shipments console data (200 OK)");
  assert(shipmentsRes.data.success === true, "Response reports success");
  const metrics = shipmentsRes.data.data.metrics;
  assert(metrics.total >= 2, `Total orders in logistics pipeline >= 2 (got: ${metrics.total})`);
  assert(typeof metrics.readyToPack === "number", "Metrics tracks readyToPack count");
  assert(typeof metrics.readyToDispatch === "number", "Metrics tracks readyToDispatch count");
  assert(metrics.inTransit >= 2, `Metrics tracks inTransit count >= 2 (got: ${metrics.inTransit})`);
  assert(typeof metrics.delivered === "number", "Metrics tracks delivered count");

  // Test Queue Filtering
  const inTransitQueue = await request("/api/admin/shipments?queue=in_transit", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(inTransitQueue.status === 200, "Filtered queue 'in_transit' returned 200 OK");
  assert(inTransitQueue.data.data.orders.length >= 2, "In-transit queue returns dispatched orders");

  // Step 7: RBAC Access Control Enforcement
  console.log("\n--- Step 7: RBAC Security Validations ---");
  const custPackBlock = await request(`/api/admin/orders/${testOrderNumber}/pack`, {
    method: "POST",
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ notes: "Malicious pack attempt" }),
  });
  assert(custPackBlock.status === 403, "Customer blocked from packing order (403 Forbidden)");

  const custShipBlock = await request(`/api/admin/orders/${testOrderNumber}/shipment`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ courier: "FakeCourier", trackingNumber: "123" }),
  });
  assert(custShipBlock.status === 403, "Customer blocked from updating shipment (403 Forbidden)");

  const custConsoleBlock = await request("/api/admin/shipments", {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(custConsoleBlock.status === 403, "Customer blocked from shipments console (403 Forbidden)");

  const anonBlock = await request("/api/admin/shipments");
  assert(anonBlock.status === 401, "Unauthenticated request blocked (401 Unauthorized)");

  console.log("\n=======================================================================");
  console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${passedTests + failedTests})`);
  console.log("=======================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSprint12Tests().catch((err) => {
  console.error("Test Suite Execution Failed:", err);
  process.exit(1);
});
