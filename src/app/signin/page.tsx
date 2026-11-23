import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import Logo from "@/components/Logo";

function safeCallback(raw: string | undefined): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/setup";
}

function SignInCard({ target }: { target: string }) {
  return (
    <div className="w-full max-w-sm rounded-[10px] border border-line bg-panel p-8 text-center">
      <div className="flex justify-center">
        <Logo />
      </div>
      <p className="mt-5 text-[15px] text-neutral-600">Sign in to start practicing</p>
      <form
        className="mt-6"
        action={async () => {
          "use server";
          await signIn("github", { redirectTo: target });
        }}
      >
        <button type="submit" className="btn btn-primary h-12 w-full text-[15px]">
          Sign in with GitHub
        </button>
      </form>
      <Link
        href="/"
        className="mt-5 inline-block text-[13px] text-neutral-600 underline underline-offset-2 transition-colors hover:text-neutral-900"
      >
        Back to home
      </Link>
    </div>
  );
}

async function SignInGate({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  const target = safeCallback(callbackUrl);

  const session = await auth();
  if (session?.user) redirect(target);

  return <SignInCard target={target} />;
}

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-4 py-10">
      <Suspense fallback={<SignInCard target="/setup" />}>
        <SignInGate searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
