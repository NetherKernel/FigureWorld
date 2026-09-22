// scripts/test-sprint13.mjs
// Automated verification suite for Sprint 13 — Admin Dashboard

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
  console.log("        SPRINT 13: ADMIN DASHBOARD & ANALYTICS TEST SUITE              ");
  console.log("=======================================================================\n");

  // Step 0: Seed Database & Authenticate
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

  // Login Customer
  const custLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "customer@figuresworld.com", password: "Customer@123456" }),
  });
  const custLoginData = await custLoginRes.json();
  const custToken = custLoginData.data?.token;
  const custCookie = custLoginRes.headers.get("set-cookie") || `auth_token=${custToken}`;
  assert(custToken, "Customer authenticated successfully");

  // Step 1: Security & Middleware Protection for /dashboard
  console.log("\n--- Step 1: Security & Middleware RBAC on /dashboard ---");
  const unauthRes = await fetch(`${BASE_URL}/dashboard`, { redirect: "manual" });
  assert(
    unauthRes.status === 307 || unauthRes.status === 302,
    `Unauthenticated request to /dashboard blocked with redirect (${unauthRes.status})`
  );

  const customerDashRes = await fetch(`${BASE_URL}/dashboard`, {
    headers: { Cookie: custCookie },
    redirect: "manual",
  });
  assert(
    customerDashRes.status === 307 || customerDashRes.status === 302,
    `Customer role blocked from /dashboard with redirect (${customerDashRes.status})`
  );

  const customerOrdersRes = await fetch(`${BASE_URL}/dashboard/orders`, {
    headers: { Cookie: custCookie },
    redirect: "manual",
  });
  assert(
    customerOrdersRes.status === 307 || customerOrdersRes.status === 302,
    `Customer role blocked from /dashboard/orders with redirect (${customerOrdersRes.status})`
  );

  const adminDashRes = await fetch(`${BASE_URL}/dashboard`, {
    headers: { Cookie: adminCookie },
  });
  assert(adminDashRes.status === 200, "Admin authorized to access /dashboard (HTTP 200)");

  // Step 2: Dashboard Analytics API (/api/admin/dashboard/stats)
  console.log("\n--- Step 2: Dashboard Analytics API & 8 Core KPIs ---");
  const statsRes = await fetch(`${BASE_URL}/api/admin/dashboard/stats?days=14`, {
    headers: { Authorization: `Bearer ${adminToken}`, Cookie: adminCookie },
  });
  assert(statsRes.status === 200, "Dashboard stats endpoint returned 200 OK");
  const statsJson = await statsRes.json();
  assert(statsJson.success === true, "Dashboard stats returned success response");

  const metrics = statsJson.data?.metrics;
  assert(typeof metrics?.todayOrders === "number", `Tracks Today's Orders (got: ${metrics?.todayOrders})`);
  assert(typeof metrics?.todayRevenue === "number", `Tracks Today's Revenue (got: ₹${metrics?.todayRevenue})`);
  assert(metrics?.pendingPayments && typeof metrics.pendingPayments.count === "number", "Tracks Pending Payments count");
  assert(typeof metrics?.pendingPayments?.amount === "number", "Tracks Pending Payments amount");
  assert(metrics?.codOrders && typeof metrics.codOrders.count === "number", "Tracks COD Orders count");
  assert(typeof metrics?.codOrders?.amount === "number", "Tracks COD Orders amount");
  assert(typeof metrics?.pendingDispatch === "number", `Tracks Pending Dispatch count (got: ${metrics?.pendingDispatch})`);
  assert(typeof metrics?.deliveredOrders === "number", `Tracks Delivered Orders count (got: ${metrics?.deliveredOrders})`);
  assert(typeof metrics?.cancelledOrders === "number", `Tracks Cancelled Orders count (got: ${metrics?.cancelledOrders})`);
  assert(typeof metrics?.lowStockCount === "number", `Tracks Low Stock count (got: ${metrics?.lowStockCount})`);

  // Step 3: All 5 Visual Charts Datasets
  console.log("\n--- Step 3: Charts Visual Data Integrity ---");
  const charts = statsJson.data?.charts;
  assert(Array.isArray(charts?.revenue) && charts.revenue.length > 0, "Revenue time-series dataset present");
  assert(charts.revenue[0].revenue !== undefined, "Revenue points include daily revenue amount");
  assert(Array.isArray(charts?.orders) && charts.orders.length > 0, "Orders daily volume dataset present");
  assert(charts.orders[0].totalOrders !== undefined, "Orders points include daily order count");
  assert(Array.isArray(charts?.products) && charts.products.length > 0, "Top products ranked dataset present");
  assert(charts.products[0].unitsSold !== undefined, "Top products include unitsSold metric");
  assert(Array.isArray(charts?.categories) && charts.categories.length > 0, "Categories distribution dataset present");
  assert(charts.categories[0].percentage !== undefined, "Categories include percentage share");
  assert(Array.isArray(charts?.paymentMethods) && charts.paymentMethods.length === 2, "Payment methods split dataset present (UPI & COD)");
  assert(charts.paymentMethods.some((p) => p.method === "UPI"), "Payment methods contains UPI data");
  assert(charts.paymentMethods.some((p) => p.method === "COD"), "Payment methods contains COD data");

  // Step 4: Customer Accounts Directory API (/api/admin/customers)
  console.log("\n--- Step 4: Customer Accounts Directory API ---");
  const custsRes = await fetch(`${BASE_URL}/api/admin/customers`, {
    headers: { Authorization: `Bearer ${adminToken}`, Cookie: adminCookie },
  });
  assert(custsRes.status === 200, "Customers endpoint returned 200 OK");
  const custsJson = await custsRes.json();
  assert(custsJson.success === true, "Customers API returned success");
  assert(Array.isArray(custsJson.data?.customers) && custsJson.data.customers.length >= 1, "Customers array returned");
  const luffy = custsJson.data.customers.find((c) => c.email === "customer@figuresworld.com");
  assert(luffy !== undefined, "Found seeded customer 'Monkey D. Luffy'");
  assert(typeof luffy?.totalSpent === "number", "Customer tracks lifetime totalSpent");
  assert(typeof luffy?.ordersCount === "number", "Customer tracks lifetime ordersCount");

  // Filter query
  const searchCustRes = await fetch(`${BASE_URL}/api/admin/customers?q=luffy`, {
    headers: { Authorization: `Bearer ${adminToken}`, Cookie: adminCookie },
  });
  const searchCustJson = await searchCustRes.json();
  assert(searchCustJson.data.customers.length >= 1, "Customer search query ?q=luffy returned matching results");

  // Step 5: Tax Invoices Listing API (/api/admin/invoices)
  console.log("\n--- Step 5: Tax Invoices Ledger API ---");
  const invRes = await fetch(`${BASE_URL}/api/admin/invoices`, {
    headers: { Authorization: `Bearer ${adminToken}`, Cookie: adminCookie },
  });
  assert(invRes.status === 200, "Invoices endpoint returned 200 OK");
  const invJson = await invRes.json();
  assert(invJson.success === true, "Invoices API returned success");
  assert(invJson.data.metrics.totalInvoices >= 1, `Tracks totalInvoices metric (got: ${invJson.data.metrics.totalInvoices})`);
  assert(invJson.data.metrics.totalAmount > 0, `Tracks totalAmount metric (got: ₹${invJson.data.metrics.totalAmount})`);
  assert(invJson.data.metrics.totalTax > 0, `Tracks totalTax metric (got: ₹${invJson.data.metrics.totalTax})`);

  // Step 6: Promotional Coupons API CRUD (/api/admin/coupons)
  console.log("\n--- Step 6: Promotional Coupons CRUD Operations ---");
  const couponsRes = await fetch(`${BASE_URL}/api/admin/coupons`, {
    headers: { Authorization: `Bearer ${adminToken}`, Cookie: adminCookie },
  });
  assert(couponsRes.status === 200, "Coupons endpoint returned 200 OK");
  const couponsJson = await couponsRes.json();
  assert(couponsJson.data.metrics.totalCoupons >= 3, `Pre-seeded coupons found (got: ${couponsJson.data.metrics.totalCoupons})`);
  assert(couponsJson.data.coupons.some((c) => c.code === "WELCOME10"), "Found pre-seeded coupon 'WELCOME10'");

  // Create new coupon
  const newCouponPayload = {
    code: "TESTDASH25",
    description: "25% off test coupon for dashboard sprint",
    discountType: "percentage",
    discountValue: 25,
    minimumOrderValue: 1200,
    maximumDiscountAmount: 600,
    validUntil: "2027-12-31T23:59:59Z",
    usageLimit: 50,
    isActive: true,
  };
  const createCouponRes = await fetch(`${BASE_URL}/api/admin/coupons`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      Cookie: adminCookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newCouponPayload),
  });
  assert(createCouponRes.status === 201, "Admin created new coupon (201 Created)");
  const createdCouponJson = await createCouponRes.json();
  const createdCouponId = createdCouponJson.data.coupon._id;

  // Toggle active status
  const toggleRes = await fetch(`${BASE_URL}/api/admin/coupons/${createdCouponId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      Cookie: adminCookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ isActive: false }),
  });
  assert(toggleRes.status === 200, "Toggled coupon active status via PATCH (200 OK)");
  const toggleJson = await toggleRes.json();
  assert(toggleJson.data.coupon.isActive === false, "Coupon isActive is now false");

  // Delete coupon
  const deleteRes = await fetch(`${BASE_URL}/api/admin/coupons/${createdCouponId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}`, Cookie: adminCookie },
  });
  assert(deleteRes.status === 200, "Deleted coupon via DELETE (200 OK)");

  // Step 7: Store Settings API (/api/admin/settings)
  console.log("\n--- Step 7: Store & System Settings API ---");
  const getSettingsRes = await fetch(`${BASE_URL}/api/admin/settings`, {
    headers: { Authorization: `Bearer ${adminToken}`, Cookie: adminCookie },
  });
  assert(getSettingsRes.status === 200, "Settings GET returned 200 OK");
  const settingsJson = await getSettingsRes.json();
  assert(settingsJson.data.settings?.gstin === "27AADCF1234F1Z5", "Settings gstin verified");
  assert(settingsJson.data.settings?.merchantUpiId === "figuresworld@icici", "Settings merchantUpiId verified");

  // Update Settings
  const updateSettingsRes = await fetch(`${BASE_URL}/api/admin/settings`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      Cookie: adminCookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ freeShippingThreshold: 2499 }),
  });
  assert(updateSettingsRes.status === 200, "Settings PUT returned 200 OK");
  const updatedSettingsJson = await updateSettingsRes.json();
  assert(updatedSettingsJson.data.settings.freeShippingThreshold === 2499, "freeShippingThreshold updated to 2499");

  // Step 8: Category Management Endpoint (/api/categories/[id])
  console.log("\n--- Step 8: Category Management Endpoint ---");
  const catListRes = await fetch(`${BASE_URL}/api/categories`);
  const catListJson = await catListRes.json();
  const catToUpdate = catListJson.data.categories[0];

  const updateCatRes = await fetch(`${BASE_URL}/api/categories/${catToUpdate._id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      Cookie: adminCookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ displayOrder: 99 }),
  });
  assert(updateCatRes.status === 200, "Category updated via PUT /api/categories/[id] (200 OK)");

  // Restore category order
  await fetch(`${BASE_URL}/api/categories/${catToUpdate._id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      Cookie: adminCookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ displayOrder: catToUpdate.displayOrder }),
  });

  // Step 9: RBAC Security Enforcement on Administration APIs
  console.log("\n--- Step 9: RBAC Security Enforcement on Dashboard APIs ---");
  const custStatsRes = await fetch(`${BASE_URL}/api/admin/dashboard/stats`, {
    headers: { Authorization: `Bearer ${custToken}`, Cookie: custCookie },
  });
  assert(custStatsRes.status === 403, "Customer forbidden from /api/admin/dashboard/stats (403 Forbidden)");

  const custCouponsRes = await fetch(`${BASE_URL}/api/admin/coupons`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${custToken}`,
      Cookie: custCookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code: "HACK25", discountType: "percentage", discountValue: 25, validUntil: "2027-12-31" }),
  });
  assert(custCouponsRes.status === 403, "Customer forbidden from creating coupons (403 Forbidden)");

  const custSettingsRes = await fetch(`${BASE_URL}/api/admin/settings`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${custToken}`,
      Cookie: custCookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ freeShippingThreshold: 0 }),
  });
  assert(custSettingsRes.status === 403, "Customer forbidden from updating settings (403 Forbidden)");

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
