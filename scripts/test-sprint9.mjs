/**
 * FiguresWorld - Sprint 9 Order Management Automated Test Suite
 *
 * Tests:
 * 1. Database Seeding & Authentication (Admin, Staff, Customer)
 * 2. Order #KF100001 Inspection: Customer, Phone, Address, Products, Quantity, Price,
 *    Payment (UPI/COD), Order Status, Payment Status, Shipment (Tracking Number, Courier)
 * 3. RBAC Protection: Customer blocked (403 Forbidden), Unauthenticated blocked (401)
 * 4. Admin Orders Listing & Metrics across the 12 Canonical Statuses
 * 5. Multi-field Search & Status Filters (Order #, Phone, Tracking AWB)
 * 6. Order Lifecycle Progression: PENDING_PAYMENT -> CONFIRMED -> PROCESSING -> PACKED -> DISPATCHED -> OUT_FOR_DELIVERY -> DELIVERED
 * 7. Shipment Assignment & Courier Tracking Update
 * 8. Cancellation Flow with Automatic Warehouse Inventory Restocking
 * 9. Return & Refund Lifecycle: RETURN_REQUESTED -> RETURNED -> REFUNDED
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

async function runSprint9Tests() {
  console.log("=======================================================================");
  console.log("      SPRINT 9: ORDER MANAGEMENT & 12-STATUS LIFECYCLE TEST SUITE      ");
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
    // --- Step 0: Ensure Database Seeded & Auth ---
    console.log("--- Step 0: Database Seed & Authentication ---");
    const seedRes = await request("/api/seed", { method: "POST" });
    assert(seedRes.status === 200, "Database seeded successfully");

    const adminLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "admin@figuresworld.com",
        password: "Admin@123456",
      }),
    });
    assert(adminLogin.status === 200, "Admin authenticated successfully");
    adminCookie = adminLogin.cookie;

    const customerLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "customer@figuresworld.com",
        password: "Customer@123456",
      }),
    });
    assert(customerLogin.status === 200, "Customer authenticated successfully");
    customerCookie = customerLogin.cookie;

    // --- Step 1: Inspect Reference Order #KF100001 ---
    console.log("\n--- Step 1: Detailed Inspection of Order #KF100001 ---");
    const kfOrderRes = await request("/api/admin/orders/KF100001", {
      cookie: adminCookie,
    });
    assert(kfOrderRes.status === 200, "Fetched Order #KF100001 via /api/admin/orders/[orderNumber]");
    const kf = kfOrderRes.json?.data;

    // 1a. Order Identifier
    assert(kf?.orderNumber === "KF100001", `Order Number is KF100001 (got: ${kf?.orderNumber})`);

    // 1b. Customer & Phone & Address
    assert(kf?.customer?.name === "Monkey D. Luffy", `Customer Name is Monkey D. Luffy (got: ${kf?.customer?.name})`);
    assert(kf?.customer?.phone === "+1 (555) 123-4567", `Customer Phone is +1 (555) 123-4567 (got: ${kf?.customer?.phone})`);
    assert(kf?.customerEmail === "customer@figuresworld.com", `Customer Email is customer@figuresworld.com`);
    assert(!!kf?.shippingAddress, "Shipping Address record present");
    assert(kf?.shippingAddress?.city === "Grand Line", `City is Grand Line (got: ${kf?.shippingAddress?.city})`);
    assert(kf?.shippingAddress?.state === "East Blue", `State is East Blue (got: ${kf?.shippingAddress?.state})`);
    assert(kf?.shippingAddress?.postalCode === "10001", `Postal code is 10001`);

    // 1c. Products, Quantity & Price
    assert(Array.isArray(kf?.items) && kf.items.length >= 1, "Order items array present and populated");
    const item0 = kf?.items?.[0];
    assert(item0?.productTitle === "Anime Figure", `Product Title is Anime Figure (got: ${item0?.productTitle})`);
    assert(item0?.quantity === 2, `Quantity is 2 (got: ${item0?.quantity})`);
    assert(item0?.unitPrice === 2499, `Unit Price is ₹2,499 (got: ₹${item0?.unitPrice})`);
    assert(item0?.total === 4998, `Line Item Total is ₹4,998 (got: ₹${item0?.total})`);
    assert(kf?.pricing?.subtotal === 4998, `Order Subtotal is ₹4,998`);
    assert(kf?.pricing?.shippingFee === 100, `Shipping fee is ₹100`);
    assert(kf?.pricing?.grandTotal === 5098, `Grand Total is ₹5,098`);

    // 1d. Payment UPI/COD
    assert(kf?.paymentMethod === "UPI", `Payment method is UPI (got: ${kf?.paymentMethod})`);
    assert(kf?.paymentStatus === "PAID", `Payment status is PAID (got: ${kf?.paymentStatus})`);
    assert(kf?.paymentDetails?.transactionRef === "426189304721", `UTR Reference is 426189304721`);

    // 1e. Order Status
    assert(kf?.orderStatus === "PROCESSING", `Order Status is PROCESSING (got: ${kf?.orderStatus})`);

    // 1f. Shipment: Courier & Tracking Number
    assert(kf?.shipment?.courier === "Blue Dart Express", `Courier is Blue Dart Express (got: ${kf?.shipment?.courier})`);
    assert(kf?.shipment?.trackingNumber === "BD-KF100001", `Tracking Number is BD-KF100001 (got: ${kf?.shipment?.trackingNumber})`);

    // --- Step 2: RBAC Security Protections ---
    console.log("\n--- Step 2: RBAC Access Control Validations ---");
    const custOrdersRes = await request("/api/admin/orders", { cookie: customerCookie });
    assert(custOrdersRes.status === 403, "Customer blocked from admin orders listing (403 Forbidden)");

    const custDetailRes = await request("/api/admin/orders/KF100001", { cookie: customerCookie });
    assert(custDetailRes.status === 403, "Customer blocked from admin order detail (403 Forbidden)");

    const custStatusRes = await request("/api/admin/orders/KF100001/status", {
      method: "PATCH",
      cookie: customerCookie,
      body: JSON.stringify({ status: "DELIVERED" }),
    });
    assert(custStatusRes.status === 403, "Customer blocked from changing order status (403 Forbidden)");

    const unauthRes = await request("/api/admin/orders/KF100001");
    assert(unauthRes.status === 401, "Unauthenticated request blocked (401 Unauthorized)");

    // --- Step 3: Admin Orders Listing & 12-Status Metrics ---
    console.log("\n--- Step 3: Admin Orders Listing & 12-Status Metrics ---");
    const adminOrdersRes = await request("/api/admin/orders", { cookie: adminCookie });
    assert(adminOrdersRes.status === 200, "Admin fetched orders listing (200 OK)");
    const listing = adminOrdersRes.json?.data;

    assert(listing?.metrics?.total >= 1, `Total orders metric >= 1 (got: ${listing?.metrics?.total})`);
    assert(listing?.metrics?.processing >= 1, `Processing metric >= 1 (got: ${listing?.metrics?.processing})`);
    assert("pendingPayment" in listing?.metrics, "Metrics tracks pendingPayment");
    assert("paymentReview" in listing?.metrics, "Metrics tracks paymentReview");
    assert("confirmed" in listing?.metrics, "Metrics tracks confirmed");
    assert("packed" in listing?.metrics, "Metrics tracks packed");
    assert("dispatched" in listing?.metrics, "Metrics tracks dispatched");
    assert("outForDelivery" in listing?.metrics, "Metrics tracks outForDelivery");
    assert("delivered" in listing?.metrics, "Metrics tracks delivered");
    assert("cancelled" in listing?.metrics, "Metrics tracks cancelled");
    assert("returnRequested" in listing?.metrics, "Metrics tracks returnRequested");
    assert("returned" in listing?.metrics, "Metrics tracks returned");
    assert("refunded" in listing?.metrics, "Metrics tracks refunded");

    // --- Step 4: Search & Filter Verification ---
    console.log("\n--- Step 4: Search & Filter Functionality ---");
    const searchOrderRes = await request("/api/admin/orders?search=KF100001", { cookie: adminCookie });
    assert(searchOrderRes.status === 200, "Search by order number returned 200 OK");
    assert(
      searchOrderRes.json?.data?.orders?.some((o) => o.orderNumber === "KF100001"),
      "Found Order #KF100001 by exact order number search"
    );

    const searchPhoneRes = await request("/api/admin/orders?search=555", { cookie: adminCookie });
    assert(
      searchPhoneRes.json?.data?.orders?.length >= 1,
      `Search by customer phone query returned matching orders (count: ${searchPhoneRes.json?.data?.orders?.length})`
    );

    const searchAwbRes = await request("/api/admin/orders?search=BD-KF100001", { cookie: adminCookie });
    assert(
      searchAwbRes.json?.data?.orders?.some((o) => o.orderNumber === "KF100001"),
      "Search by courier tracking number AWB returned matching order"
    );

    // --- Step 5: Full Order Status Lifecycle Progression ---
    console.log("\n--- Step 5: Order Status Lifecycle Progression ---");
    // Place a new order to run through all status transitions
    const catalogRes = await request("/api/products");
    const demoProduct = catalogRes.json?.data?.products?.find((p) => !p.isRestricted && p.stock > 5);
    assert(!!demoProduct, "Found product for lifecycle test order");

    const checkoutRes = await request("/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        customer: {
          fullName: "Roronoa Zoro",
          mobileNumber: "+91 9876543210",
          email: "zoro@strawhats.com",
          address: "Gym 42, Wano Dojo",
          city: "Shimotsuki",
          state: "Wano",
          pinCode: "500001",
        },
        items: [{ productId: demoProduct._id, quantity: 1 }],
        paymentMethod: "UPI",
        upiId: "zoro@upi",
      }),
    });
    assert(checkoutRes.status === 201, "Test lifecycle order placed via checkout");
    const testOrderNum = checkoutRes.json?.data?.orderNumber;
    assert(!!testOrderNum, `Generated test order: ${testOrderNum}`);

    // Transition 1: CONFIRMED
    const stConfirmed = await request(`/api/admin/orders/${testOrderNum}/status`, {
      method: "PATCH",
      cookie: adminCookie,
      body: JSON.stringify({ status: "CONFIRMED", notes: "Payment verified by finance" }),
    });
    assert(stConfirmed.status === 200, "Updated status to CONFIRMED (200 OK)");
    assert(stConfirmed.json?.data?.orderStatus === "CONFIRMED", "Order status is CONFIRMED");

    // Transition 2: PROCESSING
    const stProcessing = await request(`/api/admin/orders/${testOrderNum}/status`, {
      method: "PATCH",
      cookie: adminCookie,
      body: JSON.stringify({ status: "PROCESSING", notes: "Order sent to warehouse picker" }),
    });
    assert(stProcessing.status === 200, "Updated status to PROCESSING (200 OK)");
    assert(stProcessing.json?.data?.orderStatus === "PROCESSING", "Order status is PROCESSING");

    // Transition 3: PACKED
    const stPacked = await request(`/api/admin/orders/${testOrderNum}/status`, {
      method: "PATCH",
      cookie: adminCookie,
      body: JSON.stringify({ status: "PACKED", notes: "Box packaged with bubble wrap" }),
    });
    assert(stPacked.status === 200, "Updated status to PACKED (200 OK)");
    assert(stPacked.json?.data?.orderStatus === "PACKED", "Order status is PACKED");

    // Transition 4: DISPATCHED via Shipment Endpoint
    console.log("\n--- Step 6: Shipment Assignment & Tracking Update ---");
    const shipmentUpdate = await request(`/api/admin/orders/${testOrderNum}/shipment`, {
      method: "PATCH",
      cookie: adminCookie,
      body: JSON.stringify({
        courier: "Delhivery Express",
        trackingNumber: `DEL-${Date.now().toString().slice(-6)}`,
        shippingNotes: "Air express cargo",
        autoDispatch: true,
      }),
    });
    assert(shipmentUpdate.status === 200, "Assigned shipment via /api/admin/orders/[id]/shipment (200 OK)");
    assert(shipmentUpdate.json?.data?.shipment?.courier === "Delhivery Express", "Recorded courier: Delhivery Express");
    assert(shipmentUpdate.json?.data?.orderStatus === "DISPATCHED", "Auto-dispatched order status to DISPATCHED");

    // Transition 5: OUT_FOR_DELIVERY
    const stOutForDelivery = await request(`/api/admin/orders/${testOrderNum}/status`, {
      method: "PATCH",
      cookie: adminCookie,
      body: JSON.stringify({ status: "OUT_FOR_DELIVERY", notes: "Out with local delivery agent" }),
    });
    assert(stOutForDelivery.status === 200, "Updated status to OUT_FOR_DELIVERY (200 OK)");
    assert(stOutForDelivery.json?.data?.orderStatus === "OUT_FOR_DELIVERY", "Order status is OUT_FOR_DELIVERY");

    // Transition 6: DELIVERED
    const stDelivered = await request(`/api/admin/orders/${testOrderNum}/status`, {
      method: "PATCH",
      cookie: adminCookie,
      body: JSON.stringify({ status: "DELIVERED", notes: "Delivered to customer" }),
    });
    assert(stDelivered.status === 200, "Updated status to DELIVERED (200 OK)");
    assert(stDelivered.json?.data?.orderStatus === "DELIVERED", "Order status is DELIVERED");

    // Verify audit trail on detail query
    const verifiedOrderRes = await request(`/api/admin/orders/${testOrderNum}`, { cookie: adminCookie });
    const verifiedOrder = verifiedOrderRes.json?.data;
    assert(verifiedOrder?.statusHistory?.length >= 5, `Status audit trail captured ${verifiedOrder?.statusHistory?.length} transition events`);

    // --- Step 7: Order Cancellation & Inventory Stock Restoration ---
    console.log("\n--- Step 7: Cancellation & Automatic Inventory Restocking ---");
    const stockBeforeOrder = (await request("/api/products")).json?.data?.products?.find((p) => p.sku === demoProduct.sku)?.stock;

    const cancelOrderRes = await request("/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        customer: {
          fullName: "Vinsmoke Sanji",
          mobileNumber: "+91 9988776655",
          email: "sanji@baratie.com",
          address: "Baratie Floating Restaurant",
          city: "Sambas",
          state: "East Blue",
          pinCode: "500002",
        },
        items: [{ productId: demoProduct._id, quantity: 2 }],
        paymentMethod: "UPI",
        upiId: "sanji@upi",
      }),
    });
    const cancelOrderNum = cancelOrderRes.json?.data?.orderNumber;
    assert(!!cancelOrderNum, `Placed order for cancellation test: ${cancelOrderNum}`);

    const stockAfterPlacement = (await request("/api/products")).json?.data?.products?.find((p) => p.sku === demoProduct.sku)?.stock;
    assert(stockAfterPlacement === stockBeforeOrder - 2, `Stock decremented by 2 (from ${stockBeforeOrder} to ${stockAfterPlacement})`);

    const cancelActionRes = await request(`/api/admin/orders/${cancelOrderNum}/status`, {
      method: "PATCH",
      cookie: adminCookie,
      body: JSON.stringify({
        status: "CANCELLED",
        notes: "Customer requested cancellation before dispatch",
        restockInventory: true,
      }),
    });
    assert(cancelActionRes.status === 200, "Order cancelled via status endpoint (200 OK)");
    assert(cancelActionRes.json?.data?.orderStatus === "CANCELLED", "Order status transitioned to CANCELLED");

    const stockAfterCancellation = (await request("/api/products")).json?.data?.products?.find((p) => p.sku === demoProduct.sku)?.stock;
    assert(stockAfterCancellation === stockBeforeOrder, `Inventory stock automatically restored back to ${stockBeforeOrder}`);

    // --- Step 8: Return & Refund Flow ---
    console.log("\n--- Step 8: Return & Refund Lifecycle ---");
    // Transition 7: RETURN_REQUESTED
    const stReturnReq = await request(`/api/admin/orders/${testOrderNum}/status`, {
      method: "PATCH",
      cookie: adminCookie,
      body: JSON.stringify({ status: "RETURN_REQUESTED", notes: "Customer requested return for replacement" }),
    });
    assert(stReturnReq.status === 200, "Updated status to RETURN_REQUESTED (200 OK)");
    assert(stReturnReq.json?.data?.orderStatus === "RETURN_REQUESTED", "Order status is RETURN_REQUESTED");

    // Transition 8: RETURNED
    const stReturned = await request(`/api/admin/orders/${testOrderNum}/status`, {
      method: "PATCH",
      cookie: adminCookie,
      body: JSON.stringify({ status: "RETURNED", notes: "Item inspected and received at warehouse" }),
    });
    assert(stReturned.status === 200, "Updated status to RETURNED (200 OK)");
    assert(stReturned.json?.data?.orderStatus === "RETURNED", "Order status is RETURNED");

    // Transition 9: REFUNDED
    const stRefunded = await request(`/api/admin/orders/${testOrderNum}/status`, {
      method: "PATCH",
      cookie: adminCookie,
      body: JSON.stringify({ status: "REFUNDED", notes: "Refund credited back to customer UPI account" }),
    });
    assert(stRefunded.status === 200, "Updated status to REFUNDED (200 OK)");
    assert(stRefunded.json?.data?.orderStatus === "REFUNDED", "Order status is REFUNDED");

  } catch (err) {
    console.error("Test execution threw exception:", err);
    failed++;
  }

  console.log("\n=======================================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log("=======================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runSprint9Tests();
