const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const CATALOG_PATH = path.join(__dirname, "..", "src", "lib", "catalog", "anime-products.json");

const SUPABASE_DB_URL = "postgresql://postgres:FigureWorlds%401234@db.jcafygcduqekgoaixddo.supabase.co:5432/postgres";

const EXTRA_CATEGORIES = [
  {
    name: "Manga & Artbooks",
    slug: "manga",
    description: "Official English manga volumes, box sets, and character artbooks",
    displayOrder: 6,
    subcategories: [
      { name: "Shonen Manga", slug: "shonen-manga", description: "English-edition shonen manga volumes and box sets" },
      { name: "Seinen Manga", slug: "seinen-manga", description: "Mature English-edition seinen manga and deluxe hardcovers" },
      { name: "Artbooks & Guidebooks", slug: "artbooks", description: "Official art collections and character guidebooks" },
    ],
  },
  {
    name: "Accessories",
    slug: "accessories",
    description: "Official licensed anime accessories, keychains, and weapon props",
    displayOrder: 7,
    subcategories: [
      { name: "Acrylic Keychains", slug: "acrylic-keychains", description: "Official licensed anime keychains and bag charms" },
      { name: "Metal Weapon Props", slug: "metal-weapons", description: "Miniature metal weapon replicas" },
      { name: "Enamel Pins", slug: "enamel-pins", description: "Official licensed anime enamel pins" },
    ],
  },
];

const KATANAS = [
  {
    name: "FS-111WT Oni Katana Sword",
    slug: "fs-111wt-oni-katana-sword",
    description: "Signature Valorant Oni Katana ornamental sword replica with traditional white/purple tsuka-ito wrap, collector demon oni mask tsuba with gold fangs, and hand-finished display scabbard. Overall length: 39 inches, blade length: 25 inches unsharpened safety steel blade.",
    price: 3499,
    discount_price: 2999,
    stock: 15,
    low_stock_threshold: 3,
    category_slug: "cosplay-swords",
    brand: "Figure World Armory",
    sku: "KAT-ONI-FS111WT",
    weight: 1100,
    dimensions: { length: 99, width: 8, height: 7, unit: "cm" },
    images: [{ url: "/images/katanas/oni-katana-fs111wt.jpg", altText: "FS-111WT Oni Katana Sword", isPrimary: true }],
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
    category_slug: "nichirin-blades",
    brand: "Wano Armory / One Piece",
    sku: "KAT-OP-NIDAI-002",
    weight: 1150,
    dimensions: { length: 104, width: 8, height: 7, unit: "cm" },
    images: [{ url: "/images/katanas/nidai-kitetsu-katana.jpg", altText: "Nidai Kitetsu Katana Replica", isPrimary: true }],
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
    category_slug: "samurai-swords",
    brand: "Gotei 13 Armory / Bleach",
    sku: "KAT-BL-ZARAKI-003",
    weight: 1200,
    dimensions: { length: 108, width: 9, height: 7, unit: "cm" },
    images: [{ url: "/images/katanas/kenpachi-zaraki-zanpakuto.jpg", altText: "Kenpachi Zaraki Zanpakuto Nozarashi", isPrimary: true }],
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
    description: "Hand-forged carbon steel Nichirin katana replica crafted according to Demon Slayer Corps specifications. Features an authentic cast metal handguard, ray-skin textured handle wrap, and hand-lacquered display scabbard.",
    price: 3499,
    discount_price: 2999,
    stock: 18,
    low_stock_threshold: 4,
    category_slug: "nichirin-blades",
    brand: "Corps Armory / Demon Slayer",
    sku: "KAT-DS-NICHIRIN-004",
    weight: 1100,
    dimensions: { length: 104, width: 8, height: 7, unit: "cm" },
    images: [{ url: "/images/katanas/nichirin-katana.jpg", altText: "Demon Slayer Nichirin Katana Replica", isPrimary: true }],
    tags: ["katana", "demon-slayer", "nichirin", "kimetsu-no-yaiba", "carbon-steel", "light-weight", "sword-replica"],
    status: "active",
    is_featured: true,
    is_restricted: true,
    age_requirement: 18,
    shipping_restrictions: ["UK", "NY-NYC", "CA-SF"],
    rating_average: 5.0,
    reviews_count: 67,
    specifications: {
      "Overall Length": "104 cm",
      "Blade Length": "72 cm",
      "Blade Material": "High Carbon Steel (Unsharpened Safety Edge)",
      "Handle Wrap": "Traditional Tsuka-Ito",
      "Scabbard": "Lacquered Hardwood Saya",
    },
  },
  {
    name: "Anime Figure",
    slug: "anime-figure",
    description: "Official collector edition anime figure. High quality sculpt, vibrant hand-painted details, and collector box packaging.",
    price: 2499,
    discount_price: 2499,
    stock: 25,
    low_stock_threshold: 5,
    category_slug: "action-figures",
    brand: "Bandai Spirits",
    sku: "AF-DEMO-2499",
    weight: 450,
    dimensions: { length: 18, width: 12, height: 22, unit: "cm" },
    images: [{ url: "https://images.goodsmile.info/cgm/images/product/20190809/8675/62905/large/fdc4daa80761973df38a687f3c30526d.jpg", altText: "Anime Figure", isPrimary: true }],
    tags: ["anime", "figure", "collector", "official"],
    status: "active",
    is_featured: true,
    is_restricted: false,
    age_requirement: 0,
    shipping_restrictions: [],
    rating_average: 5.0,
    reviews_count: 24,
    specifications: {
      "Material": "PVC, ABS",
      "Height": "22 cm",
    },
  },
];

async function seed() {
  const client = new Client({
    connectionString: SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("Connected to Supabase PostgreSQL.");

  // 1. Ensure extra categories exist
  for (const group of EXTRA_CATEGORIES) {
    let parentRes = await client.query("SELECT id FROM categories WHERE slug = $1", [group.slug]);
    let parentId;
    if (parentRes.rows.length === 0) {
      const ins = await client.query(
        `INSERT INTO categories (name, slug, description, display_order, is_active, is_restricted, created_at, updated_at)
         VALUES ($1, $2, $3, $4, true, false, NOW(), NOW()) RETURNING id`,
        [group.name, group.slug, group.description, group.displayOrder]
      );
      parentId = ins.rows[0].id;
      console.log(`Created parent category: ${group.name} (${group.slug})`);
    } else {
      parentId = parentRes.rows[0].id;
    }

    for (const sub of group.subcategories) {
      let subRes = await client.query("SELECT id FROM categories WHERE slug = $1", [sub.slug]);
      if (subRes.rows.length === 0) {
        await client.query(
          `INSERT INTO categories (name, slug, description, parent_category_id, display_order, is_active, is_restricted, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 1, true, false, NOW(), NOW())`,
          [sub.name, sub.slug, sub.description, parentId]
        );
        console.log(`Created subcategory: ${sub.name} (${sub.slug}) under ${group.slug}`);
      }
    }
  }

  // Load all categories into lookup map
  const catRes = await client.query("SELECT id, slug, parent_category_id FROM categories");
  const catMap = {};
  for (const row of catRes.rows) {
    catMap[row.slug] = row.id;
  }

  // 2. Load anime catalog
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  console.log(`Read ${catalog.length} items from anime-products.json.`);

  // Combine items to insert: Anime catalog items first, then official katanas last
  const allProducts = [];

  // 1. Add anime products
  for (const p of catalog) {
    const preferredCatSlug = p.subcategorySlug || p.categorySlug;
    let catId = catMap[preferredCatSlug];
    if (!catId && p.categorySlug) {
      catId = catMap[p.categorySlug];
    }
    if (!catId) {
      catId = catMap["action-figures"];
    }

    allProducts.push({
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: p.price,
      discount_price: p.discountPrice,
      stock: p.stock ?? 15,
      low_stock_threshold: p.lowStockThreshold ?? 5,
      category_id: catId,
      brand: p.brand || "Figure World",
      sku: p.sku,
      weight: p.weight ?? 500,
      dimensions: p.dimensions || { length: 20, width: 15, height: 10, unit: "cm" },
      images: p.images || [],
      tags: p.tags || [],
      status: p.status || "active",
      is_featured: Boolean(p.isFeatured),
      is_restricted: Boolean(p.isRestricted),
      age_requirement: p.ageRequirement ?? 0,
      shipping_restrictions: p.shippingRestrictions || [],
      rating_average: 5.0,
      reviews_count: 15,
      specifications: p.specifications || {},
    });
  }

  // 2. Add the 4 official katanas + baseline figure last so they sort to top
  for (const k of KATANAS) {
    const catId = catMap[k.category_slug] || catMap["katanas-replicas"] || catMap["action-figures"];
    allProducts.push({
      name: k.name,
      slug: k.slug,
      description: k.description,
      price: k.price,
      discount_price: k.discount_price,
      stock: k.stock,
      low_stock_threshold: k.low_stock_threshold,
      category_id: catId,
      brand: k.brand,
      sku: k.sku,
      weight: k.weight,
      dimensions: k.dimensions,
      images: k.images,
      tags: k.tags,
      status: k.status,
      is_featured: k.is_featured,
      is_restricted: k.is_restricted,
      age_requirement: k.age_requirement,
      shipping_restrictions: k.shipping_restrictions,
      rating_average: k.rating_average,
      reviews_count: k.reviews_count,
      specifications: k.specifications,
    });
  }

  console.log(`Upserting ${allProducts.length} total products into Supabase...`);

  let inserted = 0;
  let updated = 0;

  for (const item of allProducts) {
    const existing = await client.query("SELECT id FROM products WHERE sku = $1", [item.sku]);

    if (existing.rows.length === 0) {
      await client.query(
        `INSERT INTO products (
          name, slug, description, price, discount_price, stock, low_stock_threshold,
          category_id, brand, sku, weight, dimensions, images, tags, status,
          is_featured, is_restricted, age_requirement, shipping_restrictions,
          rating_average, reviews_count, specifications, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19,
          $20, $21, $22, NOW(), NOW()
        )`,
        [
          item.name,
          item.slug,
          item.description,
          item.price,
          item.discount_price,
          item.stock,
          item.low_stock_threshold,
          item.category_id,
          item.brand,
          item.sku,
          item.weight,
          JSON.stringify(item.dimensions),
          JSON.stringify(item.images),
          item.tags,
          item.status,
          item.is_featured,
          item.is_restricted,
          item.age_requirement,
          item.shipping_restrictions,
          item.rating_average,
          item.reviews_count,
          JSON.stringify(item.specifications),
        ]
      );
      inserted++;
    } else {
      await client.query(
        `UPDATE products SET
          name = $1, slug = $2, description = $3, price = $4, discount_price = $5,
          stock = $6, low_stock_threshold = $7, category_id = $8, brand = $9,
          weight = $10, dimensions = $11, images = $12, tags = $13, status = $14,
          is_featured = $15, is_restricted = $16, age_requirement = $17,
          shipping_restrictions = $18, rating_average = $19, reviews_count = $20,
          specifications = $21, updated_at = NOW(), created_at = NOW()
        WHERE sku = $22`,
        [
          item.name,
          item.slug,
          item.description,
          item.price,
          item.discount_price,
          item.stock,
          item.low_stock_threshold,
          item.category_id,
          item.brand,
          item.weight,
          JSON.stringify(item.dimensions),
          JSON.stringify(item.images),
          item.tags,
          item.status,
          item.is_featured,
          item.is_restricted,
          item.age_requirement,
          item.shipping_restrictions,
          item.rating_average,
          item.reviews_count,
          JSON.stringify(item.specifications),
          item.sku,
        ]
      );
      updated++;
    }
  }

  console.log(`Done! Products inserted: ${inserted}, updated: ${updated}.`);

  const countRes = await client.query("SELECT count(*) FROM products");
  console.log(`Total products currently in Supabase: ${countRes.rows[0].count}`);

  await client.end();
}

seed().catch((err) => {
  console.error("Error seeding catalog:", err);
  process.exit(1);
});
