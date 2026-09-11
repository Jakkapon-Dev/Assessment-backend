import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import ProductForm from "./components/ProductForm";
import ProductList from "./components/ProductList";
import ProductDetail from "./components/ProductDetail";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./api";
import "./App.css";

export default function App() {
  // products = สำเนาของข้อมูลที่อยู่บน server (UI state)
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null); // พังตอนโหลด list
  const [actionError, setActionError] = useState(null); // พังตอน add/edit/delete

  const [editing, setEditing] = useState(null); // product ที่กำลังแก้ไข (null = โหมดเพิ่ม)
  const [busy, setBusy] = useState(false); // กำลังส่งฟอร์มอยู่


  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("");
  const [reloadKey, setReloadKey] = useState(0); // เพิ่มค่าเพื่อสั่งโหลดใหม่

  // โหลดรายการสินค้าพร้อม debounce 300ms เมื่อ search/sort เปลี่ยน
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const data = await getProducts({ name: search, sort });
        setProducts(data);
        setLoadError(null);
      } catch (err) {
        setLoadError(err.message);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, sort, reloadKey]);

  // Optimistic Create: แสดงผลบนหน้าจอทันทีก่อน response กลับมา แล้วค่อย reconcile ทีหลัง
  async function handleCreate(form) {
    setBusy(true);
    setActionError(null);

    const tempId = `temp-${Date.now()}`;
    const optimisticProduct = {
      id: tempId,
      name: form.name,
      price: Number(form.price),
      quantity: form.quantity !== undefined ? Number(form.quantity) : 1,
    };

    // 1. เพิ่มเข้า UI ทันที
    setProducts((prev) => [...prev, optimisticProduct]);

    try {
      // 2. ยิง API บันทึกจริง
      const created = await createProduct(form);
      // 3. Reconcile: สลับ temporary id ด้วยข้อมูลและ id จริงจาก server
      setProducts((prev) =>
        prev.map((p) => (p.id === tempId ? created : p)),
      );
    } catch (err) {
      // Rollback: ถ้าล้มเหลว ลบตัวชั่วคราวออก และแสดง error
      setProducts((prev) => prev.filter((p) => p.id !== tempId));
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Optimistic Update: อัปเดตหน้าจอทันที แล้ว rollback คืนถ้า API fail
  async function handleUpdate(form) {
    setBusy(true);
    setActionError(null);

    const targetId = editing.id;
    const previousProducts = [...products];

    const optimisticUpdated = {
      ...editing,
      ...form,
      price: Number(form.price),
      quantity: Number(form.quantity),
    };

    // 1. เปลี่ยนหน้าจอทันที
    setProducts((prev) =>
      prev.map((p) => (p.id === targetId ? optimisticUpdated : p)),
    );
    setEditing(null);

    try {
      // 2. ยิง API บันทึกจริง
      const updated = await updateProduct(targetId, form);
      // 3. Reconcile ด้วยข้อมูลล่าสุดจาก server
      setProducts((prev) =>
        prev.map((p) => (p.id === targetId ? updated : p)),
      );
    } catch (err) {
      // Rollback: คืนค่าเดิมกลับมา
      setProducts(previousProducts);
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Optimistic Delete: เอาออกจากหน้าจอทันที แล้ว rollback คืนถ้า API fail
  async function handleDelete(product) {
    setActionError(null);
    const previousProducts = [...products];

    // 1. ลบออกจากหน้าจอทันที (ไม่ต้องรอ API)
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
    if (editing?.id === product.id) setEditing(null);

    try {
      // 2. ยิง API ลบจริงที่ server
      await deleteProduct(product.id);
    } catch (err) {
      // Rollback: กู้ข้อมูลเดิมกลับคืนมาหาก server ลบไม่สำเร็จ
      setProducts(previousProducts);
      setActionError(`Could not delete "${product.name}": ${err.message}`);
    }
  }

  return (
    <main className="app">
      <header>
        <h1>Shopping Cart</h1>
        <p className="subtitle">React client + Express API</p>
      </header>

      <Routes>
        <Route
          path="/"
          element={
            <>
              {/* key ทำให้ React mount ฟอร์มใหม่เวลาสลับ product ที่แก้ไข */}
              <ProductForm
                key={editing?.id ?? "new"}
                product={editing}
                busy={busy}
                onSubmit={editing ? handleUpdate : handleCreate}
                onCancel={() => setEditing(null)}
              />

              {actionError && (
                <p className="alert error" role="alert">
                  {actionError}
                </p>
              )}

              <section className="list-section">
                <div className="controls">
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name..."
                  />
                  <select value={sort} onChange={(e) => setSort(e.target.value)}>
                    <option value="">Sort: default</option>
                    <option value="asc">Price: low to high</option>
                    <option value="desc">Price: high to low</option>
                  </select>
                </div>

                {loading && <p className="status">Loading products...</p>}

                {!loading && loadError && (
                  <div className="alert error" role="alert">
                    <p>
                      <strong>Could not load products.</strong> {loadError}
                    </p>
                    <p className="hint">
                      Is the server running on{" "}
                      <code>{import.meta.env.VITE_API_URL}</code>?
                    </p>
                    <button type="button" onClick={() => setReloadKey((n) => n + 1)}>
                      Try again
                    </button>
                  </div>
                )}

                {!loading && !loadError && (
                  <ProductList
                    products={products}
                    onEdit={setEditing}
                    onDelete={handleDelete}
                  />
                )}
              </section>
            </>
          }
        />
        <Route path="/products/:id" element={<ProductDetail />} />
      </Routes>
    </main>
  );
}

