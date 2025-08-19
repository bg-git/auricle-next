import Link from 'next/link';
import { useAccountValidationContext } from '@/context/AccountValidationContext';

export default function AccountCompletionBanner() {
  try {
    const { isAccountComplete, isLoading } = useAccountValidationContext();

  // Don't show banner if loading or account is complete
  if (isLoading || isAccountComplete) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: '#dc2626',
        color: 'white',
        padding: '12px 16px',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: '500',
        position: 'relative',
        zIndex: 1000,
      }}
    >
      <span>
        You must complete your account setup.{' '}
        <Link 
          href="/account" 
          style={{ 
            color: 'white', 
            textDecoration: 'underline',
            fontWeight: 'bold'
          }}
        >
          Complete setup here
        </Link>
      </span>
    </div>
  );
  } catch (error) {
    // Silently fail if context is not available - don't break the page
    console.warn('AccountCompletionBanner failed to render:', error);
    return null;
  }
}