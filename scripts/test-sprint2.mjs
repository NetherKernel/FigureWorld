// Automated end-to-end verification script for Sprint 2 — Authentication & Users
import http from "http";

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
    // Might be redirect or HTML
  }

  return {
    status: res.status,
    headers: res.headers,
    cookie,
    json,
  };
}

async function runTests() {
  console.log("=== SPRINT 2 AUTHENTICATION & USERS TEST SUITE ===");
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
    // 0. Seed test accounts
    console.log("\n--- Step 0: Seed Test Accounts ---");
    const seedRes = await request("/api/seed");
    assert(seedRes.status === 200 && seedRes.json?.success, "Seed endpoint creates default accounts");

    // 1. Test Registration
    console.log("\n--- Step 1: User Registration ---");
    const testEmail = `collector_${Date.now()}@example.com`;
    const regRes = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Tanjiro Kamado",
        email: testEmail,
        password: "WaterBreathing#1",
        phone: "+1 (555) 321-9876",
      }),
    });

    assert(regRes.status === 201, `Registration returned status 201 (got ${regRes.status})`);
    assert(regRes.json?.data?.user?.email === testEmail, "Registered user email matches");
    assert(regRes.json?.data?.user?.role === "CUSTOMER", "Default role is CUSTOMER");
    assert(Boolean(regRes.cookie && regRes.cookie.includes("auth_token")), "Auth cookie issued on registration");

    // 2. Test Duplicate Registration Conflict
    const dupRes = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Duplicate User",
        email: testEmail,
        password: "WaterBreathing#1",
      }),
    });
    assert(dupRes.status === 409, "Duplicate email registration rejected with 409 Conflict");

    // 3. Test Login
    console.log("\n--- Step 2: User Login & Password Hashing ---");
    const loginRes = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: testEmail,
        password: "WaterBreathing#1",
      }),
    });

    assert(loginRes.status === 200, "Login succeeded with 200 OK");
    assert(Boolean(loginRes.json?.data?.token), "JWT token returned in login response");
    const sessionCookie = loginRes.cookie;
    assert(Boolean(sessionCookie), "HTTP-only session cookie returned in login response");

    // Invalid Password test
    const badLoginRes = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: testEmail,
        password: "WrongPassword999",
      }),
    });
    assert(badLoginRes.status === 401, "Invalid password rejected with 401 Unauthorized");

    // 4. Test Session Retrieval (/api/auth/me)
    console.log("\n--- Step 3: Current Session (/api/auth/me) ---");
    const meRes = await request("/api/auth/me", {
      headers: { Cookie: sessionCookie },
    });
    assert(meRes.status === 200, "/api/auth/me returns 200 OK");
    assert(meRes.json?.data?.user?.email === testEmail, "Session user matches logged in user");

    // 5. Test Profile Update
    console.log("\n--- Step 4: Profile Management ---");
    const updateProfileRes = await request("/api/auth/profile", {
      method: "PUT",
      headers: { Cookie: sessionCookie },
      body: JSON.stringify({
        name: "Tanjiro Kamado (Hashira)",
        phone: "+1 (555) 999-8888",
      }),
    });
    assert(updateProfileRes.status === 200, "Profile updated with 200 OK");
    assert(updateProfileRes.json?.data?.name === "Tanjiro Kamado (Hashira)", "Name updated successfully");

    // 6. Test Saved Addresses CRUD
    console.log("\n--- Step 5: Saved Addresses CRUD ---");
    // Add Address 1
    const addr1Res = await request("/api/user/addresses", {
      method: "POST",
      headers: { Cookie: sessionCookie },
      body: JSON.stringify({
        type: "shipping",
        fullName: "Tanjiro Kamado",
        phone: "+1 (555) 999-8888",
        streetLine1: "123 Sun Breath Way",
        city: "Tokyo",
        state: "Kanto",
        postalCode: "100-0001",
        country: "Japan",
        isDefault: true,
      }),
    });
    assert(addr1Res.status === 201, "Address 1 added successfully");
    const addr1Id = addr1Res.json?.data?.address?._id;
    assert(Boolean(addr1Id), "Address 1 ID returned");
    assert(addr1Res.json?.data?.address?.isDefault === true, "Address 1 set as default");

    // Add Address 2 (set as default)
    const addr2Res = await request("/api/user/addresses", {
      method: "POST",
      headers: { Cookie: sessionCookie },
      body: JSON.stringify({
        type: "billing",
        fullName: "Nezuko Kamado",
        phone: "+1 (555) 999-7777",
        streetLine1: "456 Demon Slayer HQ",
        city: "Kyoto",
        state: "Kansai",
        postalCode: "600-0002",
        country: "Japan",
        isDefault: true,
      }),
    });
    assert(addr2Res.status === 201, "Address 2 added successfully");
    const addr2Id = addr2Res.json?.data?.address?._id;

    // List Addresses
    const listAddrRes = await request("/api/user/addresses", {
      headers: { Cookie: sessionCookie },
    });
    const addresses = listAddrRes.json?.data?.addresses || [];
    assert(addresses.length >= 2, `User has ${addresses.length} saved addresses`);
    const addr2InList = addresses.find((a) => a._id === addr2Id);
    assert(addr2InList?.isDefault === true, "Address 2 is now default");

    // Delete Address 1
    const delAddrRes = await request(`/api/user/addresses/${addr1Id}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie },
    });
    assert(delAddrRes.status === 200, "Address 1 deleted successfully");

    // 7. Test Password Change
    console.log("\n--- Step 6: Change Password ---");
    const changePassRes = await request("/api/auth/change-password", {
      method: "POST",
      headers: { Cookie: sessionCookie },
      body: JSON.stringify({
        currentPassword: "WaterBreathing#1",
        newPassword: "SunBreathing#Final1",
      }),
    });
    assert(changePassRes.status === 200, "Password changed successfully");

    // Verify old password is now rejected
    const oldPassLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: testEmail,
        password: "WaterBreathing#1",
      }),
    });
    assert(oldPassLogin.status === 401, "Old password rejected after change");

    // Verify new password succeeds
    const newPassLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: testEmail,
        password: "SunBreathing#Final1",
      }),
    });
    assert(newPassLogin.status === 200, "New password logged in successfully");

    // 8. Test Forgot Password & Reset Password
    console.log("\n--- Step 7: Forgot Password & Reset Password ---");
    const forgotRes = await request("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: testEmail }),
    });
    assert(forgotRes.status === 200, "Forgot password request accepted");
    const resetToken = forgotRes.json?.data?.resetToken;
    assert(Boolean(resetToken), "Cryptographic reset token generated");

    const resetRes = await request("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        token: resetToken,
        password: "RecoveredPassword#123",
      }),
    });
    assert(resetRes.status === 200, "Password reset with token succeeded");

    // Login with recovered password
    const recoveredLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: testEmail,
        password: "RecoveredPassword#123",
      }),
    });
    assert(recoveredLogin.status === 200, "Login with recovered password succeeded");

    // 9. Test Role-Based Access Control (RBAC)
    console.log("\n--- Step 8: Role-Based Access Control (CUSTOMER, STAFF, ADMIN) ---");
    // Customer login
    const customerLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "customer@figuresworld.com", password: "Customer@123456" }),
    });
    assert(customerLogin.json?.data?.user?.role === "CUSTOMER", "Customer role verified");

    // Staff login
    const staffLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "staff@figuresworld.com", password: "Staff@123456" }),
    });
    assert(staffLogin.json?.data?.user?.role === "STAFF", "Staff role verified");

    // Admin login
    const adminLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@figuresworld.com", password: "Admin@123456" }),
    });
    assert(adminLogin.json?.data?.user?.role === "ADMIN", "Admin role verified");

    // Test Middleware Route Access via redirect checks
    // Customer trying to access /admin -> redirected to /
    const custAdminReq = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: customerLogin.cookie },
      redirect: "manual",
    });
    assert(custAdminReq.status === 307 || custAdminReq.status === 308 || custAdminReq.status === 302, 
      `Customer accessing /admin is blocked by middleware (redirected with status ${custAdminReq.status})`);

    // Staff trying to access /admin -> redirected to /
    const staffAdminReq = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: staffLogin.cookie },
      redirect: "manual",
    });
    assert(staffAdminReq.status === 307 || staffAdminReq.status === 308 || staffAdminReq.status === 302, 
      `Staff accessing /admin is blocked by middleware (redirected with status ${staffAdminReq.status})`);

    // Admin accessing /admin -> allowed (status 200)
    const adminAdminReq = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: adminLogin.cookie },
      redirect: "manual",
    });
    assert(adminAdminReq.status === 200, "Admin accessing /admin is allowed (HTTP 200)");

    // Staff accessing /staff -> allowed (status 200)
    const staffStaffReq = await fetch(`${BASE_URL}/staff`, {
      headers: { Cookie: staffLogin.cookie },
      redirect: "manual",
    });
    assert(staffStaffReq.status === 200, "Staff accessing /staff is allowed (HTTP 200)");

    // 10. Logout Test
    console.log("\n--- Step 9: Logout ---");
    const logoutRes = await request("/api/auth/logout", {
      method: "POST",
      headers: { Cookie: sessionCookie },
    });
    assert(logoutRes.status === 200, "Logout API returned 200 OK");
    assert(Boolean(logoutRes.cookie && logoutRes.cookie.includes("Max-Age=0")), "Logout clears auth cookie");

  } catch (error) {
    console.error("Test execution error:", error);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
