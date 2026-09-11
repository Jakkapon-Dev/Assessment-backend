import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import productsRouter from "./routes/products.js";
import { requestLogger } from "./middlewares/logger.js";

dotenv.config();

const app = express();

// Global Middleware (ด่านตรวจส่วนกลางที่ทุก request ต้องผ่าน)
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Routes
app.get("/", (req, res) => {
  return res.send("Welcome to the API");
});

app.use("/products", productsRouter);

// 404 Handler — จัดการกรณีไม่พบ Route ที่เรียกเข้ามา
app.use((req, res) => {
  return res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// Centralized Error Handling Middleware — จัดการ Error รวมทั้งหมดใน Server
app.use((err, req, res, next) => {
  console.error(err.stack);
  return res.status(err.status || 500).json({
    error: "Something went wrong on the server...",
    message: err.message,
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on PORT:${PORT} 🟢`);
});
