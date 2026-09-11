// component ตัวนี้ไม่มี state ของตัวเอง — รับ products มาแสดง
// แล้วยิง event กลับขึ้นไปให้ App จัดการ (App เป็นเจ้าของ state ทั้งหมด)
export default function ProductList({ products, onEdit, onDelete, busyId }) {
  if (products.length === 0) {
    return <p className="empty">No products yet. Add one above.</p>;
  }

  return (
    <table className="product-table">
      <thead>
        <tr>
          <th>Name</th>
          <th className="num">Price</th>
          <th className="num">Qty</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {products.map((product) => (
          <tr key={product.id}>
            <td>{product.name}</td>
            <td className="num">{product.price.toFixed(2)}</td>
            <td className="num">{product.quantity}</td>
            <td className="row-actions">
              <button type="button" onClick={() => onEdit(product)}>
                Edit
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => onDelete(product)}
                disabled={busyId === product.id}
              >
                {busyId === product.id ? "Deleting..." : "Delete"}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
