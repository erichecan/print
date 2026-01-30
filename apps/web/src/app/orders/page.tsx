'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchOrderPage() {
    const router = useRouter();
    const [orderNumber, setOrderNumber] = useState('');
    const [email, setEmail] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (orderNumber && email) {
            router.push(`/orders/${encodeURIComponent(orderNumber.trim())}?email=${encodeURIComponent(email.trim())}`);
        }
    };

    return (
        <div className="container">
            <div className="card">
                <h1>Track Your Order</h1>
                <p>Enter your order number and email address to view your order details.</p>

                <form onSubmit={handleSubmit} className="form">
                    <div className="form-group">
                        <label htmlFor="orderNumber">Order Number</label>
                        <input
                            id="orderNumber"
                            type="text"
                            placeholder="e.g. ORD-123456789"
                            value={orderNumber}
                            onChange={(e) => setOrderNumber(e.target.value)}
                            required
                            className="input"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="Enter the email used for checkout"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="input"
                        />
                    </div>

                    <button type="submit" className="btn-primary">
                        Find Order
                    </button>
                </form>
            </div>

            <style jsx>{`
        .container {
          min-height: 60vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: #f8fafc;
        }
        .card {
          background: white;
          padding: 2.5rem;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 480px;
          text-align: center;
        }
        h1 {
          margin-bottom: 0.5rem;
          color: #1e293b;
        }
        p {
          color: #64748b;
          margin-bottom: 2rem;
        }
        .form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          text-align: left;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        label {
          font-weight: 500;
          color: #334155;
          font-size: 0.875rem;
        }
        .input {
          padding: 0.75rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          width: 100%;
        }
        .input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }
        .btn-primary {
          background: #ff1f3d;
          color: white;
          border: none;
          padding: 0.875rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          margin-top: 0.5rem;
        }
        .btn-primary:hover {
          background: #e61e37;
        }
      `}</style>
        </div>
    );
}
