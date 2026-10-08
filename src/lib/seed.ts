import { supabase } from "./supabase";
import { hashPassword } from "./auth";
import { logger } from "./logger";

export async function seedStoreData() {
  logger.info("Verifying Supabase store accounts and catalog...");

  const defaultPassword = "Customer@123456";
  const adminPassword = "Admin@123456";
  const staffPassword = "Staff@123456";

  const customerHash = await hashPassword(defaultPassword);
  const adminHash = await hashPassword(adminPassword);
  const staffHash = await hashPassword(staffPassword);

  // 1. Ensure Default Accounts in Supabase
  const accounts = [
    {
      name: "Monkey D. Luffy",
      email: "customer@figuresworld.com",
      password_hash: customerHash,
      role: "CUSTOMER",
      phone: "+1 (555) 123-4567",
    },
    {
      name: "Trafalgar Law",
      email: "staff@figuresworld.com",
      password_hash: staffHash,
      role: "STAFF",
      phone: "+1 (555) 234-5678",
    },
    {
      name: "Gol D. Roger",
      email: "admin@figuresworld.com",
      password_hash: adminHash,
      role: "ADMIN",
      phone: "+1 (555) 999-0000",
    },
  ];

  for (const acc of accounts) {
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .ilike("email", acc.email)
      .maybeSingle();

    if (!existing) {
      await supabase.from("users").insert(acc);
      logger.info(`Seeded account in Supabase: ${acc.email}`);
    }
  }

  // 2. Ensure Promotional Coupons in Supabase
  const coupons: any[] = [
    {
      code: "WELCOME10",
      description: "10% off for new anime collectors",
      discount_type: "percentage",
      discount_value: 10,
      min_order_amount: 999,
      max_discount_amount: 500,
      is_active: true,
    },
    {
      code: "ANIME500",
      description: "Flat ₹500 discount on orders above ₹2,999",
      discount_type: "fixed",
      discount_value: 500,
      min_order_amount: 2999,
      max_discount_amount: null,
      is_active: true,
    },
    {
      code: "KATANA15",
      description: "15% off replica swords and katanas",
      discount_type: "percentage",
      discount_value: 15,
      min_order_amount: 1999,
      max_discount_amount: 1000,
      is_active: true,
    },
  ];

  for (const c of coupons) {
    const { data: existing } = await supabase
      .from("coupons")
      .select("id")
      .eq("code", c.code)
      .maybeSingle();

    if (!existing) {
      await supabase.from("coupons").insert(c as any);
      logger.info(`Seeded coupon in Supabase: ${c.code}`);
    }
  }

  logger.info("Supabase store verification and seeding completed.");
  return { success: true };
}

export const seedAuthData = seedStoreData;
