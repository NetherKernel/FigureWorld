/**
 * Replaces the store catalog with the real, officially licensed anime merchandise
 * defined in src/lib/catalog/anime-products.json.
 *
 * The database is the source of truth: catalog products that already exist (matched
 * by SKU) are left untouched so edits made in the admin dashboard are kept, unless
 * --overwrite is passed. Products added through the admin are only deleted with
 * --prune, which removes every product whose SKU is not in the catalog file. Past orders are unaffected either way: order items keep their own
 * snapshot of the product title, SKU, image and price.
 *
 *   node scripts/seed-anime-products.js              # add catalog products that are missing
 *   node scripts/seed-anime-products.js --overwrite  # also reset existing ones to the catalog values
 *   node scripts/seed-anime-products.js --prune      # also delete products not in the catalog
 *   add --dry-run to any of the above to only print what would change
 */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/figuresworld";
const DRY_RUN = process.argv.includes("--dry-run");
const PRUNE = process.argv.includes("--prune");
const OVERWRITE = process.argv.includes("--overwrite");
const CATALOG_PATH = path.join(__dirname, "..", "src", "lib", "catalog", "anime-products.json");

// Subcategories used by the catalog (and the storefront menu) that older databases may lack
const REQUIRED_SUBCATEGORIES = [
  { parent: "manga", name: "Shonen Manga", slug: "shonen-manga", description: "English-edition shonen manga volumes and box sets" },
  { parent: "manga", name: "Seinen Manga", slug: "seinen-manga", description: "Mature English-edition seinen manga and deluxe hardcovers" },
  { parent: "manga", name: "Artbooks & Guidebooks", slug: "artbooks", description: "Official art collections and character guidebooks" },
  { parent: "accessories", name: "Acrylic Keychains", slug: "acrylic-keychains", description: "Official licensed anime keychains and bag charms" },
  { parent: "accessories", name: "Metal Weapon Props", slug: "metal-weapons", description: "Miniature metal weapon replicas" },
  { parent: "accessories", name: "Enamel Pins", slug: "enamel-pins", description: "Official licensed anime enamel pins" },
];

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  const skus = new Set();
  const slugs = new Set();
  for (const p of catalog) {
    if (skus.has(p.sku)) throw new Error(`Duplicate SKU in catalog: ${p.sku}`);
    if (slugs.has(p.slug)) throw new Error(`Duplicate slug in catalog: ${p.slug}`);
    skus.add(p.sku);
    slugs.add(p.slug);
  }

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const db = mongoose.connection.db;
  const categories = db.collection("categories");
  const products = db.collection("products");
  const now = new Date();

  // 1. Make sure every subcategory the catalog references exists
  for (const sub of REQUIRED_SUBCATEGORIES) {
    const parent = await categories.findOne({ slug: sub.parent });
    if (!parent) throw new Error(`Parent category "${sub.parent}" not found — run the store seed first`);
    const existing = await categories.findOne({ slug: sub.slug });
    if (existing) continue;
    const siblings = await categories.countDocuments({ parentCategory: parent._id });
    console.log(`${DRY_RUN ? "[dry-run] would create" : "Created"} subcategory ${sub.parent} > ${sub.slug}`);
    if (!DRY_RUN) {
      await categories.insertOne({
        name: sub.name,
        slug: sub.slug,
        description: sub.description,
        parentCategory: parent._id,
        displayOrder: siblings + 1,
        isActive: true,
        isRestricted: Boolean(parent.isRestricted),
        complianceRequirements: { minAge: 0, requiresIdVerification: false, disclaimerText: "", restrictedRegions: [] },
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  const categoryIds = {};
  for (const c of await categories.find({}, { projection: { slug: 1 } }).toArray()) {
    categoryIds[c.slug] = c._id;
  }
  for (const p of catalog) {
    for (const slug of [p.categorySlug, p.subcategorySlug].filter(Boolean)) {
      if (!categoryIds[slug] && !(DRY_RUN && REQUIRED_SUBCATEGORIES.some((s) => s.slug === slug))) {
        throw new Error(`Category "${slug}" used by ${p.sku} does not exist`);
      }
    }
  }

  // 2. Optionally remove every product that is not part of the catalog
  const stale = !PRUNE ? [] : await products.find({ sku: { $nin: [...skus] } }, { projection: { name: 1, sku: 1 } }).toArray();
  for (const p of stale) console.log(`${DRY_RUN ? "[dry-run] would delete" : "Deleted"} ${p.sku}  ${p.name}`);
  if (!DRY_RUN && stale.length > 0) {
    await products.deleteMany({ _id: { $in: stale.map((p) => p._id) } });
  }

  // 3. Insert missing catalog products (and reset existing ones with --overwrite)
  let created = 0;
  let updated = 0;
  for (const { categorySlug, subcategorySlug, ...fields } of catalog) {
    const existing = await products.findOne({ sku: fields.sku }, { projection: { _id: 1 } });
    if (existing && !OVERWRITE) continue;
    if (existing) updated++;
    else created++;
    if (DRY_RUN) continue;
    await products.updateOne(
      { sku: fields.sku },
      {
        $set: {
          ...fields,
          title: fields.name,
          category: categoryIds[categorySlug],
          subcategory: subcategorySlug ? categoryIds[subcategorySlug] : null,
          shippingRestrictions: fields.shippingRestrictions || [],
          ratingAverage: 0,
          reviewsCount: 0,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now, __v: 0 },
      },
      { upsert: true }
    );
  }

  console.log(
    `\n${DRY_RUN ? "[dry-run] " : ""}${stale.length} products removed, ${created} created, ${updated} updated (${catalog.length} in catalog).`
  );
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Catalog seed failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
