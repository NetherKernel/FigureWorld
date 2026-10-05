import assert from "assert";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function main() {
  console.log("=======================================================================");
  console.log("       CUSTOMIZABLE DELIVERY & LOCAL COURIER AUTOMATED TEST SUITE      ");
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

  // 2. Fetch Initial Delivery Settings
  console.log("\n--- Step 2: Fetch Current Delivery Settings ---");
  const getSettingsRes = await fetch(`${BASE_URL}/api/admin/delivery-rates`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(getSettingsRes.ok, "GET /api/admin/delivery-rates succeeded");
  const getSettingsJson = await getSettingsRes.json();
  assert(getSettingsJson.success, "API returned success");
  assert(typeof getSettingsJson.data.settings.defaultBaseFee === "number", "defaultBaseFee is a number");
  pass(`Fetched delivery settings. Current base fee: ₹${getSettingsJson.data.settings.defaultBaseFee}`);

  // 3. Update Delivery Rules (Local & Regional Tiers)
  console.log("\n--- Step 3: Configure Local Courier & Regional Tiers ---");
  const updateSettingsRes = await fetch(`${BASE_URL}/api/admin/delivery-rates`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      defaultBaseFee: 100,
      enableLocalDelivery: true,
      localCity: "Mumbai",
      localCityFee: 50,
      localCityEstDays: "Same Day / 4 Hours",
      enableRegionalDelivery: true,
      regionalState: "Maharashtra",
      regionalStateFee: 80,
      regionalStateEstDays: "1-2 Days",
      stateRates: [],
    }),
  });
  assert(updateSettingsRes.ok, "PUT /api/admin/delivery-rates succeeded");
  const updatedSettingsJson = await updateSettingsRes.json();
  assert(updatedSettingsJson.data.settings.localCityFee === 50, "localCityFee updated to 50");
  assert(updatedSettingsJson.data.settings.enableLocalDelivery === true, "enableLocalDelivery set to true");
  pass("Configured Mumbai local city delivery at ₹50");

  // 4. Add Custom Pincode Override (Hyperlocal Pricing)
  console.log("\n--- Step 4: Add Custom Pincode Override ---");
  const addPinRes = await fetch(`${BASE_URL}/api/admin/delivery-rates/pincodes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pincode: "400050",
      areaName: "Bandra West (Store Hub)",
      fee: 35,
      estimatedDays: "2-4 Hours",
      isActive: true,
      notes: "Local bike delivery quote",
    }),
  });
  assert(addPinRes.ok, "POST /api/admin/delivery-rates/pincodes succeeded");
  pass("Added custom pincode 400050 (Bandra West) at unique rate ₹35");

  // 5. Test Delivery Rate Simulation API
  console.log("\n--- Step 5: Test Delivery Cost Simulator ---");
  // 5a. Pincode override match
  const simPinRes = await fetch(`${BASE_URL}/api/admin/delivery-rates/simulate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subtotal: 1000,
      pincode: "400050",
      city: "Mumbai",
      state: "Maharashtra",
    }),
  });
  const simPinJson = await simPinRes.json();
  assert(simPinJson.data.calculation.fee === 35, `Pincode override returned ₹35 (got ${simPinJson.data.calculation.fee})`);
  assert(simPinJson.data.calculation.ruleApplied === "PINCODE_OVERRIDE", "ruleApplied is PINCODE_OVERRIDE");
  pass("Simulator correctly applied Pincode Override fee: ₹35");

  // 5b. Local city match
  const simCityRes = await fetch(`${BASE_URL}/api/admin/delivery-rates/simulate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subtotal: 1000,
      pincode: "400099",
      city: "Mumbai",
      state: "Maharashtra",
    }),
  });
  const simCityJson = await simCityRes.json();
  assert(simCityJson.data.calculation.fee === 50, `Local city returned ₹50 (got ${simCityJson.data.calculation.fee})`);
  assert(simCityJson.data.calculation.ruleApplied === "LOCAL_CITY", "ruleApplied is LOCAL_CITY");
  pass("Simulator correctly applied Local City Delivery fee: ₹50");

  // 5c. Regional state match
  const simStateRes = await fetch(`${BASE_URL}/api/admin/delivery-rates/simulate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subtotal: 1000,
      pincode: "411001",
      city: "Pune",
      state: "Maharashtra",
    }),
  });
  const simStateJson = await simStateRes.json();
  assert(simStateJson.data.calculation.fee === 80, `Regional state returned ₹80 (got ${simStateJson.data.calculation.fee})`);
  assert(simStateJson.data.calculation.ruleApplied === "REGIONAL_STATE", "ruleApplied is REGIONAL_STATE");
  pass("Simulator correctly applied Regional State Delivery fee: ₹80");

  // 5d. Default National match
  const simNatRes = await fetch(`${BASE_URL}/api/admin/delivery-rates/simulate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subtotal: 1000,
      pincode: "110001",
      city: "New Delhi",
      state: "Delhi",
    }),
  });
  const simNatJson = await simNatRes.json();
  assert(simNatJson.data.calculation.fee === 100, `National base returned ₹100 (got ${simNatJson.data.calculation.fee})`);
  assert(simNatJson.data.calculation.ruleApplied === "DEFAULT_BASE", "ruleApplied is DEFAULT_BASE");
  pass("Simulator correctly applied National Standard Delivery fee: ₹100");

  // 6. Test Dynamic Cart Calculation with Address
  console.log("\n--- Step 6: Test Cart Calculation with Shipping Address ---");
  const catalogRes = await fetch(`${BASE_URL}/api/products?search=Anime%20Figure`);
  const catalogJson = await catalogRes.json();
  const testProduct = catalogJson.data.products.find((p) => p.sku === "AF-DEMO-2499") || catalogJson.data.products[0];
  assert(testProduct, "Found test product in catalog");

  const cartRes = await fetch(`${BASE_URL}/api/cart/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ productId: testProduct._id, quantity: 1 }],
      shippingAddress: {
        postalCode: "400050",
        city: "Mumbai",
        state: "Maharashtra",
      },
    }),
  });
  const cartJson = await cartRes.json();
  assert(cartJson.data.summary.shipping === 35, `Cart shipping fee matches pincode override ₹35 (got ${cartJson.data.summary.shipping})`);
  pass("Cart calculation applied unique pincode delivery rate ₹35");

  // 7. Place Order with Pincode Override & UPI Payment
  console.log("\n--- Step 7: Place Order & Verify Authoritative Delivery Fee ---");
  const checkoutRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: {
        fullName: "Roronoa Zoro",
        email: "zoro@strawhats.com",
        mobileNumber: "9876543210",
        address: "Shop 4, Linking Road",
        landmark: "Near Crossword Bookstore",
        city: "Mumbai",
        state: "Maharashtra",
        pinCode: "400050",
      },
      items: [{ productId: testProduct._id, quantity: 1 }],
      paymentMethod: "UPI",
      upiId: "zoro@oksbi",
      termsConsent: true,
    }),
  });
  const checkoutJson = await checkoutRes.json();
  assert(checkoutRes.ok, "Order created successfully");
  const orderNumber = checkoutJson.data.orderNumber;
  const initialShipping = checkoutJson.data.pricing.shippingFee;
  assert(initialShipping === 35, `Order applied pincode delivery fee ₹35 (got ${initialShipping})`);
  pass(`Order ${orderNumber} placed with initial delivery fee ₹${initialShipping}`);

  // 8. Admin Adjusts Delivery Fee (Per-Order Customizer)
  console.log("\n--- Step 8: Admin Customizes Order Delivery Fee ---");
  const customDeliveryRes = await fetch(
    `${BASE_URL}/api/admin/orders/${encodeURIComponent(orderNumber)}/delivery-fee`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customShippingFee: 45,
        reason: "Porter bike 2-wheeler quote for 4.2 km distance",
        partnerType: "PORTER",
      }),
    }
  );
  const customDeliveryJson = await customDeliveryRes.json();
  assert(customDeliveryRes.ok, "Delivery customization API succeeded");
  assert(customDeliveryJson.data.pricing.shippingFee === 45, `Shipping fee updated to ₹45 (got ${customDeliveryJson.data.pricing.shippingFee})`);
  const expectedGrandTotal = testProduct.price + 45;
  assert(customDeliveryJson.data.pricing.grandTotal === expectedGrandTotal, `Grand total updated to ₹${expectedGrandTotal}`);
  assert(customDeliveryJson.data.pricing.isCustomShippingFee === true, "isCustomShippingFee marked true");
  assert(customDeliveryJson.data.qrPayload.includes("am="), "Regenerated UPI QR payload with new amount");
  pass(`Customized order ${orderNumber} delivery fee from ₹35 to ₹45 (Grand Total: ₹${expectedGrandTotal})`);

  // 9. Fetch Order Details via Admin Order API
  console.log("\n--- Step 9: Verify Customized Order State in Admin API ---");
  const orderDetailsRes = await fetch(`${BASE_URL}/api/admin/orders/${encodeURIComponent(orderNumber)}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const orderDetailsJson = await orderDetailsRes.json();
  assert(orderDetailsJson.data.pricing.shippingFee === 45, "Admin order details reflects ₹45 shipping fee");
  assert(orderDetailsJson.data.pricing.isCustomShippingFee === true, "Admin order details has isCustomShippingFee flag");
  pass("Admin order API correctly reflects updated delivery fee and customization flag");

  // 10. Clean up: Delete Custom Pincode & Reset local delivery toggle
  console.log("\n--- Step 10: Clean Up & Restore Default Baseline ---");
  const delPinRes = await fetch(`${BASE_URL}/api/admin/delivery-rates/pincodes?pincode=400050`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(delPinRes.ok, "Cleaned up test pincode 400050");

  const resetSettingsRes = await fetch(`${BASE_URL}/api/admin/delivery-rates`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      defaultBaseFee: 100,
      enableLocalDelivery: false,
      enableRegionalDelivery: false,
      isFreeShippingActive: false,
      freeShippingThreshold: 1999,
    }),
  });
  assert(resetSettingsRes.ok, "Reset delivery settings to baseline");
  pass("Cleaned up custom pincode and restored settings to baseline");

  console.log("\n=======================================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, 0 FAILED (TOTAL: ${passed})`);
  console.log("=======================================================================\n");
}

main().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
