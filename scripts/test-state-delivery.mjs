import assert from "assert";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function main() {
  console.log("=======================================================================");
  console.log("      STATE-WISE DELIVERY RATES AUTOMATED END-TO-END TEST SUITE        ");
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
  pass(`Fetched delivery settings. Total configured state rates: ${getSettingsJson.data.stats.totalStateRates ?? 0}`);

  // 3. Add Custom State Delivery Fee for Delhi
  console.log("\n--- Step 3: Add Custom Delivery Rate for Delhi (₹70) ---");
  const addDelhiRes = await fetch(`${BASE_URL}/api/admin/delivery-rates/states`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      state: "Delhi",
      fee: 70,
      estimatedDays: "2-3 Days",
      isActive: true,
      notes: "Courier Air Express",
    }),
  });
  const addDelhiJson = await addDelhiRes.json();
  assert(addDelhiRes.ok && addDelhiJson.success, "POST state Delhi rate succeeded");
  pass("Configured Delhi custom delivery fee at ₹70");

  // 4. Add Custom State Delivery Fee for Karnataka
  console.log("\n--- Step 4: Add Custom Delivery Rate for Karnataka (₹85) ---");
  const addKrnRes = await fetch(`${BASE_URL}/api/admin/delivery-rates/states`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      state: "Karnataka",
      fee: 85,
      estimatedDays: "2-4 Days",
      isActive: true,
      notes: "South Hub Surface/Air",
    }),
  });
  const addKrnJson = await addKrnRes.json();
  assert(addKrnRes.ok && addKrnJson.success, "POST state Karnataka rate succeeded");
  pass("Configured Karnataka custom delivery fee at ₹85");

  // 5. Test Live Simulation for Delhi Address
  console.log("\n--- Step 5: Simulate Rate for Customer in Delhi ---");
  const simDelhiRes = await fetch(`${BASE_URL}/api/admin/delivery-rates/simulate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subtotal: 999,
      pincode: "110001",
      city: "New Delhi",
      state: "Delhi",
    }),
  });
  const simDelhiJson = await simDelhiRes.json();
  assert(simDelhiRes.ok && simDelhiJson.success, "Simulation for Delhi succeeded");
  assert(simDelhiJson.data.calculation.fee === 70, `Expected fee 70, got ${simDelhiJson.data.calculation.fee}`);
  assert(
    simDelhiJson.data.calculation.ruleName.includes("Delhi"),
    `Expected rule name mentioning Delhi, got ${simDelhiJson.data.calculation.ruleName}`
  );
  pass(`Simulated Delhi order delivery fee: ₹${simDelhiJson.data.calculation.fee} (${simDelhiJson.data.calculation.ruleName})`);

  // 6. Test Live Simulation for Karnataka Address
  console.log("\n--- Step 6: Simulate Rate for Customer in Karnataka ---");
  const simKrnRes = await fetch(`${BASE_URL}/api/admin/delivery-rates/simulate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subtotal: 800,
      pincode: "560001",
      city: "Bengaluru",
      state: "Karnataka",
    }),
  });
  const simKrnJson = await simKrnRes.json();
  assert(simKrnRes.ok && simKrnJson.success, "Simulation for Karnataka succeeded");
  assert(simKrnJson.data.calculation.fee === 85, `Expected fee 85, got ${simKrnJson.data.calculation.fee}`);
  pass(`Simulated Karnataka order delivery fee: ₹${simKrnJson.data.calculation.fee} (${simKrnJson.data.calculation.ruleName})`);

  // 7. Test Pre-Populate (Seed) All Indian States
  console.log("\n--- Step 7: Pre-populate All 34+ Indian States & UTs ---");
  const seedRes = await fetch(`${BASE_URL}/api/admin/delivery-rates/states`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
  });
  const seedJson = await seedRes.json();
  assert(seedRes.ok && seedJson.success, "PUT /api/admin/delivery-rates/states succeeded");
  pass(`Pre-populated states. Total states now: ${seedJson.data.totalStateRates}`);

  // Verify Delhi (₹70) and Karnataka (₹85) were preserved and not overwritten by defaults
  const verifyDelhi = seedJson.data.settings.stateRates.find((s) => s.state.toLowerCase() === "delhi");
  const verifyKrn = seedJson.data.settings.stateRates.find((s) => s.state.toLowerCase() === "karnataka");
  assert(verifyDelhi && verifyDelhi.fee === 70, `Delhi fee preserved at 70 (got ${verifyDelhi?.fee})`);
  assert(verifyKrn && verifyKrn.fee === 85, `Karnataka fee preserved at 85 (got ${verifyKrn?.fee})`);
  pass("Custom state prices (Delhi ₹70, Karnataka ₹85) preserved across bulk pre-populate");

  // 8. Test State Update (Inline Fee Edit)
  console.log("\n--- Step 8: Update State Rate Inline (e.g. Karnataka to ₹90) ---");
  const updateKrnRes = await fetch(`${BASE_URL}/api/admin/delivery-rates/states`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      state: "Karnataka",
      fee: 90,
      estimatedDays: "2-3 Days",
      isActive: true,
      notes: "Express Air 2-3 Days",
    }),
  });
  const updateKrnJson = await updateKrnRes.json();
  assert(updateKrnRes.ok && updateKrnJson.success, "Update Karnataka fee succeeded");
  const updatedKrn = updateKrnJson.data.settings.stateRates.find((s) => s.state.toLowerCase() === "karnataka");
  assert(updatedKrn?.fee === 90, `Expected Karnataka fee 90, got ${updatedKrn?.fee}`);
  pass("Successfully updated Karnataka delivery fee to ₹90");

  // 9. Test Delete State Rate
  console.log("\n--- Step 9: Delete Specific State Rate ---");
  const deleteRes = await fetch(`${BASE_URL}/api/admin/delivery-rates/states?state=Karnataka`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const deleteJson = await deleteRes.json();
  assert(deleteRes.ok && deleteJson.success, "DELETE state rate succeeded");
  const deletedKrn = deleteJson.data.settings.stateRates.find((s) => s.state.toLowerCase() === "karnataka");
  assert(!deletedKrn, "Karnataka rate removed from settings");
  pass("Successfully deleted Karnataka custom state rate");

  console.log("\n=======================================================================");
  console.log(` ALL TESTS PASSED: ${passed}/9 SUCCESSFUL VERIFICATIONS`);
  console.log("=======================================================================\n");
}

main().catch((err) => {
  console.error("\n[TEST ERROR]:", err);
  process.exit(1);
});
