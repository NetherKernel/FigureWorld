// Automated end-to-end verification script for Sprint 3 — Product & Category System
import http from "http";

const BASE_URL = "http://localhost:3000";

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
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
  console.log("       SPRINT 3: PRODUCT & CATEGORY SYSTEM AUTOMATED TEST SUITE        ");
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
    console.log("--- Step 0: Seed Catalog & Accounts ---");
    const seedRes = await request("/api/seed");
    assert(seedRes.status === 200 && seedRes.json?.success, "Database seeded categories & sample products");

    // 1. Authenticate Personas (Admin, Staff, Customer)
    console.log("\n--- Step 1: Authentication for Roles ---");
    const adminLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@figuresworld.com", password: "Admin@123456" }),
    });
    assert(adminLogin.status === 200 && adminLogin.json?.data?.user?.role === "ADMIN", "Admin authenticated");
    const adminCookie = adminLogin.cookie?.split(";")[0] || "";

    const staffLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "staff@figuresworld.com", password: "Staff@123456" }),
    });
    assert(staffLogin.status === 200 && staffLogin.json?.data?.user?.role === "STAFF", "Staff authenticated");
    const staffCookie = staffLogin.cookie?.split(";")[0] || "";

    const customerLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "customer@figuresworld.com", password: "Customer@123456" }),
    });
    assert(customerLogin.status === 200 && customerLogin.json?.data?.user?.role === "CUSTOMER", "Customer authenticated");
    const customerCookie = customerLogin.cookie?.split(";")[0] || "";

    // 2. Category Verification & Compliance Fields
    console.log("\n--- Step 2: Categories System & Restricted Compliance ---");
    const catRes = await request("/api/categories");
    assert(catRes.status === 200 && Array.isArray(catRes.json?.data?.categories), "Categories list fetched");
    const categories = catRes.json?.data?.categories || [];

    const standardNames = [
      "Anime Figures",
      "Collectibles",
      "Accessories",
      "Keychains",
      "Posters",
      "Manga",
      "Other Merchandise",
    ];
    for (const name of standardNames) {
      const exists = categories.some((c) => c.name === name);
      assert(exists, `Standard category exists: "${name}"`);
    }

    // Verify Restricted Category
    const restrictedCategory = categories.find((c) => c.slug === "katanas-replicas");
    assert(!!restrictedCategory, "Dedicated restricted category exists: 'Katanas & Replicas'");
    assert(restrictedCategory?.isRestricted === true, "Category has isRestricted = true flag");
    assert(
      restrictedCategory?.complianceRequirements?.minAge === 18,
      "Compliance field minAge = 18 enforced"
    );
    assert(
      restrictedCategory?.complianceRequirements?.requiresIdVerification === true,
      "Compliance field requiresIdVerification = true enforced"
    );
    assert(
      typeof restrictedCategory?.complianceRequirements?.disclaimerText === "string" &&
        restrictedCategory.complianceRequirements.disclaimerText.length > 10,
      "Compliance disclaimerText present"
    );
    assert(
      Array.isArray(restrictedCategory?.complianceRequirements?.restrictedRegions) &&
        restrictedCategory.complianceRequirements.restrictedRegions.length > 0,
      `Restricted regions compliance list present: [${restrictedCategory?.complianceRequirements?.restrictedRegions?.join(", ")}]`
    );

    // Test Category RBAC
    console.log("\n--- Step 3: Category RBAC ---");
    const unauthCatCreate = await request("/api/categories", {
      method: "POST",
      headers: { Cookie: customerCookie },
      body: JSON.stringify({ name: "Hacked Category", slug: "hacked-cat" }),
    });
    assert(
      unauthCatCreate.status === 403,
      "Customer forbidden from creating category (403 Forbidden)"
    );

    const adminCatCreate = await request("/api/categories", {
      method: "POST",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        name: `Test Cat ${Date.now()}`,
        slug: `test-cat-${Date.now()}`,
        description: "Admin test category",
      }),
    });
    assert(
      adminCatCreate.status === 201 && adminCatCreate.json?.success,
      "Admin authorized to create category (201 Created)"
    );

    // 4. Image Upload Functionality
    console.log("\n--- Step 4: Image Upload Functionality (/api/upload) ---");
    // Customer attempt
    const formCustomer = new FormData();
    formCustomer.append(
      "file",
      new Blob([Buffer.from("fake-image-content")], { type: "image/png" }),
      "test-customer.png"
    );
    const customerUpload = await request("/api/upload", {
      method: "POST",
      headers: { Cookie: customerCookie },
      body: formCustomer,
    });
    assert(
      customerUpload.status === 403,
      "Customer forbidden from uploading images (403 Forbidden)"
    );

    // Admin upload
    const formAdmin = new FormData();
    formAdmin.append(
      "file",
      new Blob([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])], { type: "image/png" }),
      "test-upload.png"
    );
    const adminUpload = await request("/api/upload", {
      method: "POST",
      headers: { Cookie: adminCookie },
      body: formAdmin,
    });
    assert(
      adminUpload.status === 201 && adminUpload.json?.data?.url?.startsWith("/uploads/"),
      `Admin successfully uploaded image: ${adminUpload.json?.data?.url}`
    );
    const uploadedImageUrl = adminUpload.json?.data?.url || "/uploads/test.png";

    // 5. Product Creation with Full Fields & Compliance
    console.log("\n--- Step 5: Product Creation & Schema Compliance ---");
    const testSku = `SKU-TST-${Date.now()}`;
    const testSlug = `test-product-blade-${Date.now()}`;
    const animeCatId = categories.find((c) => c.slug === "anime-figures")?._id;

    // Customer attempt to create product
    const customerProductCreate = await request("/api/products", {
      method: "POST",
      headers: { Cookie: customerCookie },
      body: JSON.stringify({
        name: "Unauthorized Product",
        slug: "unauthorized-slug",
        description: "Should fail",
        price: 99.99,
        stock: 5,
        category: animeCatId,
        sku: "UNAUTH-001",
      }),
    });
    assert(
      customerProductCreate.status === 403,
      "Customer forbidden from creating products (403 Forbidden)"
    );

    // Admin create valid product with ALL required fields
    const newProductPayload = {
      name: "Roronoa Zoro Wano Kuni Masterpiece",
      slug: testSlug,
      description: "Exclusive collector edition Zoro wielding Enma with translucent aura effects.",
      price: 199.99,
      discountPrice: 179.99,
      stock: 15,
      category: restrictedCategory._id, // Restricted category test
      brand: "MegaHouse",
      sku: testSku,
      weight: 1450,
      dimensions: { length: 30, width: 22, height: 35, unit: "cm" },
      images: [
        { url: uploadedImageUrl, altText: "Front Angle", isPrimary: true },
        { url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800", altText: "Side View", isPrimary: false },
      ],
      status: "active",
      isFeatured: true,
      isRestricted: true,
      ageRequirement: 18,
      shippingRestrictions: ["UK", "NY-NYC", "CA-SF"],
    };

    const adminProductCreate = await request("/api/products", {
      method: "POST",
      headers: { Cookie: adminCookie },
      body: JSON.stringify(newProductPayload),
    });

    assert(
      adminProductCreate.status === 201 && adminProductCreate.json?.success,
      "Admin created product with full required fields (201 Created)"
    );

    const createdProduct = adminProductCreate.json?.data?.product;
    assert(createdProduct?.sku === testSku, "SKU properly stored in uppercase");
    assert(createdProduct?.weight === 1450, "Weight field verified (1450g)");
    assert(
      createdProduct?.dimensions?.height === 35 && createdProduct?.dimensions?.unit === "cm",
      "Dimensions field verified (30x22x35 cm)"
    );
    assert(createdProduct?.isRestricted === true, "isRestricted compliance flag verified");
    assert(createdProduct?.ageRequirement === 18, "ageRequirement compliance verified (18+)");
    assert(
      Array.isArray(createdProduct?.shippingRestrictions) &&
        createdProduct.shippingRestrictions.includes("UK"),
      "shippingRestrictions compliance verified"
    );

    // Test SKU Uniqueness Conflict (409)
    const duplicateSkuCreate = await request("/api/products", {
      method: "POST",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        ...newProductPayload,
        slug: `${testSlug}-dup`,
      }),
    });
    assert(
      duplicateSkuCreate.status === 409,
      "Duplicate SKU correctly rejected with 409 Conflict"
    );

    // 6. Admin Functionality: Quick Price & Stock Modifications (PATCH)
    console.log("\n--- Step 6: Admin Quick Price & Stock Modifications ---");
    const productId = createdProduct._id;

    // Customer attempt to change price
    const customerPricePatch = await request(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { Cookie: customerCookie },
      body: JSON.stringify({ price: 9.99 }),
    });
    assert(
      customerPricePatch.status === 403,
      "Customer forbidden from updating product price (403 Forbidden)"
    );

    // Admin change price
    const adminPricePatch = await request(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({ price: 219.99, discountPrice: 199.99 }),
    });
    assert(
      adminPricePatch.status === 200 && adminPricePatch.json?.data?.product?.price === 219.99,
      `Admin changed product price to $219.99 (discountPrice: $199.99)`
    );

    // Admin change stock
    const adminStockPatch = await request(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({ stock: 42 }),
    });
    assert(
      adminStockPatch.status === 200 && adminStockPatch.json?.data?.product?.stock === 42,
      "Admin updated inventory stock count to 42"
    );

    // 7. Admin Functionality: Enable / Disable Product Status (PATCH)
    console.log("\n--- Step 7: Admin Enable / Disable Product Status ---");
    // Disable (switch to draft)
    const disableRes = await request(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({ status: "draft" }),
    });
    assert(
      disableRes.status === 200 && disableRes.json?.data?.product?.status === "draft",
      "Admin disabled product (status: 'draft')"
    );

    // Enable back (switch to active)
    const enableRes = await request(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({ status: "active" }),
    });
    assert(
      enableRes.status === 200 && enableRes.json?.data?.product?.status === "active",
      "Admin re-enabled product (status: 'active')"
    );

    // 8. Admin Functionality: Full Edit Product (PUT)
    console.log("\n--- Step 8: Full Product Edit (PUT) ---");
    const updatedDesc = "Updated full collector edition description with improved display stand.";
    const editRes = await request(`/api/products/${productId}`, {
      method: "PUT",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        ...newProductPayload,
        description: updatedDesc,
        price: 229.99,
      }),
    });
    assert(
      editRes.status === 200 && editRes.json?.data?.product?.description === updatedDesc,
      "Admin performed full product update via PUT"
    );

    // 9. Storefront Queries & Compliance Retrieval
    console.log("\n--- Step 9: Storefront Queries & Compliance Retrieval ---");
    // Query product by slug
    const getBySlug = await request(`/api/products/${testSlug}`);
    assert(
      getBySlug.status === 200 && getBySlug.json?.data?.product?.slug === testSlug,
      `Storefront retrieved product by slug: /api/products/${testSlug}`
    );
    assert(
      getBySlug.json?.data?.category?.isRestricted === true,
      "Product query populates Category compliance details"
    );

    // Filter by Restricted
    const restrictedList = await request("/api/products?isRestricted=true");
    assert(
      restrictedList.status === 200 &&
        restrictedList.json?.data?.products?.every((p) => p.isRestricted === true),
      "Filtered query '?isRestricted=true' returns restricted items only"
    );

    // 10. Admin Functionality: Delete Product (DELETE)
    console.log("\n--- Step 10: Delete Product & RBAC Protection ---");
    // Customer attempt to delete product
    const customerDelete = await request(`/api/products/${productId}`, {
      method: "DELETE",
      headers: { Cookie: customerCookie },
    });
    assert(
      customerDelete.status === 403,
      "Customer forbidden from deleting product (403 Forbidden)"
    );

    // Staff attempt to delete product (Only ADMIN can delete)
    const staffDelete = await request(`/api/products/${productId}`, {
      method: "DELETE",
      headers: { Cookie: staffCookie },
    });
    assert(
      staffDelete.status === 403,
      "Staff forbidden from deleting product (strictly ADMIN only)"
    );

    // Admin delete product
    const adminDelete = await request(`/api/products/${productId}`, {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    });
    assert(
      adminDelete.status === 200 && adminDelete.json?.data?.deleted === true,
      "Admin deleted product successfully (200 OK)"
    );

    // Verify product is gone
    const verifyGone = await request(`/api/products/${productId}`);
    assert(verifyGone.status === 404, "Product is no longer retrievable (404 Not Found)");

    // Test Summary
    console.log("\n=======================================================================");
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
    console.log("=======================================================================");

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error("Test execution aborted with error:", err);
    process.exit(1);
  }
}

runTests();
