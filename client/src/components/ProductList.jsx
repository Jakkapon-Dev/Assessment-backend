import { Link } from "react-router-dom";

// component ตัวนี้ไม่มี state ของตัวเอง — รับ products มาแสดง
// แล้วยิง event กลับขึ้นไปให้ App จัดการ (App เป็นเจ้าของ state ทั้งหมด)
export default function ProductList({ products, onEdit, onDelete }) {
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
            <td>
              <Link to={`/products/${product.id}`} className="product-title-link">
                {product.name}
              </Link>
            </td>
            <td className="num">{Number(product.price).toFixed(2)}</td>
            <td className="num">{product.quantity}</td>
            <td className="row-actions">
              <Link to={`/products/${product.id}`} className="btn-link">
                View
              </Link>
              <button type="button" onClick={() => onEdit(product)}>
                Edit
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => onDelete(product)}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
