import { connectToDatabase } from "./db";
import { User } from "@/models/User";
import { Address } from "@/models/Address";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";
import { OrderItem } from "@/models/OrderItem";
import { Invoice } from "@/models/Invoice";
import { NotificationLog } from "@/models/NotificationLog";
import { createInvoiceForOrder } from "./invoice";
import { NotificationService } from "./notifications";
import { hashPassword } from "./auth";
import { logger } from "./logger";

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

  // 4. Seed Products
  const productsDefs = [
    {
      name: "Anime Figure",
      slug: "anime-figure-collectible",
      description: "Signature premium collectible anime figure with articulated joints, high-definition sculpt, and collector display base.",
      price: 2499,
      stock: 25,
      category: categoryMap["anime-figures"]._id,
      brand: "Good Smile",
      sku: "AF-DEMO-2499",
      weight: 650,
      dimensions: { length: 18, width: 15, height: 26, unit: "cm" },
      images: [{ url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=800", altText: "Anime Figure", isPrimary: true }],
      status: "active" as const,
      isFeatured: true,
      isRestricted: false,
      ageRequirement: 0,
    },
    {
      name: "Luffy Gear 5 Sun God Scale Figure",
      slug: "luffy-gear-5-sun-god-scale-figure",
      description: "Stunning 1/7 scale figure of Monkey D. Luffy activating Gear 5 with cloud dynamic aura and translucent lighting effect base.",
      price: 4999,
      discountPrice: 4499,
      stock: 25,
      category: categoryMap["anime-figures"]._id,
      brand: "MegaHouse",
      sku: "OP-LFF-G5-001",
      weight: 850,
      dimensions: { length: 22, width: 20, height: 32, unit: "cm" },
      images: [{ url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800", altText: "Luffy Gear 5 Figure", isPrimary: true }],
      status: "active" as const,
      isFeatured: true,
      isRestricted: false,
      ageRequirement: 0,
    },
    {
      name: "Zoro Enma 3-Sword Style Battle Diorama",
      slug: "zoro-enma-3-sword-style-battle-diorama",
      description: "Highly detailed 1/6 scale statue featuring Roronoa Zoro unleashing green dragon Haki with Enma, Wado Ichimonji, and Sandai Kitetsu.",
      price: 249.99,
      discountPrice: 219.99,
      stock: 14,
      category: categoryMap["collectibles"]._id,
      brand: "Tsume Art",
      sku: "OP-ZRO-ENM-002",
      weight: 1600,
      dimensions: { length: 28, width: 25, height: 35, unit: "cm" },
      images: [{ url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800", altText: "Zoro Diorama", isPrimary: true }],
      status: "active" as const,
      isFeatured: true,
      isRestricted: false,
      ageRequirement: 0,
    },
    {
      name: "Demon Slayer Tanjiro Kamado Hinokami Kagura",
      slug: "tanjiro-kamado-hinokami-kagura",
      description: "Aniplex dynamic scale figure capturing the Dance of the Fire God with translucent flame vortex effects and detailed uniform folds.",
      price: 159.99,
      stock: 30,
      category: categoryMap["anime-figures"]._id,
      brand: "Aniplex+",
      sku: "DS-TNJ-HNK-003",
      weight: 720,
      dimensions: { length: 18, width: 18, height: 26, unit: "cm" },
      images: [{ url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=800", altText: "Tanjiro Kagura Figure", isPrimary: true }],
      status: "active" as const,
      isFeatured: true,
      isRestricted: false,
      ageRequirement: 0,
    },
    {
      name: "Demon Slayer Nichirin Katana Replica (Carbon Steel)",
      slug: "demon-slayer-nichirin-katana-replica",
      description: "Authentic full-tang hand-forged 1045 high carbon steel replica of Tanjiro's black Nichirin blade. Comes with wooden scabbard and display stand. For adult collectors only.",
      price: 129.99,
      discountPrice: 109.99,
      stock: 8,
      category: categoryMap["katanas-replicas"]._id,
      brand: "Hansei Blades",
      sku: "WP-NCHR-TNJ-004",
      weight: 1200,
      dimensions: { length: 104, width: 8, height: 8, unit: "cm" },
      images: [{ url: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800", altText: "Nichirin Katana Replica", isPrimary: true }],
      status: "active" as const,
      isFeatured: true,
      isRestricted: true,
      ageRequirement: 18,
      shippingRestrictions: ["UK", "NY-NYC", "CA-SF"],
    },
    {
      name: "Gojo Satoru Hollow Purple 1/7 Scale Statue",
      slug: "gojo-satoru-hollow-purple-statue",
      description: "Jujutsu Kaisen master Gojo Satoru casting Hollow Purple with floating blindfold and LED crystalline foundation.",
      price: 210.00,
      stock: 12,
      category: categoryMap["anime-figures"]._id,
      brand: "eStream SHIBUYA SCRAMBLE",
      sku: "JJK-GJO-HLW-005",
      weight: 950,
      dimensions: { length: 24, width: 22, height: 30, unit: "cm" },
      images: [{ url: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=800", altText: "Gojo Satoru Statue", isPrimary: true }],
      status: "active" as const,
      isFeatured: true,
      isRestricted: false,
      ageRequirement: 0,
    },
  ];

  for (const prod of productsDefs) {
    const existingProd = await Product.findOne({ sku: prod.sku });
    if (!existingProd) {
      await Product.create(prod);
      logger.info(`Created sample product: ${prod.name}`);
    } else if (existingProd.stock < 10) {
      existingProd.stock = prod.stock;
      await existingProd.save();
    }
  }

  // 5. Seed Reference Order #KF100001 for Sprint 9 Admin Order Inspection
  let kfOrder = await Order.findOne({ orderNumber: "KF100001" });
  if (!kfOrder) {
    const defaultAddr = await Address.findOne({ user: customer._id }) || await Address.findOne();
    const demoProd = await Product.findOne({ sku: "AF-DEMO-2499" });

    if (defaultAddr && demoProd) {
      kfOrder = await Order.create({
        orderNumber: "KF100001",
        customer: customer._id,
        customerEmail: customer.email,
        items: [],
        pricing: {
          subtotal: 4998,
          discountTotal: 0,
          taxTotal: 0,
          shippingFee: 100,
          grandTotal: 5098,
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
        productImage: demoProd.images?.[0]?.url || "https://images.unsplash.com/photo-1563089145-599997674d42?w=800",
        unitPrice: 2499,
        quantity: 2,
        subtotal: 4998,
        discountAmount: 0,
        total: 4998,
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
