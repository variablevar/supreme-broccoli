export function hasRealClerkKeys() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
  const secretKey = process.env.CLERK_SECRET_KEY ?? '';

  return (
    publishableKey.startsWith('pk_') &&
    !publishableKey.includes('dummy') &&
    secretKey.startsWith('sk_') &&
    !secretKey.includes('dummy')
  );
}
