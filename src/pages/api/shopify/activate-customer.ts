import type { NextApiRequest, NextApiResponse } from "next";
import { setCustomerCookie } from "@/lib/cookies";

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;
const STOREFRONT_URL = `https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { customerId, activationToken, password } = req.body;
  if (!customerId || !activationToken || !password) {
    return res.status(400).json({
      success: false,
      error: "customerId, activationToken, and password are required",
    });
  }

  const mutation = `
    mutation customerActivate($id: ID!, $input: CustomerActivateInput!) {
      customerActivate(id: $id, input: $input) {
        customer { 
          id 
          email 
          firstName
          lastName
        }
        customerAccessToken { 
          accessToken 
          expiresAt 
        }
        customerUserErrors { 
          field 
          message 
        }
      }
    }
  `;

  try {
    const response = await fetch(STOREFRONT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
      },
      body: JSON.stringify({
        query: mutation,
        variables: { 
          id: customerId, 
          input: { 
            activationToken, 
            password 
          } 
        },
      }),
    });

    const result = await response.json();
    
    if (result.errors) {
      return res.status(400).json({ 
        success: false, 
        error: result.errors[0].message 
      });
    }

    const userErrors = result.data?.customerActivate?.customerUserErrors;
    if (userErrors?.length) {
      return res
        .status(400)
        .json({ success: false, error: userErrors[0].message });
    }

    const customer = result.data?.customerActivate?.customer;
    const accessToken = result.data?.customerActivate?.customerAccessToken;
    
    if (!customer || !accessToken) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid customer activation data" });
    }

    // Set the authentication cookie
    setCustomerCookie(res, accessToken.accessToken);

    return res.status(200).json({
      success: true,
      customer,
      accessToken,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ success: false, error: message });
  }
}