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
  const adminHash = await bcrypt.hash("Admin@123456", salt);
  const staffHash = await bcrypt.hash("Staff@123456", salt);
  const customerHash = await bcrypt.hash("Customer@123456", salt);

  console.log("Generated secure bcrypt hashes for Admin, Staff, and Customer...");

  // 1. CREATE ACCOUNTS IN SUPABASE POSTGRESQL
  const pgClient = new Client({
    connectionString: PG_CONNECTION,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pgClient.connect();
    console.log("Connected to Supabase PostgreSQL.");

    const accounts = [
      {
        email: "admin@figureworld.com",
        name: "Figure World Admin",
        phone: "+91 98765 43210",
        role: "ADMIN",
        hash: adminHash,
      },
      {
        email: "admin@figuresworld.com",
        name: "Gol D. Roger (Admin)",
        phone: "+1 (555) 345-6789",
        role: "ADMIN",
        hash: adminHash,
      },
      {
        email: "staff@figuresworld.com",
        name: "Trafalgar Law (Staff)",
        phone: "+1 (555) 234-5678",
        role: "STAFF",
        hash: staffHash,
      },
      {
        email: "customer@figuresworld.com",
        name: "Monkey D. Luffy",
        phone: "+1 (555) 123-4567",
        role: "CUSTOMER",
        hash: customerHash,
      },
    ];

    for (const acc of accounts) {
      const pgQuery = `
        INSERT INTO public.users (email, password_hash, name, phone, role)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          name = EXCLUDED.name,
          updated_at = NOW()
        RETURNING id, email, name, role;
      `;
      const res = await pgClient.query(pgQuery, [
        acc.email,
        acc.hash,
        acc.name,
        acc.phone,
        acc.role,
      ]);
      console.log(`[Supabase Postgres] Account ready:`, res.rows[0]);
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
