const { Client } = require("pg");

const client = new Client({
  connectionString: "postgresql://postgres:FigureWorlds%401234@db.jcafygcduqekgoaixddo.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false },
});

const NEW_KATANAS = [
  {
    name: "Zenitsu Agatsuma Nichirin Katana (Thunder Breathing)",
    slug: "zenitsu-agatsuma-nichirin-katana",
    description: "Authentic replica of Zenitsu Agatsuma's iconic Nichirin sword from Demon Slayer: Kimetsu no Yaiba. Features the distinctive yellow lightning bolt hamon pattern running down the black blade, four-lobed clover tsuba with a golden rim, white and yellow tsuka-ito wrap, and matching white lacquered scabbard.",
    price: 3499,
    discount_price: 2999,
    stock: 16,
    low_stock_threshold: 4,
    category_slug: "katanas-replicas",
    brand: "Demon Slayer Armory",
    sku: "KAT-DS-ZENITSU-005",
    weight: 1100, // < 2kg -> light weight delivery tier: ₹180
    dimensions: { length: 104, width: 8, height: 7, unit: "cm" },
    images: [
      {
        url: "/images/katanas/zenitsu-nichirin-katana.jpg",
        isPrimary: true,
        altText: "Zenitsu Agatsuma Nichirin Katana - Thunder Breathing Yellow Lightning Blade",
      },
    ],
    tags: ["katana", "demon-slayer", "zenitsu", "thunder-breathing", "lightning", "steel-blade", "light-weight"],
    status: "active",
    is_featured: true,
    is_restricted: true,
    age_requirement: 18,
    shipping_restrictions: ["UK", "NY-NYC", "CA-SF"],
    rating_average: 5.0,
    reviews_count: 67,
    specifications: {
      "Overall Length": "104 cm",
      "Blade Length": "71 cm",
      "Blade Material": "1045 Carbon Steel (Display Safety Edge)",
      "Hamon": "Yellow Thunder Lightning Streak",
      "Tsuba": "Four-Lobed Clover with Gold Accent",
      "Handle Wrap": "White over Golden Triangle Rayskin",
      "Scabbard": "Glossy White Lacquered Hardwood",
    },
  },
  {
    name: "Roronoa Zoro Sandai Kitetsu Katana Replica",
    slug: "zoro-sandai-kitetsu-katana-replica",
    description: "Legendary Cursed Grade sword wielded by Roronoa Zoro from One Piece. Features the signature deep crimson red lacquered scabbard with black accent wrap, golden cross-pattée tsuba with curved ends, reddish-brown braided tsuka handle, and carbon steel blade with wavy flame temper hamon line.",
    price: 3799,
    discount_price: 3299,
    stock: 14,
    low_stock_threshold: 3,
    category_slug: "katanas-replicas",
    brand: "Wano Armory / One Piece",
    sku: "KAT-OP-SANDAI-006",
    weight: 1150, // < 2kg -> light weight delivery tier: ₹180
    dimensions: { length: 104, width: 8, height: 7, unit: "cm" },
    images: [
      {
        url: "/images/katanas/sandai-kitetsu-katana.jpg",
        isPrimary: true,
        altText: "Roronoa Zoro Sandai Kitetsu Katana Replica - Cursed Red Blade",
      },
    ],
    tags: ["katana", "one-piece", "zoro", "sandai-kitetsu", "cursed-sword", "red-scabbard", "light-weight"],
    status: "active",
    is_featured: true,
    is_restricted: true,
    age_requirement: 18,
    shipping_restrictions: ["UK", "NY-NYC", "CA-SF"],
    rating_average: 5.0,
    reviews_count: 78,
    specifications: {
      "Overall Length": "104 cm",
      "Blade Length": "72 cm",
      "Blade Material": "High Carbon Steel (Display Safety Edge)",
      "Tsuba": "Golden Rounded Cross-Pattée Guard",
      "Scabbard": "Deep Crimson Red Lacquer Finish",
      "Handle": "Reddish-Brown Braided Cord over White Rayskin",
    },
  },
  {
    name: "Ichigo Kurosaki Tensa Zangetsu (Bankai Katana)",
    slug: "ichigo-kurosaki-tensa-zangetsu-katana",
    description: "Iconic Bankai form of Ichigo Kurosaki's Zanpakuto from Bleach. Features an entirely sleek pitch-black carbon steel daito blade, the distinct four-pronged manji tsuba (crossguard), black and red cord-wrapped handle with extended broken link chain flowing from the pommel, and matching all-black scabbard.",
    price: 3999,
    discount_price: 3499,
    stock: 15,
    low_stock_threshold: 4,
    category_slug: "katanas-replicas",
    brand: "Gotei 13 Armory / Bleach",
    sku: "KAT-BL-TENSA-007",
    weight: 1200, // < 2kg -> light weight delivery tier: ₹180
    dimensions: { length: 104, width: 8, height: 7, unit: "cm" },
    images: [
      {
        url: "/images/katanas/ichigo-tensa-zangetsu.jpg",
        isPrimary: true,
        altText: "Ichigo Kurosaki Tensa Zangetsu Bankai Katana - All-Black Daito Blade",
      },
    ],
    tags: ["katana", "bleach", "ichigo", "tensa-zangetsu", "bankai", "black-blade", "chain", "light-weight"],
    status: "active",
    is_featured: true,
    is_restricted: true,
    age_requirement: 18,
    shipping_restrictions: ["UK", "NY-NYC", "CA-SF"],
    rating_average: 5.0,
    reviews_count: 92,
    specifications: {
      "Overall Length": "104 cm",
      "Blade Length": "71 cm",
      "Blade Material": "All-Black Coated Carbon Steel (Safety Edge)",
      "Tsuba": "Four-Pronged Manji Guard",
      "Pommel": "Authentic Flowing Black Metal Chain",
      "Scabbard": "Matte Jet-Black Hardwood",
    },
  },
  {
    name: "Inosuke Hashibira Dual Serrated Nichirin Blade",
    slug: "inosuke-hashibira-nichirin-blade",
    description: "Distinctive Beast Breathing Nichirin blade wielded by Inosuke Hashibira from Demon Slayer: Kimetsu no Yaiba. Features the famous hand-chiseled jagged double-serrated blade edge designed to rip and shred demons, guardless tsuba-free design, and authentic rough bandage cloth wrapped tightly around the hilt and matching scabbard.",
    price: 3699,
    discount_price: 3199,
    stock: 12,
    low_stock_threshold: 3,
    category_slug: "katanas-replicas",
    brand: "Demon Slayer Armory",
    sku: "KAT-DS-INOSUKE-008",
    weight: 1100, // < 2kg -> light weight delivery tier: ₹180
    dimensions: { length: 102, width: 8, height: 6, unit: "cm" },
    images: [
      {
        url: "/images/katanas/inosuke-nichirin-blade.jpg",
        isPrimary: true,
        altText: "Inosuke Hashibira Dual Serrated Nichirin Blade - Beast Breathing Jagged Sword",
      },
    ],
    tags: ["katana", "demon-slayer", "inosuke", "beast-breathing", "serrated", "notched", "light-weight"],
    status: "active",
    is_featured: true,
    is_restricted: true,
    age_requirement: 18,
    shipping_restrictions: ["UK", "NY-NYC", "CA-SF"],
    rating_average: 5.0,
    reviews_count: 58,
    specifications: {
      "Overall Length": "102 cm",
      "Blade Length": "70 cm",
      "Blade Edge": "Double-Serrated Jagged Teeth",
      "Blade Material": "Carbon Steel (Display Safety Edge)",
      "Guard": "Guardless / Tsuba-Free Traditional Beast Design",
      "Wrap": "Authentic Rough Cotton Bandage Wrap",
    },
  },
  {
    name: "Sanemi Shinazugawa Nichirin Katana (Wind Hashira)",
    slug: "sanemi-shinazugawa-nichirin-katana",
    description: "Official replica of Wind Hashira Sanemi Shinazugawa's Nichirin katana from Demon Slayer: Kimetsu no Yaiba. Features a dynamic two-tone emerald green and obsidian black jagged wind-pattern blade, complex eight-point windmill geometric star tsuba, white braided handle over black rayskin, and a matte black wooden scabbard embossed with white cross marks.",
    price: 3799,
    discount_price: 3299,
    stock: 14,
    low_stock_threshold: 3,
    category_slug: "katanas-replicas",
    brand: "Demon Slayer Armory",
    sku: "KAT-DS-SANEMI-009",
    weight: 1150, // < 2kg -> light weight delivery tier: ₹180
    dimensions: { length: 104, width: 8, height: 7, unit: "cm" },
    images: [
      {
        url: "/images/katanas/sanemi-nichirin-katana.jpg",
        isPrimary: true,
        altText: "Sanemi Shinazugawa Nichirin Katana - Wind Hashira Emerald & Obsidian Blade",
      },
    ],
    tags: ["katana", "demon-slayer", "sanemi", "wind-hashira", "green-blade", "star-tsuba", "light-weight"],
    status: "active",
    is_featured: true,
    is_restricted: true,
    age_requirement: 18,
    shipping_restrictions: ["UK", "NY-NYC", "CA-SF"],
    rating_average: 5.0,
    reviews_count: 49,
    specifications: {
      "Overall Length": "104 cm",
      "Blade Length": "71 cm",
      "Blade Color": "Two-Tone Emerald Green & Obsidian Wind Pattern",
      "Blade Material": "Carbon Steel (Display Safety Edge)",
      "Tsuba": "Eight-Point Windmill Geometric Star Guard",
      "Scabbard": "Matte Black Hardwood with White Cross Details",
    },
  },
];

async function main() {
  await client.connect();
  console.log("Connected to Supabase PostgreSQL.");

  const catRes = await client.query("SELECT id, name FROM public.categories WHERE slug = 'katanas-replicas'");
  if (catRes.rows.length === 0) {
    throw new Error("Category 'katanas-replicas' not found!");
  }
  const categoryId = catRes.rows[0].id;
  console.log("Found Katana category:", catRes.rows[0].name, "(ID:", categoryId, ")");

  for (const katana of NEW_KATANAS) {
    const insertQuery = `
      INSERT INTO public.products (
        name, slug, description, price, discount_price, stock,
        low_stock_threshold, category_id, brand, sku, weight,
        dimensions, images, tags, status, is_featured, is_restricted,
        age_requirement, shipping_restrictions, rating_average,
        reviews_count, specifications
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17,
        $18, $19, $20,
        $21, $22
      )
      ON CONFLICT (slug) DO UPDATE SET
        price = EXCLUDED.price,
        discount_price = EXCLUDED.discount_price,
        stock = EXCLUDED.stock,
        images = EXCLUDED.images,
        description = EXCLUDED.description,
        specifications = EXCLUDED.specifications
      RETURNING id, name, slug, price, discount_price, sku;
    `;

    const values = [
      katana.name,
      katana.slug,
      katana.description,
      katana.price,
      katana.discount_price,
      katana.stock,
      katana.low_stock_threshold,
      categoryId,
      katana.brand,
      katana.sku,
      katana.weight,
      JSON.stringify(katana.dimensions),
      JSON.stringify(katana.images),
      katana.tags,
      katana.status,
      katana.is_featured,
      katana.is_restricted,
      katana.age_requirement,
      katana.shipping_restrictions,
      katana.rating_average,
      katana.reviews_count,
      JSON.stringify(katana.specifications),
    ];

    const res = await client.query(insertQuery, values);
    console.log("Upserted:", res.rows[0].name, `[SKU: ${res.rows[0].sku}, Price: ₹${res.rows[0].price}]`);
  }

  const allProds = await client.query("SELECT id, name, slug, price, discount_price, stock, weight FROM public.products ORDER BY created_at ASC");
  console.log("\nAll Products currently in Supabase (Total:", allProds.rows.length, "):");
  console.table(allProds.rows);

  await client.end();
  console.log("Successfully added all 5 new katanas to database!");
}

main().catch((err) => {
  console.error("Error updating database:", err);
  process.exit(1);
});
