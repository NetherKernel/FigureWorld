import { connectToDatabase } from "@/lib/db";
import { Category } from "@/models/Category";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";

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

export async function POST(req: Request) {
  try {
    await requireRole(req, "ADMIN", "STAFF");
    await connectToDatabase();

    let createdParents = 0;
    let createdSubs = 0;

    for (const item of SUBCATEGORY_TREE) {
      let parent = await Category.findOne({ slug: item.parent.slug });
      if (!parent) {
        parent = await Category.create({
          name: item.parent.name,
          slug: item.parent.slug,
          description: item.parent.description,
          displayOrder: item.parent.displayOrder,
          isRestricted: Boolean((item.parent as any).isRestricted),
          isActive: true,
          parentCategory: null,
        });
        createdParents++;
      }

      for (let i = 0; i < item.subcategories.length; i++) {
        const sub = item.subcategories[i];
        let subDoc = await Category.findOne({ slug: sub.slug });
        if (!subDoc) {
          await Category.create({
            name: sub.name,
            slug: sub.slug,
            description: sub.description,
            parentCategory: parent._id,
            displayOrder: i + 1,
            isActive: true,
            isRestricted: Boolean(parent.isRestricted),
          });
          createdSubs++;
        } else if (!subDoc.parentCategory) {
          subDoc.parentCategory = parent._id;
          await subDoc.save();
        }
      }
    }

    return apiSuccess({ createdParents, createdSubs }, "Anime franchises and subcategories seeded successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
