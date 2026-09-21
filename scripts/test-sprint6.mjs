// Automated end-to-end verification script for Sprint 6 — Checkout & Address
const BASE_URL = "http://localhost:3000";

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  let json = null;
  try {
    json = await res.json();
  } catch (e) {
    // Non-JSON response
  }

  return {
    status: res.status,
    headers: res.headers,
    json,
  };
}

async function runTests() {
  console.log("=======================================================================");
  console.log("         SPRINT 6: CHECKOUT & ADDRESS SYSTEM AUTOMATED TEST SUITE      ");
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

    // 1. Fetch Test Products
    console.log("\n--- Step 1: Fetch Regular Figure & Restricted Katana ---");
    const figureRes = await request("/api/products?search=Anime Figure");
    const animeFigure = figureRes.json?.data?.products?.find((p) => p.name === "Anime Figure");
    assert(!!animeFigure, "Found 'Anime Figure' in catalog (price: 2499)");

    const katanaRes = await request("/api/products?search=Nichirin Katana");
    const katana = katanaRes.json?.data?.products?.find((p) => p.isRestricted === true);
    assert(!!katana, "Found restricted 'Nichirin Katana Replica' in catalog");
    assert(katana?.isRestricted === true, "Katana has isRestricted = true");
    assert(Array.isArray(katana?.shippingRestrictions) && katana.shippingRestrictions.length > 0, "Katana has destination restrictions");

    const initialStock = animeFigure.stock;

    // 2. Validate Customer Address Fields (Name, Mobile, Email, Address, City, State, PIN, Landmark)
    console.log("\n--- Step 2: Customer Address Input Validations ---");
    const invalidAddressRes = await request("/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        customer: {
          fullName: "A", // too short
          mobileNumber: "123", // too short
          email: "invalid-email",
          address: "Hi", // too short
          city: "",
          state: "",
          pinCode: "",
        },
        items: [{ productId: animeFigure._id, quantity: 1 }],
        paymentMethod: "COD",
        ageConfirmed: false,
      }),
    });
    assert(invalidAddressRes.status === 400, "Rejected invalid/incomplete address details (400 Bad Request)");

    // 3. Payment Method: UPI Validation
    console.log("\n--- Step 3: Payment Method Validations (UPI & COD) ---");
    const missingUpiRes = await request("/api/checkout", {
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
        // upiId omitted
        ageConfirmed: false,
      }),
    });
    assert(missingUpiRes.status === 400, "Rejected UPI payment when UPI ID is missing (400 Bad Request)");

    const invalidUpiRes = await request("/api/checkout", {
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
        upiId: "invalidupiidwithoutat",
        ageConfirmed: false,
      }),
    });
    assert(invalidUpiRes.status === 400, "Rejected UPI payment with invalid UPI ID format (400 Bad Request)");

    // 4. Restricted Product: 18+ Eligibility Confirmation Gate
    console.log("\n--- Step 4: Restricted Product 18+ Eligibility Verification ---");
    const unconfirmedAgeRes = await request("/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        customer: {
          fullName: "Tanjiro Kamado",
          mobileNumber: "9123456780",
          email: "tanjiro@demonslayer.com",
          address: "42 Mount Kumotori",
          city: "Bengaluru",
          state: "Karnataka",
          pinCode: "560001",
          landmark: "Near Wisteria House",
        },
        items: [{ productId: katana._id, quantity: 1 }],
        paymentMethod: "COD",
        ageConfirmed: false, // 18+ NOT confirmed
      }),
    });
    const unconfirmedAgeMsg = (unconfirmedAgeRes.json?.error?.message || unconfirmedAgeRes.json?.message || "").toLowerCase();
    assert(
      unconfirmedAgeRes.status === 400 && unconfirmedAgeMsg.includes("age"),
      "Blocked restricted product purchase when ageConfirmed is false"
    );

    // 5. Restricted Product: Destination Restrictions Check
    console.log("\n--- Step 5: Restricted Product Destination Restrictions Check ---");
    // Katana has restrictions: ["UK", "NY-NYC", "CA-SF"]
    const restrictedDestRes = await request("/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        customer: {
          fullName: "Tanjiro Kamado",
          mobileNumber: "9123456780",
          email: "tanjiro@demonslayer.com",
          address: "10 Downing Street",
          city: "London",
          state: "UK", // Restricted territory!
          pinCode: "SW1A2AA",
          landmark: "Westminster",
        },
        items: [{ productId: katana._id, quantity: 1 }],
        paymentMethod: "COD",
        ageConfirmed: true, // Age confirmed but destination restricted
      }),
    });
    const restrictedDestMsg = (restrictedDestRes.json?.error?.message || restrictedDestRes.json?.message || "").toLowerCase();
    assert(
      restrictedDestRes.status === 400 && restrictedDestMsg.includes("destination restriction"),
      "Blocked restricted product delivery to restricted destination 'UK'"
    );

    // 6. Complete Order with UPI Payment (Regular Item)
    console.log("\n--- Step 6: Complete Order Placement with UPI Payment ---");
    const upiOrderRes = await request("/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        customer: {
          fullName: "Monkey D. Luffy",
          mobileNumber: "9876543210",
          email: "luffy@strawhat.com",
          address: "Thousand Sunny, Berth 4",
          city: "Mumbai",
          state: "Maharashtra",
          pinCode: "400001",
          landmark: "Near Gateway of India",
        },
        items: [{ productId: animeFigure._id, quantity: 2 }],
        paymentMethod: "UPI",
        upiId: "luffy@okhdfcbank",
        ageConfirmed: false,
      }),
    });

    assert(upiOrderRes.status === 201 && upiOrderRes.json?.success, "Order placed successfully via UPI (201 Created)");
    const upiOrder = upiOrderRes.json?.data;

    assert(upiOrder?.orderNumber?.startsWith("FW-"), `Generated orderNumber: ${upiOrder?.orderNumber}`);
    assert(upiOrder?.paymentMethod === "UPI", "Recorded paymentMethod: UPI");
    assert(upiOrder?.paymentStatus === "paid", "Payment status marked as paid for UPI");
    assert(upiOrder?.pricing?.subtotal === 4998, "Subtotal calculated authoritatively: ₹4,998 (2499 * 2)");
    assert(upiOrder?.pricing?.shippingFee === 100, "Delivery fee applied: ₹100");
    assert(upiOrder?.pricing?.grandTotal === 5098, "Grand total calculated: ₹5,098 (Subtotal 4,998 + Delivery 100)");
    assert(upiOrder?.shippingAddress?.landmark === "Near Gateway of India", "Landmark saved in delivery address");
    assert(!!upiOrder?.estimatedDelivery, `Estimated delivery date generated: ${upiOrder?.estimatedDelivery}`);

    // 7. Verify Inventory Decrement
    console.log("\n--- Step 7: Warehouse Inventory Decrement ---");
    const verifyStockRes = await request(`/api/products/${animeFigure._id}`);
    const updatedFigure = verifyStockRes.json?.data?.product;
    assert(
      updatedFigure?.stock === initialStock - 2,
      `Inventory stock decremented by 2: from ${initialStock} to ${updatedFigure?.stock}`
    );

    // 8. Complete Order with COD Payment & Restricted Item (Eligible Destination)
    console.log("\n--- Step 8: Complete Order Placement with COD & 18+ Restricted Product ---");
    const codOrderRes = await request("/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        customer: {
          fullName: "Roronoa Zoro",
          mobileNumber: "9876543210",
          email: "zoro@wano.com",
          address: "Dojo Street, Sector 3",
          city: "Pune",
          state: "Maharashtra", // Eligible destination
          pinCode: "411001",
          landmark: "Near Shaniwar Wada",
        },
        items: [{ productId: katana._id, quantity: 1 }],
        paymentMethod: "COD",
        ageConfirmed: true, // 18+ Confirmed
      }),
    });

    assert(codOrderRes.status === 201 && codOrderRes.json?.success, "Order placed successfully via COD (201 Created)");
    const codOrder = codOrderRes.json?.data;

    assert(codOrder?.orderNumber?.startsWith("FW-"), `Generated orderNumber: ${codOrder?.orderNumber}`);
    assert(codOrder?.paymentMethod === "COD", "Recorded paymentMethod: COD");
    assert(codOrder?.paymentStatus === "pending", "Payment status marked as pending for Cash on Delivery");
    assert(codOrder?.complianceVerified === true, "Order recorded complianceVerified = true");
    const katanaEffectivePrice = katana.discountPrice ?? katana.price;
    assert(codOrder?.pricing?.subtotal === katanaEffectivePrice, `Subtotal verified: ₹${katanaEffectivePrice}`);
    assert(codOrder?.pricing?.grandTotal === katanaEffectivePrice + 100, `Grand total verified: ₹${katanaEffectivePrice + 100}`);

    // Test Summary
    console.log("\n=======================================================================");
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
    console.log("=======================================================================");

    if (failed > 0) {
      process.exitCode = 1;
    } else {
      process.exitCode = 0;
    }
  } catch (err) {
    console.error("Test execution aborted with error:", err);
    process.exitCode = 1;
  }
}

runTests();
