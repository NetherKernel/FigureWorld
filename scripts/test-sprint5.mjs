// Automated end-to-end verification script for Sprint 5 — Cart System
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
  console.log("             SPRINT 5: CART SYSTEM AUTOMATED TEST SUITE                ");
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
    // 0. Seed database
    console.log("--- Step 0: Ensure Database Seeded ---");
    const seedRes = await request("/api/seed");
    assert(seedRes.status === 200 && seedRes.json?.success, "Database seeded successfully");

    // 1. Fetch products to get the "Anime Figure" test item
    console.log("\n--- Step 1: Fetch Anime Figure Test Product ---");
    const prodRes = await request("/api/products?search=Anime Figure");
    assert(prodRes.status === 200 && Array.isArray(prodRes.json?.data?.products), "Product search responded");

    const animeFigure = prodRes.json?.data?.products?.find((p) => p.name === "Anime Figure");
    assert(!!animeFigure, "Found 'Anime Figure' in catalog");
    assert(animeFigure?.price === 2499, `Anime Figure price is verified as ₹2,499 (got ${animeFigure?.price})`);
    assert(animeFigure?.stock >= 2, `Anime Figure has sufficient stock (got ${animeFigure?.stock})`);

    // 2. Test Exact User Specification Example:
    // Anime Figure        ₹2,499
    // Quantity                2
    // -------------------------
    // Subtotal             ₹4,998
    // Shipping               ₹100
    // -------------------------
    // Total                ₹5,098
    console.log("\n--- Step 2: Validate Exact Example Calculation ---");
    const calcRes = await request("/api/cart/calculate", {
      method: "POST",
      body: JSON.stringify({
        items: [
          {
            productId: animeFigure._id,
            quantity: 2,
          },
        ],
      }),
    });

    assert(calcRes.status === 200 && calcRes.json?.success, "Backend calculation endpoint returned 200 OK");

    const verifiedItems = calcRes.json?.data?.items;
    const summary = calcRes.json?.data?.summary;

    assert(verifiedItems?.length === 1, "Calculation returned 1 verified item");
    assert(verifiedItems?.[0]?.name === "Anime Figure", "Verified item name matches 'Anime Figure'");
    assert(verifiedItems?.[0]?.unitPrice === 2499, "Verified unit price is ₹2,499");
    assert(verifiedItems?.[0]?.validQuantity === 2, "Verified quantity is 2");
    assert(verifiedItems?.[0]?.itemTotal === 4998, "Item total is ₹4,998 (2,499 * 2)");
    assert(summary?.subtotal === 4998, "Subtotal is ₹4,998");
    assert(summary?.shipping === 100, "Shipping fee is ₹100");
    assert(summary?.total === 5098, "Total amount is ₹5,098 (Subtotal 4,998 + Shipping 100)");
    assert(summary?.currency === "INR", "Currency is INR");

    // 3. Test Zero-Trust Architecture ("Never trust the price sent by React")
    console.log("\n--- Step 3: Zero-Trust Price Tampering Prevention ---");
    const tamperedRes = await request("/api/cart/calculate", {
      method: "POST",
      body: JSON.stringify({
        items: [
          {
            productId: animeFigure._id,
            quantity: 2,
            clientPrice: 1, // Tampered client price of ₹1
          },
        ],
      }),
    });

    assert(tamperedRes.status === 200, "Tampered payload processed by server");
    const tamperedSummary = tamperedRes.json?.data?.summary;
    const tamperedItems = tamperedRes.json?.data?.items;

    assert(
      tamperedItems?.[0]?.unitPrice === 2499,
      "Server ignored client-provided price of ₹1 and enforced DB price ₹2,499"
    );
    assert(
      tamperedSummary?.subtotal === 4998,
      "Server calculated subtotal is ₹4,998 (NOT ₹2)"
    );
    assert(
      tamperedSummary?.total === 5098,
      "Server calculated grand total is ₹5,098 (NOT ₹102)"
    );

    // 4. Test Stock Validation: Requested Quantity Exceeds Available Stock
    console.log("\n--- Step 4: Server-Side Stock Validation & Clamping ---");
    const excessQuantity = animeFigure.stock + 50;
    const excessStockRes = await request("/api/cart/calculate", {
      method: "POST",
      body: JSON.stringify({
        items: [
          {
            productId: animeFigure._id,
            quantity: excessQuantity,
          },
        ],
      }),
    });

    const excessItem = excessStockRes.json?.data?.items?.[0];
    const excessSummary = excessStockRes.json?.data?.summary;
    const stockWarnings = excessStockRes.json?.data?.stockWarnings;

    assert(
      excessItem?.requestedQuantity === excessQuantity,
      `Recorded client requested quantity (${excessQuantity})`
    );
    assert(
      excessItem?.validQuantity === animeFigure.stock,
      `Clamped validQuantity to available warehouse stock (${animeFigure.stock})`
    );
    assert(
      excessItem?.stockStatus === "insufficient_stock",
      "stockStatus correctly flagged as 'insufficient_stock'"
    );
    assert(
      stockWarnings?.length > 0,
      `Warning message provided: "${stockWarnings?.[0]}"`
    );
    assert(
      excessSummary?.hasStockIssues === true,
      "summary.hasStockIssues flag is true"
    );
    assert(
      excessItem?.itemTotal === 2499 * animeFigure.stock,
      `Item total accurately matches clamped stock: ₹${2499 * animeFigure.stock}`
    );

    // 5. Test Empty Cart Calculation
    console.log("\n--- Step 5: Empty Cart Calculation ---");
    const emptyRes = await request("/api/cart/calculate", {
      method: "POST",
      body: JSON.stringify({
        items: [],
      }),
    });

    assert(emptyRes.status === 200, "Empty cart calculation returned 200 OK");
    assert(emptyRes.json?.data?.items?.length === 0, "Empty cart has 0 items");
    assert(emptyRes.json?.data?.summary?.subtotal === 0, "Empty cart subtotal is 0");
    assert(emptyRes.json?.data?.summary?.shipping === 0, "Empty cart shipping is 0");
    assert(emptyRes.json?.data?.summary?.total === 0, "Empty cart total is 0");

    // 6. Test Multiple Products with 18+ Restricted Detection
    console.log("\n--- Step 6: Multi-Item Cart & Compliance Verification ---");
    const katanaRes = await request("/api/products?search=Nichirin Katana");
    const katana = katanaRes.json?.data?.products?.[0];

    if (katana) {
      const multiRes = await request("/api/cart/calculate", {
        method: "POST",
        body: JSON.stringify({
          items: [
            { productId: animeFigure._id, quantity: 1 },
            { productId: katana._id, quantity: 1 },
          ],
        }),
      });

      assert(multiRes.status === 200, "Multi-item cart calculated successfully");
      const multiItems = multiRes.json?.data?.items;
      const multiSummary = multiRes.json?.data?.summary;

      assert(multiItems?.length === 2, "Cart contains both items");
      const katanaEffectivePrice = katana.discountPrice ?? katana.price;
      const expectedSubtotal = 2499 + katanaEffectivePrice;
      assert(
        multiSummary?.subtotal === expectedSubtotal,
        `Multi-item subtotal verified: ₹${expectedSubtotal}`
      );
      assert(
        multiSummary?.shipping === 100,
        "Flat shipping of ₹100 applied to multi-item cart"
      );
      assert(
        multiSummary?.total === expectedSubtotal + 100,
        `Grand total verified: ₹${expectedSubtotal + 100}`
      );
      assert(
        multiSummary?.hasRestrictedItems === true,
        "Cart flags hasRestrictedItems = true when 18+ katana is present"
      );
    }

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
