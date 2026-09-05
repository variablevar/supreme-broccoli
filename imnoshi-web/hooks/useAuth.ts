'use client';

import { useEffect, useState } from 'react';

interface SessionState {
  email: string;
  uid: string;
  totpEnrolled: boolean;
}

const EMPTY: SessionState = { email: '', uid: '', totpEnrolled: false };

/**
 * Client-side hook that mirrors the customer session by hitting
 * /api/auth/me. Replaces the previous Clerk-based useUser hook.
 */
export function useAuth() {
  const [state, setState] = useState<SessionState>(EMPTY);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (!res.ok) {
          if (!cancelled) {
            setIsLoaded(true);
            setIsSignedIn(false);
          }
          return;
        }
        const json = await res.json();
        if (!cancelled && json?.email) {
          setState({
            email: json.email,
            uid: json.uid ?? '',
            totpEnrolled: !!json.totpEnrolled,
          });
          setIsSignedIn(true);
          setIsLoaded(true);
        } else if (!cancelled) {
          setIsLoaded(true);
          setIsSignedIn(false);
        }
      } catch {
        if (!cancelled) {
          setIsLoaded(true);
          setIsSignedIn(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    isLoaded,
    isSignedIn,
    userId: state.uid,
    email: state.email,
    totpEnrolled: state.totpEnrolled,
  };
}