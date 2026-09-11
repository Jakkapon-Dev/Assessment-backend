import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getProduct } from "../api";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getProduct(id);
        setProduct(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  return (
    <div className="product-detail-card">
      <Link to="/" className="back-link">
        ← Back to products
      </Link>

      {loading && <p className="status">Loading product details...</p>}

      {!loading && error && (
        <div className="alert error" role="alert">
          <p>
            <strong>Error:</strong> {error}
          </p>
          <Link to="/">Go back to list</Link>
        </div>
      )}

      {!loading && product && (
        <article className="detail-content">
          <header className="detail-header">
            <h2>{product.name}</h2>
            <span className="badge">ID: {product.id}</span>
          </header>

          <div className="detail-grid">
            <div className="detail-item">
              <span className="label">Price</span>
              <span className="value price">${Number(product.price).toFixed(2)}</span>
            </div>

            <div className="detail-item">
              <span className="label">In Stock Quantity</span>
              <span className="value">{product.quantity}</span>
            </div>

            {product.createdAt && (
              <div className="detail-item">
                <span className="label">Created At</span>
                <span className="value">
                  {new Date(product.createdAt).toLocaleString()}
                </span>
              </div>
            )}

            {product.updatedAt && (
              <div className="detail-item">
                <span className="label">Last Updated</span>
                <span className="value">
                  {new Date(product.updatedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </article>
      )}
    </div>
  );
}
