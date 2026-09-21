/**
 * FiguresWorld - Sprint 8 Cash on Delivery (COD) Automated Test Suite
 *
 * Tests:
 * 1. COD Maximum Limit Enforcement (> ₹15,000 rejected)
 * 2. Order Creation with COD -> PENDING_VERIFICATION & orderStatus pending
 * 3. Admin Call Customer Logging (NO_ANSWER & ANSWERED with notes)
 * 4. Admin Mark Verified / Accept COD -> codStatus VERIFIED & orderStatus confirmed
 * 5. Admin Dispatch Order -> codStatus DISPATCHED & orderStatus shipped with courier details
 * 6. Admin Reject COD -> codStatus REJECTED, order cancelled & inventory stock restored
 * 7. Admin Cancel COD -> codStatus CANCELLED, order cancelled & inventory stock restored
 * 8. RBAC Security: Customer blocked (403 Forbidden) and Unauthenticated blocked (401 Unauthorized)
 * 9. Admin COD Console Listing & Metrics Calculation
 */

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

let adminCookie = "";
let customerCookie = "";

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (options.cookie) {
    headers["Cookie"] = options.cookie;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // text response
  }

  const setCookieHeader = res.headers.get("set-cookie");
  let cookie = null;
  if (setCookieHeader) {
    cookie = setCookieHeader.split(";")[0];
  }

  return { status: res.status, json, text, cookie };
}

async function runSprint8Tests() {
  console.log("=======================================================================");
  console.log("      SPRINT 8: CASH ON DELIVERY (COD) SYSTEM AUTOMATED TEST SUITE     ");
  console.log("=======================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 0. Seed Database & Authenticate
    console.log("--- Step 0: Ensure Database Seeded & Authenticate ---");
    const seedRes = await request("/api/seed");
    assert(seedRes.status === 200 && seedRes.json?.success, "Database seeded successfully");

    const adminLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@figuresworld.com", password: "Admin@123456" }),
    });
    adminCookie = adminLogin.cookie || "";
    assert(adminLogin.status === 200, "Admin authenticated successfully");

    const customerLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "customer@figuresworld.com", password: "Customer@123456" }),
    });
    customerCookie = customerLogin.cookie || "";
    assert(customerLogin.status === 200, "Customer authenticated successfully");

    // 1. Fetch Catalog Product
    console.log("\n--- Step 1: Fetch Catalog Product ---");
    const figureRes = await request("/api/products?search=Anime Figure");
    const animeFigure = figureRes.json?.data?.products?.find((p) => p.name === "Anime Figure");
    assert(!!animeFigure, "Found 'Anime Figure' in catalog (price: 2499)");

    // 2. COD Maximum Order Limit Enforcement (₹15,000 ceiling)
    console.log("\n--- Step 2: COD Max Order Limit Enforcement (> ₹15,000) ---");
    const highValueCodRes = await request("/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        customer: {
          fullName: "Kaido King of Beasts",
          mobileNumber: "9876543210",
          email: "kaido@onigashima.com",
          address: "1 Skull Dome Peak",
          city: "Wano",
          state: "Maharashtra",
          pinCode: "400001",
        },
        items: [{ productId: animeFigure._id, quantity: 8 }], // 8 * 2499 + 100 = 20,092 > 15,000
        paymentMethod: "COD",
      }),
    });
    const highValueMsg = (highValueCodRes.json?.error?.message || highValueCodRes.json?.message || "").toLowerCase();
    assert(
      highValueCodRes.status === 400 && (highValueMsg.includes("15,000") || highValueMsg.includes("cash on delivery")),
      "Blocked COD order exceeding ₹15,000 threshold (400 Bad Request)"
    );

    // 3. Normal COD Order Creation (Lifecycle: Order Created -> PENDING_VERIFICATION)
    console.log("\n--- Step 3: COD Order Creation (PENDING_VERIFICATION State) ---");
    const initialStock = (await request(`/api/products/${animeFigure._id}`)).json?.data?.product?.stock;

    const codOrderRes = await request("/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        customer: {
          fullName: "Portgas D. Ace",
          mobileNumber: "9876543210",
          email: "ace@whitebeard.com",
          address: "Spade Pirates Flagship, Berth 2",
          city: "Bengaluru",
          state: "Karnataka",
          pinCode: "560001",
          landmark: "Near Marine Dock",
        },
        items: [{ productId: animeFigure._id, quantity: 1 }],
        paymentMethod: "COD",
      }),
    });

    assert(codOrderRes.status === 201, "COD order created successfully (201 Created)");
    const codData = codOrderRes.json?.data;
    const testOrderNumber = codData?.orderNumber;
    assert(testOrderNumber?.startsWith("FW-"), `Generated orderNumber: ${testOrderNumber}`);
    assert(codData?.paymentMethod === "COD", "Payment method is COD");
    assert(
      codData?.paymentStatus === "PENDING" || codData?.paymentStatus === "pending",
      "Payment status is PENDING (doorstep collection)"
    );
    assert(
      codData?.orderStatus === "pending",
      "Order status is 'pending' (Awaiting COD Phone Verification)"
    );
    assert(
      codData?.codDetails?.codStatus === "PENDING_VERIFICATION",
      "COD status initialized to 'PENDING_VERIFICATION'"
    );
    assert(
      Array.isArray(codData?.codDetails?.callLogs) && codData.codDetails.callLogs.length === 0,
      "Initialized empty callLogs array"
    );

    // 4. Admin Calls Customer & Logs Verification Attempts
    console.log("\n--- Step 4: Admin Customer Phone Call Logging ---");
    // Call 1: No Answer
    const call1Res = await request("/api/admin/cod/action", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({
        orderNumber: testOrderNumber,
        action: "LOG_CALL",
        callStatus: "NO_ANSWER",
        notes: "First attempt at 10:30 AM: Rang 5 times, no response.",
      }),
    });
    assert(call1Res.status === 200, "Logged Call 1: NO_ANSWER (200 OK)");

    // Call 2: Answered and Confirmed
    const call2Res = await request("/api/admin/cod/action", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({
        orderNumber: testOrderNumber,
        action: "LOG_CALL",
        callStatus: "ANSWERED",
        notes: "Customer confirmed identity and verified delivery address.",
      }),
    });
    assert(call2Res.status === 200, "Logged Call 2: ANSWERED (200 OK)");
    assert(
      call2Res.json?.data?.codDetails?.callLogs?.length === 2,
      "Order records exactly 2 verification phone calls in callLogs"
    );

    // 5. Admin Accepts COD / Marks Verified
    console.log("\n--- Step 5: Admin Accepts COD & Marks Verified ---");
    const acceptRes = await request("/api/admin/cod/action", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({
        orderNumber: testOrderNumber,
        action: "ACCEPT",
        notes: "Address coordinates and phone verified.",
      }),
    });

    assert(acceptRes.status === 200, "Admin accepted COD order (200 OK)");
    const acceptedData = acceptRes.json?.data;
    assert(
      acceptedData?.codDetails?.codStatus === "VERIFIED",
      "COD status transitioned to 'VERIFIED'"
    );
    assert(
      acceptedData?.orderStatus === "confirmed",
      "Order status transitioned to 'confirmed' upon COD verification"
    );
    assert(
      !!acceptedData?.codDetails?.verifiedAt,
      "Recorded verifiedAt timestamp"
    );
    assert(
      !!acceptedData?.codDetails?.verifiedBy,
      "Recorded verifiedBy admin identifier"
    );

    // 6. Admin Dispatches Verified COD Order
    console.log("\n--- Step 6: Admin Dispatches COD Order ---");
    const dispatchRes = await request("/api/admin/cod/action", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({
        orderNumber: testOrderNumber,
        action: "DISPATCH",
        courierPartner: "Blue Dart Express",
        trackingNumber: "BD-92019482",
      }),
    });

    assert(dispatchRes.status === 200, "Admin dispatched COD order (200 OK)");
    const dispatchedData = dispatchRes.json?.data;
    assert(
      dispatchedData?.codDetails?.codStatus === "DISPATCHED",
      "COD status transitioned to 'DISPATCHED'"
    );
    assert(
      dispatchedData?.orderStatus === "shipped",
      "Order status transitioned to 'shipped'"
    );
    assert(
      dispatchedData?.codDetails?.courierPartner === "Blue Dart Express",
      "Recorded courierPartner: Blue Dart Express"
    );
    assert(
      dispatchedData?.codDetails?.trackingNumber === "BD-92019482",
      "Recorded trackingNumber: BD-92019482"
    );

    // 7. Admin Rejection Flow & Automatic Inventory Restoration
    console.log("\n--- Step 7: Admin COD Rejection Flow & Inventory Restoration ---");
    const stockBeforeRejectOrder = (await request(`/api/products/${animeFigure._id}`)).json?.data?.product?.stock;

    const rejectOrderRes = await request("/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        customer: {
          fullName: "Bogus Customer",
          mobileNumber: "9123456789",
          email: "bogus@fake.com",
          address: "99 Fake Street",
          city: "Mumbai",
          state: "Maharashtra",
          pinCode: "400001",
        },
        items: [{ productId: animeFigure._id, quantity: 2 }],
        paymentMethod: "COD",
      }),
    });
    const rejectOrderNumber = rejectOrderRes.json?.data?.orderNumber;
    assert(!!rejectOrderNumber, `Placed COD order for rejection: ${rejectOrderNumber}`);

    const stockAfterPlaced = (await request(`/api/products/${animeFigure._id}`)).json?.data?.product?.stock;
    assert(
      stockAfterPlaced === stockBeforeRejectOrder - 2,
      `Inventory stock decremented by 2 upon placement (${stockBeforeRejectOrder} -> ${stockAfterPlaced})`
    );

    // Admin rejects COD
    const rejectActionRes = await request("/api/admin/cod/action", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({
        orderNumber: rejectOrderNumber,
        action: "REJECT",
        rejectionReason: "Phone disconnected / fake number.",
      }),
    });

    assert(rejectActionRes.status === 200, "Admin rejected COD order (200 OK)");
    assert(
      rejectActionRes.json?.data?.codDetails?.codStatus === "REJECTED",
      "COD status transitioned to 'REJECTED'"
    );
    assert(
      rejectActionRes.json?.data?.orderStatus === "cancelled",
      "Order status transitioned to 'cancelled'"
    );

    // Verify stock restoration
    const stockAfterReject = (await request(`/api/products/${animeFigure._id}`)).json?.data?.product?.stock;
    assert(
      stockAfterReject === stockBeforeRejectOrder,
      `Inventory stock restored by 2 back to ${stockBeforeRejectOrder}`
    );

    // 8. Admin Cancellation Flow & Inventory Restoration
    console.log("\n--- Step 8: Admin COD Cancellation Flow & Inventory Restoration ---");
    const stockBeforeCancelOrder = (await request(`/api/products/${animeFigure._id}`)).json?.data?.product?.stock;

    const cancelOrderRes = await request("/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        customer: {
          fullName: "Customer Canceller",
          mobileNumber: "9988776655",
          email: "canceller@domain.com",
          address: "50 Marina Bay",
          city: "Chennai",
          state: "Tamil Nadu",
          pinCode: "600001",
        },
        items: [{ productId: animeFigure._id, quantity: 1 }],
        paymentMethod: "COD",
      }),
    });
    const cancelOrderNumber = cancelOrderRes.json?.data?.orderNumber;

    const cancelActionRes = await request("/api/admin/cod/action", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({
        orderNumber: cancelOrderNumber,
        action: "CANCEL",
        cancellationReason: "Customer changed mind before dispatch.",
      }),
    });

    assert(cancelActionRes.status === 200, "Admin cancelled COD order (200 OK)");
    assert(
      cancelActionRes.json?.data?.codDetails?.codStatus === "CANCELLED",
      "COD status transitioned to 'CANCELLED'"
    );

    const stockAfterCancel = (await request(`/api/products/${animeFigure._id}`)).json?.data?.product?.stock;
    assert(
      stockAfterCancel === stockBeforeCancelOrder,
      `Inventory stock restored after cancellation (${stockAfterCancel})`
    );

    // 9. RBAC Protection
    console.log("\n--- Step 9: RBAC Security on COD Actions ---");
    const customerActionAttempt = await request("/api/admin/cod/action", {
      method: "POST",
      cookie: customerCookie,
      body: JSON.stringify({
        orderNumber: testOrderNumber,
        action: "ACCEPT",
      }),
    });
    assert(
      customerActionAttempt.status === 403,
      "Customer role blocked from COD admin actions (403 Forbidden)"
    );

    const anonActionAttempt = await request("/api/admin/cod/action", {
      method: "POST",
      body: JSON.stringify({
        orderNumber: testOrderNumber,
        action: "ACCEPT",
      }),
    });
    assert(
      anonActionAttempt.status === 401,
      "Unauthenticated request blocked from COD admin actions (401 Unauthorized)"
    );

    // 10. Admin COD Console Listing & Metrics
    console.log("\n--- Step 10: Admin COD Console Listing & Metrics ---");
    const codListRes = await request("/api/admin/cod?status=ALL", {
      cookie: adminCookie,
    });
    assert(codListRes.status === 200, "Admin fetched COD list (200 OK)");
    const metrics = codListRes.json?.data?.metrics;
    assert(metrics?.total >= 3, `Metrics track total COD orders: ${metrics?.total}`);
    assert(metrics?.dispatched >= 1, `Metrics track dispatched COD orders: ${metrics?.dispatched}`);
    assert(metrics?.rejected >= 1, `Metrics track rejected COD orders: ${metrics?.rejected}`);
    assert(metrics?.cancelled >= 1, `Metrics track cancelled COD orders: ${metrics?.cancelled}`);

  } catch (error) {
    console.error("Test execution failed with error:", error);
    failed++;
  }

  console.log("\n=======================================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log("=======================================================================\n");

  process.exitCode = failed > 0 ? 1 : 0;
}

runSprint8Tests();
