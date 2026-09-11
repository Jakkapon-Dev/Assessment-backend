import { useState } from "react";

// ฟอร์มเดียวใช้ได้ทั้ง "เพิ่ม" และ "แก้ไข"
// - ตอนเพิ่ม: product เป็น null → ช่องว่างเปล่า
// - ตอนแก้ไข: product คือตัวที่เลือก → เติมค่าเดิมไว้ให้
// App ใส่ key ให้ component นี้ เวลาสลับ product React จะ mount ใหม่
// ทำให้ useState ด้านล่างอ่านค่าเริ่มต้นใหม่เสมอ
export default function ProductForm({ product, onSubmit, onCancel, busy }) {
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product?.price ?? "");
  const [quantity, setQuantity] = useState(product?.quantity ?? 1);

  const isEditing = Boolean(product);

  function handleSubmit(e) {
    // กัน browser reload หน้าเว็บตอน submit form
    e.preventDefault();

    onSubmit({
      name: name.trim(),
      price: Number(price),
      quantity: Number(quantity),
    });

    // เคลียร์ฟอร์มเฉพาะตอนเพิ่มใหม่ ตอนแก้ไขให้ App เป็นคนปิดโหมดแก้ไขเอง
    if (!isEditing) {
      setName("");
      setPrice("");
      setQuantity(1);
    }
  }

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      <h2>{isEditing ? `Edit: ${product.name}` : "Add a product"}</h2>

      <div className="fields">
        <label>
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Keyboard"
          />
        </label>

        <label>
          Price
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="49.99"
          />
        </label>

        <label>
          Quantity
          <input
            type="number"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </label>
      </div>

      <div className="actions">
        <button type="submit" className="primary" disabled={busy}>
          {isEditing ? "Save changes" : "Add product"}
        </button>

        {isEditing && (
          <button type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
