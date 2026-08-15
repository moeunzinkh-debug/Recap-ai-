"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

interface DeleteRecapButtonProps {
  id: string;
  title?: string;
  /** When set, navigate here after a successful delete (e.g. from a detail page). */
  redirectTo?: string;
  className?: string;
}

export default function DeleteRecapButton({
  id,
  title,
  redirectTo,
  className = "",
}: DeleteRecapButtonProps) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const remove = async () => {
    const label = title ? `“${title}”` : "ស្គ្រីបនេះ";
    if (!window.confirm(`តើអ្នកពិតជាចង់លុប ${label} មែនទេ?`)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/recaps/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "បរាជ័យក្នុងការលុបស្គ្រីប។");
      }
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "បរាជ័យក្នុងការលុបស្គ្រីប។");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={remove}
      disabled={deleting}
      aria-label="លុបស្គ្រីប"
      className={`inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-300 ring-1 ring-red-500/30 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {deleting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
      លុប
    </button>
  );
}
