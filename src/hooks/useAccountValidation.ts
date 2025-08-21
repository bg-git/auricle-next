import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface CustomerData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  website?: string;
  social?: string;
}

export const useAccountValidation = () => {
  const [isAccountComplete, setIsAccountComplete] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  // Safely get auth context - handle case where it might not be available
  let isAuthenticated = false;
  let user: any = null;
  
  try {
    const authContext = useAuth();
    isAuthenticated = authContext.isAuthenticated;
    user = authContext.user;
  } catch (error) {
    console.warn('AuthContext not available in useAccountValidation:', error);
  }

  const validateAccountCompleteness = (customer: any) => {
    if (!customer) return false;
    
    // Check mandatory account fields
    const hasFirstName = !!customer.firstName?.trim();
    const hasLastName = !!customer.lastName?.trim();
    const hasEmail = !!customer.email?.trim();
    const hasPhone = !!customer.phone?.trim();
    const hasWebsiteOrSocial = !!(customer.website?.trim() || customer.social?.trim());
    
    const accountFieldsComplete = hasFirstName && hasLastName && hasEmail && hasPhone && hasWebsiteOrSocial;
    
    // Check mandatory address fields
    const billingAddress = customer?.addresses?.edges?.[0]?.node;
    const shippingAddress = customer?.addresses?.edges?.[1]?.node;
    
    const isBillingComplete = billingAddress && 
      billingAddress.firstName?.trim() &&
      billingAddress.lastName?.trim() &&
      billingAddress.address1?.trim() &&
      billingAddress.city?.trim() &&
      billingAddress.zip?.trim() &&
      billingAddress.country?.trim() &&
      billingAddress.phone?.trim();
    
    const isShippingComplete = shippingAddress &&
      shippingAddress.firstName?.trim() &&
      shippingAddress.lastName?.trim() &&
      shippingAddress.address1?.trim() &&
      shippingAddress.city?.trim() &&
      shippingAddress.zip?.trim() &&
      shippingAddress.country?.trim() &&
      shippingAddress.phone?.trim();
    
    return accountFieldsComplete && isBillingComplete && isShippingComplete;
  };

  const checkAccountStatus = async () => {
    if (!isAuthenticated || !user?.id) {
      setIsAccountComplete(true); // Don't show banner for non-authenticated users
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/shopify/get-customer', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success && data.customer) {
        const isComplete = validateAccountCompleteness(data.customer);
        setIsAccountComplete(isComplete);
      } else {
        setIsAccountComplete(false);
      }
    } catch (error) {
      console.error('Error checking account status:', error);
      setIsAccountComplete(true); // Don't show banner on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAccountStatus();
  }, [isAuthenticated, user?.id]);

  const refreshValidation = () => {
    setIsLoading(true);
    checkAccountStatus();
  };

  return { isAccountComplete, isLoading, refreshValidation };
};