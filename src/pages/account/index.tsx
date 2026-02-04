import { useState, useEffect } from "react";
import useSWR from "swr";
import { useAuth } from "@/context/AuthContext";
import { useAccountValidationContext } from "@/context/AccountValidationContext";
import { useRouter } from "next/router";
import Link from "next/link";

interface Customer {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  website?: string;
  social?: string;
  addresses?: {
    edges: Array<{
      node: {
        id: string;
        firstName?: string;
        lastName?: string;
        company?: string;
        address1?: string;
        address2?: string;
        city?: string;
        province?: string;
        provinceCode?: string;
        country?: string;
        zip?: string;
        phone?: string;
      };
    }>;
  };
}

const tabs = [
  "Orders",
  "Billing Address",
  "Shipping Address",
  "Profile",
  "Security",
];

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState("Orders");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const { isAuthenticated, user, loading } = useAuth();
  const router = useRouter();
  
  // Safely get validation context - handle case where it might not be available
  let refreshValidation = () => {};
  try {
    const validationContext = useAccountValidationContext();
    refreshValidation = validationContext.refreshValidation;
  } catch (error) {
    console.warn('AccountValidationContext not available:', error);
  }

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, loading, router]);

  const fetcher = (url: string) =>
    fetch(url, { 
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      }
    }).then((res) => res.json());

  const {
    data: customerData,
    error: customerError,
    isLoading: customerLoading,
    mutate: mutateCustomer,
  } = useSWR(user?.id ? "/api/shopify/get-customer" : null, fetcher);

  const {
    data: ordersData,
    error: ordersError,
    isLoading: ordersLoading,
  } = useSWR(user?.id ? "/api/shopify/get-orders" : null, fetcher);

  const customer = (customerData?.customer as Customer | undefined) || ({} as Customer);
  const orders = ordersData?.orders || [];
  const dataError = customerError || ordersError;

  // Show loading state while component mounts to prevent hydration mismatch
  if (!isMounted || loading || customerLoading || ordersLoading) {
    return (
      <main className="account-page">
        <div style={{ textAlign: "center", padding: "50px" }}>
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  // Redirect unauthenticated users - this happens after mount to prevent hydration issues
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

  // Function to check if a tab has missing mandatory fields
  const hasTabValidationErrors = (tabName: string) => {
    if (!customer) return false;
    
    switch (tabName) {
      case "Profile":
        // Check profile mandatory fields
        const hasFirstName = !!customer.firstName?.trim();
        const hasLastName = !!customer.lastName?.trim();
        const hasEmail = !!customer.email?.trim();
        const hasPhone = !!customer.phone?.trim();
        const hasWebsiteOrSocial = !!(customer.website?.trim() || customer.social?.trim());
        return !(hasFirstName && hasLastName && hasEmail && hasPhone && hasWebsiteOrSocial);
        
      case "Security":
        // Security tab has no mandatory fields (password is optional)
        return false;
        
      case "Billing Address": {
        const deliveryAddress = customer?.addresses?.edges?.[0]?.node;
        if (!deliveryAddress) return true;
        return !(
          deliveryAddress.firstName?.trim() &&
          deliveryAddress.lastName?.trim() &&
          deliveryAddress.address1?.trim() &&
          deliveryAddress.city?.trim() &&
          deliveryAddress.zip?.trim() &&
          deliveryAddress.country?.trim() &&
          deliveryAddress.phone?.trim()
        );
      }
      
      case "Shipping Address": {
        const shippingAddress = customer?.addresses?.edges?.[1]?.node;
        if (!shippingAddress) return true;
        return !(
          shippingAddress.firstName?.trim() &&
          shippingAddress.lastName?.trim() &&
          shippingAddress.address1?.trim() &&
          shippingAddress.city?.trim() &&
          shippingAddress.zip?.trim() &&
          shippingAddress.country?.trim() &&
          shippingAddress.phone?.trim()
        );
      }
      
      default:
        return false;
    }
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
                orders.map((order) => (
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
                        <a
                          href={(() => {
                            // Build items with unit price calculation
                            const items = (order.lineItems?.edges || []).map((edge: { node: { title: string; quantity: number; discountedTotalPrice: { amount: string } } }) => {
                              const qty = Number(edge.node.quantity || 1);
                              const lineDiscounted = Number(edge.node.discountedTotalPrice?.amount || 0);
                              const unit = qty > 0 ? (lineDiscounted / qty) : lineDiscounted;
                              return {
                                title: edge.node.title,
                                quantity: qty,
                                price: unit.toFixed(2),
                              };
                            });

                            // Build billing address from customer's first address
                            const addr = customer?.addresses?.edges?.[0]?.node;
                            const billToLines = [
                              `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim(),
                              addr?.address1,
                              addr?.address2,
                              addr?.city,
                              addr?.provinceCode,
                              addr?.zip,
                              addr?.country,
                            ].filter(Boolean).join('\n');

                            // Get totals from order
                            const subtotal = order.subtotalPriceV2?.amount || '0.00';
                            const tax = order.totalTaxV2?.amount || '0.00';
                            const shipping = order.totalShippingPriceV2?.amount || '0.00';
                            const discount = order.totalDiscountsV2?.amount || '0.00';
                            const total = order.totalPriceV2?.amount || '0.00';
                            const currency = order.totalPriceV2?.currencyCode || 'GBP';

                            const params = new URLSearchParams({
                              orderId: order.id,
                              orderNumber: order.orderNumber || order.name,
                              date: order.processedAt ? new Date(order.processedAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }),
                              subtotal,
                              tax,
                              shipping,
                              discount,
                              total,
                              currency,
                              items: JSON.stringify(items),
                              billTo: billToLines,
                            });
                            return `/api/downloads/invoice?${params.toString()}`;
                          })()}
                          download
                          className="primary-btn small"
                          style={{ marginLeft: "8px" }}
                        >
                          Invoice PDF
                        </a>
                      </div>
                    </div>

                    {expandedOrder === order.id && (
                      <div className="order-details">
                        <p>
                          <strong>Items in this order:</strong>
                        </p>
                        {order.lineItems && order.lineItems.edges.length > 0 ? (
                          order.lineItems.edges.map((itemEdge, idx: number) => (
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

      case "Billing Address": {
        // Use the first address for delivery
        const deliveryAddress = customer?.addresses?.edges?.[0]?.node;
        return (
          <AddressForm
            type="edit"
            address={deliveryAddress}
            onAddressUpdated={async () => {
              await mutateCustomer();
              refreshValidation(); // Refresh site-wide banner status
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
            onAddressUpdated={async () => {
              await mutateCustomer();
              refreshValidation(); // Refresh site-wide banner status
            }}
          />
        );
      }

      case "Profile":
        return (
          <ProfileForm customer={customer} refreshCustomer={() => mutateCustomer()} />
        );
        
      case "Security":
        return (
          <SecurityForm />
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

{/* VIP Membership and Watermarks buttons */}
    <div className="account-vip-cta">
      <Link href="/vip-membership" className="vip-membership-button">
        VIP Membership
      </Link>
      <a
        href="/api/downloads/watermarks"
        download
        className="vip-membership-button"
        style={{ marginLeft: "15px" }}
      >
        Download Watermarks
      </a>
    </div>
    
      <div className="tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${tab === activeTab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
            style={{
              borderColor: hasTabValidationErrors(tab) ? '#ff0000' : undefined,
              borderWidth: hasTabValidationErrors(tab) ? '2px' : undefined,
              color: hasTabValidationErrors(tab) ? '#ff0000' : undefined
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="tab-content">{renderTab()}</div>
    </main>
  );
}

function ProfileForm({ customer, refreshCustomer }: { customer: Customer; refreshCustomer: () => Promise<unknown> }) {
  
  // Safely get validation context - handle case where it might not be available
  let refreshValidation = () => {};
  try {
    const validationContext = useAccountValidationContext();
    refreshValidation = validationContext.refreshValidation;
  } catch (error) {
    console.warn('AccountValidationContext not available:', error);
  }
  const [firstName, setFirstName] = useState(customer?.firstName || "");
  const [lastName, setLastName] = useState(customer?.lastName || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [website, setWebsite] = useState(customer?.website || "");
  const [social, setSocial] = useState(customer?.social || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add a prop or callback to update parent customer state
  const [refreshing, setRefreshing] = useState(false);
  const updateCustomerState = (newCustomer: Customer) => {
    setFirstName(newCustomer?.firstName || "");
    setLastName(newCustomer?.lastName || "");
    setPhone(newCustomer?.phone || "");
    setWebsite(newCustomer?.website || "");
    setSocial(newCustomer?.social || "");
  };

  const validateMandatoryFields = () => {
    const errors: {[key: string]: boolean} = {};
    
    if (!firstName.trim()) errors.firstName = true;
    if (!lastName.trim()) errors.lastName = true;
    if (!customer?.email?.trim()) errors.email = true;
    if (!phone.trim()) errors.phone = true;
    
    // Website OR Social is required (at least one of them)
    if (!website.trim() && !social.trim()) {
      errors.website = true;
      errors.social = true;
    }
    
    return Object.keys(errors).length === 0;
  };

  // Helper function to check if a field should show red border (for real-time validation)
  const shouldShowFieldError = (field: string) => {
    switch (field) {
      case 'firstName':
        return !firstName.trim();
      case 'lastName':
        return !lastName.trim();
      case 'email':
        return !customer?.email?.trim();
      case 'phone':
        return !phone.trim();
      case 'website':
        // Show red only if both website AND social are empty
        return !website.trim() && !social.trim();
      case 'social':
        // Show red only if both website AND social are empty
        return !website.trim() && !social.trim();
      default:
        return false;
    }
  };

const fetchLatestCustomer = async () => {
  setRefreshing(true);
  try {
    const data = await refreshCustomer() as { customer?: Customer };
    if (data?.customer) {
      updateCustomerState(data.customer);
    }
  } finally {
    setRefreshing(false);
  }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Validate mandatory fields
    if (!validateMandatoryFields()) {
      setError("Please fill in all mandatory fields. For Website/Social Media, at least one is required.");
      return;
    }
    
    setLoading(true);
      try {
        const payload: Record<string, string> = { firstName, lastName, phone, website, social };
        const res = await fetch("/api/shopify/update-customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json() as { success?: boolean; error?: string };
        if (!res.ok || !data.success) {
          setError(data.error || "Failed to update profile");
        } else {
          setSuccess("Profile updated successfully.");
          // Re-fetch latest customer info
          await fetchLatestCustomer();
          refreshValidation(); // Refresh site-wide banner status
        }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="dashboard-form" onSubmit={handleSubmit}>
      <label>
        First Name *
        <input
          type="text"
          name="firstName"
          placeholder="First Name"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          style={{ 
            borderColor: shouldShowFieldError('firstName') ? '#ff0000' : undefined,
            borderWidth: shouldShowFieldError('firstName') ? '2px' : undefined 
          }}
        />
      </label>
      <label>
        Last Name *
        <input
          type="text"
          name="lastName"
          placeholder="Last Name"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          style={{ 
            borderColor: shouldShowFieldError('lastName') ? '#ff0000' : undefined,
            borderWidth: shouldShowFieldError('lastName') ? '2px' : undefined 
          }}
        />
      </label>
      <label>
        Email *
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={customer?.email || ""}
          readOnly
          style={{ 
            borderColor: shouldShowFieldError('email') ? '#ff0000' : undefined,
            borderWidth: shouldShowFieldError('email') ? '2px' : undefined 
          }}
        />
      </label>
      <label>
        Phone Number *
        <input
          type="tel"
          name="phone"
          placeholder="Phone Number"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          style={{ 
            borderColor: shouldShowFieldError('phone') ? '#ff0000' : undefined,
            borderWidth: shouldShowFieldError('phone') ? '2px' : undefined 
          }}
        />
      </label>
      <label>
        Website * (at least one required)
        <input
          type="url"
          name="website"
          placeholder="https://your-site.com"
          value={website}
          onChange={e => setWebsite(e.target.value)}
          style={{ 
            borderColor: shouldShowFieldError('website') ? '#ff0000' : undefined,
            borderWidth: shouldShowFieldError('website') ? '2px' : undefined 
          }}
        />
      </label>
      <label>
        Social Media * (at least one required)
        <input
          type="url"
          name="social"
          placeholder="https://instagram.com/yourhandle"
          value={social}
          onChange={e => setSocial(e.target.value)}
          style={{ 
            borderColor: shouldShowFieldError('social') ? '#ff0000' : undefined,
            borderWidth: shouldShowFieldError('social') ? '2px' : undefined 
          }}
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

function SecurityForm() {
  const { signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!password.trim()) {
      setError("Please enter a new password.");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    setLoading(true);
    try {
      const payload = { password };
      const res = await fetch("/api/shopify/update-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to update password");
      } else {
        setSuccess("Password updated successfully. Please sign in again.");
        // Clear password fields
        setPassword("");
        setConfirmPassword("");
        // Wait a moment for user to see the message
        setTimeout(async () => {
          signOut();
        }, 2000);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="dashboard-form" onSubmit={handleSubmit}>
      <h3>Change Password</h3>
      <label>
        New Password
        <input
          type="password"
          name="password"
          placeholder="Enter new password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </label>
      <label>
        Confirm New Password
        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
        />
      </label>
      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}
      {success && <div style={{ color: 'green', marginBottom: 10 }}>{success}</div>}
      <button type="submit" className="primary-btn" disabled={loading}>
        {loading ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}

function AddressForm({ type, address, onAddressUpdated }: {
  type: "edit";
  address: {
    id: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    provinceCode?: string;
    country?: string;
    zip?: string;
    phone?: string;
  } | undefined;
  onAddressUpdated: () => Promise<unknown>;
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

  const validateMandatoryAddressFields = () => {
    const errors: {[key: string]: boolean} = {};
    
    if (!form.firstName.trim()) errors.firstName = true;
    if (!form.lastName.trim()) errors.lastName = true;
    if (!form.address1.trim()) errors.address1 = true;
    if (!form.city.trim()) errors.city = true;
    if (!form.zip.trim()) errors.zip = true;
    if (!form.country.trim()) errors.country = true;
    if (!form.phone.trim()) errors.phone = true;
    
    return Object.keys(errors).length === 0;
  };

  // Helper function to check if a field should show red border (for real-time validation)
  const shouldShowAddressFieldError = (field: string) => {
    switch (field) {
      case 'firstName':
        return !form.firstName.trim();
      case 'lastName':
        return !form.lastName.trim();
      case 'address1':
        return !form.address1.trim();
      case 'city':
        return !form.city.trim();
      case 'zip':
        return !form.zip.trim();
      case 'country':
        return !form.country.trim();
      case 'phone':
        return !form.phone.trim();
      default:
        return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Validate mandatory fields
    if (!validateMandatoryAddressFields()) {
      setError("Please fill in all mandatory fields (highlighted in red).");
      return;
    }
    
    setLoading(true);
      try {
        const payload: Record<string, unknown> = {
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
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to update address");
      } else {
        setSuccess("Address updated successfully.");
        await onAddressUpdated();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="dashboard-form" onSubmit={handleSubmit}>
      <label>
        First Name *
        <input
          type="text"
          name="firstName"
          placeholder="First Name"
          value={form.firstName}
          onChange={handleChange}
          style={{ 
            borderColor: shouldShowAddressFieldError('firstName') ? '#ff0000' : undefined,
            borderWidth: shouldShowAddressFieldError('firstName') ? '2px' : undefined 
          }}
        />
      </label>
      <label>
        Last Name *
        <input
          type="text"
          name="lastName"
          placeholder="Last Name"
          value={form.lastName}
          onChange={handleChange}
          style={{ 
            borderColor: shouldShowAddressFieldError('lastName') ? '#ff0000' : undefined,
            borderWidth: shouldShowAddressFieldError('lastName') ? '2px' : undefined 
          }}
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
        Address Line 1 *
        <input
          type="text"
          name="address1"
          placeholder="Street address"
          value={form.address1}
          onChange={handleChange}
          style={{ 
            borderColor: shouldShowAddressFieldError('address1') ? '#ff0000' : undefined,
            borderWidth: shouldShowAddressFieldError('address1') ? '2px' : undefined 
          }}
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
        City *
        <input
          type="text"
          name="city"
          placeholder="City"
          value={form.city}
          onChange={handleChange}
          style={{ 
            borderColor: shouldShowAddressFieldError('city') ? '#ff0000' : undefined,
            borderWidth: shouldShowAddressFieldError('city') ? '2px' : undefined 
          }}
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
        Postcode *
        <input
          type="text"
          name="zip"
          placeholder="Postcode"
          value={form.zip}
          onChange={handleChange}
          style={{ 
            borderColor: shouldShowAddressFieldError('zip') ? '#ff0000' : undefined,
            borderWidth: shouldShowAddressFieldError('zip') ? '2px' : undefined 
          }}
        />
      </label>
      <label>
        Country *
        <input
          type="text"
          name="country"
          placeholder="Country"
          value={form.country}
          onChange={handleChange}
          style={{ 
            borderColor: shouldShowAddressFieldError('country') ? '#ff0000' : undefined,
            borderWidth: shouldShowAddressFieldError('country') ? '2px' : undefined 
          }}
        />
      </label>
      <label>
        Phone *
        <input
          type="tel"
          name="phone"
          placeholder="Phone"
          value={form.phone}
          onChange={handleChange}
          style={{ 
            borderColor: shouldShowAddressFieldError('phone') ? '#ff0000' : undefined,
            borderWidth: shouldShowAddressFieldError('phone') ? '2px' : undefined 
          }}
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
