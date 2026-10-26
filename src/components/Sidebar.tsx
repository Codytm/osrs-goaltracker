import { useState } from 'react';
import './Sidebar.css';

type Tab = 'skills' | 'bosses' | 'progress' | 'goals';

const TABS: { id: Tab; label: string }[] = [
  { id: 'skills', label: '⚔ Skills' },
  { id: 'bosses', label: '☠ Bosses' },
  { id: 'progress', label: '📈 Progress' },
  { id: 'goals', label: '🎯 Goals' },
];

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onSearch: (username: string) => void;
  currentUsername: string;
  loading: boolean;
  lastUpdated: number | null;
}

export default function Sidebar({ activeTab, onTabChange, onSearch, currentUsername, loading, lastUpdated }: Props) {
  const [input, setInput] = useState(currentUsername);

  const handleSearch = () => {
    const name = input.trim();
    if (name) onSearch(name);
  };

  const timeAgo = lastUpdated
    ? (() => {
        const s = Math.floor((Date.now() - lastUpdated) / 1000);
        if (s < 60) return 'just now';
        if (s < 3600) return `${Math.floor(s / 60)}m ago`;
        return `${Math.floor(s / 3600)}h ago`;
      })()
    : null;

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <h1>OSRS Tracker</h1>
        <p className="sidebar__tagline">Goals for Gielinor</p>
      </div>

      <div className="sidebar__search">
        <label className="sidebar__search-label">Player name</label>
        <div className="sidebar__search-row">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="RSN..."
            disabled={loading}
            maxLength={12}
          />
          <button
            className="sidebar__search-btn"
            onClick={handleSearch}
            disabled={loading || !input.trim()}
          >
            {loading ? '…' : '→'}
          </button>
        </div>
        {timeAgo && <span className="sidebar__updated">Updated {timeAgo}</span>}
      </div>

      <nav className="sidebar__nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`sidebar__nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="sidebar__footer">
        <p>Stats via Wise Old Man</p>
        <p>Goals saved in your browser</p>
      </div>
    </aside>
  );
}
