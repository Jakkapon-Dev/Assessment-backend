import { Router } from "express";
import mongoose from "mongoose";
import { Product } from "../models/product.model.js";
import { isDbConnected } from "../config/db.js";

const router = Router();

// ข้อมูลสินค้าจำลองในหน่วยความจำ (Fallback In-memory products array)
const memoryProducts = [
  { id: "1", name: "Keyboard", price: 49.99, quantity: 5 },
  { id: "2", name: "Mouse", price: 29.99, quantity: 10 },
  { id: "3", name: "Monitor", price: 299.99, quantity: 3 },
];

let seeded = false;
async function ensureSeed() {
  if (seeded) return;
  try {
    const count = await Product.countDocuments();
    if (count === 0) {
      await Product.insertMany([
        { name: "Keyboard", price: 49.99, quantity: 5 },
        { name: "Mouse", price: 29.99, quantity: 10 },
        { name: "Monitor", price: 299.99, quantity: 3 },
      ]);
      console.log("Seeded initial products to MongoDB Atlas 📦");
    }
  } catch (err) {
    console.warn("Could not seed database:", err.message);
  }
  seeded = true;
}

// GET /products — ดึงรายการสินค้าทั้งหมด (รองรับ ?name=xxx ค้นหาชื่อ & ?sort=asc|desc เรียงราคา)
router.get("/", async (req, res, next) => {
  try {
    if (isDbConnected()) {
      await ensureSeed();
      const filter = {};
      if (req.query.name) {
        filter.name = { $regex: req.query.name, $options: "i" };
      }
      const sortOption = {};
      if (req.query.sort === "asc") sortOption.price = 1;
      else if (req.query.sort === "desc") sortOption.price = -1;

      const docs = await Product.find(filter).sort(sortOption);
      return res.status(200).json(docs);
    }

    // In-memory fallback
    let result = [...memoryProducts];
    if (req.query.name) {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(req.query.name.toLowerCase()),
      );
    }
    if (req.query.sort === "asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (req.query.sort === "desc") {
      result.sort((a, b) => b.price - a.price);
    }
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /products/:id — ดึงข้อมูลสินค้าชิ้นเดียวตาม ID
router.get("/:id", async (req, res, next) => {
  try {
    if (isDbConnected()) {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ error: "Product not found" });
      }
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      return res.status(200).json(product);
    }

    const product = memoryProducts.find((p) => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    return res.status(200).json(product);
  } catch (err) {
    next(err);
  }
});

// POST /products — เพิ่มสินค้าใหม่เข้าระบบ
router.post("/", async (req, res, next) => {
  try {
    const { name, price, quantity } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: "name and price are required" });
    }

    if (isDbConnected()) {
      const newProduct = await Product.create({
        name,
        price: Number(price),
        quantity: quantity !== undefined ? Number(quantity) : 1,
      });
      return res.status(201).json(newProduct);
    }

    const newProduct = {
      id: String(Date.now()),
      name,
      price: Number(price),
      quantity: quantity !== undefined ? Number(quantity) : 1,
    };
    memoryProducts.push(newProduct);
    return res.status(201).json(newProduct);
  } catch (err) {
    next(err);
  }
});

// PUT /products/:id — แก้ไขข้อมูลสินค้าตาม ID
router.put("/:id", async (req, res, next) => {
  try {
    const { name, price, quantity } = req.body;

    if (isDbConnected()) {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ error: "Product not found" });
      }
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (price !== undefined) updateData.price = Number(price);
      if (quantity !== undefined) updateData.quantity = Number(quantity);

      const updated = await Product.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true },
      );
      if (!updated) {
        return res.status(404).json({ error: "Product not found" });
      }
      return res.status(200).json(updated);
    }

    const index = memoryProducts.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: "Product not found" });
    }
    if (name !== undefined) memoryProducts[index].name = name;
    if (price !== undefined) memoryProducts[index].price = Number(price);
    if (quantity !== undefined) memoryProducts[index].quantity = Number(quantity);

    return res.status(200).json(memoryProducts[index]);
  } catch (err) {
    next(err);
  }
});

// DELETE /products/:id — ลบสินค้าตาม ID
router.delete("/:id", async (req, res, next) => {
  try {
    if (isDbConnected()) {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ error: "Product not found" });
      }
      const deleted = await Product.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Product not found" });
      }
      return res.status(200).json({ message: "Product deleted", deleted });
    }

    const index = memoryProducts.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: "Product not found" });
    }
    const deleted = memoryProducts.splice(index, 1);
    return res.status(200).json({ message: "Product deleted", deleted: deleted[0] });
  } catch (err) {
    next(err);
  }
});

export default router;

