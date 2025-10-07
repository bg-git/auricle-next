import Link from 'next/link';
import { useAccountValidationContext } from '@/context/AccountValidationContext';
import { useAuth } from '@/context/AuthContext';

export default function AccountCompletionBanner() {
  // ❗ Call hooks unconditionally at the top level
  const { isAccountComplete, isLoading } = useAccountValidationContext();
  const { isApproved, authReady } = useAuth();

  // Only show to wholesale users, and only after auth is hydrated
  if (!authReady) return null;
  if (!isApproved) return null;

  // Don’t show if still loading or already complete
  if (isLoading || isAccountComplete) return null;

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
        Complete your trade account setup.{' '}
        <Link
          href="/account"
          style={{
            color: 'white',
            textDecoration: 'underline',
            fontWeight: 'bold',
          }}
        >
          Click Here
        </Link>
      </span>
    </div>
  );
}
