import localforage from 'localforage';
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Card, Project, Tag, PromptProject, DeletedHeaderBlock } from './types';

const DEFAULT_TAGS: Tag[] = [
  { id: '1', name: 'Fantasy', color: 'bg-red-500' },
  { id: '2', name: 'Sci-Fi', color: 'bg-accent' },
  { id: '3', name: 'Modern', color: 'bg-green-500' },
  { id: '4', name: 'Historical', color: 'bg-yellow-500' },
  { id: '5', name: 'Horror', color: 'bg-purple-500' },
  { id: '6', name: 'Romance', color: 'bg-pink-500' },
  { id: '7', name: 'Action', color: 'bg-orange-500' },
  { id: '8', name: 'Mystery', color: 'bg-teal-500' },
  { id: '9', name: 'Slice of Life', color: 'bg-indigo-500' },
  { id: '10', name: 'Magic', color: 'bg-violet-500' },
  { id: '11', name: 'Cyberpunk', color: 'bg-cyan-500' },
  { id: '12', name: 'Steampunk', color: 'bg-amber-500' },
  { id: '13', name: 'Post-Apocalyptic', color: 'bg-stone-500' },
  { id: '14', name: 'Superhero', color: 'bg-rose-500' },
  { id: '15', name: 'Supernatural', color: 'bg-fuchsia-500' },
  { id: '16', name: 'Mythology', color: 'bg-emerald-500' },
  { id: '17', name: 'Space Opera', color: 'bg-sky-500' },
  { id: '18', name: 'Urban Fantasy', color: 'bg-lime-500' },
  { id: '19', name: 'Dystopian', color: 'bg-zinc-500' },
  { id: '20', name: 'Isekai', color: 'bg-slate-500' },
];

interface AppStateData {
  cards: Card[];
  projects: Project[];
  promptProjects: PromptProject[];
  tags: Tag[];
  deletedHeaderBlocks: DeletedHeaderBlock[];
  theme: string;
}

interface AppState extends AppStateData {
  addCard: (card: Card) => Promise<void>;
  updateCard: (card: Card) => Promise<void>;
  updateCards: (cards: Card[]) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  addProject: (project: Project) => Promise<void>;
  updateProject: (project: Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addPromptProject: (project: PromptProject) => Promise<void>;
  updatePromptProject: (project: PromptProject) => Promise<void>;
  deletePromptProject: (id: string) => Promise<void>;
  addTag: (tag: Tag) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  addDeletedHeaderBlock: (block: DeletedHeaderBlock) => Promise<void>;
  updateDeletedHeaderBlocks: (blocks: DeletedHeaderBlock[]) => Promise<void>;
  setTheme: (theme: string) => Promise<void>;
  /** Replace the entire state from an external source (e.g. cloud restore) */
  replaceState: (newState: AppStateData) => void;
  /** Monotonically increasing counter that bumps on every state mutation */
  stateVersion: number;
  loading: boolean;
}

const StoreContext = createContext<AppState | undefined>(undefined);

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const saveToStorage = (state: AppStateData) => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(async () => {
    await localforage.setItem('appState', state);
  }, 500);
};

const loadFromStorage = async (): Promise<AppStateData | null> => {
  return await localforage.getItem<AppStateData>('appState');
};

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppStateData>({
    cards: [],
    projects: [],
    promptProjects: [],
    tags: DEFAULT_TAGS,
    deletedHeaderBlocks: [],
    theme: 'dark'
  });
  const [loading, setLoading] = useState(true);
  const [stateVersion, setStateVersion] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      const storedState = await loadFromStorage();
      if (storedState) {
        const now = Date.now();
        const ninetyDays = 90 * 24 * 60 * 60 * 1000;

        const validCards = (storedState.cards || []).filter(c => !c.deletedAt || (now - c.deletedAt) < ninetyDays);
        const validPromptProjects = (storedState.promptProjects || []).filter(p => !p.deletedAt || (now - p.deletedAt) < ninetyDays);
        const validDeletedHeaderBlocks = (storedState.deletedHeaderBlocks || []).filter(b => !b.deletedAt || (now - b.deletedAt) < ninetyDays);

        setState({
          cards: validCards,
          projects: storedState.projects || [],
          promptProjects: validPromptProjects,
          tags: storedState.tags || DEFAULT_TAGS,
          deletedHeaderBlocks: validDeletedHeaderBlocks,
          theme: storedState.theme || 'dark'
        });
      } else {
        // Migration from old format if appState doesn't exist
        try {
          const keys = await localforage.keys();
          const oldCards: Card[] = [];
          const oldPromptProjects: PromptProject[] = [];
          const oldDeletedBlocks: DeletedHeaderBlock[] = [];
          
          for (const key of keys) {
            if (key.startsWith('card_')) {
              const item = await localforage.getItem<Card>(key);
              if (item) oldCards.push(item);
            } else if (key.startsWith('promptProject_')) {
              const item = await localforage.getItem<PromptProject>(key);
              if (item) oldPromptProjects.push(item);
            } else if (key.startsWith('deletedHeaderBlock_')) {
              const item = await localforage.getItem<DeletedHeaderBlock>(key);
              if (item) oldDeletedBlocks.push(item);
            }
          }
          
          const oldProjects = await localforage.getItem<Project[]>('projects') || [];
          const oldTags = await localforage.getItem<Tag[]>('tags') || DEFAULT_TAGS;

          const migratedState = {
            cards: oldCards,
            projects: oldProjects,
            promptProjects: oldPromptProjects,
            tags: oldTags,
            deletedHeaderBlocks: oldDeletedBlocks,
            theme: 'dark'
          };
          
          setState(migratedState);
          await saveToStorage(migratedState);
        } catch (e) {
          console.error('Migration failed', e);
        }
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const updateState = async (updater: (prev: AppStateData) => AppStateData) => {
    setState(prev => {
      const next = updater(prev);
      saveToStorage(next);
      return next;
    });
    setStateVersion(v => v + 1);
  };

  /**
   * Replace the entire in-memory state from an external source (e.g. cloud
   * restore). This does NOT write to localforage because the caller
   * (useCloudSync.pullFromCloud) already persisted the merged data.
   */
  const replaceState = useCallback((newState: AppStateData) => {
    setState({
      cards: newState.cards || [],
      projects: newState.projects || [],
      promptProjects: newState.promptProjects || [],
      tags: newState.tags?.length ? newState.tags : DEFAULT_TAGS,
      deletedHeaderBlocks: newState.deletedHeaderBlocks || [],
      theme: newState.theme || 'dark',
    });
    // Do NOT bump stateVersion here – this is an external replace, not a
    // user-initiated mutation, so it should not trigger auto-backup.
  }, []);

  const addCard = async (card: Card) => {
    await updateState(prev => {
      if (prev.cards.some(c => c.id === card.id)) {
        return { ...prev, cards: prev.cards.map(c => c.id === card.id ? card : c) };
      }
      return { ...prev, cards: [...prev.cards, card] };
    });
  };

  const updateCard = async (card: Card) => {
    await updateState(prev => ({ ...prev, cards: prev.cards.map(c => c.id === card.id ? card : c) }));
  };

  const updateCards = async (updatedCards: Card[]) => {
    await updateState(prev => {
      const updatedMap = new Map(updatedCards.map(c => [c.id, c]));
      return { ...prev, cards: prev.cards.map(c => updatedMap.has(c.id) ? updatedMap.get(c.id)! : c) };
    });
  };

  const deleteCard = async (id: string) => {
    await updateState(prev => ({ ...prev, cards: prev.cards.filter(c => c.id !== id) }));
  };

  const addProject = async (project: Project) => {
    await updateState(prev => {
      if (prev.projects.some(p => p.id === project.id)) {
        return { ...prev, projects: prev.projects.map(p => p.id === project.id ? project : p) };
      }
      return { ...prev, projects: [...prev.projects, project] };
    });
  };

  const updateProject = async (project: Project) => {
    await updateState(prev => ({ ...prev, projects: prev.projects.map(p => p.id === project.id ? project : p) }));
  };

  const deleteProject = async (id: string) => {
    await updateState(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id) }));
  };

  const addPromptProject = async (project: PromptProject) => {
    await updateState(prev => {
      if (prev.promptProjects.some(p => p.id === project.id)) {
        return { ...prev, promptProjects: prev.promptProjects.map(p => p.id === project.id ? project : p) };
      }
      return { ...prev, promptProjects: [...prev.promptProjects, project] };
    });
  };

  const updatePromptProject = async (project: PromptProject) => {
    await updateState(prev => ({ ...prev, promptProjects: prev.promptProjects.map(p => p.id === project.id ? project : p) }));
  };

  const deletePromptProject = async (id: string) => {
    await updateState(prev => ({ ...prev, promptProjects: prev.promptProjects.filter(p => p.id !== id) }));
  };

  const addTag = async (tag: Tag) => {
    await updateState(prev => {
      if (prev.tags.some(t => t.id === tag.id)) {
        return { ...prev, tags: prev.tags.map(t => t.id === tag.id ? tag : t) };
      }
      return { ...prev, tags: [...prev.tags, tag] };
    });
  };

  const deleteTag = async (id: string) => {
    await updateState(prev => {
      const newTags = prev.tags.filter(t => t.id !== id);
      const newCards = prev.cards.map(c => ({
        ...c,
        tags: c.tags ? c.tags.filter(t => t !== id) : [],
        mainTag: c.mainTag === id ? undefined : c.mainTag
      }));
      return { ...prev, tags: newTags, cards: newCards };
    });
  };

  const addDeletedHeaderBlock = async (block: DeletedHeaderBlock) => {
    await updateState(prev => {
      if (prev.deletedHeaderBlocks.some(b => b.id === block.id)) {
        return { ...prev, deletedHeaderBlocks: prev.deletedHeaderBlocks.map(b => b.id === block.id ? block : b) };
      }
      return { ...prev, deletedHeaderBlocks: [...prev.deletedHeaderBlocks, block] };
    });
  };

  const updateDeletedHeaderBlocks = async (blocks: DeletedHeaderBlock[]) => {
    await updateState(prev => ({ ...prev, deletedHeaderBlocks: blocks }));
  };

  const setTheme = async (theme: string) => {
    await updateState(prev => ({ ...prev, theme }));
  };

  return (
    <StoreContext.Provider value={{ 
      ...state,
      addCard, updateCard, updateCards, deleteCard, 
      addProject, updateProject, deleteProject, 
      addPromptProject, updatePromptProject, deletePromptProject,
      addTag, deleteTag, addDeletedHeaderBlock, updateDeletedHeaderBlocks, setTheme,
      replaceState, stateVersion, loading 
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
};
