import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Menu, X, Home, Folder, Plus, BarChart3, BookOpen, Trash2, ChevronRight, ArrowLeft, Sun, Moon, MoonStar, Palette } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useStore } from '../store';
import { generateId } from '../utils';
import { useSwipeable } from 'react-swipeable';
import AccountMenu from './AccountMenu';
import { useScrollDirection } from '../hooks/useScrollDirection';

const THEMES = [
  { id: 'light', name: 'Light', icon: Sun, colors: ['#FFFFFF', '#3B82F6', '#E5E5E5'] },
  { id: 'dark', name: 'Dark', icon: Moon, colors: ['#121318', '#3B82F6', '#2D2E36'] },
  { id: 'amoled', name: 'AMOLED', icon: MoonStar, colors: ['#000000', '#3B82F6', '#1A1A1A'] },
  { id: 'midnight-peach', name: 'Midnight Peach', icon: Palette, colors: ['#0D0D0D', '#F4A261', '#1A1A1E'] },
  { id: 'liquid-glass', name: 'Liquid Glass', icon: Palette, colors: ['#E8E4DF', '#7C5CFC', '#2DD4BF'] },
  { id: 'royal-purple', name: 'Royal Purple', icon: Palette, colors: ['#F0F0F5', '#6C5CE7', '#7B68EE'] },
  { id: 'starry-night', name: 'Starry Night', icon: Palette, colors: ['#0F0A2E', '#B8A9E8', '#C9A0DC'] },
];

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/stats', label: 'Stats', icon: BarChart3 },
  { path: '/prompts', label: 'Prompts', icon: BookOpen },
  { path: '/projects', label: 'Gallery', icon: Folder },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const { projects, cards, promptProjects, addProject, theme, setTheme } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { barsVisible } = useScrollDirection(5);
  const barsHidden = !barsVisible;

  const handlers = useSwipeable({
    onSwipedRight: (e) => {
      if (e.initial[0] <= 20) {
        setSidebarOpen(true);
      }
    },
    onSwipedLeft: () => setSidebarOpen(false),
    trackMouse: false,
    delta: 50,
  });

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    const newProject = {
      id: generateId(),
      name: newGroupName,
      cardIds: [],
      createdAt: Date.now(),
    };
    await addProject(newProject);
    setNewGroupName('');
    setShowCreateGroup(false);
    navigate(`/projects`);
    setSidebarOpen(false);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('theme-transitioning');
    root.classList.remove('light', 'dark', 'amoled', 'midnight-peach', 'liquid-glass', 'royal-purple', 'starry-night');
    root.classList.add(theme || 'dark');
    
    // Remove transition class after animation completes
    const timer = setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 350);
    return () => clearTimeout(timer);
  }, [theme]);

  const breadcrumbs = useMemo(() => {
    const path = location.pathname;
    
    if (path === '/') return [{ label: 'Main Screen', path: '/' }];
    if (path === '/stats') return [{ label: 'Statistics', path: '/stats' }];
    if (path === '/prompts') return [{ label: 'Prompt Gallery', path: '/prompts' }];
    if (path === '/projects') return [{ label: 'Card Gallery', path: '/projects' }];
    if (path === '/bin') return [{ label: 'Recycle Bin', path: '/bin' }];
    
    if (path.startsWith('/prompt/')) {
      const id = path.split('/')[2];
      const prompt = promptProjects.find(p => p.id === id);
      return [
        { label: 'Prompt Gallery', path: '/prompts' },
        { label: prompt?.name || 'New Prompt', path }
      ];
    }
    
    if (path.startsWith('/project/')) {
      const id = path.split('/')[2];
      const project = projects.find(p => p.id === id);
      return [
        { label: 'Card Gallery', path: '/projects' },
        { label: project?.name || 'Project', path }
      ];
    }
    
    if (path.startsWith('/entry/')) {
      const id = path.split('/')[2];
      const card = cards.find(c => c.id === id);
      return [
        { label: 'Main Screen', path: '/' },
        { label: card?.name || 'New Entry', path }
      ];
    }
    
    if (path === '/entry') {
      return [
        { label: 'Main Screen', path: '/' },
        { label: 'New Entry', path }
      ];
    }

    return [{ label: 'Roleplay Vault', path: '/' }];
  }, [location.pathname, projects, cards, promptProjects]);

  // Determine if bottom nav should be shown (only on main-level screens)
  const showBottomNav = ['/', '/stats', '/prompts', '/projects'].includes(location.pathname);

  const getActiveNavPath = useCallback(() => {
    const path = location.pathname;
    if (path === '/') return '/';
    if (path === '/stats') return '/stats';
    if (path.startsWith('/prompt')) return '/prompts';
    if (path.startsWith('/project')) return '/projects';
    return path;
  }, [location.pathname]);

  const handleNavClick = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  return (
    <div {...handlers} className={`h-[100dvh] bg-bg-main text-text-main font-sans flex flex-col transition-colors duration-300 ${theme === 'starry-night' ? 'starry-bg' : ''}`} style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}>
      {/* Top Bar — fixed position, GPU-only transform animation, no layout reflow */}
        <header className={`fixed top-0 left-0 right-0 h-14 flex items-center px-4 border-b border-border-main bg-bg-main/95 backdrop-blur-md z-40 will-change-transform transition-transform duration-300 ease-out ${barsHidden ? '-translate-y-full' : 'translate-y-0'}`} style={{ top: 'var(--safe-top, 0px)' }}>
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 hover:bg-bg-surface-hover rounded-lg transition-colors shrink-0">
            <Menu className="w-6 h-6" />
          </button>
          
          {breadcrumbs.length > 1 && (
            <button 
              onClick={() => navigate(breadcrumbs[breadcrumbs.length - 2].path)}
              className="p-2 hover:bg-bg-surface-hover rounded-lg transition-colors shrink-0 ml-1 md:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="ml-2 md:ml-4 flex items-center overflow-hidden flex-1 min-w-0">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.path}>
                {index > 0 && <ChevronRight className="w-4 h-4 text-text-muted mx-1.5 shrink-0" />}
                <Link 
                  to={crumb.path}
                  className={`truncate transition-colors ${
                    index === breadcrumbs.length - 1 
                      ? 'font-semibold text-lg tracking-tight text-text-main' 
                      : 'text-sm font-medium text-text-muted hover:text-text-secondary hidden md:block'
                  }`}
                >
                  {crumb.label}
                </Link>
              </React.Fragment>
            ))}
          </div>

          {/* Account Menu Avatar */}
          <AccountMenu />
        </header>

      {/* Sidebar Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 z-50 transition-opacity duration-250 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setSidebarOpen(false)} 
      />

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-bg-surface z-50 transform transition-transform duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col border-r border-border-main`} style={{ paddingTop: 'calc(16px + var(--safe-top))', paddingBottom: 'calc(16px + var(--safe-bottom))' }}>
        <div className="px-4 pb-4 flex items-center justify-between border-b border-border-main shrink-0">
          <h2 className="font-semibold text-lg">Menu</h2>
          <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-bg-surface-hover rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="space-y-1">
            <button 
              onClick={() => { navigate('/'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors relative ${location.pathname === '/' ? 'bg-bg-surface-hover text-text-main' : 'text-text-muted hover:bg-bg-surface-hover/50 hover:text-text-secondary'}`}
            >
              {location.pathname === '/' && <div className="absolute left-0 top-2 bottom-2 w-1 bg-accent rounded-r-full" />}
              <Home className="w-5 h-5" />
              <span className="font-medium">Main Screen</span>
            </button>
            <button 
              onClick={() => { navigate('/stats'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors relative ${location.pathname === '/stats' ? 'bg-bg-surface-hover text-text-main' : 'text-text-muted hover:bg-bg-surface-hover/50 hover:text-text-secondary'}`}
            >
              {location.pathname === '/stats' && <div className="absolute left-0 top-2 bottom-2 w-1 bg-accent rounded-r-full" />}
              <BarChart3 className="w-5 h-5" />
              <span className="font-medium">Statistics</span>
            </button>
            <button 
              onClick={() => { navigate('/prompts'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors relative ${location.pathname.startsWith('/prompt') ? 'bg-bg-surface-hover text-text-main' : 'text-text-muted hover:bg-bg-surface-hover/50 hover:text-text-secondary'}`}
            >
              {location.pathname.startsWith('/prompt') && <div className="absolute left-0 top-2 bottom-2 w-1 bg-accent rounded-r-full" />}
              <BookOpen className="w-5 h-5" />
              <span className="font-medium">Prompt Gallery</span>
            </button>
            <button 
              onClick={() => { navigate('/bin'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors relative ${location.pathname === '/bin' ? 'bg-bg-surface-hover text-text-main' : 'text-text-muted hover:bg-bg-surface-hover/50 hover:text-text-secondary'}`}
            >
              {location.pathname === '/bin' && <div className="absolute left-0 top-2 bottom-2 w-1 bg-accent rounded-r-full" />}
              <Trash2 className="w-5 h-5" />
              <span className="font-medium">Recycle Bin</span>
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-3">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Groups</h3>
              <button 
                onClick={() => setShowCreateGroup(true)}
                className="p-1 hover:bg-bg-surface-hover rounded-md text-text-muted hover:text-text-main transition-colors"
                title="Create Group"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {projects.length > 0 && (
              <button 
                onClick={() => { navigate('/projects'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors relative ${location.pathname.startsWith('/project') ? 'bg-bg-surface-hover text-text-main' : 'text-text-muted hover:bg-bg-surface-hover/50 hover:text-text-secondary'}`}
              >
                {location.pathname.startsWith('/project') && <div className="absolute left-0 top-2 bottom-2 w-1 bg-accent rounded-r-full" />}
                <Folder className="w-5 h-5" />
                <span className="font-medium">Card Gallery</span>
              </button>
            )}
          </div>
        </div>

        {/* Theme Selector */}
        <div className="p-4 border-t border-border-main shrink-0">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 px-1">Theme</h3>
          <div className="grid grid-cols-4 gap-2">
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                  theme === t.id 
                    ? 'bg-bg-surface-hover ring-2 ring-accent shadow-sm' 
                    : 'hover:bg-bg-surface-hover/50'
                }`}
                title={t.name}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-border-main" style={{ background: t.colors[0] }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: t.colors[1] }} />
                </div>
                <span className="text-[10px] font-medium text-text-muted leading-tight text-center line-clamp-1">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-bg-surface rounded-2xl p-6 w-full max-w-sm border border-border-main shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">Create Group</h3>
            <input 
              type="text" 
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group Name"
              className="w-full bg-bg-main border border-border-main rounded-xl px-4 py-3 text-text-main focus:outline-none focus:ring-2 focus:ring-accent mb-6"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowCreateGroup(false)}
                className="px-4 py-2 rounded-xl font-medium text-text-muted hover:bg-bg-surface-hover transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateGroup}
                className="px-4 py-2 rounded-xl font-medium bg-text-main text-bg-main hover:bg-text-secondary transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content — no dynamic padding; pages handle their own padding for fixed header/nav */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        {children}
      </main>

      {/* Bottom Navigation Bar */}
      {showBottomNav && (
        <div className={`bottom-nav will-change-transform transition-transform duration-300 ease-out ${barsHidden ? 'translate-y-full' : 'translate-y-0'}`}>
          <div className="bottom-nav-inner">
            <div className="bottom-nav-pill">
              {NAV_ITEMS.map(item => {
                const isActive = getActiveNavPath() === item.path;
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavClick(item.path)}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="nav-item-label">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
