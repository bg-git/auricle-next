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

  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, loading, router]);

  // Fetch customer info and orders on mount
  useEffect(() => {
    const fetchData = async () => {
      setDataLoading(true);
      setDataError(null);
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("No auth token found");

        // Fetch customer info (profile + addresses)
        const customerRes = await fetch("/api/shopify/get-customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!customerRes.ok) throw new Error("Failed to fetch customer info");
        const customerData = await customerRes.json();
        setCustomer(customerData.customer);

        // Fetch orders
        const ordersRes = await fetch("/api/shopify/get-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!ordersRes.ok) throw new Error("Failed to fetch orders");
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);
      } catch (err: any) {
        setDataError(err.message || "Unknown error");
      } finally {
        setDataLoading(false);
      }
    };
    if (isAuthenticated && !loading) {
      fetchData();
    }
  }, [isAuthenticated, loading]);

  if (loading || dataLoading) {
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

  if (dataError) {
    return (
      <main className="account-page">
        <div style={{ textAlign: "center", padding: "50px", color: "red" }}>
          <p>Error: {dataError}</p>
        </div>
      </main>
    );
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
              {orders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px" }}>No orders found.</div>
              ) : (
                orders.map((order, index) => (
                  <div key={order.id} className="order-item">
                    <div className="order-header">
                      <div className="order-id">Order #{order.orderNumber || order.name}</div>
                      <div className="order-meta">
                        {order.processedAt ? new Date(order.processedAt).toLocaleDateString() : "-"}
                      </div>
                      <div className="order-total">
                        {order.totalPriceV2 ? `${order.totalPriceV2.amount} ${order.totalPriceV2.currencyCode}` : "-"}
                        <button
                          className="primary-btn small"
                          onClick={() => toggleOrder(order.id)}
                        >
                          {expandedOrder === order.id ? "Hide" : "View"}
                        </button>
                      </div>
                    </div>

                    {expandedOrder === order.id && (
                      <div className="order-details">
                        <p>
                          <strong>Items in this order:</strong>
                        </p>
                        {order.lineItems && order.lineItems.edges.length > 0 ? (
                          order.lineItems.edges.map((itemEdge: any, idx: number) => (
                            <div className="order-product-row" key={idx}>
                              <span className="product-title">{itemEdge.node.title}</span>
                              <span className="product-qty">×{itemEdge.node.quantity}</span>
                              <span className="product-price">
                                {itemEdge.node.originalTotalPrice
                                  ? `${itemEdge.node.originalTotalPrice.amount} ${itemEdge.node.originalTotalPrice.currencyCode}`
                                  : "-"}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div>No items found.</div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case "Delivery Address": {
        // Use the first address for delivery
        const deliveryAddress = customer?.addresses?.edges?.[0]?.node;
        return (
          <AddressForm
            type="edit"
            address={deliveryAddress}
            token={localStorage.getItem("authToken")}
            onAddressUpdated={async () => {
              // Re-fetch customer data after update
              const token = localStorage.getItem("authToken");
              if (!token) return;
              const res = await fetch("/api/shopify/get-customer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
              });
              if (res.ok) {
                const data = await res.json();
                setCustomer(data.customer);
              }
            }}
          />
        );
      }
      case "Shipping Address": {
        // Use the second address for shipping
        const shippingAddress = customer?.addresses?.edges?.[1]?.node;
        return (
          <AddressForm
            type="edit"
            address={shippingAddress}
            token={localStorage.getItem("authToken")}
            onAddressUpdated={async () => {
              // Re-fetch customer data after update
              const token = localStorage.getItem("authToken");
              if (!token) return;
              const res = await fetch("/api/shopify/get-customer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
              });
              if (res.ok) {
                const data = await res.json();
                setCustomer(data.customer);
              }
            }}
          />
        );
      }

      case "Account Settings":
        return (
          <AccountSettingsForm customer={customer} />
        );

      default:
        return null;
    }
  };

  return (
    <main className="account-page">
      <div className="welcome-section">
        <h1>Welcome back, {customer?.firstName || customer?.email || "Customer"}!</h1>
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

function AccountSettingsForm({ customer }: { customer: any }) {
  const [firstName, setFirstName] = useState(customer?.firstName || "");
  const [lastName, setLastName] = useState(customer?.lastName || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [website, setWebsite] = useState(customer?.note || ""); // Now from note field
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add a prop or callback to update parent customer state
  const [refreshing, setRefreshing] = useState(false);
  const updateCustomerState = (newCustomer: any) => {
    setFirstName(newCustomer?.firstName || "");
    setLastName(newCustomer?.lastName || "");
    setPhone(newCustomer?.phone || "");
    setWebsite(newCustomer?.note || "");
    // Don't update password fields
  };

  const fetchLatestCustomer = async (token: string) => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/shopify/get-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        const data = await res.json();
        updateCustomerState(data.customer);
      }
    } catch {}
    setRefreshing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (password && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No auth token found");
      const payload: any = { token, firstName, lastName, phone, note: website };
      if (password) payload.password = password;
      const res = await fetch("/api/shopify/update-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to update account");
      } else {
        setSuccess("Account updated successfully.");
        // Re-fetch latest customer info
        await fetchLatestCustomer(token);
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="dashboard-form" onSubmit={handleSubmit}>
      <label>
        First Name
        <input
          type="text"
          name="firstName"
          placeholder="First Name"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
        />
      </label>
      <label>
        Last Name
        <input
          type="text"
          name="lastName"
          placeholder="Last Name"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
        />
      </label>
      <label>
        Email
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={customer?.email || ""}
          readOnly
        />
      </label>
      <label>
        Phone Number
        <input
          type="tel"
          name="phone"
          placeholder="Phone Number"
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />
      </label>
      <label>
        Password
        <input
          type="password"
          name="password"
          placeholder="New Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </label>
      <label>
        Confirm Password
        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
        />
      </label>
      <label>
        Website / Social Media
        <input
          type="url"
          name="website"
          placeholder="https://your-site.com or @yourhandle"
          value={website}
          onChange={e => setWebsite(e.target.value)}
        />
      </label>
      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}
      {success && <div style={{ color: 'green', marginBottom: 10 }}>{success}</div>}
      {refreshing && <div style={{ color: 'blue', marginBottom: 10 }}>Refreshing info...</div>}
      <button type="submit" className="primary-btn" disabled={loading}>
        {loading ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}

function AddressForm({ type, address, token, onAddressUpdated }: {
  type: "edit",
  address: any,
  token: string | null,
  onAddressUpdated: () => void
}) {
  const [form, setForm] = useState({
    firstName: address?.firstName || "",
    lastName: address?.lastName || "",
    company: address?.company || "",
    address1: address?.address1 || "",
    address2: address?.address2 || "",
    city: address?.city || "",
    province: address?.province || "",
    country: address?.country || "",
    zip: address?.zip || "",
    phone: address?.phone || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      firstName: address?.firstName || "",
      lastName: address?.lastName || "",
      company: address?.company || "",
      address1: address?.address1 || "",
      address2: address?.address2 || "",
      city: address?.city || "",
      province: address?.province || "",
      country: address?.country || "",
      zip: address?.zip || "",
      phone: address?.phone || "",
    });
  }, [address]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (!token) throw new Error("No auth token found");
      const payload: any = {
        token,
        address: {
          firstName: form.firstName,
          lastName: form.lastName,
          company: form.company,
          address1: form.address1,
          address2: form.address2,
          city: form.city,
          province: form.province,
          country: form.country,
          zip: form.zip,
          phone: form.phone,
        },
      };
      if (address?.id) payload.addressId = address.id;
      const res = await fetch("/api/shopify/update-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to update address");
      } else {
        setSuccess("Address updated successfully.");
        await onAddressUpdated();
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="dashboard-form" onSubmit={handleSubmit}>
      <label>
        First Name
        <input
          type="text"
          name="firstName"
          placeholder="First Name"
          value={form.firstName}
          onChange={handleChange}
        />
      </label>
      <label>
        Last Name
        <input
          type="text"
          name="lastName"
          placeholder="Last Name"
          value={form.lastName}
          onChange={handleChange}
        />
      </label>
      <label>
        Company
        <input
          type="text"
          name="company"
          placeholder="Company (optional)"
          value={form.company}
          onChange={handleChange}
        />
      </label>
      <label>
        Address Line 1
        <input
          type="text"
          name="address1"
          placeholder="Street address"
          value={form.address1}
          onChange={handleChange}
        />
      </label>
      <label>
        Address Line 2
        <input
          type="text"
          name="address2"
          placeholder="Building, floor, etc. (optional)"
          value={form.address2}
          onChange={handleChange}
        />
      </label>
      <label>
        City
        <input
          type="text"
          name="city"
          placeholder="City"
          value={form.city}
          onChange={handleChange}
        />
      </label>
      <label>
        County / Region
        <input
          type="text"
          name="province"
          placeholder="County or Region"
          value={form.province}
          onChange={handleChange}
        />
      </label>
      <label>
        Postcode
        <input
          type="text"
          name="zip"
          placeholder="Postcode"
          value={form.zip}
          onChange={handleChange}
        />
      </label>
      <label>
        Country
        <input
          type="text"
          name="country"
          placeholder="Country"
          value={form.country}
          onChange={handleChange}
        />
      </label>
      <label>
        Phone
        <input
          type="tel"
          name="phone"
          placeholder="Phone"
          value={form.phone}
          onChange={handleChange}
        />
      </label>
      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}
      {success && <div style={{ color: 'green', marginBottom: 10 }}>{success}</div>}
      <button type="submit" className="primary-btn" disabled={loading}>
        {loading ? "Saving..." : "Save " + (type === "edit" ? "Address" : "Delivery/Shipping Address")}
      </button>
    </form>
  );
}
