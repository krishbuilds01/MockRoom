"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function AuthButton() {
  const { data: session } = useSession();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/auth/providers")
      .then((res) => (res.ok ? res.json() : {}))
      .then((providers) => {
        if (live && !(providers && typeof providers === "object" && "github" in providers)) {
          setHidden(true);
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (hidden) return null;

  if (session?.user) {
    return (
      <span className="flex items-center gap-3">
        <span className="hidden items-center gap-2 md:flex">
          {session.user.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt="" width={28} height={28} className="rounded-full" />
          )}
          <span className="max-w-32 truncate text-sm text-neutral-700">{session.user.name ?? session.user.email}</span>
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void signOut()}>
          Sign out
        </button>
      </span>
    );
  }

  return (
    <button type="button" className="btn btn-secondary btn-sm" onClick={() => void signIn("github")}>
      Sign in with GitHub
    </button>
  );
}
