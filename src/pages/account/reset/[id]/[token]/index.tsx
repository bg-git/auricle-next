import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import Seo from "@/components/Seo";

export default function ResetPassword() {
  const router = useRouter();
  const { id: rawId, token: resetToken } = router.query as {
    id?: string;
    token?: string;
  };

  // Convert numeric ID to base64-encoded GID
  const customerId = rawId
    ? typeof window !== "undefined"
      ? btoa(`gid://shopify/Customer/${rawId}`)
      : Buffer.from(`gid://shopify/Customer/${rawId}`).toString("base64")
    : null;

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // No scroll or fetch needed; just ensure query params are present
  }, [customerId, resetToken]);

//   if (!customerId || !resetToken) {
//     return (
//       <div>
//         <p>Invalid reset link.</p>
//         <button onClick={() => router.push("/sign-in")}>Back to Sign In</button>
//       </div>
//     );
//   }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

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
      const res = await fetch("/api/shopify/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, resetToken, password: form.password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus("error");
        setErrorMessage(data.error || "Failed to reset password");
      } else {
        setStatus("success");
        setTimeout(() => router.push("/sign-in"), 1000);
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please try again.");
    }
  };

  return (
    <>
      <Seo
        title="Reset Password"
        description="Choose a new password for your AURICLE account."
      />
      <main className="reset-password-page">
      <div className="reset-password-container">
      <div className="reset-password-info">
          <h1>Reset Password</h1>
          <p>Reset access your business ccount</p>
        </div>
      <form className="reset-password-form"  onSubmit={handleSubmit}>
        <label>
          New Password
          <input name="password" type="password" onChange={handleChange} minLength={6} required />
        </label>
        <label>
          Confirm New Password
          <input name="confirmPassword" type="password" onChange={handleChange} minLength={6} required />
        </label>
        <button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Resetting…" : "Reset Password"}
        </button>
      </form>

      {status === "error" && <p style={{ color: "red" }}>{errorMessage}</p>}
      {status === "success" && <p>Password reset! Redirecting…</p>}
      </div>
    </main>
    </>
  );
}
