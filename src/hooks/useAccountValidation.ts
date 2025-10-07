import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

interface CustomerData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  website?: string;
  social?: string;
}

interface Address {
  firstName?: string;
  lastName?: string;
  address1?: string;
  city?: string;
  zip?: string;
  country?: string;
  phone?: string;
}

interface Edge<T> {
  node?: T;
}

interface Customer extends CustomerData {
  id?: string;
  addresses?: {
    edges?: Array<Edge<Address>>;
  };
}

interface GetCustomerResponse {
  success: boolean;
  customer?: Customer;
}

interface AuthUser {
  id?: string;
}

export const useAccountValidation = () => {
  const [isAccountComplete, setIsAccountComplete] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // If your AuthContext can only be used within a provider, this will be safe.
  // If it can throw, you can wrap in try/catch again—but ESLint is happy either way.
  const { isAuthenticated, user } = useAuth() as {
    isAuthenticated: boolean;
    user: AuthUser | null;
  };

  const validateAccountCompleteness = (customer: Customer | undefined | null): boolean => {
    if (!customer) return false;

    const hasFirstName = !!customer.firstName?.trim();
    const hasLastName = !!customer.lastName?.trim();
    const hasEmail = !!customer.email?.trim();
    const hasPhone = !!customer.phone?.trim();
    const hasWebsiteOrSocial = !!(customer.website?.trim() || customer.social?.trim());

    const accountFieldsComplete =
      hasFirstName && hasLastName && hasEmail && hasPhone && hasWebsiteOrSocial;

    const billingAddress = customer.addresses?.edges?.[0]?.node;
    const shippingAddress = customer.addresses?.edges?.[1]?.node;

    const isAddressComplete = (addr?: Address): boolean =>
      !!(
        addr &&
        addr.firstName?.trim() &&
        addr.lastName?.trim() &&
        addr.address1?.trim() &&
        addr.city?.trim() &&
        addr.zip?.trim() &&
        addr.country?.trim() &&
        addr.phone?.trim()
      );

    const isBillingComplete = isAddressComplete(billingAddress);
    const isShippingComplete = isAddressComplete(shippingAddress);

    return accountFieldsComplete && isBillingComplete && isShippingComplete;
  };

  const checkAccountStatus = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      // Don't show banner for non-authenticated users
      setIsAccountComplete(true);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/shopify/get-customer', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      const data: GetCustomerResponse = await response.json();

      if (data.success && data.customer) {
        const isComplete = validateAccountCompleteness(data.customer);
        setIsAccountComplete(isComplete);
      } else {
        setIsAccountComplete(false);
      }
    } catch (error) {
      console.error('Error checking account status:', error);
      // Fail safe: don't nag the user on transient errors
      setIsAccountComplete(true);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    void checkAccountStatus();
  }, [checkAccountStatus]);

  const refreshValidation = () => {
    setIsLoading(true);
    void checkAccountStatus();
  };

  return { isAccountComplete, isLoading, refreshValidation };
};
