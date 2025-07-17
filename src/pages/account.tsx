import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/router";

const tabs = [
  "Orders",
  "Delivery Address",
  "Shipping Address",
  "Account Settings",
];

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState("Orders");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const { isAuthenticated, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <main className="account-page">
        <div style={{ textAlign: "center", padding: "50px" }}>
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const toggleOrder = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const renderTab = () => {
    switch (activeTab) {
      case "Orders":
        return (
          <div className="dashboard-section">
            <h2>My Orders</h2>
            <div className="order-list">
              {["1001", "1000", "0999"].map((orderId, index) => (
                <div key={orderId} className="order-item">
                  <div className="order-header">
                    <div className="order-id">Order #{orderId}</div>
                    <div className="order-meta">
                      {index === 0
                        ? "14 Jul 2025"
                        : index === 1
                        ? "01 Jul 2025"
                        : "18 Jun 2025"}
                    </div>
                    <div className="order-total">
                      {index === 0
                        ? "£45.00"
                        : index === 1
                        ? "£123.99"
                        : "£78.50"}
                      <button
                        className="primary-btn small"
                        onClick={() => toggleOrder(orderId)}
                      >
                        {expandedOrder === orderId ? "Hide" : "View"}
                      </button>
                    </div>
                  </div>

                  {expandedOrder === orderId && (
                    <div className="order-details">
                      <p>
                        <strong>Items in this order:</strong>
                      </p>
                      <div className="order-product-row">
                        <span className="product-title">Gold Dome Stud</span>
                        <span className="product-qty">×1</span>
                        <span className="product-price">£15.00</span>
                      </div>
                      <div className="order-product-row">
                        <span className="product-title">
                          3mm Flat Back Disk
                        </span>
                        <span className="product-qty">×2</span>
                        <span className="product-price">£25.00</span>
                      </div>
                      <div className="order-product-row">
                        <span className="product-title">
                          14k Gold Seam Ring
                        </span>
                        <span className="product-qty">×1</span>
                        <span className="product-price">£49.00</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case "Delivery Address":
        return (
          <form className="dashboard-form">
            <label>
              First Name
              <input
                type="text"
                name="deliveryFirstName"
                placeholder="First Name"
              />
            </label>
            <label>
              Last Name
              <input
                type="text"
                name="deliveryLastName"
                placeholder="Last Name"
              />
            </label>
            <label>
              Company
              <input
                type="text"
                name="deliveryCompany"
                placeholder="Company (optional)"
              />
            </label>
            <label>
              Address Line 1
              <input
                type="text"
                name="deliveryAddress1"
                placeholder="Street address"
              />
            </label>
            <label>
              Address Line 2
              <input
                type="text"
                name="deliveryAddress2"
                placeholder="Building, floor, etc. (optional)"
              />
            </label>
            <label>
              City
              <input type="text" name="deliveryCity" placeholder="City" />
            </label>
            <label>
              County / Region
              <input
                type="text"
                name="deliveryRegion"
                placeholder="County or Region"
              />
            </label>
            <label>
              Postcode
              <input
                type="text"
                name="deliveryPostcode"
                placeholder="Postcode"
              />
            </label>
            <label>
              Country
              <input type="text" name="deliveryCountry" placeholder="Country" />
            </label>
            <button type="submit" className="primary-btn">
              Save Delivery Address
            </button>
          </form>
        );

      case "Shipping Address":
        return (
          <form className="dashboard-form">
            <label>
              First Name
              <input
                type="text"
                name="shippingFirstName"
                placeholder="First Name"
              />
            </label>
            <label>
              Last Name
              <input
                type="text"
                name="shippingLastName"
                placeholder="Last Name"
              />
            </label>
            <label>
              Company
              <input
                type="text"
                name="shippingCompany"
                placeholder="Company (optional)"
              />
            </label>
            <label>
              Address Line 1
              <input
                type="text"
                name="shippingAddress1"
                placeholder="Street address"
              />
            </label>
            <label>
              Address Line 2
              <input
                type="text"
                name="shippingAddress2"
                placeholder="Building, floor, etc. (optional)"
              />
            </label>
            <label>
              City
              <input type="text" name="shippingCity" placeholder="City" />
            </label>
            <label>
              County / Region
              <input
                type="text"
                name="shippingRegion"
                placeholder="County or Region"
              />
            </label>
            <label>
              Postcode
              <input
                type="text"
                name="shippingPostcode"
                placeholder="Postcode"
              />
            </label>
            <label>
              Country
              <input type="text" name="shippingCountry" placeholder="Country" />
            </label>
            <button type="submit" className="primary-btn">
              Save Shipping Address
            </button>
          </form>
        );

      case "Account Settings":
        return (
          <form className="dashboard-form">
            <label>
              First Name
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                defaultValue={user?.firstName || ""}
              />
            </label>
            <label>
              Last Name
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                defaultValue={user?.lastName || ""}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                name="email"
                placeholder="Email"
                defaultValue={user?.email || ""}
                readOnly
              />
            </label>
            <label>
              Phone Number
              <input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                defaultValue={user?.phone || ""}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                placeholder="New Password"
              />
            </label>
            <label>
              Confirm Password
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
              />
            </label>
            <label>
              Website / Social Media
              <input
                type="url"
                name="website"
                placeholder="https://your-site.com"
              />
            </label>
            <button type="submit" className="primary-btn">
              Save Changes
            </button>
          </form>
        );

      default:
        return null;
    }
  };

  return (
    <main className="account-page">
      <div className="welcome-section">
        <h1>Welcome back, {user?.firstName || user?.email || "Customer"}!</h1>
        <p>Manage your account, orders, and addresses below.</p>
      </div>

      <div className="tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${tab === activeTab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="tab-content">{renderTab()}</div>
    </main>
  );
}
