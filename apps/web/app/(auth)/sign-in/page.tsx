import { SignInForm } from "./sign-in-form";

export const metadata = {
  title: "Sign in — Influuc",
};

/**
 * Sign-in / sign-up page.
 * Server Component so we can read searchParams safely in Next.js 15.
 * Passes resolved values to the Client Component form to avoid useSearchParams + Suspense.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return <SignInForm initialError={error} next={next} />;
}
