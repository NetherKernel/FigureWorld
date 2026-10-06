import assert from "assert";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function main() {
  console.log("=======================================================================");
  console.log("     WEIGHT-BASED TWO-TIER DELIVERY AUTOMATED END-TO-END TEST SUITE     ");
  console.log("=======================================================================\n");

  let passed = 0;
  function pass(msg) {
    passed++;
    console.log(`[PASS] ${msg}`);
  }

  // 1. Authenticate Admin
  console.log("--- Step 1: Admin Authentication ---");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@figuresworld.com",
      password: "Admin@123456",
    }),
  });

  const loginJson = await loginRes.json();
  assert(loginRes.ok, "Admin login succeeded");
  const adminToken = loginJson.data?.token;
  assert(adminToken, "Received admin auth token");
  pass("Admin authenticated successfully");

  // 2. Fetch Delivery Settings via Admin API
  console.log("\n--- Step 2: Fetch Current Delivery Settings ---");
  const getSettingsRes = await fetch(`${BASE_URL}/api/admin/delivery-rates`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(getSettingsRes.ok, "GET /api/admin/delivery-rates succeeded");
  const getSettingsJson = await getSettingsRes.json();
  assert(getSettingsJson.success, "API returned success");

  const { settings, stats } = getSettingsJson.data;
  console.log(`[INFO] Current Light Weight Fee: ₹${settings.lightWeightFee}`);
  console.log(`[INFO] Current Large Weight Fee: ₹${settings.largeWeightFee}`);
  console.log(`[INFO] Heavy Weight Cutoff: ${settings.heavyWeightThresholdKg} kg`);

  assert.strictEqual(settings.lightWeightFee, 180, "lightWeightFee default must be ₹180");
  assert.strictEqual(settings.largeWeightFee, 299, "largeWeightFee default must be ₹299");
  assert.strictEqual(settings.heavyWeightThresholdKg, 2.0, "heavyWeightThresholdKg must be 2.0kg");
  assert.strictEqual(stats.totalStateRates, undefined, "stateRates should not be in stats");
  pass("Delivery settings configured with ₹180 (Light) & ₹299 (Large)");

  // 3. Test Rate Simulator API
  console.log("\n--- Step 3: Rate Simulator for Light vs Large Orders ---");
  const simLightRes = await fetch(`${BASE_URL}/api/admin/delivery-rates/simulate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subtotal: 999,
      state: "Karnataka",
      pincode: "560001",
      weightClassification: "LIGHT",
      itemCount: 1,
    }),
  });
  const simLightJson = await simLightRes.json();
  assert(simLightRes.ok && simLightJson.success, "Simulate Light Weight Order succeeded");
  assert.strictEqual(simLightJson.data.fee, 180, "Light weight simulated fee must be ₹180");
  pass("Simulator correctly calculated Light Weight Fee: ₹180");

  const simLargeRes = await fetch(`${BASE_URL}/api/admin/delivery-rates/simulate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subtotal: 999,
      state: "Karnataka",
      pincode: "560001",
      weightClassification: "LARGE",
      itemCount: 1,
    }),
  });
  const simLargeJson = await simLargeRes.json();
  assert(simLargeRes.ok && simLargeJson.success, "Simulate Large Weight Order succeeded");
  assert.strictEqual(simLargeJson.data.fee, 299, "Large weight simulated fee must be ₹299");
  pass("Simulator correctly calculated Large Weight Fee: ₹299");

  // 4. Test Live Cart Calculation with Light Weight Item (Katana Mini Keychain - 350g)
  console.log("\n--- Step 4: Live Cart Calculation with Light Weight Order (< 2kg) ---");
  const katanaKeychain = {
    productId: "6ac29c1cbe0293f095523d84", // Demon Slayer Metal Nichirin Katana Mini Keychain Set (350g)
    quantity: 1,
  };

  const cartLightRes = await fetch(`${BASE_URL}/api/cart/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [katanaKeychain],
      address: {
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
      },
    }),
  });
  const cartLightJson = await cartLightRes.json();
  assert(cartLightRes.ok && cartLightJson.success, "Cart calculate succeeded for light order");
  assert.strictEqual(
    cartLightJson.data.summary.shipping,
    180,
    `Delivery fee for katana keychain must be ₹180, got ${cartLightJson.data.summary?.shipping}`
  );
  pass(`Light weight order delivery fee is ₹${cartLightJson.data.summary.shipping} (${cartLightJson.data.summary.deliveryRule})`);

  // 5. Test Live Cart Calculation with Large Weight Order (Zoro 3-Sword Set - 4200g)
  console.log("\n--- Step 5: Live Cart Calculation with Large Weight Order (≥ 2kg) ---");
  const zoroSet = {
    productId: "6ac29c1cbe0293f095523d7e", // Roronoa Zoro 3-Sword Complete Katana Set (4200g)
    quantity: 1,
  };

  const cartLargeRes = await fetch(`${BASE_URL}/api/cart/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [zoroSet],
      address: {
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
      },
    }),
  });
  const cartLargeJson = await cartLargeRes.json();
  assert(cartLargeRes.ok && cartLargeJson.success, "Cart calculate succeeded for heavy order");
  assert.strictEqual(
    cartLargeJson.data.summary.shipping,
    299,
    `Delivery fee for 4.2kg katana set must be ₹299, got ${cartLargeJson.data.summary?.shipping}`
  );
  pass(`Large weight order delivery fee is ₹${cartLargeJson.data.summary.shipping} (${cartLargeJson.data.summary.deliveryRule})`);

  // 6. Test Multiple Light Items Accumulating to Large Weight (e.g. 3 x 750g figures = 2250g >= 2000g)
  console.log("\n--- Step 6: Multiple Light Items Crossing 2.0kg Threshold ---");
  const gojoFigure = {
    productId: "6ac29d50a195805b0bd8573c", // Gojo Satoru Figure (750g)
    quantity: 3, // 3 * 750g = 2250g (> 2000g cutoff)
  };

  const cartMultiRes = await fetch(`${BASE_URL}/api/cart/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [gojoFigure],
      address: {
        city: "Pune",
        state: "Maharashtra",
        postalCode: "411001",
      },
    }),
  });
  const cartMultiJson = await cartMultiRes.json();
  assert(cartMultiRes.ok && cartMultiJson.success, "Cart calculate succeeded for multi-item order");
  assert.strictEqual(
    cartMultiJson.data.summary.shipping,
    299,
    `Delivery fee for 3x figures (2250g) must be ₹299, got ${cartMultiJson.data.summary?.shipping}`
  );
  pass(`Cumulative weight > 2kg correctly upgraded to Large Weight Fee: ₹${cartMultiJson.data.summary.shipping} (${cartMultiJson.data.summary.deliveryRule})`);

  // 7. Test Admin Updates Weight Rates and Verifies Persistence
  console.log("\n--- Step 7: Admin Updates Rates (e.g. ₹185 & ₹315) and Restores ---");
  const updateRes = await fetch(`${BASE_URL}/api/admin/delivery-rates`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      lightWeightFee: 185,
      largeWeightFee: 315,
      heavyWeightThresholdKg: 2.5,
    }),
  });
  const updateJson = await updateRes.json();
  assert(updateRes.ok && updateJson.success, "Update rates succeeded");
  assert.strictEqual(updateJson.data.settings.lightWeightFee, 185);
  assert.strictEqual(updateJson.data.settings.largeWeightFee, 315);
  assert.strictEqual(updateJson.data.settings.heavyWeightThresholdKg, 2.5);
  pass("Admin successfully updated rates to ₹185 (Light) / ₹315 (Large)");

  // Verify cart calculation uses updated rates
  const verifyUpdatedCartRes = await fetch(`${BASE_URL}/api/cart/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [katanaKeychain],
    }),
  });
  const verifyUpdatedCartJson = await verifyUpdatedCartRes.json();
  assert.strictEqual(verifyUpdatedCartJson.data.summary.shipping, 185, "Cart must reflect updated ₹185 fee");
  pass("Cart calculation immediately reflected the updated rate: ₹185");

  // Restore back to ₹180 and ₹299
  const restoreRes = await fetch(`${BASE_URL}/api/admin/delivery-rates`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      lightWeightFee: 180,
      largeWeightFee: 299,
      heavyWeightThresholdKg: 2.0,
    }),
  });
  const restoreJson = await restoreRes.json();
  assert(restoreRes.ok && restoreJson.success, "Restore rates succeeded");
  assert.strictEqual(restoreJson.data.settings.lightWeightFee, 180);
  assert.strictEqual(restoreJson.data.settings.largeWeightFee, 299);
  assert.strictEqual(restoreJson.data.settings.heavyWeightThresholdKg, 2.0);
  pass("Successfully restored default rates: Light = ₹180, Large = ₹299, Threshold = 2.0 kg");

  console.log("\n=======================================================================");
  console.log(`  ALL ${passed} WEIGHT-BASED DELIVERY SYSTEM TESTS PASSED SUCCESSFULLY! `);
  console.log("=======================================================================\n");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
