"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CheckoutButton({ id, status }: { id: string; status: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  if (status === "checked_out") return null;
  return (
    <button
      className="btn-ghost"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Check out this guest?")) return;
        setBusy(true);
        await fetch(`/api/stays/${id}/checkout`, { method: "POST" });
        setBusy(false);
        router.refresh();
      }}
    >
      {busy ? "…" : "Check out"}
    </button>
  );
}
