import { useEffect, useState } from "react";
import ProductForm from "./components/ProductForm";
import ProductList from "./components/ProductList";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./api";
import "./App.css";

export default function App() {
  // products = สำเนาของ array ที่อยู่บน server (UI state)
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null); // พังตอนโหลด list
  const [actionError, setActionError] = useState(null); // พังตอน add/edit/delete

  const [editing, setEditing] = useState(null); // product ที่กำลังแก้ไข (null = โหมดเพิ่ม)
  const [busy, setBusy] = useState(false); // กำลังส่งฟอร์มอยู่
  const [deletingId, setDeletingId] = useState(null); // id ที่กำลังลบ

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("");
  const [reloadKey, setReloadKey] = useState(0); // เพิ่มค่าเพื่อสั่งโหลดใหม่

  // เรียก fetch ตรง ๆ ใน component body ไม่ได้ เพราะ body ทำงานทุกครั้งที่ render
  // การ setState จะทำให้ render ใหม่ → fetch ใหม่ → วนไม่รู้จบ
  // useEffect เลยเป็นที่สำหรับ side effect: รันหลัง render และคุม deps ได้
  useEffect(() => {
    // หน่วง 300ms กันยิง request ทุกตัวอักษรที่พิมพ์ในช่อง search
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const data = await getProducts({ name: search, sort });
        setProducts(data);
        setLoadError(null);
      } catch (err) {
        // เข้าตรงนี้ตอน server ไม่ได้รัน (fetch reject) หรือ status ไม่ใช่ 2xx
        setLoadError(err.message);
      } finally {
        setLoading(false);
      }
    }, 300);

    // cleanup: ถ้า search/sort เปลี่ยนก่อนครบ 300ms ให้ทิ้งตัวเดิมไป
    return () => clearTimeout(timer);
  }, [search, sort, reloadKey]);

  async function handleCreate(form) {
    setBusy(true);
    setActionError(null);
    try {
      // server เป็นคนสร้าง id ให้ เราจึงเอา product ที่ server ตอบกลับมาใส่ state
      const created = await createProduct(form);
      setProducts((prev) => [...prev, created]);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(form) {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await updateProduct(editing.id, form);
      // สลับเฉพาะตัวที่ id ตรงกัน ตัวอื่นคงเดิม
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );
      setEditing(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(product) {
    setDeletingId(product.id);
    setActionError(null);
    try {
      // ลบบน server ให้สำเร็จก่อน แล้วค่อยเอาออกจาก state
      await deleteProduct(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));

      // ถ้ากำลังแก้ไขตัวที่เพิ่งลบอยู่ ให้ออกจากโหมดแก้ไข
      if (editing?.id === product.id) setEditing(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="app">
      <header>
        <h1>Shopping Cart</h1>
        <p className="subtitle">React client + Express API</p>
      </header>

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
            busyId={deletingId}
            onEdit={setEditing}
            onDelete={handleDelete}
          />
        )}
      </section>
    </main>
  );
}
