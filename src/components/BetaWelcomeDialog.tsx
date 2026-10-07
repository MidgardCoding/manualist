import { PartyPopper, Sparkles } from 'lucide-react';
import { DISCORD_URL } from './TopBanner';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function BetaWelcomeDialog({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box max-w-md rounded-3xl border border-base-300 bg-base-100 shadow-2xl">
        <div className="flex flex-col items-center pt-2 text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
            <PartyPopper className="h-8 w-8 text-primary" aria-hidden />
          </span>
          <h3 className="mt-4 text-2xl font-extrabold tracking-tight">
            Welcome to the Manualist beta!
          </h3>
          <p className="mt-2 text-base opacity-75">
            Thank you for choosing to test the beta version of Manualist. You are
            one of our very first users — your feedback shapes what we build next.
          </p>
          <div className="mt-4 w-full space-y-2 rounded-2xl bg-base-200 p-4 text-left text-sm">
            <p className="inline-flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
              <span>Things may still be rough around the edges — that's what beta is for.</span>
            </p>
            <p className="inline-flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
              <span>
                When something fails or confuses you, let us know on{' '}
                <a
                  href={DISCORD_URL || '#'}
                  target={DISCORD_URL ? '_blank' : undefined}
                  rel={DISCORD_URL ? 'noopener noreferrer' : undefined}
                  className="link link-primary font-bold"
                  onClick={(e) => {
                    if (!DISCORD_URL) e.preventDefault();
                  }}
                  title={DISCORD_URL ? undefined : 'Invite link coming soon'}
                >
                  Discord
                </a>
                .
              </span>
            </p>
            <p className="inline-flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
              <span>You start with 10 free credits — saving a manual or sending a chat message costs 1.</span>
            </p>
          </div>
        </div>
        <div className="modal-action justify-center">
          <button
            className="btn btn-primary rounded-2xl px-8 font-bold text-amber-900"
            onClick={onClose}
          >
            Start exploring
          </button>
        </div>
      </div>
      <div className="modal-backdrop bg-black/30" onClick={onClose}></div>
    </div>
  );
}
