const { Client } = require("pg");

const client = new Client({
  connectionString: "postgresql://postgres:FigureWorlds%401234@db.jcafygcduqekgoaixddo.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false },
});

const KATANAS = [
  {
    name: "FS-111WT Oni Katana Sword",
    slug: "fs-111wt-oni-katana-sword",
    description: "Signature Valorant Oni Katana ornamental sword replica with traditional white/purple tsuka-ito wrap, collector demon oni mask tsuba with gold fangs, and hand-finished display scabbard. Overall length: 39 inches, blade length: 25 inches unsharpened safety steel blade.",
    price: 3499,
    discount_price: 2999,
    stock: 15,
    low_stock_threshold: 3,
    category_slug: "katanas-replicas",
    brand: "Figure World Armory",
    sku: "KAT-ONI-FS111WT",
    weight: 1100, // < 2kg -> light weight delivery tier: ₹180
    dimensions: { length: 99, width: 8, height: 7, unit: "cm" },
    images: [
      {
        url: "/images/katanas/oni-katana-fs111wt.jpg",
        isPrimary: true,
        altText: "FS-111WT Oni Katana Sword - White & Blue Steel Replica",
      },
    ],
    tags: ["katana", "oni", "valorant", "steel-blade", "sword-replica", "light-weight", "cosplay"],
    status: "active",
    is_featured: true,
    is_restricted: true,
    age_requirement: 18,
    shipping_restrictions: ["UK", "NY-NYC", "CA-SF"],
    rating_average: 5.0,
    reviews_count: 36,
    specifications: {
      "Overall Length": "39 inches (99 cm)",
      "Blade Length": "25 inches (63.5 cm)",
      "Blade Material": "Carbon Steel (Unsharpened Safety Edge)",
      "Tsuba": "Oni Demon Mask Guard with Gold Fangs",
      "Handle": "White Braided Cord Wrap with Purple Accents",
      "Scabbard": "Hardwood with Blue/White Floral Artwork",
    },
  },
  {
    name: "Nidai Kitetsu Katana Replica",
    slug: "nidai-kitetsu-katana-replica",
    description: "Legendary O Wazamono cursed katana wielded by Luffy in the Wano Country arc. Features the iconic purple and white ringed/striped wooden scabbard, gold trefoil-shaped crossguard, white diamond-braided tsuka, and deep black steel blade with authentic wavy flame hamon temper line.",
    price: 3799,
    discount_price: 3299,
    stock: 12,
    low_stock_threshold: 3,
    category_slug: "katanas-replicas",
    brand: "Wano Armory / One Piece",
    sku: "KAT-OP-NIDAI-002",
    weight: 1150, // < 2kg -> light weight delivery tier: ₹180
    dimensions: { length: 104, width: 8, height: 7, unit: "cm" },
    images: [
      {
        url: "/images/katanas/nidai-kitetsu-katana.jpg",
        isPrimary: true,
        altText: "Nidai Kitetsu Katana Replica - One Piece Cursed Blade",
      },
    ],
    tags: ["katana", "one-piece", "nidai-kitetsu", "luffy", "wano", "cursed-sword", "light-weight"],
    status: "active",
    is_featured: true,
    is_restricted: true,
    age_requirement: 18,
    shipping_restrictions: ["UK", "NY-NYC", "CA-SF"],
    rating_average: 5.0,
    reviews_count: 52,
    specifications: {
      "Overall Length": "104 cm",
      "Blade Length": "71 cm",
      "Blade Material": "1045 High Carbon Steel (Unsharpened Safety Edge)",
      "Scabbard": "Hardwood with Purple & White Ring Stripes",
      "Tsuba": "Polished Golden Trefoil Guard",
      "Handle Wrap": "Traditional White Cord over Gold Accent",
    },
  },
  {
    name: "Kenpachi Zaraki Zanpakuto 'Nozarashi'",
    slug: "kenpachi-zaraki-zanpakuto-nozarashi",
    description: "Authentic full-scale replica of 11th Division Captain Kenpachi Zaraki's iconic Zanpakuto, Nozarashi. Features the signature battle-notched jagged steel blade, wrapped white bandage hilt cloth, faceted bronze bell guard, and matching white scabbard.",
    price: 3999,
    discount_price: 3499,
    stock: 10,
    low_stock_threshold: 3,
    category_slug: "katanas-replicas",
    brand: "Gotei 13 Armory / Bleach",
    sku: "KAT-BL-ZARAKI-003",
    weight: 1200, // < 2kg -> light weight delivery tier: ₹180
    dimensions: { length: 108, width: 9, height: 7, unit: "cm" },
    images: [
      {
        url: "/images/katanas/kenpachi-zaraki-zanpakuto.jpg",
        isPrimary: true,
        altText: "Kenpachi Zaraki Zanpakuto Nozarashi - Bleach Notched Blade",
      },
    ],
    tags: ["katana", "bleach", "kenpachi-zaraki", "nozarashi", "zanpakuto", "soul-reaper", "light-weight"],
    status: "active",
    is_featured: true,
    is_restricted: true,
    age_requirement: 18,
    shipping_restrictions: ["UK", "NY-NYC", "CA-SF"],
    rating_average: 5.0,
    reviews_count: 44,
    specifications: {
      "Overall Length": "108 cm",
      "Blade Style": "Notched / Jagged Battle-Worn Edge",
      "Blade Material": "Carbon Steel (Unsharpened Safety Edge)",
      "Tsuba": "Faceted Bronze Bell Guard",
      "Hilt Wrap": "Traditional White Bandage Cloth",
      "Scabbard": "Hardwood Finished in Chalk White",
    },
  },
  {
    name: "Demon Slayer Nichirin Katana Replica (Carbon Steel)",
    slug: "demon-slayer-nichirin-katana-replica",
    description: "Authentic full-tang carbon steel ornamental replica sword with unsharpened safety display edge, ray-skin handle wrap, and hand-painted wooden scabbard.",
    price: 3499,
    discount_price: 2999,
    stock: 18,
    low_stock_threshold: 4,
    category_slug: "katanas-replicas",
    brand: "Demon Slayer Armory",
    sku: "KAT-DS-NICHIRIN-004",
    weight: 1100, // < 2kg -> light weight delivery tier: ₹180
    dimensions: { length: 104, width: 8, height: 6, unit: "cm" },
    images: [
      {
        url: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800",
        isPrimary: true,
        altText: "Demon Slayer Nichirin Katana Replica - Black Steel Blade",
      },
    ],
    tags: ["demon-slayer", "katana", "carbon-steel", "replica", "tanjiro", "light-weight"],
    status: "active",
    is_featured: true,
    is_restricted: true,
    age_requirement: 18,
    shipping_restrictions: ["UK", "NY-NYC", "CA-SF"],
    rating_average: 5.0,
    reviews_count: 89,
    specifications: {
      "Overall Length": "104 cm",
      "Blade Material": "1045 Carbon Steel",
      "Edge": "Unsharpened Safety Edge",
      "Tsuba": "Black Wheel Sun Guard",
      "Scabbard": "Matte Black Hardwood",
    },
  },
];

async function main() {
  await client.connect();
  console.log("Connected to Supabase PostgreSQL.");

  // 1. Get Katanas category ID
  const catRes = await client.query("SELECT id, name FROM public.categories WHERE slug = 'katanas-replicas'");
  if (catRes.rows.length === 0) {
    throw new Error("Category 'katanas-replicas' not found!");
  }
  const categoryId = catRes.rows[0].id;
  console.log("Found Katana category:", catRes.rows[0].name, "(ID:", categoryId, ")");

  // 2. Delete ALL existing products
  console.log("Deleting all existing products...");
  const deleteRes = await client.query("DELETE FROM public.products");
  console.log(`Deleted ${deleteRes.rowCount} existing products.`);

  // 3. Insert the 4 new katanas
  console.log("Inserting the 4 new katanas...");
  for (const katana of KATANAS) {
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
    console.log("Inserted:", res.rows[0].name, `[SKU: ${res.rows[0].sku}, Price: ₹${res.rows[0].price}]`);
  }

  // 4. Verify products count
  const allProds = await client.query("SELECT id, name, slug, price, discount_price, stock, weight FROM public.products");
  console.log("\nCurrent products in database (Total:", allProds.rows.length, "):");
  console.table(allProds.rows);

  await client.end();
  console.log("Database update completed successfully.");
}

main().catch((err) => {
  console.error("Error updating database:", err);
  process.exit(1);
});
