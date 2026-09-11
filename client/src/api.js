// ทุก request ในแอปนี้วิ่งผ่านไฟล์นี้ไฟล์เดียว
// base URL อ่านจาก .env (VITE_API_URL) — เวลา server ย้าย port แก้ที่เดียวจบ
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4001";

// helper กลาง: ยิง fetch, แกะ JSON, แล้วโยน error ถ้า status ไม่ใช่ 2xx
async function request(path, options) {
  const res = await fetch(BASE_URL + path, options);

  // server ตอบ JSON เสมอ แต่กัน body ว่างไว้ด้วย
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // ใช้ error message จาก server (เช่น 400 "name and price are required")
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }

  return data;
}

// ส่ง JSON body — ใช้ซ้ำใน POST กับ PUT
function jsonBody(method, product) {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  };
}

// GET /products?name=...&sort=asc|desc
export function getProducts({ name, sort } = {}) {
  const params = new URLSearchParams();
  if (name) params.set("name", name);
  if (sort) params.set("sort", sort);

  const query = params.toString();
  return request(query ? `/products?${query}` : "/products");
}

// POST /products
export function createProduct(product) {
  return request("/products", jsonBody("POST", product));
}

// PUT /products/:id
export function updateProduct(id, product) {
  return request(`/products/${id}`, jsonBody("PUT", product));
}

// DELETE /products/:id
export function deleteProduct(id) {
  return request(`/products/${id}`, { method: "DELETE" });
}
