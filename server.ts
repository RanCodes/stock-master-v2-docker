import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import multer from "multer";

const app = express();
const PORT = 3000;

// Database setup
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function ensureDatabase(dbPath: string) {
  let db = new Database(dbPath);

  try {
    db.exec("PRAGMA journal_mode = WAL;");
  } catch (error: any) {
    if (error?.code !== "SQLITE_NOTADB") {
      throw error;
    }

    db.close();
    const corruptedPath = `${dbPath}.corrupt-${Date.now()}`;
    fs.renameSync(dbPath, corruptedPath);
    console.warn(`Invalid database file detected. Backed up to ${corruptedPath}`);

    db = new Database(dbPath);
    db.exec("PRAGMA journal_mode = WAL;");
  }

  return db;
}

const dbPath = path.join(dataDir, "stock.db");
const db = ensureDatabase(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT,
    name TEXT,
    quantity INTEGER,
    notes TEXT,
    photo_front TEXT,
    photo_back TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Multer setup for photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });


app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(self)");
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use("/uploads", express.static("uploads"));

// API Routes
app.get("/api/products", (req, res) => {
  const products = db.prepare("SELECT * FROM products ORDER BY created_at DESC").all();
  res.json(products);
});

app.get("/api/products/sku/:sku", (req, res) => {
  const product = db.prepare("SELECT * FROM products WHERE sku = ?").get(req.params.sku);
  res.json(product || null);
});

app.post("/api/products", upload.fields([
  { name: 'photoFront', maxCount: 1 },
  { name: 'photoBack', maxCount: 1 }
]), (req, res) => {
  const { sku, name, quantity, notes, updateExisting } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  
  const photoFront = files['photoFront'] ? `/uploads/${files['photoFront'][0].filename}` : null;
  const photoBack = files['photoBack'] ? `/uploads/${files['photoBack'][0].filename}` : null;

  if (sku && updateExisting === 'true') {
    const existing = db.prepare("SELECT * FROM products WHERE sku = ?").get(sku) as any;
    if (existing) {
      db.prepare(
        "UPDATE products SET quantity = quantity + ?, notes = ?, photo_front = COALESCE(?, photo_front), photo_back = COALESCE(?, photo_back) WHERE id = ?"
      ).run(parseInt(quantity) || 0, notes || existing.notes, photoFront, photoBack, existing.id);
      return res.json({ id: existing.id, success: true, updated: true });
    }
  }

  const info = db.prepare(
    "INSERT INTO products (sku, name, quantity, notes, photo_front, photo_back) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(sku || null, name || null, parseInt(quantity) || 0, notes || null, photoFront, photoBack);

  res.json({ id: info.lastInsertRowid, success: true });
});

app.put("/api/products/:id", upload.fields([
  { name: 'photoFront', maxCount: 1 },
  { name: 'photoBack', maxCount: 1 }
]), (req, res) => {
  const { sku, name, quantity, notes } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  
  const photoFront = files['photoFront'] ? `/uploads/${files['photoFront'][0].filename}` : null;
  const photoBack = files['photoBack'] ? `/uploads/${files['photoBack'][0].filename}` : null;

  const query = `
    UPDATE products 
    SET sku = ?, name = ?, quantity = ?, notes = ?, 
        photo_front = COALESCE(?, photo_front), 
        photo_back = COALESCE(?, photo_back) 
    WHERE id = ?
  `;
  
  db.prepare(query).run(sku, name, quantity, notes, photoFront, photoBack, req.params.id);
  res.json({ success: true });
});

app.delete("/api/products/:id", (req, res) => {
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.get("/api/config", (req, res) => {
  const config = db.prepare("SELECT * FROM config").all();
  const configMap = config.reduce((acc: any, curr: any) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
  res.json(configMap);
});

app.post("/api/config", (req, res) => {
  const { driveLink, locked } = req.body;
  
  db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)").run("driveLink", driveLink);
  db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)").run("locked", locked ? "true" : "false");
  
  res.json({ success: true });
});


app.get("/api/export/db", (req, res) => {
  const dbPath = path.join(dataDir, "stock.db");
  if (!fs.existsSync(dbPath)) {
    return res.status(404).send("No hay base de datos para exportar");
  }

  res.download(dbPath, "stock.db");
});

app.get("/api/export", (req, res) => {
  const products = db.prepare("SELECT * FROM products ORDER BY created_at DESC").all();
  
  if (products.length === 0) {
    return res.status(404).send("No hay datos para exportar");
  }

  const headers = ["ID", "SKU", "Nombre", "Cantidad", "Notas", "Foto Frontal", "Foto Trasera", "Fecha"];
  const rows = (products as any[]).map(p => [
    p.id,
    p.sku,
    p.name,
    p.quantity,
    p.notes,
    p.photo_front ? `${process.env.APP_URL}${p.photo_front}` : "",
    p.photo_back ? `${process.env.APP_URL}${p.photo_back}` : "",
    p.created_at
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(val => `"${val}"`).join(","))
  ].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=stock_report.csv");
  res.send(csvContent);
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
