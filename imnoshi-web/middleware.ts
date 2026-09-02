import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/wallet(.*)', '/staking(.*)', '/rewards(.*)', '/withdrawals(.*)', '/transactions(.*)', '/settings(.*)']);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) auth().protect();
});

export const config = {
  matcher: ['/((?!_next|.*\\.\\w+).*)', '/', '/(api|trpc)(.*)'],
};
