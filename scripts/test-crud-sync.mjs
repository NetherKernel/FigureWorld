// scripts/test-crud-sync.mjs
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

async function run() {
  console.log("=== Testing Dual Database CRUD & Delete Synchronization ===\n");

  // 1. Login as Admin
  console.log("1. Authenticating Admin...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@figuresworld.com", password: "Admin@123456" }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.token;
  assert(token, "Admin login successful");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // 2. Create a test parent category
  console.log("\n2. Creating Test Category...");
  const testCatSlug = `test-cat-${Date.now()}`;
  const catCreateRes = await fetch(`${BASE_URL}/api/categories`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Test Universe",
      slug: testCatSlug,
      description: "A test universe category for verification",
      displayOrder: 99,
      isActive: true,
      isRestricted: false,
    }),
  });
  const catCreateData = await catCreateRes.json();
  assert(catCreateRes.ok && catCreateData.success, `Category created: ${catCreateData.data?.category?.name}`);
  const catId = catCreateData.data?.category?._id || catCreateData.data?.category?.id;
  assert(catId, `Category ID received: ${catId}`);

  // 3. Update the category using its ID (PUT /api/categories/[id])
  console.log("\n3. Updating Category using ID...");
  const catUpdateRes = await fetch(`${BASE_URL}/api/categories/${catId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      description: "Updated description via PUT",
    }),
  });
  const catUpdateData = await catUpdateRes.json();
  assert(catUpdateRes.ok && catUpdateData.success, `Category updated successfully via PUT: ${catUpdateData.data?.category?.description}`);

  // 4. Create a test subcategory
  console.log("\n4. Creating Test Subcategory...");
  const testSubSlug = `test-sub-${Date.now()}`;
  const subCreateRes = await fetch(`${BASE_URL}/api/categories`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Test Hero Subcategory",
      slug: testSubSlug,
      description: "Subcategory of Test Universe",
      parentCategory: catId,
      displayOrder: 1,
      isActive: true,
      isRestricted: false,
    }),
  });
  const subCreateData = await subCreateRes.json();
  assert(subCreateRes.ok && subCreateData.success, `Subcategory created: ${subCreateData.data?.category?.name}`);
  const subId = subCreateData.data?.category?._id || subCreateData.data?.category?.id;

  // 5. Create a test product under this category
  console.log("\n5. Creating Test Product...");
  const testProdSlug = `test-figure-${Date.now()}`;
  const testProdSku = `SKU-TEST-${Date.now()}`;
  const prodCreateRes = await fetch(`${BASE_URL}/api/products`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Son Goku Ultra Test Edition Figure",
      slug: testProdSlug,
      description: "Premium action figure for CRUD verification test",
      price: 3499,
      discountPrice: 2999,
      stock: 15,
      sku: testProdSku,
      category: catId,
      brand: "FiguresWorld Studios",
      images: [{ url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f", isPrimary: true }],
      status: "active",
      isFeatured: true,
    }),
  });
  const prodCreateData = await prodCreateRes.json();
  assert(prodCreateRes.ok && prodCreateData.success, `Product created: ${prodCreateData.data?.product?.name} (Price: ₹${prodCreateData.data?.product?.price})`);
  const prodId = prodCreateData.data?.product?._id || prodCreateData.data?.product?.id;
  assert(prodId, `Product ID: ${prodId}`);

  // 6. Verify product is returned in GET /api/products
  console.log("\n6. Verifying Product in GET /api/products...");
  const prodGetRes = await fetch(`${BASE_URL}/api/products?search=${testProdSku}`);
  const prodGetData = await prodGetRes.json();
  const foundProd = prodGetData.data?.products?.find((p) => p.sku === testProdSku);
  assert(foundProd, `Product found in GET /api/products query: ${foundProd?.name}`);

  // 7. Test PATCH /api/products/[id]
  console.log("\n7. Testing PATCH /api/products/[id]...");
  const patchRes = await fetch(`${BASE_URL}/api/products/${prodId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ price: 3999, stock: 20 }),
  });
  const patchData = await patchRes.json();
  assert(patchRes.ok && patchData.success, `Product patched: new price ₹${patchData.data?.product?.price}, stock ${patchData.data?.product?.stock}`);

  // 8. Delete Product (DELETE /api/products/[id])
  console.log("\n8. Deleting Product...");
  const prodDelRes = await fetch(`${BASE_URL}/api/products/${prodId}`, {
    method: "DELETE",
    headers,
  });
  const prodDelData = await prodDelRes.json();
  assert(prodDelRes.ok && prodDelData.success, `Product deleted successfully: ${prodDelData.message}`);

  // Verify product is gone
  const verifyProdRes = await fetch(`${BASE_URL}/api/products?search=${testProdSku}`);
  const verifyProdData = await verifyProdRes.json();
  const stillExists = verifyProdData.data?.products?.some((p) => p.sku === testProdSku);
  assert(!stillExists, "Verified: Product no longer appears in GET /api/products");

  // 9. Delete Subcategory (DELETE /api/categories/[id])
  console.log("\n9. Deleting Subcategory...");
  const subDelRes = await fetch(`${BASE_URL}/api/categories/${subId}`, {
    method: "DELETE",
    headers,
  });
  const subDelData = await subDelRes.json();
  assert(subDelRes.ok && subDelData.success, `Subcategory deleted successfully: ${subDelData.message}`);

  // 10. Delete Parent Category (DELETE /api/categories/[id])
  console.log("\n10. Deleting Parent Category...");
  const catDelRes = await fetch(`${BASE_URL}/api/categories/${catId}`, {
    method: "DELETE",
    headers,
  });
  const catDelData = await catDelRes.json();
  assert(catDelRes.ok && catDelData.success, `Category deleted successfully: ${catDelData.message}`);

  // Verify category is gone
  const catListRes = await fetch(`${BASE_URL}/api/categories`);
  const catListData = await catListRes.json();
  const catStillExists = catListData.data?.categories?.some((c) => c.slug === testCatSlug || c.id === catId);
  assert(!catStillExists, "Verified: Category no longer appears in GET /api/categories");

  console.log(`\n=======================================================`);
  console.log(`Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log(`=======================================================`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Test failed with exception:", err);
  process.exit(1);
});
