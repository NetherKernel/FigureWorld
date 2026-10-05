// Automated end-to-end verification script for Subcategories & Franchise Hierarchy
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

  const cookie = res.headers.get("set-cookie");
  let json = null;
  try {
    json = await res.json();
  } catch (e) {
    // Non-JSON response
  }

  return {
    status: res.status,
    headers: res.headers,
    cookie,
    json,
  };
}

async function runTests() {
  console.log("=======================================================================");
  console.log("       SUBCATEGORY & FRANCHISE HIERARCHY AUTOMATED TEST SUITE          ");
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
    // 1. Admin Authentication
    console.log("--- Step 1: Admin Authentication ---");
    const loginRes = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "admin@figuresworld.com",
        password: "Admin@123456",
      }),
    });
    assert(loginRes.status === 200 && loginRes.json?.data?.user?.role === "ADMIN", "Admin login successful");
    const adminCookie = loginRes.cookie?.split(";")[0] || "";

    // 2. Query Category Tree Hierarchy
    console.log("\n--- Step 2: Category Tree Hierarchy Retrieval ---");
    const treeRes = await request("/api/categories?tree=true");
    assert(treeRes.status === 200 && treeRes.json?.success, "GET /api/categories?tree=true succeeded");
    const tree = treeRes.json?.data?.categories;
    assert(Array.isArray(tree) && tree.length > 0, "Tree array returned");

    const actionFigures = tree.find((c) => c.slug === "action-figures");
    assert(!!actionFigures, "Parent 'Action Figures' category present in tree");
    assert(Array.isArray(actionFigures?.subcategories), "Action Figures has subcategories array");

    // 3. Verify Specific User-Requested Franchises Under Action Figures
    console.log("\n--- Step 3: Verify User-Requested Franchise Subcategories ---");
    const requestedSlugs = [
      { name: "Dragon Ball", slug: "dragon-ball" },
      { name: "Jujutsu Kaisen", slug: "jujutsu-kaisen" },
      { name: "Marvel", slug: "marvel" },
      { name: "DC", slug: "dc-comics" },
      { name: "One Piece", slug: "one-piece" },
      { name: "Naruto", slug: "naruto" },
      { name: "Demon Slayer", slug: "demon-slayer" },
      { name: "Attack on Titan", slug: "attack-on-titan" },
      { name: "Bleach", slug: "bleach" },
      { name: "Chainsaw Man", slug: "chainsaw-man" },
      { name: "My Hero Academia", slug: "my-hero-academia" },
      { name: "Pokemon", slug: "pokemon" },
      { name: "Star Wars", slug: "star-wars" },
      { name: "Solo Leveling", slug: "solo-leveling" },
    ];

    for (const item of requestedSlugs) {
      const match = actionFigures.subcategories.find((s) => s.slug === item.slug);
      assert(!!match, `Action Figures contains franchise: ${item.name} (${item.slug})`);
    }

    // 4. Test Subcategory Product Filtering
    console.log("\n--- Step 4: Product Filtering by Subcategory ---");
    for (const item of [
      { slug: "dragon-ball", expectedWord: "Goku" },
      { slug: "jujutsu-kaisen", expectedWord: "Gojo" },
      { slug: "marvel", expectedWord: "Iron Man" },
      { slug: "dc-comics", expectedWord: "Batman" },
      { slug: "one-piece", expectedWord: "Luffy" },
    ]) {
      const prodRes = await request(`/api/products?subcategory=${item.slug}`);
      assert(prodRes.status === 200, `Filtering /api/products?subcategory=${item.slug} responded 200 OK`);
      const prods = prodRes.json?.data?.products || [];
      assert(prods.length > 0, `Subcategory '${item.slug}' returned at least 1 product`);
      const matchedName = prods.some((p) => p.name.includes(item.expectedWord));
      assert(matchedName, `Product for '${item.slug}' correctly features '${item.expectedWord}'`);
    }

    // 5. Parent Category Cumulative Query
    console.log("\n--- Step 5: Parent Category Query Returns Subcategory Products ---");
    const parentQueryRes = await request("/api/products?category=action-figures");
    assert(parentQueryRes.status === 200, "Querying ?category=action-figures succeeded");
    const parentProds = parentQueryRes.json?.data?.products || [];
    assert(
      parentProds.length >= 5,
      `Parent 'action-figures' query aggregated products from child subcategories (found ${parentProds.length})`
    );

    // 6. Admin Create Subcategory via API
    console.log("\n--- Step 6: Create New Subcategory under Parent ---");
    const testSlug = `test-franchise-${Date.now()}`;
    const createSubRes = await request("/api/categories", {
      method: "POST",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        name: "Test Anime Franchise",
        slug: testSlug,
        description: "Automated test franchise",
        parentCategory: actionFigures._id,
        displayOrder: 99,
      }),
    });

    assert(createSubRes.status === 201, "Admin created subcategory with parentCategory ID (201 Created)");
    const createdCat = createSubRes.json?.data?.category;
    assert(
      createdCat?.parentCategory?.name === "Action Figures" ||
        createdCat?.parentCategory?._id === actionFigures._id ||
        createdCat?.parentCategory === actionFigures._id,
      "Created category correctly linked to parent category"
    );

    // 7. Update Subcategory (PUT)
    console.log("\n--- Step 7: Update Subcategory ---");
    const updateRes = await request(`/api/categories/${createdCat._id}`, {
      method: "PUT",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        description: "Updated test franchise description",
      }),
    });
    assert(updateRes.status === 200, "Updated subcategory successfully (200 OK)");

    // 8. Delete Subcategory (Cleanup)
    console.log("\n--- Step 8: Delete Subcategory ---");
    const deleteRes = await request(`/api/categories/${createdCat._id}`, {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    });
    assert(deleteRes.status === 200, "Deleted test subcategory cleanly");

    // 9. Franchise Seed Endpoint
    console.log("\n--- Step 9: Seed Franchise Endpoint Check ---");
    const seedFranchisesRes = await request("/api/categories/seed", {
      method: "POST",
      headers: { Cookie: adminCookie },
    });
    assert(seedFranchisesRes.status === 200, "POST /api/categories/seed executed successfully");

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
    console.error("Test execution error:", err);
    process.exitCode = 1;
  }
}

runTests();
