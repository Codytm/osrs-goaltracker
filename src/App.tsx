import { useState, useCallback } from 'react';
import type { PlayerData } from './types';
import { fetchPlayer } from './services/osrsApi';
import { useGoals } from './hooks/useGoals';
import Sidebar from './components/Sidebar';
import SkillsGrid from './components/SkillsGrid';
import BossesPanel from './components/BossesPanel';
import GoalsPanel from './components/GoalsPanel';
import GoalModal from './components/GoalModal';
import './App.css';

type Tab = 'skills' | 'bosses' | 'goals';

export default function App() {
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('skills');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPrefillSkill, setModalPrefillSkill] = useState<string | undefined>();
  const [modalPrefillBoss, setModalPrefillBoss] = useState<string | undefined>();

  const { goals, addGoal, removeGoal } = useGoals();

  const handleSearch = useCallback(async (username: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPlayer(username);
      setPlayer(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch player data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const openModal = (skillName?: string, bossName?: string) => {
    setModalPrefillSkill(skillName);
    setModalPrefillBoss(bossName);
    setModalOpen(true);
  };

  return (
    <div className="app-layout">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSearch={handleSearch}
        currentUsername={player?.username ?? ''}
        loading={loading}
        lastUpdated={player?.fetchedAt ?? null}
      />

      <main className="app-main">
        {error && (
          <div className="app-error">
            <strong>Could not load player data</strong>
            <pre className="app-error__detail">{error}</pre>
          </div>
        )}

        {loading && (
          <div className="app-loading">
            <div className="app-loading__spinner" />
            <p>Fetching hiscores…</p>
          </div>
        )}

        {!player && !loading && !error && (
          <div className="app-empty">
            <div className="app-empty__rune">⚔</div>
            <h2>Welcome to OSRS Tracker</h2>
            <p>Enter your RSN in the sidebar to load your stats and start setting goals.</p>
          </div>
        )}

        {player && !loading && (
          <div className="app-content">
            <div className="app-content__username">
              <h2>{player.username}</h2>
              <button
                className="app-refresh"
                onClick={() => handleSearch(player.username)}
                title="Refresh stats"
              >
                ↻ Refresh
              </button>
            </div>

            {activeTab === 'skills' && (
              <SkillsGrid
                player={player}
                goals={goals}
                onAddGoal={(skillName) => openModal(skillName)}
              />
            )}

            {activeTab === 'bosses' && (
              <BossesPanel
                player={player}
                goals={goals}
                onAddGoal={(bossName) => openModal(undefined, bossName)}
              />
            )}

            {activeTab === 'goals' && (
              <GoalsPanel
                goals={goals}
                player={player}
                onRemove={removeGoal}
                onAddGoal={() => openModal()}
              />
            )}
          </div>
        )}
      </main>

      {modalOpen && player && (
        <GoalModal
          player={player}
          prefillSkill={modalPrefillSkill}
          prefillBoss={modalPrefillBoss}
          onAdd={addGoal}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
