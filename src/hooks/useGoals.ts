import { useState, useEffect } from 'react';
import type { Goal } from '../types';

const STORAGE_KEY = 'osrs-goals';

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  }, [goals]);

  const addGoal = (goal: Omit<Goal, 'id' | 'createdAt'>) => {
    const newGoal: Goal = {
      ...goal,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    setGoals(prev => [...prev, newGoal]);
    return newGoal;
  };

  const removeGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const updateGoal = (id: string, patch: Partial<Goal>) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));
  };

  return { goals, addGoal, removeGoal, updateGoal };
}
