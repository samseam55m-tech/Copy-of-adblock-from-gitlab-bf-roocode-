import React, { useState, useMemo } from 'react';
import { Search, Plus, X, FolderPlus, SlidersHorizontal, Folder, Trash2, Pin, PinOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Card } from '../types';
import CardItem from '../components/CardItem';
import ConfirmModal from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';

export default function MainScreen() {
  const { cards, projects, addProject, updateProject, tags, deleteCard, updateCard, updateCards } = useStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [showGroupSelect, setShowGroupSelect] = useState(false);

  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [selectedSearchTags, setSelectedSearchTags] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'dateDesc' | 'dateAsc' | 'nameAsc' | 'nameDesc' | 'editedDesc'>('dateDesc');
  const [showDates, setShowDates] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [searchFilter, setSearchFilter] = useState<'all' | 'headerBlocks' | 'cards'>('all');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = cards.findIndex(item => item.id === active.id);
      const newIndex = cards.findIndex(item => item.id === over.id);
      
      const newCards = arrayMove(cards, oldIndex, newIndex);
      const updatedCards = newCards.map((item: Card, index: number) => ({ ...item, order: index }));
      updateCards(updatedCards);
    }
  };

  const filteredCards = useMemo(() => {
    const activeCards = cards.filter(c => !c.deletedAt);
    let result = activeCards.filter(card => {
      const searchLower = searchQuery.toLowerCase();
      
      let matchesText = false;
      if (searchFilter === 'all' || searchFilter === 'cards') {
        matchesText = matchesText || (card.name || '').toLowerCase().includes(searchLower) ||
                      (card.summary || '').toLowerCase().includes(searchLower);
      }
      if (searchFilter === 'all' || searchFilter === 'headerBlocks') {
        matchesText = matchesText || (card.headerBlocks || []).some(b => (b.title || '').toLowerCase().includes(searchLower) || (b.content || '').toLowerCase().includes(searchLower));
      }
      
      const matchesTags = selectedSearchTags.size === 0 || 
                          Array.from(selectedSearchTags).every(tagId => (card.tags || []).includes(tagId));
                          
      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && card.createdAt >= new Date(startDate).getTime();
      }
      if (endDate) {
        matchesDate = matchesDate && card.createdAt <= new Date(endDate).getTime() + 86400000;
      }
      
      return matchesText && matchesTags && matchesDate;
    });

    result.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }

      switch (sortBy) {
        case 'editedDesc':
          return (Number(b.updatedAt || b.createdAt) || 0) - (Number(a.updatedAt || a.createdAt) || 0);
        case 'dateDesc':
          return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
        case 'dateAsc':
          return (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0);
        case 'nameAsc': return a.name.localeCompare(b.name);
        case 'nameDesc': return b.name.localeCompare(a.name);
        default: return 0;
      }
    });

    return result;
  }, [cards, searchQuery, searchFilter, selectedSearchTags, sortBy, startDate, endDate]);

  const pinnedCards = useMemo(() => filteredCards.filter(c => c.isPinned), [filteredCards]);
  const unpinnedCards = useMemo(() => filteredCards.filter(c => !c.isPinned), [filteredCards]);

  const handleLongPress = React.useCallback((id: string) => {
    setSelectionMode(prevMode => {
      if (!prevMode) {
        setSelectedCards(new Set([id]));
        return true;
      }
      return prevMode;
    });
  }, []);

  const toggleSelection = React.useCallback((id: string) => {
    setSelectedCards(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(id)) {
        newSelection.delete(id);
        if (newSelection.size === 0) {
          setSelectionMode(false);
        }
      } else {
        newSelection.add(id);
      }
      return newSelection;
    });
  }, []);

  const handleCardClick = React.useCallback((id: string) => {
    navigate(`/entry/${id}`);
  }, [navigate]);

  const handleTogglePinSingle = React.useCallback((card: Card) => {
    updateCard({ ...card, isPinned: !card.isPinned });
  }, [updateCard]);

  const handleTogglePin = async () => {
    const cardsToUpdate = Array.from(selectedCards)
      .map(id => cards.find(c => c.id === id))
      .filter((c): c is Card => c !== undefined);
    
    if (cardsToUpdate.length > 0) {
      const allPinned = cardsToUpdate.every(c => c.isPinned);
      const updatedCards = cardsToUpdate.map(c => ({ ...c, isPinned: !allPinned }));
      await updateCards(updatedCards);
    }
    setSelectionMode(false);
    setSelectedCards(new Set());
  };

  const handleAddToGroup = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      const newCardIds = Array.from(new Set([...project.cardIds, ...Array.from(selectedCards)]));
      await updateProject({ ...project, cardIds: newCardIds });
    }
    setSelectionMode(false);
    setSelectedCards(new Set());
    setShowGroupSelect(false);
  };

  const activeFilterCount = (selectedSearchTags.size > 0 ? 1 : 0) + (startDate ? 1 : 0) + (endDate ? 1 : 0) + (sortBy !== 'dateDesc' ? 1 : 0) + (showDates ? 1 : 0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      {/* Top Bar - Sticky */}
      <div className="sticky top-0 z-30 p-4 flex flex-col gap-3 shrink-0" style={{ background: 'var(--header-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: '0 1px 0 0 var(--header-border)' }}>
        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait">
            {selectionMode ? (
              <motion.div 
                key="selection"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex items-center justify-between bg-bg-surface rounded-2xl p-2.5 border border-border-main"
                style={{ boxShadow: 'var(--surface-elevation-1)' }}
              >
                <div className="flex items-center gap-3">
                  <button onClick={() => { setSelectionMode(false); setSelectedCards(new Set()); }} className="p-2 hover:bg-bg-surface-hover rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                  <span className="font-semibold text-sm">{selectedCards.size} selected</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={handleTogglePin}
                    className="p-2 text-text-muted hover:text-text-main hover:bg-bg-surface-hover rounded-xl transition-colors"
                    title="Toggle Pin"
                  >
                    {Array.from(selectedCards).every(id => cards.find(c => c.id === id)?.isPinned) ? <PinOff className="w-5 h-5" /> : <Pin className="w-5 h-5" />}
                  </button>
                  <button 
                    onClick={() => setShowGroupSelect(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Group</span>
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="search"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex-1 flex items-center gap-2"
              >
                <div className="search-input-wrapper flex-1">
                  <Search className="search-icon" />
                  <input 
                    type="text"
                    placeholder="Search cards..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => setShowAdvancedSearch(true)}
                  className="relative p-2.5 bg-bg-surface border border-border-main rounded-xl hover:bg-bg-surface-hover transition-colors shrink-0"
                >
                  <SlidersHorizontal className="w-5 h-5 text-text-muted" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Search Filter Pills */}
        {!selectionMode && searchQuery && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5"
          >
            {[
              { key: 'all', label: 'All Results' },
              { key: 'cards', label: 'Cards Only' },
              { key: 'headerBlocks', label: 'Blocks Only' },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setSearchFilter(item.key as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  searchFilter === item.key 
                    ? 'bg-accent text-white shadow-sm' 
                    : 'bg-bg-surface text-text-muted hover:bg-bg-surface-hover border border-border-main/50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Masonry Grid */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24" style={{ WebkitOverflowScrolling: 'touch' }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {pinnedCards.length > 0 && (
            <div className="mb-8">
              <h3 className="section-label">Pinned</h3>
              <SortableContext
                items={pinnedCards.map(c => c.id)}
                strategy={rectSortingStrategy}
              >
                <div className="columns-2 gap-4 space-y-4">
                  {pinnedCards.map((card, i) => (
                    <CardItem 
                      key={card.id} 
                      card={card} 
                      tags={tags}
                      showDates={showDates}
                      onTogglePin={handleTogglePinSingle}
                      selected={selectionMode ? selectedCards.has(card.id) : undefined}
                      onSelect={selectionMode ? toggleSelection : undefined}
                      onLongPress={handleLongPress}
                      onClick={handleCardClick}
                      staggerIndex={i}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          )}

          {pinnedCards.length > 0 && unpinnedCards.length > 0 && (
            <div className="h-px bg-border-main/30 w-full mb-8" />
          )}

          {unpinnedCards.length > 0 && (
            <div>
              {pinnedCards.length > 0 && <h3 className="section-label">Others</h3>}
              <SortableContext
                items={unpinnedCards.map(c => c.id)}
                strategy={rectSortingStrategy}
              >
                <div className="columns-2 gap-4 space-y-4">
                  {unpinnedCards.map((card, i) => (
                    <CardItem 
                      key={card.id} 
                      card={card} 
                      tags={tags}
                      showDates={showDates}
                      onTogglePin={handleTogglePinSingle}
                      selected={selectionMode ? selectedCards.has(card.id) : undefined}
                      onSelect={selectionMode ? toggleSelection : undefined}
                      onLongPress={handleLongPress}
                      onClick={handleCardClick}
                      staggerIndex={i + pinnedCards.length}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          )}
        </DndContext>

        {/* Empty State */}
        {filteredCards.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-text-muted mt-16">
            <div className="float-gentle">
              <div className="w-20 h-20 rounded-3xl bg-bg-surface border border-border-main/50 flex items-center justify-center mb-6" style={{ boxShadow: 'var(--surface-elevation-2)' }}>
                <Search className="w-9 h-9 opacity-30" />
              </div>
            </div>
            <p className="font-semibold text-base text-text-main mb-1">{searchQuery ? 'No cards found' : 'No cards yet'}</p>
            <p className="text-sm opacity-70 max-w-[220px] text-center leading-relaxed">{searchQuery ? 'Try a different search term or adjust your filters.' : 'Tap the + button below to create your first card.'}</p>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => navigate('/entry')}
        className="fab-button bg-accent text-white"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Group Select Modal */}
      {showGroupSelect && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="bg-bg-surface rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-sm border border-border-main" style={{ boxShadow: 'var(--surface-elevation-3)' }}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold">Select Group</h3>
              <button onClick={() => setShowGroupSelect(false)} className="p-1 hover:bg-bg-surface-hover rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {projects.length === 0 ? (
                <p className="text-text-muted text-center py-6 text-sm">No groups available. Create one from the menu.</p>
              ) : (
                projects.map(project => (
                  <button 
                    key={project.id}
                    onClick={() => handleAddToGroup(project.id)}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-bg-surface-hover transition-colors flex items-center gap-3 text-sm"
                  >
                    <Folder className="w-5 h-5 text-text-muted" />
                    <span className="font-medium">{project.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Advanced Search Modal */}
      {showAdvancedSearch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div 
            className="bg-bg-surface rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md border border-border-main flex flex-col max-h-[90vh]"
            style={{ paddingBottom: 'calc(1.5rem + var(--safe-bottom))', overflow: 'visible', boxShadow: 'var(--surface-elevation-3)' }}
          >
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div>
                <h3 className="text-lg font-bold">Filters</h3>
                <p className="text-xs text-text-muted mt-0.5">Refine your card search</p>
              </div>
              <button onClick={() => setShowAdvancedSearch(false)} className="p-1 hover:bg-bg-surface-hover rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-6 overflow-y-auto scrollbar-hide flex-1" style={{ overflow: 'visible' }}>
              {/* Sort */}
              <div style={{ overflow: 'visible' }}>
                <h4 className="section-label">Sort By</h4>
                <select 
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="w-full bg-bg-main border border-border-main rounded-xl px-4 py-2.5 text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent"
                >
                  <option value="dateDesc">Newest First</option>
                  <option value="dateAsc">Oldest First</option>
                  <option value="editedDesc">Recently Edited</option>
                  <option value="nameAsc">Name (A-Z)</option>
                  <option value="nameDesc">Name (Z-A)</option>
                </select>
              </div>

              {/* Show dates toggle */}
              <div>
                <label className="flex items-center justify-between cursor-pointer">
                  <h4 className="text-sm font-medium text-text-muted">Show Dates on Cards</h4>
                  <div className={`relative w-11 h-6 rounded-full transition-colors ${showDates ? 'bg-accent' : 'bg-bg-main border border-border-main'}`}
                    onClick={() => setShowDates(prev => !prev)}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${showDates ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>
              </div>

              {/* Date Range */}
              <div>
                <h4 className="section-label">Date Range</h4>
                <div className="flex gap-2">
                  <input 
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="flex-1 bg-bg-main border border-border-main rounded-xl px-3 py-2.5 text-text-main focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent text-sm"
                  />
                  <input 
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="flex-1 bg-bg-main border border-border-main rounded-xl px-3 py-2.5 text-text-main focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent text-sm"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <h4 className="section-label">Filter by Tags</h4>
                <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto pr-2">
                  {tags.map(tag => {
                    const isSelected = selectedSearchTags.has(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => {
                          const newTags = new Set(selectedSearchTags);
                          if (isSelected) newTags.delete(tag.id);
                          else newTags.add(tag.id);
                          setSelectedSearchTags(newTags);
                        }}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all border ${
                          isSelected 
                            ? `${tag.color} text-white border-transparent shadow-sm` 
                            : 'bg-bg-main text-text-muted border-border-main hover:border-accent/50'
                        }`}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-border-main flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => {
                  setSelectedSearchTags(new Set());
                  setStartDate('');
                  setEndDate('');
                  setSortBy('dateDesc');
                  setShowDates(false);
                }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:bg-bg-surface-hover transition-colors"
              >
                Reset
              </button>
              <button 
                onClick={() => setShowAdvancedSearch(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-accent text-white hover:opacity-90 transition-opacity"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={showDeleteConfirm}
        title="Delete Cards"
        message={`Are you sure you want to move ${selectedCards.size} selected card(s) to the recycle bin?`}
        confirmText="Move to Bin"
        onConfirm={async () => {
          const cardsToUpdate = Array.from(selectedCards)
            .map(id => cards.find(c => c.id === id))
            .filter((c): c is Card => c !== undefined)
            .map(c => ({ ...c, deletedAt: Date.now() }));
          
          if (cardsToUpdate.length > 0) {
            await updateCards(cardsToUpdate);
          }
          
          setSelectionMode(false);
          setSelectedCards(new Set());
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
