const { Client } = require("pg");

const client = new Client({
  connectionString: "postgresql://postgres:FigureWorlds%401234@db.jcafygcduqekgoaixddo.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false },
});

const PRODUCTS_TO_SEED = [
  {
    name: "Anime Figure Collectible",
    slug: "anime-figure-collectible",
    description: "Signature premium collectible anime figure with articulated joints, high-definition sculpt, and collector display base.",
    price: 2499,
    discount_price: 1999,
    stock: 16,
    low_stock_threshold: 5,
    category_slug: "anime-figures",
    brand: "Good Smile Company",
    sku: "AF-DEMO-2499",
    weight: 650,
    dimensions: { length: 18, width: 15, height: 26, unit: "cm" },
    images: [{ url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=800", isPrimary: true }],
    tags: ["scale-figure", "good-smile", "shonen"],
    status: "active",
    is_featured: true,
    is_restricted: false,
    age_requirement: 0,
    shipping_restrictions: [],
    rating_average: 5.0,
    reviews_count: 48,
    specifications: { scale: "1/7", material: "PVC / ABS" },
  },
  {
    name: "Gojo Satoru Hollow Purple 1/7 Scale Statue",
    slug: "gojo-satoru-hollow-purple-statue",
    description: "Jujutsu Kaisen master Gojo Satoru casting Hollow Purple with floating blindfold and LED crystalline foundation.",
    price: 7499,
    discount_price: 5999,
    stock: 12,
    low_stock_threshold: 5,
    category_slug: "collectibles",
    brand: "eStream Shibuya Scramble",
    sku: "JJK-GJO-HLW-005",
    weight: 950,
    dimensions: { length: 24, width: 22, height: 30, unit: "cm" },
    images: [{ url: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=800", isPrimary: true }],
    tags: ["jjk", "gojo", "statue", "led"],
    status: "active",
    is_featured: true,
    is_restricted: false,
    age_requirement: 0,
    shipping_restrictions: [],
    rating_average: 5.0,
    reviews_count: 126,
    specifications: { scale: "1/7", material: "Resin / Polystone / LED" },
  },
  {
    name: "Demon Slayer Nichirin Katana Replica (Carbon Steel)",
    slug: "demon-slayer-nichirin-katana-replica",
    description: "Authentic full-tang carbon steel ornamental replica sword with unsharpened safety display edge, ray-skin handle wrap, and hand-painted wooden scabbard.",
    price: 4299,
    discount_price: 3499,
    stock: 8,
    low_stock_threshold: 3,
    category_slug: "katanas-replicas",
    brand: "Hasbro / Bandai",
    sku: "DS-KTA-NCH-004",
    weight: 1250,
    dimensions: { length: 104, width: 8, height: 6, unit: "cm" },
    images: [{ url: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800", isPrimary: true }],
    tags: ["demon-slayer", "katana", "carbon-steel", "replica"],
    status: "active",
    is_featured: true,
    is_restricted: true,
    age_requirement: 18,
    shipping_restrictions: ["UK", "NY-NYC", "CA-SF"],
    rating_average: 5.0,
    reviews_count: 89,
    specifications: { bladeMaterial: "1045 Carbon Steel", overallLength: "104 cm", edge: "Unsharpened Safety Edge" },
  },
  {
    name: "Demon Slayer Tanjiro Kamado Hinokami Kagura",
    slug: "demon-slayer-tanjiro-kamado-figure",
    description: "Tanjiro executing the Sun Breathing Dance with dynamic translucent flame effect parts and display foundation.",
    price: 4299,
    discount_price: 3499,
    stock: 30,
    low_stock_threshold: 5,
    category_slug: "anime-figures",
    brand: "Aniplex+",
    sku: "DS-TNJ-HNK-003",
    weight: 780,
    dimensions: { length: 20, width: 18, height: 25, unit: "cm" },
    images: [{ url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=800", isPrimary: true }],
    tags: ["demon-slayer", "tanjiro", "aniplex"],
    status: "active",
    is_featured: true,
    is_restricted: false,
    age_requirement: 0,
    shipping_restrictions: [],
    rating_average: 5.0,
    reviews_count: 64,
    specifications: { scale: "1/8", material: "PVC / ABS" },
  },
  {
    name: "Zoro Enma 3-Sword Style Battle Diorama",
    slug: "zoro-enma-battle-diorama",
    description: "Roronoa Zoro releasing Armament Haki Enma conqueror slash with three custom katanas and diorama base.",
    price: 9999,
    discount_price: 7999,
    stock: 14,
    low_stock_threshold: 4,
    category_slug: "collectibles",
    brand: "MegaHouse P.O.P",
    sku: "OP-ZRO-ENM-002",
    weight: 1450,
    dimensions: { length: 30, width: 22, height: 35, unit: "cm" },
    images: [{ url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800", isPrimary: true }],
    tags: ["one-piece", "zoro", "enma", "megahouse"],
    status: "active",
    is_featured: true,
    is_restricted: false,
    age_requirement: 0,
    shipping_restrictions: [],
    rating_average: 5.0,
    reviews_count: 112,
    specifications: { scale: "Maximum P.O.P", material: "PVC / Resin" },
  },
  {
    name: "Monkey D. Luffy - Gear 5 'Sun God Nika' Scale Figure",
    slug: "luffy-gear-5-sun-god-figure",
    description: "Monkey D. Luffy laughing in Sun God Nika awakening form with cloud smoke aura and joyful dynamic sculpt.",
    price: 5499,
    discount_price: 4499,
    stock: 25,
    low_stock_threshold: 5,
    category_slug: "anime-figures",
    brand: "Bandai Spirits",
    sku: "OP-LFY-GR5-001",
    weight: 850,
    dimensions: { length: 22, width: 19, height: 28, unit: "cm" },
    images: [{ url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800", isPrimary: true }],
    tags: ["one-piece", "luffy", "gear-5", "nika"],
    status: "active",
    is_featured: true,
    is_restricted: false,
    age_requirement: 0,
    shipping_restrictions: [],
    rating_average: 5.0,
    reviews_count: 230,
    specifications: { scale: "Ichibansho", material: "PVC / ABS" },
  },
];

async function seed() {
  await client.connect();
  console.log("Connected to Supabase PostgreSQL.");

  // Get categories mapping (slug -> id)
  const catRes = await client.query("SELECT id, slug FROM public.categories");
  const catMap = {};
  for (const row of catRes.rows) {
    catMap[row.slug] = row.id;
  }

  for (const p of PRODUCTS_TO_SEED) {
    const categoryId = catMap[p.category_slug] || null;
    const query = `
      INSERT INTO public.products (
        name, slug, description, price, discount_price, stock, low_stock_threshold,
        category_id, brand, sku, weight, dimensions, images, tags, status,
        is_featured, is_restricted, age_requirement, shipping_restrictions,
        rating_average, reviews_count, specifications
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      ON CONFLICT (sku) DO UPDATE SET
        name = EXCLUDED.name,
        price = EXCLUDED.price,
        discount_price = EXCLUDED.discount_price,
        stock = EXCLUDED.stock,
        images = EXCLUDED.images;
    `;

    await client.query(query, [
      p.name,
      p.slug,
      p.description,
      p.price,
      p.discount_price,
      p.stock,
      p.low_stock_threshold,
      categoryId,
      p.brand,
      p.sku,
      p.weight,
      JSON.stringify(p.dimensions),
      JSON.stringify(p.images),
      p.tags,
      p.status,
      p.is_featured,
      p.is_restricted,
      p.age_requirement,
      p.shipping_restrictions,
      p.rating_average,
      p.reviews_count,
      JSON.stringify(p.specifications),
    ]);
    console.log(`Seeded/Updated product: ${p.name} (${p.sku})`);
  }

  const countRes = await client.query("SELECT COUNT(*) FROM public.products");
  console.log(`\nTotal products in Supabase PostgreSQL: ${countRes.rows[0].count}`);

  await client.end();
}

seed().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});
