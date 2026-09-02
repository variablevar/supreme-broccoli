import { useUser } from '@clerk/nextjs';

export function useAuth() {
  const { isLoaded, isSignedIn, user } = useUser();
  return {
    isLoaded,
    isSignedIn,
    userId: user?.id,
    email: user?.primaryEmailAddress?.emailAddress,
  };
}
