import "dotenv/config";
import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });

const products = [
  { slug:"ufo-planter", name:"UFO Planter", description:"A playful planter for a little out-of-this-world greenery.", price:699, image:"assets/Quirkzy-ufoplanter.jpg", category:"plant-pals", dimensions:"Approx. 15 × 12 cm", material:"Decorative planter" },
  { slug:"desk-organizer", name:"Desk Organizer", description:"Give your desk a little personality while keeping essentials together.", price:499, image:"assets/Quirkzy-organizer.png", category:"desk-office", dimensions:"Approx. 18 × 10 cm", material:"Decorative organizer" },
  { slug:"potter-pen-holder", name:"Potter Pen Holder", description:"A whimsical pen holder for your everyday writing tools.", price:999, image:"assets/Quirkzy-potterpenholder.png", category:"desk-office", dimensions:"Approx. 12 × 10 cm", material:"Decorative holder" },
  { slug:"mushroom-lamp", name:"Mushroom Lamp", description:"A cosy mushroom-shaped accent to brighten your corner.", price:899, image:"assets/Quirkzy-mushroomlamp.png", category:"home-decor", dimensions:"Approx. 20 × 15 cm", material:"Decorative lamp" }
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
