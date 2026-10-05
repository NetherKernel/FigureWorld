/**
 * Creates (or updates) the DEVELOPER account used to sign in to the Developer Console (/developer).
 *
 *   node scripts/create-developer.js
 *
 * Credentials come from .env.local:
 *   DEVELOPER_EMAIL     (default: developer@figuresworld.com)
 *   DEVELOPER_PASSWORD  (if missing, a strong random password is generated and saved to .env.local)
 *
 * Accounts live in MongoDB (that's what /api/auth/login checks). Refuses to turn an existing
 * customer/admin/staff account into a developer unless run with --force.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const ENV_PATH = path.join(__dirname, "..", ".env.local");

function readEnvFile() {
  if (!fs.existsSync(ENV_PATH)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(ENV_PATH, "utf8")
      .split(/\r?\n/)
      .filter((l) => /^[A-Z0-9_]+=/.test(l))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")];
      })
  );
}

function appendEnv(vars) {
  const existing = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
  const eol = existing.includes("\r\n") ? "\r\n" : "\n";
  const lines = Object.entries(vars).map(([k, v]) => `${k}=${v}`);
  const prefix = existing && !existing.endsWith("\n") ? eol : "";
  fs.appendFileSync(ENV_PATH, `${prefix}${eol}# Developer Console sign-in (scripts/create-developer.js)${eol}${lines.join(eol)}${eol}`);
}

async function main() {
  const fileEnv = readEnvFile();
  const env = (k) => process.env[k] || fileEnv[k];

  const email = (env("DEVELOPER_EMAIL") || "developer@figuresworld.com").toLowerCase().trim();
  let password = env("DEVELOPER_PASSWORD");
  const toSave = {};
  if (!env("DEVELOPER_EMAIL")) toSave.DEVELOPER_EMAIL = email;
  if (!password) {
    password = `Dev-${crypto.randomBytes(12).toString("base64url")}`;
    toSave.DEVELOPER_PASSWORD = password;
  }

  const mongoUri = env("MONGODB_URI") || "mongodb://localhost:27017/figuresworld";
  await mongoose.connect(mongoUri);

  try {
    const users = mongoose.connection.db.collection("users");
    const existing = await users.findOne({ email });
    if (existing && existing.role !== "DEVELOPER" && !process.argv.includes("--force")) {
      throw new Error(
        `${email} already exists with role ${existing.role}. Use a different DEVELOPER_EMAIL, or re-run with --force to convert it.`
      );
    }

    const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt(12));
    const now = new Date();
    await users.updateOne(
      { email },
      {
        $set: { name: "Figure World Developer", email, passwordHash, role: "DEVELOPER", isActive: true, isEmailVerified: true, updatedAt: now },
        $setOnInsert: { addresses: [], createdAt: now },
      },
      { upsert: true }
    );

    if (Object.keys(toSave).length) appendEnv(toSave);

    console.log("\n=======================================================");
    console.log("       DEVELOPER ACCOUNT READY");
    console.log("=======================================================");
    console.log(`  Sign in at: /auth/login, then open /developer`);
    console.log(`  Email:      ${email}`);
    console.log(`  Password:   ${toSave.DEVELOPER_PASSWORD ? "generated and saved to .env.local (DEVELOPER_PASSWORD)" : "the DEVELOPER_PASSWORD in .env.local"}`);
    console.log(`  Role:       DEVELOPER`);
    console.log("=======================================================\n");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("Failed to create developer account:", err.message);
  process.exit(1);
});
