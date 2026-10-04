const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const PG_CONNECTION =
  process.env.DATABASE_URL ||
  "postgresql://postgres:FigureWorlds%401234@db.jcafygcduqekgoaixddo.supabase.co:5432/postgres";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/figuresworld";

async function createAdmin() {
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123456";
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(adminPassword, salt);

  console.log("Generated secure bcrypt hash for Admin...");

  // 1. CREATE ADMIN IN SUPABASE POSTGRESQL
  const pgClient = new Client({
    connectionString: PG_CONNECTION,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pgClient.connect();
    console.log("Connected to Supabase PostgreSQL.");

    const adminAccounts = [
      {
        email: "admin@figureworld.com",
        name: "Figure World Admin",
        phone: "+91 98765 43210",
      },
      {
        email: "admin@figuresworld.com",
        name: "Gol D. Roger (Admin)",
        phone: "+1 (555) 345-6789",
      },
    ];

    for (const acc of adminAccounts) {
      const pgQuery = `
        INSERT INTO public.users (email, password_hash, name, phone, role)
        VALUES ($1, $2, $3, $4, 'ADMIN')
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          role = 'ADMIN',
          name = EXCLUDED.name,
          updated_at = NOW()
        RETURNING id, email, name, role;
      `;
      const res = await pgClient.query(pgQuery, [
        acc.email,
        passwordHash,
        acc.name,
        acc.phone,
      ]);
      console.log(`[Supabase Postgres] Admin ready:`, res.rows[0]);
    }
  } catch (err) {
    console.error("[Supabase Postgres] Error creating admin:", err);
  } finally {
    await pgClient.end();
  }

  // 2. CREATE ADMIN IN MONGODB
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.");

    const UserSchema = new mongoose.Schema(
      {
        name: String,
        email: { type: String, unique: true },
        passwordHash: String,
        role: { type: String, default: "CUSTOMER" },
        phone: String,
        isEmailVerified: Boolean,
        isActive: Boolean,
      },
      { timestamps: true }
    );

    const MongoUser = mongoose.models.User || mongoose.model("User", UserSchema);

    for (const email of ["admin@figureworld.com", "admin@figuresworld.com"]) {
      const updated = await MongoUser.findOneAndUpdate(
        { email },
        {
          name: email.includes("figureworld") ? "Figure World Admin" : "Gol D. Roger (Admin)",
          email,
          passwordHash,
          role: "ADMIN",
          isActive: true,
          isEmailVerified: true,
        },
        { upsert: true, new: true }
      );
      console.log(`[MongoDB] Admin ready: ${updated.email} (Role: ${updated.role})`);
    }
  } catch (err) {
    console.error("[MongoDB] Error creating admin:", err);
  } finally {
    await mongoose.disconnect();
  }

  console.log("\n=======================================================");
  console.log("       ADMIN ACCOUNT READY TO LOG IN");
  console.log("=======================================================");
  console.log("  Email:    admin@figureworld.com");
  console.log("            admin@figuresworld.com");
  console.log("  Password: " + adminPassword);
  console.log("  Role:     ADMIN");
  console.log("=======================================================\n");
}

createAdmin().catch(console.error);
