import { connectToDatabase } from "./db";
import { User } from "@/models/User";
import { Address } from "@/models/Address";
import { hashPassword } from "./auth";
import { logger } from "./logger";

export async function seedAuthData() {
  await connectToDatabase();

  logger.info("Seeding authentication test accounts...");

  const defaultPassword = "Customer@123456";
  const adminPassword = "Admin@123456";
  const staffPassword = "Staff@123456";

  const customerHash = await hashPassword(defaultPassword);
  const adminHash = await hashPassword(adminPassword);
  const staffHash = await hashPassword(staffPassword);

  // 1. Customer User
  let customer = await User.findOne({ email: "customer@figuresworld.com" });
  if (!customer) {
    customer = await User.create({
      name: "Monkey D. Luffy",
      email: "customer@figuresworld.com",
      passwordHash: customerHash,
      role: "CUSTOMER",
      phone: "+1 (555) 123-4567",
      isEmailVerified: true,
    });
    logger.info("Created test customer account: customer@figuresworld.com");
  }

  // 2. Staff User
  let staff = await User.findOne({ email: "staff@figuresworld.com" });
  if (!staff) {
    staff = await User.create({
      name: "Trafalgar Law",
      email: "staff@figuresworld.com",
      passwordHash: staffHash,
      role: "STAFF",
      phone: "+1 (555) 234-5678",
      isEmailVerified: true,
    });
    logger.info("Created test staff account: staff@figuresworld.com");
  }

  // 3. Admin User
  let admin = await User.findOne({ email: "admin@figuresworld.com" });
  if (!admin) {
    admin = await User.create({
      name: "Gol D. Roger",
      email: "admin@figuresworld.com",
      passwordHash: adminHash,
      role: "ADMIN",
      phone: "+1 (555) 999-0000",
      isEmailVerified: true,
    });
    logger.info("Created test admin account: admin@figuresworld.com");
  }

  // 4. Sample Address for customer
  const existingAddress = await Address.findOne({ user: customer._id });
  if (!existingAddress) {
    const addr = await Address.create({
      user: customer._id,
      type: "shipping",
      fullName: "Monkey D. Luffy",
      phone: "+1 (555) 123-4567",
      streetLine1: "100 Thousand Sunny Deck",
      streetLine2: "Captain Quarters",
      city: "Grand Line",
      state: "East Blue",
      postalCode: "10001",
      country: "United States",
      isDefault: true,
    });
    customer.addresses = [addr._id];
    await customer.save();
    logger.info("Created default shipping address for test customer");
  }

  return {
    customer: customer.email,
    staff: staff.email,
    admin: admin.email,
  };
}
