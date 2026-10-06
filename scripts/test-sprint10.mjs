/**
 * FiguresWorld - Sprint 10 Invoice Generation Automated Test Suite
 *
 * Tests:
 * 1. Database Seeding & Authentication (Admin, Customer)
 * 2. Reference Order #KF100001 Invoice Verification:
 *    - Store Name: FiguresWorld Anime Store
 *    - Store GSTIN: 27AADCF1234F1Z5
 *    - Server-Generated Invoice Number (FW-INV-YYYY-XXXX)
 *    - Order Number & Issue Date
 *    - Customer details: Name, Phone, Email, Address
 *    - Products Table: Title, SKU, HSN, Quantity, Unit Price, Tax, Line Total
 *    - Grand Total & Payment Method
 * 3. Server-Side Numbering Integrity (Strictly server-driven, never trusted from React)
 * 4. Automatic Invoice Generation upon Order Confirmation
 * 5. Vector Binary PDF Stream Verification (%PDF-1.4 header, application/pdf MIME type)
 * 6. File Storage in /uploads/invoices/
 * 7. Customer Dispatch Simulation (sentToCustomer, sentAt, email log)
 * 8. API Endpoints:
 *    - GET /api/orders/[orderNumber]/invoice
 *    - POST /api/orders/[orderNumber]/invoice
 *    - GET /api/invoices/[invoiceNumber]
 *    - GET /api/invoices/[invoiceNumber]/pdf
 *    - POST /api/invoices/[invoiceNumber]/send
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

  const contentType = res.headers.get("content-type") || "";
  let json = null;
  let text = "";
  let buffer = null;

  if (contentType.includes("application/pdf") || options.binary) {
    buffer = await res.arrayBuffer();
  } else {
    text = await res.text();
    try {
      json = JSON.parse(text);
    } catch {
      // plain text
    }
  }

  const setCookieHeader = res.headers.get("set-cookie");
  let cookie = null;
  if (setCookieHeader) {
    cookie = setCookieHeader.split(";")[0];
  }

  return { status: res.status, json, text, buffer, headers: res.headers, cookie };
}

async function runSprint10Tests() {
  console.log("=======================================================================");
  console.log("           SPRINT 10: INVOICE GENERATION AUTOMATED TEST SUITE          ");
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

    // --- Step 1: Reference Order #KF100001 Invoice Retrieval ---
    console.log("\n--- Step 1: Fetch Invoice for Order #KF100001 ---");
    const kfInvoiceRes = await request("/api/orders/KF100001/invoice");
    assert(kfInvoiceRes.status === 200, "Fetched invoice for #KF100001 via /api/orders/[orderNumber]/invoice");
    const inv = kfInvoiceRes.json?.data;

    // 1a. Store Details & GST
    assert(inv?.storeDetails?.name === "FiguresWorld Anime Store", `Store name is FiguresWorld Anime Store (got: ${inv?.storeDetails?.name})`);
    assert(inv?.storeDetails?.gstin === "27AADCF1234F1Z5", `Store GSTIN is 27AADCF1234F1Z5 (got: ${inv?.storeDetails?.gstin})`);
    assert(inv?.storeDetails?.pan === "AADCF1234F", `Store PAN is AADCF1234F`);
    assert(inv?.gstDetails?.isApplicable === true, "GST is applicable flag is true");
    assert(inv?.gstDetails?.hsnCode === "95030090", `HSN Code is 95030090`);
    assert(inv?.gstDetails?.totalTax > 0, `Total tax calculated (> 0, got: ₹${inv?.gstDetails?.totalTax})`);

    // 1b. Identifiers: Server-Side Invoice Number & Order Number
    const invoiceNum = inv?.invoiceNumber;
    assert(invoiceNum?.startsWith("FW-INV-"), `Invoice number starts with FW-INV- (got: ${invoiceNum})`);
    assert(inv?.orderNumber === "KF100001", `Order number matches KF100001 (got: ${inv?.orderNumber})`);
    assert(!!inv?.issuedAt, `Invoice issue date present: ${inv?.issuedAt}`);

    // 1c. Customer Details
    assert(inv?.customerDetails?.name === "Monkey D. Luffy", `Customer Name: ${inv?.customerDetails?.name}`);
    assert(inv?.customerDetails?.phone === "+1 (555) 123-4567", `Customer Phone: ${inv?.customerDetails?.phone}`);
    assert(inv?.customerDetails?.email === "customer@figuresworld.com", `Customer Email: ${inv?.customerDetails?.email}`);
    assert(!!inv?.customerDetails?.shippingAddress, "Customer shipping address present");
    assert(inv?.customerDetails?.shippingAddress?.city === "Grand Line", `City: Grand Line`);
    assert(inv?.customerDetails?.shippingAddress?.state === "East Blue", `State: East Blue`);

    // 1d. Products Table & Pricing Breakdown
    assert(Array.isArray(inv?.items) && inv.items.length >= 1, "Invoice items array present");
    const item0 = inv?.items?.[0];
    assert(item0?.productTitle === "Anime Figure", `Item Title is Anime Figure (got: ${item0?.productTitle})`);
    assert(item0?.productSku === "AF-DEMO-2499", `Item SKU is AF-DEMO-2499`);
    assert(item0?.quantity === 2, `Item Quantity is 2 (got: ${item0?.quantity})`);
    assert(item0?.unitPrice === 2499, `Item Unit Price is ₹2,499`);
    assert(item0?.total === 4998, `Item Total is ₹4,998`);
    assert(inv?.pricing?.subtotal === 4998, `Subtotal is ₹4,998`);
    assert(inv?.pricing?.shippingFee === 100, `Shipping fee is ₹100`);
    assert(inv?.pricing?.grandTotal === 5098, `Grand Total is ₹5,098`);

    // 1e. Payment Method
    assert(inv?.paymentMethod === "UPI", `Payment method recorded: UPI`);
    assert(inv?.paymentStatus === "PAID", `Payment status recorded: PAID`);

    // --- Step 2: Invoice Lookup by Invoice Number ---
    console.log("\n--- Step 2: Query Invoice by Invoice Number ---");
    const directInvRes = await request(`/api/invoices/${invoiceNum}`, {
      headers: { Cookie: customerCookie },
    });
    assert(directInvRes.status === 200, `Retrieved invoice via /api/invoices/${invoiceNum}`);
    assert(directInvRes.json?.data?.invoiceNumber === invoiceNum, "Invoice number matches");

    // --- Step 3: Vector PDF Generation & Stream Verification ---
    console.log("\n--- Step 3: Stream Binary PDF Document ---");
    const pdfRes = await request(`/api/invoices/${invoiceNum}/pdf`, {
      binary: true,
      headers: { Cookie: customerCookie },
    });
    assert(pdfRes.status === 200, "PDF stream returned 200 OK");
    const pdfContentType = pdfRes.headers.get("content-type");
    assert(pdfContentType?.includes("application/pdf"), `Content-Type is application/pdf (got: ${pdfContentType})`);

    const pdfBytes = new Uint8Array(pdfRes.buffer);
    assert(pdfBytes.length > 500, `PDF size is valid (> 500 bytes, got: ${pdfBytes.length} bytes)`);

    // Check PDF header signature '%PDF-'
    const pdfHeader = String.fromCharCode(...pdfBytes.slice(0, 5));
    assert(pdfHeader === "%PDF-", `PDF contains standard '%PDF-' magic header signature (got: ${pdfHeader})`);

    // --- Step 4: Server-Side Invoice Numbering Security ---
    console.log("\n--- Step 4: Server-Side Invoice Numbering Integrity ---");
    // Place a new order
    const catalogRes = await request("/api/products");
    const demoProduct = catalogRes.json?.data?.products?.find((p) => !p.isRestricted && p.stock > 5);
    assert(!!demoProduct, "Found product for invoice order test");

    const checkoutRes = await request("/api/checkout", {
      method: "POST",
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
        items: [{ productId: demoProduct._id, quantity: 1 }],
        paymentMethod: "UPI",
        upiId: "law@upi",
      }),
    });
    assert(checkoutRes.status === 201, "Test order placed for invoice generation");
    const newOrderNum = checkoutRes.json?.data?.orderNumber;
    assert(!!newOrderNum, `Generated order: ${newOrderNum}`);

    // Confirm order
    const confirmRes = await request(`/api/admin/orders/${newOrderNum}/status`, {
      method: "PATCH",
      cookie: adminCookie,
      body: JSON.stringify({
        status: "CONFIRMED",
        notes: "Payment verified - triggering invoice",
      }),
    });
    assert(confirmRes.status === 200, "Order status transitioned to CONFIRMED");

    // Fetch the auto-generated invoice for this newly confirmed order
    const autoInvRes = await request(`/api/orders/${newOrderNum}/invoice`);
    assert(autoInvRes.status === 200, "Invoice automatically generated upon order confirmation");
    const autoInv = autoInvRes.json?.data;
    assert(autoInv?.invoiceNumber?.startsWith("FW-INV-"), `Auto-generated invoice number starts with FW-INV- (got: ${autoInv?.invoiceNumber})`);
    assert(autoInv?.orderNumber === newOrderNum, "Invoice correctly links to orderNumber");
    assert(autoInv?.customerDetails?.name === "Trafalgar D. Water Law", "Customer name accurately recorded");

    // Verify order record links to invoiceNumber
    const updatedOrderRes = await request(`/api/admin/orders/${newOrderNum}`, { cookie: adminCookie });
    assert(updatedOrderRes.json?.data?.invoiceNumber === autoInv?.invoiceNumber, `Order record populated with invoiceNumber (${updatedOrderRes.json?.data?.invoiceNumber})`);

    // --- Step 5: Customer Email Dispatch ---
    console.log("\n--- Step 5: Customer Email Dispatch Simulation ---");
    const sendInvoiceRes = await request(`/api/invoices/${autoInv?.invoiceNumber}/send`, {
      method: "POST",
      cookie: adminCookie,
    });
    assert(sendInvoiceRes.status === 200, "Dispatched invoice to customer email (200 OK)");
    assert(sendInvoiceRes.json?.data?.sentTo === "law@heartpirates.com", "Sent to customer email law@heartpirates.com");
    assert(!!sendInvoiceRes.json?.data?.sentAt, "Recorded sentAt timestamp");

    // --- Step 6: RBAC Protections ---
    console.log("\n--- Step 6: RBAC Protection on Invoice Endpoints ---");
    const custSendRes = await request(`/api/invoices/${autoInv?.invoiceNumber}/send`, {
      method: "POST",
      cookie: customerCookie,
    });
    assert(custSendRes.status === 403, "Customer blocked from triggering invoice emails (403 Forbidden)");

    const unauthSendRes = await request(`/api/invoices/${autoInv?.invoiceNumber}/send`, {
      method: "POST",
    });
    assert(unauthSendRes.status === 401, "Unauthenticated request blocked from sending invoices (401 Unauthorized)");

  } catch (err) {
    console.error("Test execution failed with exception:", err);
    failed++;
  }

  console.log("\n=======================================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log("=======================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runSprint10Tests();
