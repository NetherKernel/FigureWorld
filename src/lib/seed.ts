import { connectToDatabase } from "./db";
import { User } from "@/models/User";
import { Address } from "@/models/Address";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";
import { OrderItem } from "@/models/OrderItem";
import { Invoice } from "@/models/Invoice";
import { NotificationLog } from "@/models/NotificationLog";
import { Coupon } from "@/models/Coupon";
import { DeliveryRule } from "@/models/DeliveryRule";
import { createInvoiceForOrder } from "./invoice";
import { NotificationService } from "./notifications";
import { hashPassword } from "./auth";
import { logger } from "./logger";
import animeCatalog from "./catalog/anime-products.json";

export async function seedStoreData() {
  await connectToDatabase();

  logger.info("Seeding authentication test accounts & store catalog...");

  const defaultPassword = "Customer@123456";
  const adminPassword = "Admin@123456";
  const staffPassword = "Staff@123456";

  const customerHash = await hashPassword(defaultPassword);
  const adminHash = await hashPassword(adminPassword);
  const staffHash = await hashPassword(staffPassword);

  // 1. Seed Accounts
  let customer = await User.findOne({ email: "customer@figuresworld.com" });
  if (!customer) {
    customer = await User.create({
      name: "Monkey D. Luffy",
      email: "customer@figuresworld.com",
      passwordHash: customerHash,
      role: "CUSTOMER",
      phone: "+1 (555) 123-4567",
      isEmailVerified: true,
      isActive: true,
    });
  }

  let staff = await User.findOne({ email: "staff@figuresworld.com" });
  if (!staff) {
    staff = await User.create({
      name: "Trafalgar Law",
      email: "staff@figuresworld.com",
      passwordHash: staffHash,
      role: "STAFF",
      phone: "+1 (555) 234-5678",
      isEmailVerified: true,
      isActive: true,
    });
  }

  let admin = await User.findOne({ email: "admin@figuresworld.com" });
  if (!admin) {
    admin = await User.create({
      name: "Gol D. Roger",
      email: "admin@figuresworld.com",
      passwordHash: adminHash,
      role: "ADMIN",
      phone: "+1 (555) 999-0000",
      isEmailVerified: true,
      isActive: true,
    });
  }

  // 2. Default Address
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
  }

  // 3. Seed Categories
  const categoryDefs = [
    { name: "Action Figures", slug: "action-figures", description: "Collector poseable action figures and prize figures from top anime series", displayOrder: 1 },
    { name: "Anime Figures", slug: "anime-figures", description: "Scale figures and articulated models from popular anime series", displayOrder: 1 },
    { name: "Collectibles", slug: "collectibles", description: "Limited edition resin statues and collector busts", displayOrder: 2 },
    { name: "Accessories", slug: "accessories", description: "Display cases, LED risers, cleaning kits and figure accessories", displayOrder: 3 },
    { name: "Keychains", slug: "keychains", description: "Acrylic, metallic and rubber anime character keychains", displayOrder: 4 },
    { name: "Posters", slug: "posters", description: "High-definition collector wall scrolls and framed art prints", displayOrder: 5 },
    { name: "Manga", slug: "manga", description: "Original Japanese and translated manga volumes and box sets", displayOrder: 6 },
    { name: "Other Merchandise", slug: "other-merchandise", description: "Apparel, plushies, and gaming desk mats", displayOrder: 7 },
    {
      name: "Katanas & Replicas",
      slug: "katanas-replicas",
      description: "Collector display anime swords, scabbards, and metal weapons. Age restricted 18+.",
      displayOrder: 8,
      isRestricted: true,
      complianceRequirements: {
        minAge: 18,
        requiresIdVerification: true,
        disclaimerText: "Notice: Ornamental replica sword for display purposes only. Buyer must be 18 years or older and complies with local weapons regulations.",
        restrictedRegions: ["UK", "NY-NYC", "CA-SF"],
      },
    },
  ];

  const categoryMap: Record<string, any> = {};

  for (const cat of categoryDefs) {
    let existingCat = await Category.findOne({ slug: cat.slug });
    if (!existingCat) {
      existingCat = await Category.create(cat);
      logger.info(`Created category: ${cat.name}`);
    }
    categoryMap[cat.slug] = existingCat;
  }

  // 4. Seed Products — real licensed anime merchandise, shared with scripts/seed-anime-products.js
  for (const slug of new Set(animeCatalog.flatMap((p) => [p.categorySlug, p.subcategorySlug]))) {
    if (slug && !categoryMap[slug]) categoryMap[slug] = await Category.findOne({ slug });
  }

  const productsDefs = animeCatalog.map(({ categorySlug, subcategorySlug, ...prod }) => ({
    ...prod,
    title: prod.name,
    category: categoryMap[categorySlug]._id,
    subcategory: subcategorySlug ? categoryMap[subcategorySlug]?._id ?? null : null,
  }));

  for (const prod of productsDefs) {
    const existingProd = await Product.findOne({ sku: prod.sku });
    if (!existingProd) {
      await Product.create(prod);
      logger.info(`Created catalog product: ${prod.name} (₹${prod.price})`);
    } else {
      Object.assign(existingProd, prod);
      await existingProd.save();
      logger.info(`Updated catalog product: ${prod.name} (₹${prod.price})`);
    }
  }

  // 5. Seed Reference Order #KF100001 for Sprint 9 Admin Order Inspection
  let kfOrder = await Order.findOne({ orderNumber: "KF100001" });
  if (!kfOrder) {
    const defaultAddr = await Address.findOne({ user: customer._id }) || await Address.findOne();
    const demoProd = await Product.findOne({ sku: productsDefs[0].sku });
    const demoUnitPrice = demoProd ? demoProd.discountPrice || demoProd.price : 0;

    if (defaultAddr && demoProd) {
      kfOrder = await Order.create({
        orderNumber: "KF100001",
        customer: customer._id,
        customerEmail: customer.email,
        items: [],
        pricing: {
          subtotal: demoUnitPrice * 2,
          discountTotal: 0,
          taxTotal: 0,
          shippingFee: 100,
          grandTotal: demoUnitPrice * 2 + 100,
          currency: "INR",
        },
        shippingAddress: defaultAddr._id,
        paymentMethod: "UPI",
        paymentStatus: "PAID",
        orderStatus: "PROCESSING",
        paymentDetails: {
          merchantUpiId: "figuresworld@icici",
          customerUpiId: "luffy@okicici",
          transactionRef: "426189304721",
          upiApp: "Google Pay",
          submittedAt: new Date(Date.now() - 7200000),
          verifiedAt: new Date(Date.now() - 3600000),
          verifiedBy: admin._id,
          verificationNotes: "Verified via ICICI corporate banking",
        },
        shipmentDetails: {
          courier: "Blue Dart Express",
          trackingNumber: "BD-KF100001",
          trackingUrl: "https://www.bluedart.com/tracking?track=BD-KF100001",
          dispatchedAt: new Date(),
          shippingNotes: "Signature collector anime figure. Fragile handling required.",
        },
        statusHistory: [
          { status: "PENDING_PAYMENT", changedAt: new Date(Date.now() - 7200000), notes: "Order checkout placed" },
          { status: "PAYMENT_REVIEW", changedAt: new Date(Date.now() - 5400000), notes: "Customer submitted UPI UTR 426189304721" },
          { status: "CONFIRMED", changedAt: new Date(Date.now() - 3600000), notes: "Admin confirmed payment" },
          { status: "PROCESSING", changedAt: new Date(Date.now() - 1800000), notes: "Warehouse picking and packaging" },
        ],
        notes: "Priority delivery requested by customer",
        placedAt: new Date(Date.now() - 7200000),
      });

      const orderItem = await OrderItem.create({
        order: kfOrder._id,
        product: demoProd._id,
        productTitle: demoProd.name,
        productSku: demoProd.sku,
        productImage: demoProd.images?.[0]?.url,
        unitPrice: demoUnitPrice,
        quantity: 2,
        subtotal: demoUnitPrice * 2,
        discountAmount: 0,
        total: demoUnitPrice * 2,
      });

      kfOrder.items = [orderItem._id];
      await kfOrder.save();
      logger.info("Seeded reference order: #KF100001");

      // Generate invoice for #KF100001
      try {
        const existingInv = await Invoice.findOne({ order: kfOrder._id });
        if (!existingInv) {
          await createInvoiceForOrder(kfOrder.orderNumber);
          logger.info("Seeded invoice for reference order #KF100001");
        }
      } catch (invErr) {
        logger.error("Error seeding invoice for #KF100001:", { error: String(invErr) });
      }
    }
  }

  // Ensure WhatsApp notifications exist for reference order #KF100001
  try {
    const kf = await Order.findOne({ orderNumber: "KF100001" });
    if (kf) {
      const existingNotifs = await NotificationLog.countDocuments({ orderNumber: "KF100001" });
      if (existingNotifs === 0) {
        await NotificationService.sendOrderConfirmation(kf);
        await NotificationService.sendPaymentConfirmation(kf);
        await NotificationService.sendInvoice(kf);
        await NotificationService.sendDispatchDetails(kf);
        logger.info("Seeded WhatsApp notifications for reference order #KF100001");
      }
    }
  } catch (notifErr) {
    logger.error("Error seeding WhatsApp notifications for #KF100001:", { error: String(notifErr) });
  }

  // 5. Seed Promotional Coupons
  try {
    const existingCoupons = await Coupon.countDocuments({});
    if (existingCoupons === 0) {
      await Coupon.create({
        code: "WELCOME10",
        description: "10% off on your first anime collectible order",
        discountType: "percentage",
        discountValue: 10,
        minimumOrderValue: 999,
        maximumDiscountAmount: 500,
        validFrom: new Date(Date.now() - 30 * 24 * 3600 * 1000),
        validUntil: new Date("2027-12-31T23:59:59Z"),
        usageLimit: 500,
        usedCount: 24,
        isActive: true,
      });

      await Coupon.create({
        code: "ANIME500",
        description: "Flat ₹500 instant discount on premium figures",
        discountType: "fixed",
        discountValue: 500,
        minimumOrderValue: 2499,
        validFrom: new Date(Date.now() - 15 * 24 * 3600 * 1000),
        validUntil: new Date("2027-12-31T23:59:59Z"),
        usageLimit: 200,
        usedCount: 42,
        isActive: true,
      });

      await Coupon.create({
        code: "KATANA15",
        description: "15% off on collector replica blades and katanas",
        discountType: "percentage",
        discountValue: 15,
        minimumOrderValue: 1500,
        maximumDiscountAmount: 1000,
        validFrom: new Date(Date.now() - 7 * 24 * 3600 * 1000),
        validUntil: new Date("2027-12-31T23:59:59Z"),
        usageLimit: 100,
        usedCount: 8,
        isActive: true,
      });

      await Coupon.create({
        code: "EXPIRED20",
        description: "Seasonal 20% discount (Past campaign)",
        discountType: "percentage",
        discountValue: 20,
        minimumOrderValue: 1000,
        maximumDiscountAmount: 400,
        validFrom: new Date(Date.now() - 90 * 24 * 3600 * 1000),
        validUntil: new Date(Date.now() - 15 * 24 * 3600 * 1000),
        usageLimit: 100,
        usedCount: 100,
        isActive: false,
      });

      logger.info("Seeded sample promotional coupons: WELCOME10, ANIME500, KATANA15, EXPIRED20");
    }
  } catch (couponErr) {
    logger.error("Error seeding coupons:", { error: String(couponErr) });
  }

  // Ensure default baseline delivery rates (isFreeShippingActive = false)
  try {
    const deliveryRule = await DeliveryRule.findOne({});
    if (deliveryRule) {
      deliveryRule.isFreeShippingActive = false;
      await deliveryRule.save();
    }
  } catch (deliveryErr) {
    logger.error("Error resetting delivery rule in seed:", { error: String(deliveryErr) });
  }

  return {
    categoriesCount: categoryDefs.length,
    productsCount: productsDefs.length,
    accounts: {
      customer: customer.email,
      staff: staff.email,
      admin: admin.email,
    },
  };
}

export const seedAuthData = seedStoreData;
