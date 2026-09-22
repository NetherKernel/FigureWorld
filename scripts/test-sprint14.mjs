// scripts/test-sprint14.mjs
// Automated verification suite for Sprint 14 — Security, Compliance & Production Hardening

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failedCount++;
  }
}

async function runTests() {
  console.log("=======================================================================");
  console.log("     SPRINT 14: SECURITY, COMPLIANCE & PRODUCTION HARDENING SUITE      ");
  console.log("=======================================================================\n");

  // Step 0: Seed Database & Authentication
  console.log("--- Step 0: Database Seed & Authentication ---");
  const seedRes = await fetch(`${BASE_URL}/api/seed`, { method: "POST" });
  assert(seedRes.ok, "Database seeded successfully");

  // Login Admin
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@figuresworld.com", password: "Admin@123456" }),
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.data?.token;
  const adminCookie = adminLoginRes.headers.get("set-cookie") || `auth_token=${adminToken}`;
  assert(adminToken, "Admin authenticated successfully");

  // Login Customer A (Luffy)
  const custALoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "customer@figuresworld.com", password: "Customer@123456" }),
  });
  const custALoginData = await custALoginRes.json();
  const custAToken = custALoginData.data?.token;
  const custACookie = custALoginRes.headers.get("set-cookie") || `auth_token=${custAToken}`;
  assert(custAToken, "Customer A (Monkey D. Luffy) authenticated successfully");

  // Register / Login Customer B (Attacker / Unrelated User)
  const custBLoginRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Buggy the Clown",
      email: `buggy_${Date.now()}@pirates.com`,
      password: "Customer@123456",
    }),
  });
  const custBLoginData = await custBLoginRes.json();
  const custBToken = custBLoginData.data?.token;
  const custBCookie = custBLoginRes.headers.get("set-cookie") || `auth_token=${custBToken}`;
  assert(custBToken, "Customer B (Buggy) registered & authenticated successfully");

  // Step 1: Security Headers Verification
  console.log("\n--- Step 1: HTTP Security Headers Enforcement ---");
  const headersRes = await fetch(`${BASE_URL}/api/health`);
  const xFrame = headersRes.headers.get("x-frame-options");
  const xContentType = headersRes.headers.get("x-content-type-options");
  const referrerPolicy = headersRes.headers.get("referrer-policy");
  const permissionsPolicy = headersRes.headers.get("permissions-policy");

  assert(xFrame === "SAMEORIGIN", `X-Frame-Options is SAMEORIGIN (got: ${xFrame})`);
  assert(xContentType === "nosniff", `X-Content-Type-Options is nosniff (got: ${xContentType})`);
  assert(referrerPolicy === "strict-origin-when-cross-origin", `Referrer-Policy is strict-origin-when-cross-origin (got: ${referrerPolicy})`);
  assert(permissionsPolicy?.includes("camera=()"), `Permissions-Policy restricts sensitive sensors (got: ${permissionsPolicy})`);

  // Step 2: Cross-Site Request Forgery (CSRF) Defense
  console.log("\n--- Step 2: CSRF Defense on Cookie Mutations ---");
  const csrfAttackRes = await fetch(`${BASE_URL}/api/admin/settings`, {
    method: "PUT",
    headers: {
      Cookie: adminCookie,
      Origin: "https://evil-attacker-site.com",
      Referer: "https://evil-attacker-site.com/steal",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ storeName: "Hacked Store" }),
  });
  assert(csrfAttackRes.status === 403, `Cross-origin cookie mutation blocked with 403 Forbidden (got: ${csrfAttackRes.status})`);
  const csrfErrData = await csrfAttackRes.json();
  assert(csrfErrData.error?.code === "ERR_CSRF_REJECTED", "Rejection returned ERR_CSRF_REJECTED code");

  // Step 3: Rate Limiting Defense
  console.log("\n--- Step 3: Rate Limiting & Brute-Force Defense ---");
  let rateLimitHit = false;
  let retryAfterHeader = null;

  // Send burst of requests to trigger rate limiter
  for (let i = 0; i < 22; i++) {
    const rlRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": "203.0.113.195",
      },
      body: JSON.stringify({ email: "victim@test.com", password: "wrong" }),
    });

    if (rlRes.status === 429) {
      rateLimitHit = true;
      retryAfterHeader = rlRes.headers.get("retry-after");
      break;
    }
  }
  assert(rateLimitHit, "Rate limiter tripped HTTP 429 Too Many Requests upon rapid bursts");
  assert(retryAfterHeader !== null, `Response includes Retry-After header (got: ${retryAfterHeader}s)`);

  // Step 4: Secure File Upload Hardening
  console.log("\n--- Step 4: Secure File Upload Hardening ---");

  // 4a. Reject dangerous executable extension (.exe)
  const exeFormData = new FormData();
  const exeBlob = new Blob(["MZ...executable binary content"], { type: "application/octet-stream" });
  exeFormData.append("file", exeBlob, "malware.exe");

  const exeUploadRes = await fetch(`${BASE_URL}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}`, Cookie: adminCookie },
    body: exeFormData,
  });
  assert(exeUploadRes.status === 400, "Blocked executable .exe upload with 400 Bad Request");

  // 4b. Reject double extension trick (shell.php.png)
  const doubleExtFormData = new FormData();
  const doubleExtBlob = new Blob(["<?php system($_GET['cmd']); ?>"], { type: "image/png" });
  doubleExtFormData.append("file", doubleExtBlob, "shell.php.png");

  const doubleExtRes = await fetch(`${BASE_URL}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}`, Cookie: adminCookie },
    body: doubleExtFormData,
  });
  assert(doubleExtRes.status === 400, "Blocked disguised script shell.php.png with 400 Bad Request");

  // 4c. Reject spoofed text file with fake PNG header (Magic bytes validation)
  const fakePngFormData = new FormData();
  const fakePngBlob = new Blob(["This is a text file claiming to be PNG"], { type: "image/png" });
  fakePngFormData.append("file", fakePngBlob, "fake_photo.png");

  const fakePngRes = await fetch(`${BASE_URL}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}`, Cookie: adminCookie },
    body: fakePngFormData,
  });
  assert(fakePngRes.status === 400, "Rejected spoofed image failing magic bytes check with 400 Bad Request");

  // 4d. Accept genuine PNG file with valid magic bytes (89 50 4E 47 0D 0A 1A 0A)
  const validPngBytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  ]);
  const validFormData = new FormData();
  const validBlob = new Blob([validPngBytes], { type: "image/png" });
  validFormData.append("file", validBlob, "valid_figure_photo.png");

  const validUploadRes = await fetch(`${BASE_URL}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}`, Cookie: adminCookie },
    body: validFormData,
  });
  assert(validUploadRes.status === 201, "Accepted legitimate PNG with valid magic bytes (201 Created)");

  // Step 5: Zero-Trust Order Security (Tampering Prevention)
  console.log("\n--- Step 5: Zero-Trust Order Security & Tampering Prevention ---");

  // Fetch catalog product
  const prodsRes = await fetch(`${BASE_URL}/api/products`);
  const prodsJson = await prodsRes.json();
  const animeFigure = prodsJson.data.products.find((p) => p.name === "Anime Figure");
  assert(animeFigure !== undefined, "Found 'Anime Figure' in catalog");
  const authoritativePrice = animeFigure.price; // ₹2,499

  const baseCustomer = {
    fullName: "Monkey D. Luffy",
    mobileNumber: "+91 9876543210",
    email: "customer@figuresworld.com",
    address: "100 Thousand Sunny Deck",
    city: "Mumbai",
    state: "Maharashtra",
    pinCode: "400001",
  };

  // 5a. Prevent Fake Price & Fake Statuses
  const tamperedOrderRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${custAToken}`,
      Cookie: custACookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer: baseCustomer,
      items: [{ productId: animeFigure._id, quantity: 2, unitPrice: 1 }], // Hacked price ₹1
      paymentMethod: "UPI",
      upiId: "luffy@icici",
      orderStatus: "DELIVERED", // Hacked order status
      paymentStatus: "PAID", // Hacked payment status
    }),
  });
  assert(tamperedOrderRes.status === 201, "Checkout request processed successfully");
  const tamperedJson = await tamperedOrderRes.json();
  const placedOrder = tamperedJson.data;

  assert(
    placedOrder.pricing.subtotal === authoritativePrice * 2,
    `Server enforced database price ₹${authoritativePrice * 2} (Ignored client hacked price ₹2)`
  );
  assert(
    placedOrder.orderStatus === "pending",
    `Server enforced initial orderStatus 'pending' (Ignored client fake status 'DELIVERED')`
  );
  assert(
    placedOrder.paymentStatus === "PENDING",
    `Server enforced initial paymentStatus 'PENDING' (Ignored client fake status 'PAID')`
  );

  // 5b. Prevent Fake Discount / Invalid Coupon
  const fakeCouponRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${custAToken}`,
      Cookie: custACookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer: baseCustomer,
      items: [{ productId: animeFigure._id, quantity: 1 }],
      paymentMethod: "UPI",
      upiId: "luffy@icici",
      couponCode: "FAKEDISCOUNT9999",
    }),
  });
  assert(fakeCouponRes.status === 400, "Fake coupon code rejected with 400 Bad Request");

  // 5c. Authoritative Server Discount with Valid Coupon (WELCOME10)
  const validCouponRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${custAToken}`,
      Cookie: custACookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer: baseCustomer,
      items: [{ productId: animeFigure._id, quantity: 1 }],
      paymentMethod: "UPI",
      upiId: "luffy@icici",
      couponCode: "WELCOME10",
    }),
  });
  assert(validCouponRes.status === 201, "Order placed with valid coupon WELCOME10 (201 Created)");
  const couponOrderJson = await validCouponRes.json();
  const expectedDiscount = Math.round((authoritativePrice * 10) / 100);
  assert(
    couponOrderJson.data.pricing.discountTotal === expectedDiscount,
    `Authoritative 10% discount computed server-side: ₹${expectedDiscount}`
  );
  assert(
    couponOrderJson.data.pricing.grandTotal === authoritativePrice - expectedDiscount + 100,
    "Authoritative grand total computed: Subtotal - Discount + Shipping"
  );

  // 5d. Prevent Fake Stock (Clamped/Rejected when exceeding warehouse stock)
  const fakeStockRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${custAToken}`,
      Cookie: custACookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer: baseCustomer,
      items: [{ productId: animeFigure._id, quantity: 99999 }],
      paymentMethod: "UPI",
      upiId: "luffy@icici",
    }),
  });
  assert(fakeStockRes.status === 409, "Insufficient warehouse stock rejected with 409 Conflict");

  // Step 6: Katana & Restricted Merchandise Compliance
  console.log("\n--- Step 6: Katana Legal Compliance & Bypass Prevention ---");
  const katanaProduct = prodsJson.data.products.find((p) => p.isRestricted === true);
  assert(katanaProduct !== undefined, "Found 18+ restricted 'Nichirin Katana Replica' in catalog");

  // 6a. Reject purchase without age confirmed
  const noAgeRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${custAToken}`,
      Cookie: custACookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer: baseCustomer,
      items: [{ productId: katanaProduct._id, quantity: 1 }],
      paymentMethod: "COD",
      ageConfirmed: false,
    }),
  });
  assert(noAgeRes.status === 400, "Purchase of katana without age confirmation rejected (400 Bad Request)");

  // 6b. Reject purchase to prohibited region (UK)
  const badRegionRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${custAToken}`,
      Cookie: custACookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer: { ...baseCustomer, state: "UK", city: "London" },
      items: [{ productId: katanaProduct._id, quantity: 1 }],
      paymentMethod: "COD",
      ageConfirmed: true,
    }),
  });
  assert(badRegionRes.status === 400, "Delivery of katana to prohibited destination 'UK' rejected (400 Bad Request)");

  // 6c. Reject purchase with explicit terms rejection
  const noTermsRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${custAToken}`,
      Cookie: custACookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer: baseCustomer,
      items: [{ productId: katanaProduct._id, quantity: 1 }],
      paymentMethod: "COD",
      ageConfirmed: true,
      termsConsent: false,
    }),
  });
  assert(noTermsRes.status === 400, "Purchase of katana without terms consent rejected (400 Bad Request)");

  // 6d. Valid compliant purchase: requiresAdminReview flag active
  const compliantKatanaRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${custAToken}`,
      Cookie: custACookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer: baseCustomer,
      items: [{ productId: katanaProduct._id, quantity: 1 }],
      paymentMethod: "COD",
      ageConfirmed: true,
      termsConsent: true,
    }),
  });
  assert(compliantKatanaRes.status === 201, "Compliant katana order placed successfully (201 Created)");
  const compliantKatanaJson = await compliantKatanaRes.json();
  assert(compliantKatanaJson.data.complianceVerified === true, "Order recorded complianceVerified = true");
  assert(compliantKatanaJson.data.requiresAdminReview === true, "Order flagged requiresAdminReview = true for admin pre-dispatch audit");

  // Step 7: Invoice Access Control & Privacy
  console.log("\n--- Step 7: Invoice Access Control & Privacy ---");
  const invoiceNumber = "FW-INV-2026-0001"; // Owned by Customer A (Monkey D. Luffy)

  // 7a. Unauthenticated access blocked
  const unauthInvRes = await fetch(`${BASE_URL}/api/invoices/${invoiceNumber}`);
  assert(unauthInvRes.status === 401, "Unauthenticated access to invoice blocked (401 Unauthorized)");

  // 7b. Customer B (Buggy) accessing Customer A's invoice blocked
  const custBInvRes = await fetch(`${BASE_URL}/api/invoices/${invoiceNumber}`, {
    headers: { Authorization: `Bearer ${custBToken}`, Cookie: custBCookie },
  });
  assert(custBInvRes.status === 403, "Customer B accessing Customer A's invoice blocked (403 Forbidden)");

  // 7c. Customer B downloading Customer A's PDF blocked
  const custBPdfRes = await fetch(`${BASE_URL}/api/invoices/${invoiceNumber}/pdf`, {
    headers: { Authorization: `Bearer ${custBToken}`, Cookie: custBCookie },
  });
  assert(custBPdfRes.status === 403, "Customer B downloading Customer A's invoice PDF blocked (403 Forbidden)");

  // 7d. Customer A accessing own invoice permitted
  const custAInvRes = await fetch(`${BASE_URL}/api/invoices/${invoiceNumber}`, {
    headers: { Authorization: `Bearer ${custAToken}`, Cookie: custACookie },
  });
  assert(custAInvRes.status === 200, "Customer A accessing own invoice permitted (200 OK)");

  // 7e. Admin accessing invoice permitted
  const adminInvRes = await fetch(`${BASE_URL}/api/invoices/${invoiceNumber}`, {
    headers: { Authorization: `Bearer ${adminToken}`, Cookie: adminCookie },
  });
  assert(adminInvRes.status === 200, "Admin accessing any invoice permitted (200 OK)");

  // Step 8: Administrative Audit Logging
  console.log("\n--- Step 8: Administrative Audit Logging ---");

  // Update an order status as Admin to generate audit log
  await fetch(`${BASE_URL}/api/admin/orders/${placedOrder.orderNumber}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      Cookie: adminCookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "PROCESSING", notes: "Audit verification test" }),
  });

  // Query Audit Logs as Admin
  const auditRes = await fetch(`${BASE_URL}/api/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${adminToken}`, Cookie: adminCookie },
  });
  assert(auditRes.status === 200, "Admin fetched audit logs (200 OK)");
  const auditJson = await auditRes.json();
  assert(auditJson.data.total >= 1, `Audit records captured in system (got: ${auditJson.data.total})`);
  assert(auditJson.data.auditLogs.some((l) => l.actor?.email === "admin@figuresworld.com"), "Audit record contains admin identity");

  // Customer blocked from viewing audit logs
  const custAuditRes = await fetch(`${BASE_URL}/api/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${custAToken}`, Cookie: custACookie },
  });
  assert(custAuditRes.status === 403, "Customer blocked from audit logs (403 Forbidden)");

  console.log("\n=======================================================================");
  console.log(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${passedCount + failedCount})`);
  console.log("=======================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
