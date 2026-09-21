/**
 * FiguresWorld - Sprint 7 Direct UPI Payment & Verification Automated Test Suite
 *
 * Tests:
 * 1. Checkout with Direct UPI -> PENDING paymentStatus, pending orderStatus, QR code and merchant VPA generated
 * 2. Customer submits 12-digit UTR reference ID -> transitions to UNDER_REVIEW, orderStatus remains pending
 * 3. Validation: Reject invalid/empty UTR (< 6 chars)
 * 4. RBAC Protection: Customer blocked from /api/admin/payments/verify (403 Forbidden)
 * 5. Admin Payment Console: Lists under-review payments with metrics
 * 6. Admin Payment Confirmation: action CONFIRM -> transitions to PAID and orderStatus to confirmed
 * 7. Admin Payment Rejection: action REJECT -> transitions to FAILED, cancels order, and restores inventory stock
 * 8. Cash on Delivery (COD): paymentStatus PENDING, orderStatus confirmed
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

async function runSprint7Tests() {
  console.log("=======================================================================");
  console.log("      SPRINT 7: DIRECT UPI PAYMENT & VERIFICATION TEST SUITE           ");
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
    // 0. Seed Database
    console.log("--- Step 0: Ensure Database Seeded ---");
    const seedRes = await request("/api/seed");
    assert(seedRes.status === 200 && seedRes.json?.success, "Database seeded successfully");

    // Authenticate Admin & Customer
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

    // 1. Fetch Product
    console.log("\n--- Step 1: Fetch Catalog Product ---");
    const figureRes = await request("/api/products?search=Anime Figure");
    const animeFigure = figureRes.json?.data?.products?.find((p) => p.name === "Anime Figure");
    assert(!!animeFigure, "Found 'Anime Figure' in catalog");
    const initialStock = animeFigure.stock;

    // 2. Direct UPI Order Creation
    console.log("\n--- Step 2: Direct UPI Order Creation (PENDING State) ---");
    const upiCheckoutRes = await request("/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        customer: {
          fullName: "Roronoa Zoro",
          mobileNumber: "9876543210",
          email: "zoro@wano.com",
          address: "100 Swordsman Way",
          city: "Mumbai",
          state: "Maharashtra",
          pinCode: "400001",
          landmark: "Near Gateway of India",
        },
        items: [{ productId: animeFigure._id, quantity: 1 }],
        paymentMethod: "UPI",
        upiId: "zoro@okhdfcbank",
        ageConfirmed: false,
      }),
    });

    assert(upiCheckoutRes.status === 201, "UPI Order placed successfully (201 Created)");
    const orderData = upiCheckoutRes.json?.data;
    assert(orderData?.orderNumber?.startsWith("FW-"), `Generated orderNumber: ${orderData?.orderNumber}`);
    assert(orderData?.paymentMethod === "UPI", "Payment method recorded as UPI");
    assert(
      orderData?.paymentStatus === "PENDING" || orderData?.paymentStatus === "pending",
      `Payment status initialized to PENDING (got ${orderData?.paymentStatus})`
    );
    assert(
      orderData?.orderStatus === "pending",
      `Order status initialized to pending (awaiting payment confirmation)`
    );
    assert(
      orderData?.paymentDetails?.merchantUpiId === "figuresworld@icici",
      `Merchant UPI VPA configured: ${orderData?.paymentDetails?.merchantUpiId}`
    );
    assert(
      orderData?.paymentDetails?.qrPayload?.includes("upi://pay"),
      "Standard UPI intent QR payload generated"
    );
    assert(
      orderData?.paymentDetails?.qrDataUrl?.startsWith("data:image/png;base64,"),
      "High-resolution QR code PNG Data URL generated"
    );

    const testOrderNumber = orderData.orderNumber;

    // 3. Customer Reference Submission Validations
    console.log("\n--- Step 3: Customer Reference Submission Validations ---");
    const shortRefRes = await request(`/api/orders/${testOrderNumber}/payment-reference`, {
      method: "POST",
      body: JSON.stringify({
        transactionRef: "123", // too short (< 6 chars)
      }),
    });
    assert(shortRefRes.status === 400, "Rejected invalid/short transaction reference (< 6 chars)");

    // 4. Valid Transaction Reference Submission -> Moves to UNDER_REVIEW
    console.log("\n--- Step 4: Submit Valid 12-Digit UTR Reference ID ---");
    const validUtr = "426189304721";
    const submitRefRes = await request(`/api/orders/${testOrderNumber}/payment-reference`, {
      method: "POST",
      body: JSON.stringify({
        transactionRef: validUtr,
        upiApp: "Google Pay",
        notes: "Paid via GPay at 18:45 IST",
      }),
    });

    assert(submitRefRes.status === 200, "Transaction reference submitted successfully (200 OK)");
    const submitData = submitRefRes.json?.data;
    assert(
      submitData?.paymentStatus === "UNDER_REVIEW",
      `Payment status transitioned to UNDER_REVIEW (got ${submitData?.paymentStatus})`
    );
    // CRITICAL: Order must NOT be confirmed upon customer submission!
    assert(
      submitData?.orderStatus === "pending",
      `Order status remains 'pending' (Zero-Trust: submission != confirmed)`
    );
    assert(submitData?.transactionRef === validUtr, `Stored transactionRef: ${submitData?.transactionRef}`);

    // 5. RBAC Enforcement on Payment Verification
    console.log("\n--- Step 5: RBAC Protection on Verification Endpoint ---");
    const customerVerifyAttempt = await request("/api/admin/payments/verify", {
      method: "POST",
      cookie: customerCookie,
      body: JSON.stringify({
        orderNumber: testOrderNumber,
        action: "CONFIRM",
      }),
    });
    assert(
      customerVerifyAttempt.status === 403,
      "Customer role blocked from verifying payments (403 Forbidden)"
    );

    const anonVerifyAttempt = await request("/api/admin/payments/verify", {
      method: "POST",
      body: JSON.stringify({
        orderNumber: testOrderNumber,
        action: "CONFIRM",
      }),
    });
    assert(
      anonVerifyAttempt.status === 401,
      "Unauthenticated request blocked from verifying payments (401 Unauthorized)"
    );

    // 6. Admin Payment List & Metrics
    console.log("\n--- Step 6: Admin Payment Console Listing & Metrics ---");
    const adminPaymentsRes = await request("/api/admin/payments?status=UNDER_REVIEW", {
      cookie: adminCookie,
    });
    assert(adminPaymentsRes.status === 200, "Admin fetched payments list (200 OK)");
    const metrics = adminPaymentsRes.json?.data?.metrics;
    assert(metrics?.underReview >= 1, `Metrics track underReview payments count: ${metrics?.underReview}`);

    const listedOrder = adminPaymentsRes.json?.data?.orders?.find(
      (o) => o.orderNumber === testOrderNumber
    );
    assert(!!listedOrder, "Submitted order found in admin Under Review queue");
    assert(
      listedOrder?.paymentDetails?.transactionRef === validUtr,
      "Admin view includes submitted UTR reference ID"
    );

    // 7. Admin Verifies and Confirms Payment
    console.log("\n--- Step 7: Admin Verifies & Confirms Payment ---");
    const confirmPaymentRes = await request("/api/admin/payments/verify", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({
        orderNumber: testOrderNumber,
        action: "CONFIRM",
        notes: "Verified in ICICI merchant statement UTR #426189304721",
      }),
    });

    assert(confirmPaymentRes.status === 200, "Admin payment confirmation returned 200 OK");
    const confirmedData = confirmPaymentRes.json?.data;
    assert(
      confirmedData?.paymentStatus === "PAID",
      `Payment status transitioned to PAID (got ${confirmedData?.paymentStatus})`
    );
    assert(
      confirmedData?.orderStatus === "confirmed",
      `Order status transitioned to 'confirmed' upon payment verification`
    );
    assert(
      !!confirmedData?.paymentDetails?.verifiedAt,
      "Verification timestamp verifiedAt recorded"
    );
    assert(
      !!confirmedData?.paymentDetails?.verifiedBy,
      "Admin verifier ID verifiedBy recorded"
    );

    // 8. Order Status Query by OrderNumber
    console.log("\n--- Step 8: Order Details Query (/api/orders/[orderNumber]) ---");
    const orderDetailsRes = await request(`/api/orders/${testOrderNumber}`);
    assert(orderDetailsRes.status === 200, "Fetched order details via /api/orders/[orderNumber]");
    assert(
      orderDetailsRes.json?.data?.paymentStatus === "PAID",
      "Public order query reflects verified PAID paymentStatus"
    );
    assert(
      orderDetailsRes.json?.data?.orderStatus === "confirmed",
      "Public order query reflects confirmed orderStatus"
    );

    // 9. Admin Rejection Flow & Stock Restoration
    console.log("\n--- Step 9: Admin Rejection Flow & Stock Restoration ---");
    // Place second order
    const figureStockBefore = (await request(`/api/products/${animeFigure._id}`)).json?.data?.product?.stock;

    const rejectedOrderRes = await request("/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        customer: {
          fullName: "Fake Payment Tester",
          mobileNumber: "9123456789",
          email: "tester@fake.com",
          address: "123 Fraud Lane",
          city: "Delhi",
          state: "Delhi",
          pinCode: "110001",
        },
        items: [{ productId: animeFigure._id, quantity: 2 }],
        paymentMethod: "UPI",
        upiId: "fake@upi",
      }),
    });
    const rejectedOrderNumber = rejectedOrderRes.json?.data?.orderNumber;
    assert(!!rejectedOrderNumber, `Placed second test order: ${rejectedOrderNumber}`);

    // Stock should be decremented by 2
    const figureStockAfterOrder = (await request(`/api/products/${animeFigure._id}`)).json?.data?.product?.stock;
    assert(
      figureStockAfterOrder === figureStockBefore - 2,
      `Inventory decremented by 2 (from ${figureStockBefore} to ${figureStockAfterOrder})`
    );

    // Submit invalid UTR
    await request(`/api/orders/${rejectedOrderNumber}/payment-reference`, {
      method: "POST",
      body: JSON.stringify({
        transactionRef: "INVALID-UTR-999",
        upiApp: "PhonePe",
      }),
    });

    // Admin rejects payment
    const rejectRes = await request("/api/admin/payments/verify", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({
        orderNumber: rejectedOrderNumber,
        action: "REJECT",
        rejectionReason: "UTR not found in bank statement; amount not credited.",
      }),
    });

    assert(rejectRes.status === 200, "Admin rejected invalid transaction (200 OK)");
    assert(
      rejectRes.json?.data?.paymentStatus === "FAILED",
      `Payment status transitioned to FAILED (got ${rejectRes.json?.data?.paymentStatus})`
    );
    assert(
      rejectRes.json?.data?.orderStatus === "cancelled",
      `Order status transitioned to 'cancelled'`
    );

    // Verify stock is restored
    const figureStockAfterReject = (await request(`/api/products/${animeFigure._id}`)).json?.data?.product?.stock;
    assert(
      figureStockAfterReject === figureStockBefore,
      `Stock restored back to ${figureStockBefore} after payment rejection`
    );

    // 10. Cash on Delivery (COD) Flow
    console.log("\n--- Step 10: Cash on Delivery (COD) Order Flow ---");
    const codOrderRes = await request("/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        customer: {
          fullName: "Naruto Uzumaki",
          mobileNumber: "9876543210",
          email: "naruto@leaf.com",
          address: "Hokage Residence",
          city: "Bengaluru",
          state: "Karnataka",
          pinCode: "560001",
        },
        items: [{ productId: animeFigure._id, quantity: 1 }],
        paymentMethod: "COD",
      }),
    });

    assert(codOrderRes.status === 201, "COD order placed successfully (201 Created)");
    const codData = codOrderRes.json?.data;
    assert(codData?.paymentMethod === "COD", "Recorded paymentMethod: COD");
    assert(
      codData?.paymentStatus === "PENDING" || codData?.paymentStatus === "pending",
      "COD paymentStatus is PENDING until doorstep delivery"
    );
    assert(
      codData?.orderStatus === "confirmed",
      "COD orderStatus is confirmed immediately upon checkout"
    );

  } catch (error) {
    console.error("Test execution failed with error:", error);
    failed++;
  }

  console.log("\n=======================================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log("=======================================================================\n");

  process.exitCode = failed > 0 ? 1 : 0;
}

runSprint7Tests();
