import { useEffect, useState } from 'react';
import { BookOpen, Plus, Sparkles } from 'lucide-react';
import useManuals from '../hooks/useManuals';
import ManualTile from '../components/ManualTile';
import NewManualWizard from '../components/NewManualWizard';
import BetaWelcomeDialog from '../components/BetaWelcomeDialog';
import { getActiveUser } from '../utils/supabase';
import { useAppStore } from '../store';
import useCredits from '../hooks/useCredits';
import type { Manual } from '../hooks/useManuals';

export default function ArchivePage() {
  const { manuals, loading, fetchManuals } = useManuals();
  const { loadManual } = useAppStore();
  const { credits } = useCredits();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [lowCreditsOpen, setLowCreditsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await getActiveUser();
        const key = user
          ? `manualist-beta-welcome-seen-${user.id}`
          : 'manualist-beta-welcome-seen';
        if (cancelled) return;
        if (!localStorage.getItem(key)) setWelcomeOpen(true);
      } catch {
        if (!cancelled) setWelcomeOpen(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const closeWelcome = () => {
    setWelcomeOpen(false);
    getActiveUser().then((user) => {
      const key = user
        ? `manualist-beta-welcome-seen-${user.id}`
        : 'manualist-beta-welcome-seen';
      try {
        localStorage.setItem(key, '1');
      } catch {}
    }).catch(() => {});
  };

  const handleNewManual = () => {
    if (credits !== null && credits <= 0) {
      setLowCreditsOpen(true);
    } else {
      setWizardOpen(true);
    }
  };

  const handleCheck = (manual: Manual) => {
    loadManual({
      id: manual.id,
      extracted_text: manual.extracted_text,
      api_response: manual.api_response,
      todo_response: manual.todo_response,
      input_mode: manual.input_mode as any,
    });
  };

  return (
    <div className="w-full flex flex-col items-center px-4 sm:px-6 pt-8 pb-16">
      <div className="w-full max-w-[80%]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 mb-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-base-100 border border-base-300 px-4 py-2 text-base shadow-sm">
              <Sparkles className="w-5 h-5 text-warning" aria-hidden />
              <span>Your home base for every manual</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">My manuals</h1>
            <p className="text-xl opacity-80 max-w-xl">Everything you save lives here. Pick one up anytime and keep chatting with your helper.</p>
          </div>
          <button className="btn btn-primary btn-lg rounded-2xl text-amber-900 font-bold shadow-lg shrink-0" onClick={handleNewManual}>
            <Plus className="w-6 h-6" /> New manual
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg text-warning"></span>
          </div>
        ) : manuals.length === 0 ? (
          <div className="card bg-base-100 border border-base-300 shadow-xl rounded-3xl p-10 text-center">
            <span className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/15">
              <BookOpen className="w-10 h-10 text-primary" aria-hidden />
            </span>
            <p className="text-2xl font-extrabold mt-4">No manuals yet — let's fix that</p>
            <p className="text-lg opacity-75 mt-2 max-w-md mx-auto">Hit “New manual”, add a title, then upload photos, a PDF, or pasted text. Your helper takes it from there.</p>
            <button className="btn btn-primary btn-lg rounded-2xl text-amber-900 font-bold shadow-lg mt-6 mx-auto" onClick={handleNewManual}>Create my first manual</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {manuals.map(m => (
              <ManualTile key={m.id} manual={m} onCheck={handleCheck} onRefresh={fetchManuals} />
            ))}
          </div>
        )}
      </div>

      <NewManualWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onCreated={fetchManuals} />
      <BetaWelcomeDialog open={welcomeOpen} onClose={closeWelcome} />
      {lowCreditsOpen && (
        <div className="modal modal-open z-50">
          <div className="modal-box max-w-sm bg-base-100 border border-base-300 shadow-2xl rounded-3xl text-center">
            <h3 className="font-extrabold text-xl mb-2">Out of credits</h3>
            <p className="text-sm opacity-70 mb-4">You need at least 1 credit to create a manual. Buy more credits to continue.</p>
            <div className="modal-action justify-center">
              <button className="btn btn-ghost rounded-full" onClick={() => setLowCreditsOpen(false)}>Cancel</button>
              <a href="/pricing" className="btn btn-primary rounded-2xl text-amber-900 font-bold">Buy credits</a>
            </div>
          </div>
          <div className="modal-backdrop bg-black/30" onClick={() => setLowCreditsOpen(false)}></div>
        </div>
      )}
    </div>
  );
}
