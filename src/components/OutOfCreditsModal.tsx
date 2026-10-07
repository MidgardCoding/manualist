import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export const OUT_OF_CREDITS_EVENT = 'manualist-out-of-credits';

export function notifyOutOfCredits(credits?: number | null) {
  window.dispatchEvent(
    new CustomEvent<number | null | undefined>(OUT_OF_CREDITS_EVENT, { detail: credits ?? null }),
  );
}

export default function OutOfCreditsModal() {
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const onOut = (e: Event) => {
      const detail = (e as CustomEvent<number | null | undefined>).detail;
      if (typeof detail === 'number') setBalance(detail);
      setOpen(true);
    };
    window.addEventListener(OUT_OF_CREDITS_EVENT, onOut as EventListener);
    return () => window.removeEventListener(OUT_OF_CREDITS_EVENT, onOut as EventListener);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="out-of-credits-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="out-of-credits-title"
      onClick={close}
    >
      <div
        className="out-of-credits-sway relative overflow-hidden card bg-base-100 border border-warning/40 shadow-2xl rounded-3xl max-w-sm w-full p-6 sm:p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <span aria-hidden className="out-of-credits-shine pointer-events-none absolute inset-y-0 left-0 w-1/2" />
        <button
          aria-label="Close out of credits dialog"
          onClick={close}
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        >
          ✕
        </button>
        <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-warning/20 text-3xl" aria-hidden>
          🪙
        </div>
        <h2 id="out-of-credits-title" className="text-2xl font-extrabold tracking-tight">
          You&apos;re out of credits
        </h2>
        <p className="mt-2 opacity-75">
          No available balance{balance !== null ? ` (${balance} credits)` : ''} — each saved manual
          and each chat message costs <b>1 credit</b>. Top up to keep going.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            to="/pricing"
            onClick={close}
            className="btn btn-primary rounded-2xl text-amber-900 font-bold"
          >
            See plans &amp; top up
          </Link>
          <button onClick={close} className="btn btn-ghost rounded-2xl">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
