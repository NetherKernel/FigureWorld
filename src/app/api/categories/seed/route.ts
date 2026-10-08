import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { supabase } from "@/lib/supabase";

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
      { name: "Zoro's Swords", slug: "zoros-swords", description: "One Piece Shusui, Wado Ichimonji & Enma steel replicas" },
      { name: "Bankai Swords", slug: "bankai-swords", description: "Bleach Zangetsu, Senbonzakura and Kyoka Suigetsu blades" },
    ],
  },
  {
    parent: {
      name: "Nendoroid & Chibi",
      slug: "nendoroid-chibi",
      description: "Adorable interchangeable chibi figures and mini desktop desk buddies",
      displayOrder: 4,
    },
    subcategories: [
      { name: "Nendoroids", slug: "nendoroid", description: "Official Good Smile style interchangeable chibi figures" },
      { name: "Funko Pop!", slug: "funko-pop", description: "Vinyl anime and pop culture figures" },
      { name: "Mini Figures & Bobbleheads", slug: "mini-figures", description: "Desk buddies and dashboard figures" },
    ],
  },
  {
    parent: {
      name: "Apparel & Accessories",
      slug: "apparel-accessories",
      description: "Anime oversized tees, hoodies, keychains, cosplay props and jewelry",
      displayOrder: 5,
    },
    subcategories: [
      { name: "Anime Oversized Tees", slug: "anime-tees", description: "Heavyweight graphic print anime t-shirts" },
      { name: "Anime Hoodies", slug: "anime-hoodies", description: "Winter fleece anime and gaming hoodies" },
      { name: "Metal Keychains", slug: "metal-keychains", description: "Miniature weapons and character keyrings" },
      { name: "Posters & Wall Scrolls", slug: "posters-scrolls", description: "High-definition matte and silk art scrolls" },
      { name: "Cosplay Props & Cloaks", slug: "cosplay-props", description: "Akatsuki cloaks, Survey Corps jackets and headbands" },
    ],
  },
];

export async function POST(req: Request) {
  try {
    await requireRole(req, "ADMIN", "STAFF");

    let createdParents = 0;
    let createdSubs = 0;

    for (const item of SUBCATEGORY_TREE) {
      // 1. Ensure Parent exists in Supabase
      let supaParentId: string | null = null;
      try {
        const { data: existingSupaP } = await supabase
          .from("categories")
          .select("id, slug")
          .eq("slug", item.parent.slug)
          .maybeSingle();

        if (existingSupaP) {
          supaParentId = existingSupaP.id;
        } else {
          const { data: createdSupaP } = await supabase
            .from("categories")
            .insert({
              name: item.parent.name,
              slug: item.parent.slug,
              description: item.parent.description,
              display_order: item.parent.displayOrder,
              is_active: true,
              is_restricted: Boolean((item.parent as any).isRestricted),
            })
            .select("id")
            .single();
          if (createdSupaP) {
            supaParentId = createdSupaP.id;
            createdParents++;
          }
        }
      } catch (err) {
        console.error(`Error ensuring parent ${item.parent.slug} in Supabase:`, err);
      }

      // 2. Ensure Subcategories exist in Supabase
      for (let i = 0; i < item.subcategories.length; i++) {
        const sub = item.subcategories[i];
        try {
          const { data: supaSub } = await supabase
            .from("categories")
            .select("id, slug, parent_category_id")
            .eq("slug", sub.slug)
            .maybeSingle();

          if (!supaSub) {
            await supabase.from("categories").insert({
              name: sub.name,
              slug: sub.slug,
              description: sub.description,
              parent_category_id: supaParentId,
              display_order: i + 1,
              is_active: true,
              is_restricted: Boolean((item.parent as any).isRestricted),
            });
            createdSubs++;
          } else if (supaParentId && supaSub.parent_category_id !== supaParentId) {
            await supabase
              .from("categories")
              .update({ parent_category_id: supaParentId })
              .eq("id", supaSub.id);
          }
        } catch (err) {
          console.error(`Error ensuring subcategory ${sub.slug} in Supabase:`, err);
        }
      }
    }

    return apiSuccess({ createdParents, createdSubs }, "Anime franchises and subcategories seeded successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
