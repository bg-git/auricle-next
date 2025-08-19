import { createContext, useContext, ReactNode } from 'react';
import { useAccountValidation } from '@/hooks/useAccountValidation';

interface AccountValidationContextType {
  isAccountComplete: boolean;
  isLoading: boolean;
  refreshValidation: () => void;
}

const AccountValidationContext = createContext<AccountValidationContextType | undefined>(undefined);

export function AccountValidationProvider({ children }: { children: ReactNode }) {
  const accountValidation = useAccountValidation();

  return (
    <AccountValidationContext.Provider value={accountValidation}>
      {children}
    </AccountValidationContext.Provider>
  );
}

export function useAccountValidationContext() {
  const context = useContext(AccountValidationContext);
  if (context === undefined) {
    throw new Error('useAccountValidationContext must be used within an AccountValidationProvider');
  }
  return context;
}