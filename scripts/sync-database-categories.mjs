import { createClient } from "@supabase/supabase-js";
import mongoose from "mongoose";

const supabaseUrl = "https://jcafygcduqekgoaixddo.supabase.co";
const supabaseAnonKey = "sb_publishable_uIe7CXMwm1bocUu-9BBUHA_38dxrdKK";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("Connecting to Supabase...");
  const { data: cats, error } = await supabase.from("categories").select("*");
  if (error) {
    console.error("Supabase error:", error);
    return;
  }
  console.log("Supabase categories count:", cats.length);

  // Check existing categories
  const catBySlug = new Map(cats.map(c => [c.slug, c]));

  // Ensure Collectibles and Keychains exist
  const collectibles = catBySlug.get("collectibles");
  const keychains = catBySlug.get("keychains");
  const actionFigures = catBySlug.get("action-figures");

  console.log("Collectibles parent ID:", collectibles?.id);
  console.log("Keychains parent ID:", keychains?.id);

  // Categories with images to insert or update
  const toUpsert = [
    {
      name: "Action Figures",
      slug: "action-figures",
      description: "Scale figures and articulated models from popular anime series",
      image: "/images/categories/action-figure.jpg",
      display_order: 1,
      is_active: true,
      is_restricted: false,
    },
    {
      name: "Katanas & Replicas",
      slug: "katanas-replicas",
      description: "Collector display anime swords, scabbards, and metal weapons. 18+ only.",
      image: "/images/katanas/oni-katana-fs111wt.jpg",
      display_order: 2,
      is_active: true,
      is_restricted: true,
    },
    {
      name: "Collectibles & Statues",
      slug: "collectibles",
      description: "Limited edition resin statues and collector busts",
      image: "/images/figures/madara-uchiha-susanoo-kurama-resin-statue.jpg",
      display_order: 3,
      is_active: true,
      is_restricted: false,
    },
    {
      name: "Keychains",
      slug: "keychains",
      description: "Acrylic, metallic and rubber anime character keychains",
      image: "/images/categories/keychains.jpg",
      display_order: 4,
      is_active: true,
      is_restricted: false,
    },
    {
      name: "Bobblehead",
      slug: "bobbleheads",
      description: "Collector bobbleheads and chibi figurines",
      image: "/images/categories/bobblehead.jpg",
      parent_category_id: collectibles?.id || null,
      display_order: 5,
      is_active: true,
      is_restricted: false,
    },
    {
      name: "3D Keychain",
      slug: "3d-keychains",
      description: "3D rubber and PVC anime character keychains",
      image: "/images/categories/3d-keychain.jpg",
      parent_category_id: keychains?.id || null,
      display_order: 6,
      is_active: true,
      is_restricted: false,
    },
    {
      name: "Resin Statues",
      slug: "resin-statues",
      description: "High-end 1/4 & 1/6 polyresin statues",
      image: "/images/figures/madara-uchiha-susanoo-kurama-resin-statue.jpg",
      parent_category_id: collectibles?.id || null,
      display_order: 7,
      is_active: true,
      is_restricted: false,
    },
    {
      name: "Posters & Wall Art",
      slug: "posters",
      description: "High-definition collector wall scrolls and framed art prints",
      image: "/images/categories/wands-merch.jpg",
      display_order: 8,
      is_active: true,
      is_restricted: false,
    },
    {
      name: "Other Merchandise",
      slug: "other-merchandise",
      description: "Apparel, plushies, wands, and gaming desk mats",
      image: "/images/categories/wands-merch.jpg",
      display_order: 9,
      is_active: true,
      is_restricted: false,
    },
  ];

  for (const item of toUpsert) {
    const existing = catBySlug.get(item.slug);
    if (existing) {
      console.log(`Updating ${item.name} (${item.slug})...`);
      const { error: updErr } = await supabase
        .from("categories")
        .update({
          image: item.image,
          name: item.name,
          display_order: item.display_order,
        })
        .eq("id", existing.id);
      if (updErr) console.warn(`Could not update ${item.slug}:`, updErr.message);
    } else {
      console.log(`Inserting ${item.name} (${item.slug})...`);
      const { data: insData, error: insErr } = await supabase
        .from("categories")
        .insert(item)
        .select()
        .single();
      if (insErr) console.warn(`Could not insert ${item.slug}:`, insErr.message);
      else console.log(`Inserted ${item.name} with ID:`, insData?.id);
    }
  }

  // Also update MongoDB categories if local MongoDB is running
  try {
    await mongoose.connect("mongodb://localhost:27017/figuresworld");
    const mongoColl = mongoose.connection.db.collection("categories");
    for (const item of toUpsert) {
      const mongoExisting = await mongoColl.findOne({ slug: item.slug });
      if (mongoExisting) {
        await mongoColl.updateOne(
          { slug: item.slug },
          { $set: { image: item.image, name: item.name, displayOrder: item.display_order } }
        );
      } else {
        await mongoColl.insertOne({
          name: item.name,
          slug: item.slug,
          description: item.description,
          image: item.image,
          displayOrder: item.display_order,
          isActive: true,
          isRestricted: item.is_restricted,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
    console.log("MongoDB categories synced successfully!");
    await mongoose.disconnect();
  } catch (mErr) {
    console.log("MongoDB sync skipped or failed:", mErr.message);
  }

  console.log("Done!");
}

main().catch(console.error);
