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

  const validateAccountCompleteness = (customer: CustomerData | null) => {
    if (!customer) return false;
    
    // Check mandatory fields
    const hasFirstName = !!customer.firstName?.trim();
    const hasLastName = !!customer.lastName?.trim();
    const hasEmail = !!customer.email?.trim();
    const hasPhone = !!customer.phone?.trim();
    const hasWebsiteOrSocial = !!(customer.website?.trim() || customer.social?.trim());
    
    return hasFirstName && hasLastName && hasEmail && hasPhone && hasWebsiteOrSocial;
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