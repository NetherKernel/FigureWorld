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
  {
    parent: {
      name: "Manga",
      slug: "manga",
      description: "English-edition manga volumes, box sets and artbooks",
      displayOrder: 6,
    },
    subcategories: [
      { name: "Shonen Manga", slug: "shonen-manga", description: "English-edition shonen manga volumes and box sets" },
      { name: "Seinen Manga", slug: "seinen-manga", description: "Mature English-edition seinen manga and deluxe hardcovers" },
      { name: "Artbooks & Guidebooks", slug: "artbooks", description: "Official art collections and character guidebooks" },
    ],
  },
  {
    parent: {
      name: "Accessories",
      slug: "accessories",
      description: "Keychains, figure display stands and collector accessories",
      displayOrder: 7,
    },
    subcategories: [
      { name: "Acrylic Keychains", slug: "acrylic-keychains", description: "Official licensed anime keychains and bag charms" },
      { name: "Metal Weapon Props", slug: "metal-weapons", description: "Miniature metal weapon replicas" },
      { name: "Enamel Pins", slug: "enamel-pins", description: "Official licensed anime enamel pins" },
    ],
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
    }
  }

  console.log("\n[MongoDB] Subcategories synced successfully. Products are seeded by scripts/seed-anime-products.js");
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

    console.log("\n[Postgres] Subcategories synced successfully.");
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
