import "dotenv/config";
import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });

const products = [
  { slug:"ufo-planter", name:"UFO Planter", description:"Give your little plant a spaceship of its own. This quirky UFO-inspired planter is perfect for succulents, small plants, and anyone who likes their greenery a little out of this world. 🛸", price:699, image:"assets/Quirkzy-ufoplanter.jpg", category:"plant-pals", dimensions:"16 cm × 16 cm × 12 cm", material:"High-quality ceramic" },
  { slug:"desk-organizer", name:"Desk Organizer", description:"Keep your desk a little less chaotic with this fun and functional organizer. Perfect for pens, pencils, stationery, and those tiny things that somehow disappear every day. ✨", price:499, image:"assets/Quirkzy-organizer.png", category:"desk-office", dimensions:"22 cm × 10 cm × 12 cm", material:"Durable ABS plastic" },
  { slug:"potter-pen-holder", name:"Potter Pen Holder", description:"A charming little holder inspired by pottery and handcrafted forms. Use it to keep your favourite stationery, brushes, accessories, or other small everyday treasures. 🏺", price:999, image:"assets/Quirkzy-potterpenholder.png", category:"desk-office", dimensions:"11 cm × 10 cm × 10 cm", material:"Ceramic" },
  { slug:"mushroom-lamp", name:"Mushroom Lamp", description:"A cute mushroom-inspired lamp that adds a warm, cozy glow to your desk, bedside table, or reading corner. A wonderfully quirky little light for your space. ♡", price:899, image:"assets/Quirkzy-mushroomlamp.png", category:"home-decor", dimensions:"18 cm × 12 cm × 12 cm", material:"ABS plastic + LED light" }
];

try {
  for (const p of products) {
    await pool.query(
      `INSERT INTO products(slug,name,description,price,image,category,dimensions,material)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description,
       price=EXCLUDED.price, image=EXCLUDED.image, category=EXCLUDED.category,
       dimensions=EXCLUDED.dimensions, material=EXCLUDED.material, active=TRUE`,
      [p.slug,p.name,p.description,p.price,p.image,p.category,p.dimensions,p.material]
    );
  }
  console.log(`Seeded ${products.length} Quirkzy products (safe to rerun).`);
} catch (error) {
  console.error("Seeding failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
