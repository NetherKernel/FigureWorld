const mongoose = require("mongoose");
const { Client } = require("pg");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/figuresworld";
const PG_CONNECTION =
  process.env.DATABASE_URL ||
  "postgresql://postgres:FigureWorlds%401234@db.jcafygcduqekgoaixddo.supabase.co:5432/postgres";

// Definition of Parent Categories & Subcategories
const SUBCATEGORY_TREE = [
  {
    parent: {
      name: "Action Figures",
      slug: "action-figures",
      description: "Collector poseable action figures from top anime, Marvel & DC universes",
      displayOrder: 1,
    },
    subcategories: [
      { name: "Dragon Ball", slug: "dragon-ball", description: "Goku, Vegeta, Gohan & DBZ action figures" },
      { name: "Jujutsu Kaisen", slug: "jujutsu-kaisen", description: "Gojo, Sukuna, Yuji & Megumi figures" },
      { name: "Marvel", slug: "marvel", description: "Iron Man, Spider-Man, Wolverine & Avengers action figures" },
      { name: "DC", slug: "dc-comics", description: "Batman, Superman, The Joker & Justice League action figures" },
      { name: "One Piece", slug: "one-piece", description: "Luffy, Zoro, Sanji & Straw Hat Pirates action figures" },
      { name: "Naruto", slug: "naruto", description: "Naruto, Sasuke, Kakashi & Akatsuki figures" },
      { name: "Demon Slayer", slug: "demon-slayer", description: "Tanjiro, Nezuko, Zenitsu & Hashira figures" },
      { name: "Attack on Titan", slug: "attack-on-titan", description: "Eren, Levi, Mikasa & Titan figures" },
      { name: "Bleach", slug: "bleach", description: "Ichigo, Aizen & Gotei 13 Shinigami figures" },
      { name: "Chainsaw Man", slug: "chainsaw-man", description: "Denji, Power, Makima & Aki action figures" },
      { name: "My Hero Academia", slug: "my-hero-academia", description: "Deku, Bakugo, Todoroki & All Might figures" },
      { name: "Pokemon", slug: "pokemon", description: "Pikachu, Charizard, Mewtwo & legendary figures" },
      { name: "Star Wars", slug: "star-wars", description: "Darth Vader, Mandalorian, Luke Skywalker & Jedi figures" },
      { name: "Solo Leveling", slug: "solo-leveling", description: "Sung Jin-Woo & Shadow Monarch figures" },
      { name: "Berserk", slug: "berserk", description: "Guts, Griffith & Black Swordsman figures" },
      { name: "JoJo's Bizarre Adventure", slug: "jojo", description: "Jotaro, Dio & Stand action figures" },
      { name: "Genshin Impact", slug: "genshin-impact", description: "Raiden Shogun, Zhongli & Teyvat figures" },
    ],
  },
  {
    parent: {
      name: "Collectibles",
      slug: "collectibles",
      description: "Premium scale statues, resin masterworks and limited edition collectibles",
      displayOrder: 2,
    },
    subcategories: [
      { name: "Resin Statues", slug: "resin-statues", description: "High-end 1/4 & 1/6 polyresin statues" },
      { name: "Scale Figures", slug: "scale-figures", description: "Fixed-pose PVC scale master figures" },
      { name: "Dioramas & Busts", slug: "dioramas-busts", description: "Cinematic diorama battle scenes and busts" },
      { name: "Limited Editions", slug: "limited-editions", description: "Numbered collector pieces with certificates" },
    ],
  },
  {
    parent: {
      name: "Katanas & Replicas",
      slug: "katanas-replicas",
      description: "Authentic anime replica swords and traditional Japanese steel katanas (18+ only)",
      isRestricted: true,
      displayOrder: 3,
    },
    subcategories: [
      { name: "Nichirin Blades", slug: "nichirin-blades", description: "Demon Slayer forged steel replica swords" },
      { name: "Samurai Katanas", slug: "samurai-swords", description: "Carbon steel folded traditional katanas" },
      { name: "Cosplay & Foam Swords", slug: "cosplay-swords", description: "Convention-safe bamboo and foam swords" },
    ],
  },
  {
    parent: {
      name: "Posters",
      slug: "posters",
      description: "Vibrant high-definition wall art, canvas prints and metal displates",
      displayOrder: 4,
    },
    subcategories: [
      { name: "Framed Canvas Art", slug: "framed-canvas", description: "Gallery-wrapped anime canvas paintings" },
      { name: "Metal Displates", slug: "metal-displates", description: "Magnetic metal wall prints" },
      { name: "Wall Scrolls", slug: "wall-scrolls", description: "Traditional Japanese silk fabric hanging scrolls" },
    ],
  },
  {
    parent: {
      name: "Other Merchandise",
      slug: "other-merchandise",
      description: "Anime hoodies, apparel, LED lamps and desk mats",
      displayOrder: 5,
    },
    subcategories: [
      { name: "Anime Apparel & Hoodies", slug: "anime-apparel", description: "Heavyweight streetwear hoodies & tees" },
      { name: "LED Night Lamps", slug: "led-lamps", description: "3D acrylic illusion neon LED night lights" },
      { name: "Desk Mats & Mousepads", slug: "desk-mats", description: "XXL stitched-edge gaming anime desk mats" },
    ],
  },
];

// Sample featured products to seed for subcategories if missing
const SAMPLE_SUBCATEGORY_PRODUCTS = [
  {
    name: "Son Goku Ultra Instinct Master Figure",
    title: "Son Goku Ultra Instinct Master Figure",
    slug: "son-goku-ultra-instinct-figure",
    description: "Dynamic Dragon Ball Super master figure depicting Son Goku reaching Mastered Ultra Instinct state with silver hair aura effects.",
    price: 3499,
    discountPrice: 2999,
    stock: 25,
    categorySlug: "action-figures",
    subcategorySlug: "dragon-ball",
    series: "Dragon Ball Super",
    brand: "Bandai Spirits",
    sku: "DB-GOKU-UI-01",
    weight: 850,
    dimensions: { length: 20, width: 18, height: 30, unit: "cm" },
    images: [{ url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800", altText: "Goku Ultra Instinct", isPrimary: true }],
    tags: ["dragon ball", "goku", "action figure", "anime"],
    isFeatured: true,
  },
  {
    name: "Gojo Satoru Hollow Purple Action Figure",
    title: "Gojo Satoru Hollow Purple Action Figure",
    slug: "gojo-satoru-hollow-purple-figure",
    description: "Highly articulated Jujutsu Kaisen figure featuring Gojo Satoru casting the devastating Hollow Purple with translucent cursed energy sphere.",
    price: 3999,
    discountPrice: 3499,
    stock: 20,
    categorySlug: "action-figures",
    subcategorySlug: "jujutsu-kaisen",
    series: "Jujutsu Kaisen",
    brand: "Good Smile Company",
    sku: "JJK-GOJO-HP-02",
    weight: 750,
    dimensions: { length: 18, width: 16, height: 26, unit: "cm" },
    images: [{ url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=800", altText: "Gojo Satoru", isPrimary: true }],
    tags: ["jujutsu kaisen", "gojo", "jjk", "action figure"],
    isFeatured: true,
  },
  {
    name: "Iron Man Mark 85 Nano Gauntlet Figure",
    title: "Iron Man Mark 85 Nano Gauntlet Figure",
    slug: "iron-man-mark-85-figure",
    description: "Marvel Avengers Endgame die-cast articulated action figure of Tony Stark in the Mark LXXXV armor equipped with the LED Nano Gauntlet.",
    price: 4999,
    discountPrice: 4299,
    stock: 18,
    categorySlug: "action-figures",
    subcategorySlug: "marvel",
    series: "Marvel Cinematic Universe",
    brand: "Marvel Legends",
    sku: "MVL-IRONMAN-85",
    weight: 900,
    dimensions: { length: 22, width: 15, height: 32, unit: "cm" },
    images: [{ url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800", altText: "Iron Man Mark 85", isPrimary: true }],
    tags: ["marvel", "iron man", "avengers", "action figure"],
    isFeatured: true,
  },
  {
    name: "Batman The Dark Knight Bat-Armor Figure",
    title: "Batman The Dark Knight Bat-Armor Figure",
    slug: "batman-dark-knight-figure",
    description: "DC Multiverse 7-inch premium articulated Batman figure featuring cloth wired cape, Batarangs, grapple gun and magnetic display base.",
    price: 3699,
    discountPrice: 3199,
    stock: 22,
    categorySlug: "action-figures",
    subcategorySlug: "dc-comics",
    series: "DC Universe",
    brand: "McFarlane Toys",
    sku: "DC-BATMAN-TDK",
    weight: 800,
    dimensions: { length: 20, width: 14, height: 28, unit: "cm" },
    images: [{ url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800", altText: "Batman", isPrimary: true }],
    tags: ["dc", "batman", "justice league", "action figure"],
    isFeatured: true,
  },
  {
    name: "Monkey D. Luffy Gear 5 Sun God Nika Statue",
    title: "Monkey D. Luffy Gear 5 Sun God Nika Statue",
    slug: "luffy-gear-5-sun-god-statue",
    description: "Spectacular One Piece Wano climax statue capturing Luffy in laughing Sun God Gear 5 form with cloud sash and rubber lightning bolt.",
    price: 4499,
    discountPrice: 3999,
    stock: 30,
    categorySlug: "action-figures",
    subcategorySlug: "one-piece",
    series: "One Piece",
    brand: "Megahouse P.O.P",
    sku: "OP-LUFFY-G5-01",
    weight: 950,
    dimensions: { length: 24, width: 22, height: 33, unit: "cm" },
    images: [{ url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800", altText: "Luffy Gear 5", isPrimary: true }],
    tags: ["one piece", "luffy", "gear 5", "action figure"],
    isFeatured: true,
  },
];

async function seedSubcategories() {
  console.log("=======================================================================");
  console.log("         SEEDING CATEGORY & SUBCATEGORY HIERARCHY                     ");
  console.log("=======================================================================\n");

  // 1. SEED IN MONGODB
  await mongoose.connect(MONGODB_URI);
  const CategorySchema = new mongoose.Schema(
    {
      name: { type: String, required: true },
      slug: { type: String, required: true, unique: true },
      description: String,
      parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
      displayOrder: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true },
      isRestricted: { type: Boolean, default: false },
      complianceRequirements: mongoose.Schema.Types.Mixed,
    },
    { timestamps: true }
  );

  const ProductSchema = new mongoose.Schema(
    {
      name: { type: String, required: true },
      title: String,
      slug: { type: String, required: true, unique: true },
      description: String,
      price: { type: Number, required: true },
      discountPrice: Number,
      stock: { type: Number, default: 0 },
      category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
      subcategory: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
      brand: String,
      series: String,
      sku: { type: String, required: true },
      weight: Number,
      dimensions: mongoose.Schema.Types.Mixed,
      images: Array,
      tags: [String],
      isFeatured: Boolean,
      status: { type: String, default: "active" },
    },
    { timestamps: true }
  );

  const Category = mongoose.models.Category || mongoose.model("Category", CategorySchema);
  const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);

  const mongoCatMap = {};

  for (const group of SUBCATEGORY_TREE) {
    // Upsert parent category
    let parentDoc = await Category.findOne({ slug: group.parent.slug });
    if (!parentDoc) {
      parentDoc = await Category.create({
        name: group.parent.name,
        slug: group.parent.slug,
        description: group.parent.description,
        displayOrder: group.parent.displayOrder,
        isRestricted: Boolean(group.parent.isRestricted),
        complianceRequirements: group.parent.isRestricted
          ? {
              minAge: 18,
              requiresIdVerification: true,
              disclaimerText: "Legal adult collector replica blade. Strict 18+ verification required.",
              restrictedRegions: ["UK", "NY-NYC", "CA-SF"],
            }
          : undefined,
      });
      console.log(`[MongoDB] Created parent category: ${parentDoc.name} (${parentDoc.slug})`);
    } else {
      parentDoc.name = group.parent.name;
      parentDoc.displayOrder = group.parent.displayOrder;
      await parentDoc.save();
      console.log(`[MongoDB] Verified parent category: ${parentDoc.name}`);
    }

    mongoCatMap[group.parent.slug] = parentDoc._id;

    // Also link "Anime Figures" as parent if exists
    if (group.parent.slug === "action-figures") {
      const animeFiguresDoc = await Category.findOne({ slug: "anime-figures" });
      if (animeFiguresDoc) {
        mongoCatMap["anime-figures"] = animeFiguresDoc._id;
      }
    }

    // Upsert subcategories
    for (let i = 0; i < group.subcategories.length; i++) {
      const sub = group.subcategories[i];
      let subDoc = await Category.findOne({ slug: sub.slug });
      if (!subDoc) {
        subDoc = await Category.create({
          name: sub.name,
          slug: sub.slug,
          description: sub.description,
          parentCategory: parentDoc._id,
          displayOrder: i + 1,
          isRestricted: Boolean(sub.isRestricted || group.parent.isRestricted),
        });
        console.log(`  └─ [MongoDB] Created subcategory: ${group.parent.name} > ${subDoc.name} (${subDoc.slug})`);
      } else {
        subDoc.parentCategory = parentDoc._id;
        subDoc.name = sub.name;
        subDoc.displayOrder = i + 1;
        await subDoc.save();
        console.log(`  └─ [MongoDB] Updated subcategory: ${group.parent.name} > ${subDoc.name}`);
      }
      mongoCatMap[sub.slug] = subDoc._id;
    }
  }

  // Seed sample subcategory products in MongoDB
  for (const prod of SAMPLE_SUBCATEGORY_PRODUCTS) {
    const parentId = mongoCatMap[prod.categorySlug] || mongoCatMap["anime-figures"];
    const subId = mongoCatMap[prod.subcategorySlug];

    const existing = await Product.findOne({ slug: prod.slug });
    if (!existing) {
      await Product.create({
        name: prod.name,
        title: prod.title,
        slug: prod.slug,
        description: prod.description,
        price: prod.price,
        discountPrice: prod.discountPrice,
        stock: prod.stock,
        category: parentId,
        subcategory: subId,
        brand: prod.brand,
        series: prod.series,
        sku: prod.sku,
        weight: prod.weight,
        dimensions: prod.dimensions,
        images: prod.images,
        tags: prod.tags,
        isFeatured: prod.isFeatured,
        status: "active",
      });
      console.log(`[MongoDB] Created sample product: "${prod.name}" under ${prod.categorySlug} > ${prod.subcategorySlug}`);
    } else {
      existing.category = parentId;
      existing.subcategory = subId;
      existing.series = prod.series;
      await existing.save();
      console.log(`[MongoDB] Synced product: "${existing.name}" with subcategory ${prod.subcategorySlug}`);
    }
  }

  // Also link existing figures to One Piece or relevant subcategories
  await Product.updateMany(
    { name: { $regex: /zoro|katana/i } },
    { $set: { subcategory: mongoCatMap["nichirin-blades"] || mongoCatMap["one-piece"] } }
  );
  await Product.updateMany(
    { name: { $regex: /luffy/i } },
    { $set: { subcategory: mongoCatMap["one-piece"] } }
  );

  console.log("\n[MongoDB] Subcategories & products linked successfully.");
  await mongoose.disconnect();

  // 2. SEED IN SUPABASE POSTGRESQL
  const pgClient = new Client({
    connectionString: PG_CONNECTION,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pgClient.connect();
    console.log("\nConnected to Supabase PostgreSQL.");

    const pgCatMap = {};

    for (const group of SUBCATEGORY_TREE) {
      // Upsert parent category in PostgreSQL
      const parentRes = await pgClient.query(
        `INSERT INTO public.categories (name, slug, description, display_order, is_restricted)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           display_order = EXCLUDED.display_order
         RETURNING id, name, slug;`,
        [
          group.parent.name,
          group.parent.slug,
          group.parent.description,
          group.parent.displayOrder,
          Boolean(group.parent.isRestricted),
        ]
      );
      const parentId = parentRes.rows[0].id;
      pgCatMap[group.parent.slug] = parentId;
      console.log(`[Postgres] Parent category: ${group.parent.name} (UUID: ${parentId})`);

      // Upsert subcategories with parent_category_id
      for (let i = 0; i < group.subcategories.length; i++) {
        const sub = group.subcategories[i];
        const subRes = await pgClient.query(
          `INSERT INTO public.categories (name, slug, description, parent_category_id, display_order, is_restricted)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (slug) DO UPDATE SET
             name = EXCLUDED.name,
             parent_category_id = EXCLUDED.parent_category_id,
             display_order = EXCLUDED.display_order
           RETURNING id, name, slug;`,
          [
            sub.name,
            sub.slug,
            sub.description,
            parentId,
            i + 1,
            Boolean(sub.isRestricted || group.parent.isRestricted),
          ]
        );
        const subId = subRes.rows[0].id;
        pgCatMap[sub.slug] = subId;
        console.log(`  └─ [Postgres] Subcategory: ${group.parent.name} > ${sub.name} (UUID: ${subId})`);
      }
    }

    // Upsert sample products in PostgreSQL
    for (const prod of SAMPLE_SUBCATEGORY_PRODUCTS) {
      const parentId = pgCatMap[prod.categorySlug] || pgCatMap["action-figures"];
      await pgClient.query(
        `INSERT INTO public.products (
           name, slug, description, price, discount_price, stock,
           category_id, brand, sku, weight, dimensions, images, tags, status, is_featured
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (slug) DO UPDATE SET
           category_id = EXCLUDED.category_id,
           price = EXCLUDED.price,
           stock = EXCLUDED.stock;`,
        [
          prod.name,
          prod.slug,
          prod.description,
          prod.price,
          prod.discountPrice,
          prod.stock,
          parentId,
          prod.brand,
          prod.sku,
          prod.weight,
          JSON.stringify(prod.dimensions),
          JSON.stringify(prod.images),
          prod.tags,
          "active",
          prod.isFeatured,
        ]
      );
      console.log(`[Postgres] Seeded product: ${prod.name}`);
    }

    console.log("\n[Postgres] Subcategories and products synced successfully.");
  } catch (err) {
    console.error("[Postgres] Error seeding subcategories:", err);
  } finally {
    await pgClient.end();
  }

  console.log("\n=======================================================================");
  console.log("       SUBCATEGORY HIERARCHY COMPLETE & FULLY SEEDED                  ");
  console.log("=======================================================================\n");
}

seedSubcategories().catch((err) => {
  console.error("Failed to seed subcategories:", err);
  process.exit(1);
});
