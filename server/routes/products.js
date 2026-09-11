import { Router } from "express";

const router = Router();

// ข้อมูลสินค้าจำลองในหน่วยความจำ (In-memory products array)
const products = [
  { id: "1", name: "Keyboard", price: 49.99, quantity: 5 },
  { id: "2", name: "Mouse", price: 29.99, quantity: 10 },
  { id: "3", name: "Monitor", price: 299.99, quantity: 3 },
];

// GET /products — ดึงรายการสินค้าทั้งหมด (รองรับ ?name=xxx ค้นหาชื่อ & ?sort=asc|desc เรียงราคา)
router.get("/", (req, res) => {
  let result = [...products];

  // กรองตามชื่อสินค้า (ค้นหาแบบไม่สนตัวพิมพ์เล็ก-ใหญ่)
  if (req.query.name) {
    result = result.filter((p) =>
      p.name.toLowerCase().includes(req.query.name.toLowerCase()),
    );
  }

  // เรียงลำดับตามราคา
  if (req.query.sort === "asc") {
    result.sort((a, b) => a.price - b.price);
  } else if (req.query.sort === "desc") {
    result.sort((a, b) => b.price - a.price);
  }

  return res.status(200).json(result);
});

// GET /products/:id — ดึงข้อมูลสินค้าชิ้นเดียวตาม ID
router.get("/:id", (req, res) => {
  const product = products.find((p) => p.id === req.params.id);

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  return res.status(200).json(product);
});

// POST /products — เพิ่มสินค้าใหม่เข้าระบบ
router.post("/", (req, res) => {
  const { name, price, quantity } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: "name and price are required" });
  }

  const newProduct = {
    id: String(Date.now()),
    name,
    price: Number(price),
    quantity: quantity !== undefined ? Number(quantity) : 1,
  };

  products.push(newProduct);
  return res.status(201).json(newProduct);
});

// PUT /products/:id — แก้ไขข้อมูลสินค้าตาม ID
router.put("/:id", (req, res) => {
  const index = products.findIndex((p) => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: "Product not found" });
  }

  const { name, price, quantity } = req.body;

  if (name !== undefined) products[index].name = name;
  if (price !== undefined) products[index].price = Number(price);
  if (quantity !== undefined) products[index].quantity = Number(quantity);

  return res.status(200).json(products[index]);
});

// DELETE /products/:id — ลบสินค้าตาม ID
router.delete("/:id", (req, res) => {
  const index = products.findIndex((p) => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: "Product not found" });
  }

  const deleted = products.splice(index, 1);
  return res.status(200).json({ message: "Product deleted", deleted: deleted[0] });
});

export default router;
