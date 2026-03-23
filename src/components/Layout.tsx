import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Menu, X, Home, Folder, Plus, BarChart3, BookOpen, Trash2, ChevronRight, ArrowLeft, Sun, Moon, MoonStar, Palette } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useStore } from '../store';
import { generateId } from '../utils';
import { useSwipeable } from 'react-swipeable';
import AccountMenu from './AccountMenu';

const THEMES = [
  { id: 'light', name: 'Light', icon: Sun, colors: ['#FAFAFA', '#3B82F6', '#E5E7EB'] },
  { id: 'dark', name: 'Dark', icon: Moon, colors: ['#0F1014', '#3B82F6', '#2A2B35'] },
  { id: 'amoled', name: 'AMOLED', icon: MoonStar, colors: ['#000000', '#3B82F6', '#1A1A1E'] },
  { id: 'midnight-peach', name: 'Peach', icon: Palette, colors: ['#0C0C0E', '#F4A261', '#18181C'] },
  { id: 'liquid-glass', name: 'Glass', icon: Palette, colors: ['#E8E4DF', '#7C5CFC', '#2DD4BF'] },
  { id: 'royal-purple', name: 'Purple', icon: Palette, colors: ['#F0F0F5', '#6C5CE7', '#7B68EE'] },
  { id: 'starry-night', name: 'Starry', icon: Palette, colors: ['#0B0820', '#B8A9E8', '#C9A0DC'] },
];

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/stats', label: 'Stats', icon: BarChart3 },
  { path: '/prompts', label: 'Prompts', icon: BookOpen },
  { path: '/projects', label: 'Gallery', icon: Folder },
];

const SIDEBAR_NAV = [
  { path: '/', label: 'Main Screen', icon: Home },
  { path: '/stats', label: 'Statistics', icon: BarChart3 },
  { path: '/prompts', label: 'Prompt Gallery', icon: BookOpen },
  { path: '/bin', label: 'Recycle Bin', icon: Trash2 },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const { projects, cards, promptProjects, addProject, theme, setTheme } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

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
    
    const timer = setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 400);
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

  const showBottomNav = ['/', '/stats', '/prompts', '/projects'].includes(location.pathname);

  const getActiveNavPath = useCallback(() => {
    const path = location.pathname;
    if (path === '/') return '/';
    if (path === '/stats') return '/stats';
    if (path.startsWith('/prompt')) return '/prompts';
    if (path.startsWith('/project')) return '/projects';
    return path;
  }, [location.pathname]);

  const isActiveSidebarPath = useCallback((navPath: string) => {
    const path = location.pathname;
    if (navPath === '/') return path === '/';
    if (navPath === '/bin') return path === '/bin';
    return path.startsWith(navPath);
  }, [location.pathname]);

  const handleNavClick = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  return (
    <div {...handlers} className={`h-[100dvh] bg-bg-main text-text-main font-sans flex flex-col transition-colors duration-350 ${theme === 'starry-night' ? 'starry-bg' : ''}`} style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}>
      {/* Top Bar */}
      <header className="h-14 flex items-center px-4 sticky top-0 z-40 transition-colors duration-350" style={{ background: 'var(--header-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid var(--header-border)' }}>
        <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 hover:bg-bg-surface-hover rounded-xl transition-colors shrink-0">
          <Menu className="w-5 h-5" />
        </button>
        
        {breadcrumbs.length > 1 && (
          <button 
            onClick={() => navigate(breadcrumbs[breadcrumbs.length - 2].path)}
            className="p-2 hover:bg-bg-surface-hover rounded-xl transition-colors shrink-0 ml-0.5 md:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div className="ml-2 md:ml-4 flex items-center overflow-hidden flex-1 min-w-0">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-text-muted mx-1.5 shrink-0 opacity-50" />}
              <Link 
                to={crumb.path}
                className={`truncate transition-colors ${
                  index === breadcrumbs.length - 1 
                    ? 'font-semibold text-base tracking-tight text-text-main' 
                    : 'text-sm font-medium text-text-muted hover:text-text-main hidden md:block'
                }`}
              >
                {crumb.label}
              </Link>
            </React.Fragment>
          ))}
        </div>

        <AccountMenu />
      </header>

      {/* Sidebar Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50 transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setSidebarOpen(false)} 
      />

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-bg-surface z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col border-r border-border-main`} style={{ paddingTop: 'calc(16px + var(--safe-top))', paddingBottom: 'calc(16px + var(--safe-bottom))' }}>
        {/* Sidebar Header */}
        <div className="px-5 pb-4 flex items-center justify-between border-b border-border-main shrink-0">
          <h2 className="font-bold text-base tracking-tight">Menu</h2>
          <button onClick={() => setSidebarOpen(false)} className="p-2 -mr-2 hover:bg-bg-surface-hover rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Navigation */}
          <div className="space-y-1">
            {SIDEBAR_NAV.map(item => {
              const isActive = isActiveSidebarPath(item.path);
              const Icon = item.icon;
              return (
                <button 
                  key={item.path}
                  onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative ${
                    isActive 
                      ? 'bg-bg-surface-hover text-text-main font-medium' 
                      : 'text-text-muted hover:bg-bg-surface-hover/50 hover:text-text-main'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-accent rounded-r-full" />
                  )}
                  <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-accent' : ''}`} />
                  <span className="text-[14px]">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Groups Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-3">
              <h3 className="section-label !mb-0 !px-0">Groups</h3>
              <button 
                onClick={() => setShowCreateGroup(true)}
                className="p-1.5 hover:bg-bg-surface-hover rounded-lg text-text-muted hover:text-accent transition-colors"
                title="Create Group"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {projects.length > 0 && (
              <button 
                onClick={() => { navigate('/projects'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative ${
                  location.pathname.startsWith('/project') 
                    ? 'bg-bg-surface-hover text-text-main font-medium' 
                    : 'text-text-muted hover:bg-bg-surface-hover/50 hover:text-text-main'
                }`}
              >
                {location.pathname.startsWith('/project') && (
                  <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-accent rounded-r-full" />
                )}
                <Folder className={`w-[18px] h-[18px] ${location.pathname.startsWith('/project') ? 'text-accent' : ''}`} />
                <span className="text-[14px]">Card Gallery</span>
                <span className="ml-auto text-xs text-text-muted bg-bg-main px-2 py-0.5 rounded-md">{projects.length}</span>
              </button>
            )}
          </div>
        </div>

        {/* Theme Selector */}
        <div className="px-4 py-4 border-t border-border-main shrink-0">
          <h3 className="section-label">Theme</h3>
          <div className="grid grid-cols-4 gap-2">
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200 ${
                  theme === t.id 
                    ? 'bg-bg-surface-hover ring-2 ring-accent/60 shadow-sm' 
                    : 'hover:bg-bg-surface-hover/60'
                }`}
                title={t.name}
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-border-main/50 shadow-sm" 
                  style={{ background: t.colors[0] }}
                >
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ background: t.colors[1] }} />
                </div>
                <span className="text-[10px] font-medium text-text-muted leading-tight text-center line-clamp-1">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4">
          <div className="bg-bg-surface rounded-2xl p-6 w-full max-w-sm border border-border-main" style={{ boxShadow: 'var(--surface-elevation-3)' }}>
            <h3 className="text-lg font-bold mb-1">Create Group</h3>
            <p className="text-sm text-text-muted mb-5">Organize your cards into collections.</p>
            <input 
              type="text" 
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name..."
              className="w-full bg-bg-main border border-border-main rounded-xl px-4 py-3 text-text-main focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent mb-5 text-sm"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowCreateGroup(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:bg-bg-surface-hover transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateGroup}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-accent text-white hover:opacity-90 transition-opacity"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col overflow-hidden" style={{ paddingBottom: showBottomNav ? '56px' : '0px' }}>
        {children}
      </main>

      {/* Bottom Navigation Bar */}
      {showBottomNav && (
        <div className="bottom-nav">
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
