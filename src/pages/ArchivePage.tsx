import { useState } from 'react';
import useManuals from '../hooks/useManuals';
import ManualTile from '../components/ManualTile';
import NewManualWizard from '../components/NewManualWizard';
import { useAppStore } from '../store';
import type { Manual } from '../hooks/useManuals';

export default function ArchivePage() {
  const { manuals, loading, fetchManuals } = useManuals();
  const { loadManual } = useAppStore();
  const [wizardOpen, setWizardOpen] = useState(false);

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
    <div className="min-h-dvh w-full flex flex-col items-center p-6 pt-18">
      <div className="w-full max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-extrabold">User Archive</h1>
            <p className="text-sm opacity-60 mt-1">Your saved manuals – access them anytime you log in.</p>
          </div>
          <button className="btn btn-warning shadow-lg" onClick={() => setWizardOpen(true)}>
            + New Manual
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg text-warning"></span>
          </div>
        ) : manuals.length === 0 ? (
          <div className="card bg-base-200 border border-base-300 p-10 text-center">
            <p className="text-lg font-semibold mb-2">No manuals yet</p>
            <p className="text-sm opacity-60 mb-6">Click "New Manual" to create your first one. You'll enter title and description, then choose how to analyse the manual.</p>
            <button className="btn btn-warning mx-auto" onClick={() => setWizardOpen(true)}>Create Manual</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {manuals.map(m => (
              <ManualTile key={m.id} manual={m} onCheck={handleCheck} onRefresh={fetchManuals} />
            ))}
          </div>
        )}
      </div>

      <NewManualWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onCreated={fetchManuals} />
    </div>
  );
}
