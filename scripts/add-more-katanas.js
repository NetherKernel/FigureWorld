const { Client } = require("pg");

const client = new Client({
  connectionString: "postgresql://postgres:FigureWorlds%401234@db.jcafygcduqekgoaixddo.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false },
});

const KATANAS_TO_ADD = [
  {
    name: "Ame no Habakiri Katana Replica (One Piece)",
    slug: "ame-no-habakiri-katana-replica",
    description: "Legendary O Wazamono sword crafted by Tenguyama Hitetsu and wielded by Kozuki Oden in One Piece. Features an elegant glossy white wooden scabbard adorned with golden floral mon crests, a ceremonial purple hanging sageo tassel, a four-lobed golden trefoil tsuba guard, and a two-tone steel blade featuring a fiery crimson temper line.",
    price: 3799,
    discount_price: 3299,
    stock: 14,
    low_stock_threshold: 3,
    category_slug: "katanas-replicas",
    brand: "Wano Armory / One Piece",
    sku: "KAT-OP-AME-010",
    weight: 1150, // < 2kg -> light weight delivery tier: ₹180
    dimensions: { length: 104, width: 8, height: 7, unit: "cm" },
    images: [
      {
        url: "/images/katanas/ame-no-habakiri-katana.jpg",
        isPrimary: true,
        altText: "Ame no Habakiri Katana Replica - One Piece Oden Blade",
      },
    ],
    tags: ["katana", "one-piece", "ame-no-habakiri", "oden", "momonosuke", "wano", "white-scabbard", "light-weight"],
    status: "active",
    is_featured: true,
    is_restricted: true,
    age_requirement: 18,
    shipping_restrictions: ["UK", "NY-NYC", "CA-SF"],
    rating_average: 5.0,
    reviews_count: 83,
    specifications: {
      "Overall Length": "104 cm",
      "Blade Length": "72 cm",
      "Blade Color": "Silver with Crimson Red Flame Temper Line",
      "Blade Material": "1045 Carbon Steel (Display Safety Edge)",
      "Tsuba": "Golden Trefoil Four-Lobe Guard",
      "Scabbard": "Glossy White with Golden Floral Mon Crests & Purple Tassel",
      "Handle": "White Tsuka with Purple Rings and Gold Accents",
    },
  },
  {
    name: "Sasuke Uchiha Kusanagi Katana (Grass Cutter)",
    slug: "sasuke-uchiha-kusanagi-katana",
    description: "Official replica of Sasuke Uchiha's straight black Kusanagi Sword from Naruto Shippuden. Features a sleek 104 cm matte black hardwood shirasaya scabbard and handle emblazoned with the iconic red and white Uchiha clan fan crest, paired with a razor-straight high carbon steel chokuto blade.",
    price: 3599,
    discount_price: 3099,
    stock: 16,
    low_stock_threshold: 4,
    category_slug: "katanas-replicas",
    brand: "Konoha Armory / Naruto",
    sku: "KAT-NAR-SASUKE-011",
    weight: 1100, // < 2kg -> light weight delivery tier: ₹180
    dimensions: { length: 104, width: 7, height: 6, unit: "cm" },
    images: [
      {
        url: "/images/katanas/sasuke-kusanagi-katana.jpg",
        isPrimary: true,
        altText: "Sasuke Uchiha Kusanagi Black Katana 104 cm - Naruto Shippuden",
      },
    ],
    tags: ["katana", "naruto", "sasuke", "kusanagi", "chokuto", "uchiha", "black-blade", "light-weight"],
    status: "active",
    is_featured: true,
    is_restricted: true,
    age_requirement: 18,
    shipping_restrictions: ["UK", "NY-NYC", "CA-SF"],
    rating_average: 5.0,
    reviews_count: 94,
    specifications: {
      "Overall Length": "104 cm",
      "Blade Style": "Straight Chokuto Grass Cutter",
      "Blade Material": "High Carbon Steel (Display Safety Edge)",
      "Crest": "Official Uchiha Clan Red & White Fan Insignia",
      "Scabbard & Hilt": "Seamless Matte Black Hardwood Shirasaya",
    },
  },
  {
    name: "Kyojuro Rengoku Nichirin Katana (Flame Hashira)",
    slug: "rengoku-nichirin-katana-flame-hashira",
    description: "Signature Flame Breathing Nichirin katana wielded by Flame Hashira Kyojuro Rengoku from Demon Slayer: Kimetsu no Yaiba (Mugen Train). Features the renowned flame-shaped orange and yellow alloy tsuba guard, black cord wrap over crimson rayskin handle, black wooden scabbard with silver fittings, and high carbon steel blade with blazing flame temper line.",
    price: 3899,
    discount_price: 3399,
    stock: 15,
    low_stock_threshold: 4,
    category_slug: "katanas-replicas",
    brand: "Demon Slayer Armory",
    sku: "KAT-DS-RENGOKU-012",
    weight: 1150, // < 2kg -> light weight delivery tier: ₹180
    dimensions: { length: 104, width: 8, height: 7, unit: "cm" },
    images: [
      {
        url: "/images/katanas/rengoku-flame-katana.jpg",
        isPrimary: true,
        altText: "Kyojuro Rengoku Nichirin Katana - Flame Hashira Flame Blade",
      },
    ],
    tags: ["katana", "demon-slayer", "rengoku", "flame-hashira", "mugen-train", "flame-blade", "light-weight"],
    status: "active",
    is_featured: true,
    is_restricted: true,
    age_requirement: 18,
    shipping_restrictions: ["UK", "NY-NYC", "CA-SF"],
    rating_average: 5.0,
    reviews_count: 112,
    specifications: {
      "Overall Length": "104 cm",
      "Blade Length": "71 cm",
      "Blade Material": "1045 Carbon Steel (Display Safety Edge)",
      "Hamon Pattern": "Blazing Flame Hashira Temper Line",
      "Tsuba": "Die-Cast Alloy Flame Guard (Orange & Yellow)",
      "Handle Wrap": "Black Ito over Crimson Red Rayskin",
      "Scabbard": "Glossy Black Hardwood with Silver Chappe Fittings",
    },
  },
];

async function main() {
  await client.connect();
  console.log("Connected to Supabase PostgreSQL.");

  const catRes = await client.query("SELECT id, name FROM public.categories WHERE slug = 'katanas-replicas'");
  const categoryId = catRes.rows[0].id;
  console.log("Found Katana category ID:", categoryId);

  // 1. Update Tanjiro Kamado image to the uploaded high-res product photo
  await client.query(`
    UPDATE public.products
    SET images = $1,
        name = 'Tanjiro Kamado Nichirin Katana Replica (Sun Wheel Guard)'
    WHERE slug = 'demon-slayer-nichirin-katana-replica'
  `, [
    JSON.stringify([
      {
        url: "/images/katanas/tanjiro-nichirin-katana.jpg",
        isPrimary: true,
        altText: "Tanjiro Kamado Nichirin Katana Replica - Sun Wheel Spoked Guard",
      },
    ]),
  ]);
  console.log("Updated Tanjiro Kamado katana image to local asset.");

  // 2. Update Zenitsu Agatsuma images to include both angles
  await client.query(`
    UPDATE public.products
    SET images = $1
    WHERE slug = 'zenitsu-agatsuma-nichirin-katana'
  `, [
    JSON.stringify([
      {
        url: "/images/katanas/zenitsu-nichirin-katana.jpg",
        isPrimary: true,
        altText: "Zenitsu Agatsuma Nichirin Katana - Thunder Breathing",
      },
      {
        url: "/images/katanas/zenitsu-nichirin-white-bg.jpg",
        isPrimary: false,
        altText: "Zenitsu Agatsuma Nichirin Katana - Full Sword & Scabbard",
      },
    ]),
  ]);
  console.log("Updated Zenitsu Agatsuma images with dual angles.");

  // 3. Upsert the new katanas (Ame no Habakiri, Sasuke Kusanagi, Rengoku Flame Hashira)
  for (const katana of KATANAS_TO_ADD) {
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

  // 4. Verify all katanas in database
  const allProds = await client.query("SELECT id, name, slug, price, discount_price, stock, weight FROM public.products ORDER BY created_at ASC");
  console.log("\nAll Products currently in Supabase (Total:", allProds.rows.length, "):");
  console.table(allProds.rows);

  await client.end();
  console.log("Successfully completed database updates!");
}

main().catch((err) => {
  console.error("Error updating database:", err);
  process.exit(1);
});
