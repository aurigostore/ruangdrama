import { config } from "dotenv";
config(); // Load .env SEBELUM apapun lainnya

import express from "express";
import cors from "cors";
import dramaboxRouter from "./routes/dramabox.js";
import authRouter from "./routes/auth.js";

// Inisialisasi database saat startup
import "./db.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "POST", "DELETE"],
}));

app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Ruang Drama Backend", version: "2.0.0" });
});

// Routes
app.use("/api/dramabox", dramaboxRouter);
app.use("/api/auth", authRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`DRACIN Backend running on http://localhost:${PORT}`);
  // Validasi JWT Token
  const key = process.env.AIO_JWT_TOKEN;
  if (!key) {
    console.error("[ERROR] AIO_JWT_TOKEN tidak ditemukan! Cek file .env");
  } else {
    console.log(`[OK] AIO_JWT_TOKEN loaded: ${key.slice(0, 20)}...`);
  }
});
