import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Seo from "@/components/Seo";

export default function AccountActivation() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { customerId: rawCustomerId, activationToken } = router.query as {
    customerId?: string;
    activationToken?: string;
  };

  // Convert numeric customer ID to base64-encoded GID
  const customerId = rawCustomerId
    ? typeof window !== "undefined"
      ? btoa(`gid://shopify/Customer/${rawCustomerId}`)
      : Buffer.from(`gid://shopify/Customer/${rawCustomerId}`).toString("base64")
    : null;

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    // If already authenticated, redirect to account page
    if (!authLoading && isAuthenticated) {
      router.push('/account');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    if (!customerId || !activationToken) {
      setStatus("error");
      setErrorMessage("Invalid activation link");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setStatus("error");
      setErrorMessage("Passwords do not match");
      return;
    }

    if (form.password.length < 6) {
      setStatus("error");
      setErrorMessage("Password must be at least 6 characters long");
      return;
    }

    try {
      const res = await fetch("/api/shopify/activate-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          customerId, 
          activationToken, 
          password: form.password 
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus("error");
        setErrorMessage(data.error || "Failed to activate account");
      } else {
        setStatus("success");
        
        // The API endpoint already sets the authentication cookie
        // Now sign in the user using the auth context to update the client state
        try {
          const signInResult = await signIn(data.customer.email, form.password);
          if (signInResult.success) {
            // Redirect to account page after successful activation and sign-in
            setTimeout(() => router.push("/account"), 2000);
          } else {
            // If sign-in fails, still redirect but show a message
            setErrorMessage("Account activated but automatic sign-in failed. Please sign in manually.");
            setTimeout(() => router.push("/sign-in"), 3000);
          }
        } catch {
          setErrorMessage("Account activated but automatic sign-in failed. Please sign in manually.");
          setTimeout(() => router.push("/sign-in"), 3000);
        }
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please try again.");
    }
  };

  if (!customerId || !activationToken) {
    return (
      <>
        <Seo
          title="Account Activation"
          description="Activate your AURICLE account."
        />
        <main className="reset-password-page">
          <div className="reset-password-container">
            <div className="reset-password-info">
              <h1>Invalid Activation Link</h1>
              <p>The activation link is invalid or has expired.</p>
              <button 
                className="primary-btn"
                onClick={() => router.push("/register")}
              >
                Create New Account
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Seo
        title="Account Activation"
        description="Activate your AURICLE account and set your password."
      />
      <main className="reset-password-page">
        <div className="reset-password-container">
          <div className="reset-password-info">
            <h1>Activate Your Account</h1>
            <p>Set your password to activate your AURICLE business account</p>
          </div>
          
          <form className="reset-password-form" onSubmit={handleSubmit}>
            <label>
              Password
              <input 
                name="password" 
                type="password" 
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange} 
                minLength={6} 
                required 
              />
            </label>
            <label>
              Confirm Password
              <input 
                name="confirmPassword" 
                type="password" 
                placeholder="Confirm your password"
                value={form.confirmPassword}
                onChange={handleChange} 
                minLength={6} 
                required 
              />
            </label>
            <button type="submit" disabled={status === "submitting"}>
              {status === "submitting" ? "Activating Account…" : "Activate Account"}
            </button>
          </form>

          {status === "error" && (
            <p style={{ color: "red", textAlign: "center", marginTop: "1rem" }}>
              {errorMessage}
            </p>
          )}
          {status === "success" && (
            <p style={{ color: "green", textAlign: "center", marginTop: "1rem" }}>
              Account activated successfully! Redirecting to your account...
            </p>
          )}
        </div>
      </main>
    </>
  );
}