import React, { useState, useEffect } from 'react';
import { Reorder, motion, AnimatePresence } from 'framer-motion';
import { BlockItem } from './BlockItem';
import { TagBottomSheet } from './TagBottomSheet';
import { ArrowLeft, MoreVertical, Plus, Tag as TagIcon } from 'lucide-react';

// Mock Data
const INITIAL_DATA = {
  id: 'card-1',
  name: 'Project Alpha Details',
  tags: [
    { id: 't1', label: 'Draft', color: '#f59e0b' }
  ],
  tabGroups: [
    {
      id: 'g1',
      label: 'Group 1',
      blocks: [
        {
          id: 'b1',
          title: 'Introduction',
          isExpanded: true,
          variations: [
            { id: 'v1', versionLabel: 'V1', textContent: 'Initial intro text...' },
            { id: 'v2', versionLabel: 'V2', textContent: 'Alternative intro text...' }
          ]
        },
        {
          id: 'b2',
          title: 'Body Paragraph',
          isExpanded: false,
          variations: [
            { id: 'v3', versionLabel: 'V1', textContent: 'Main body content...' }
          ]
        }
      ]
    },
    {
      id: 'g2',
      label: 'Group 2',
      blocks: [
        {
          id: 'b3',
          title: 'Conclusion',
          isExpanded: true,
          variations: [
            { id: 'v4', versionLabel: 'V1', textContent: 'Final thoughts...' }
          ]
        }
      ]
    }
  ]
};

export function EntryPage() {
  const [data, setData] = useState(INITIAL_DATA);
  const [activeGroupId, setActiveGroupId] = useState(data.tabGroups[0].id);
  const [isTagSheetOpen, setIsTagSheetOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const activeGroup = data.tabGroups.find(g => g.id === activeGroupId);

  const handleBlocksReorder = (newBlocks: any[]) => {
    if (navigator.vibrate) navigator.vibrate(50);
    setData(prev => ({
      ...prev,
      tabGroups: prev.tabGroups.map(g => 
        g.id === activeGroupId ? { ...g, blocks: newBlocks } : g
      )
    }));
  };

  const handleBlockUpdate = (updatedBlock: any) => {
    setSaveStatus('saving');
    setData(prev => ({
      ...prev,
      tabGroups: prev.tabGroups.map(g => 
        g.id === activeGroupId 
          ? { ...g, blocks: g.blocks.map(b => b.id === updatedBlock.id ? updatedBlock : b) }
          : g
      )
    }));
    
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  const handleAddTag = (tag: { label: string; color: string }) => {
    setData(prev => ({
      ...prev,
      tags: [...prev.tags, { id: Date.now().toString(), ...tag }]
    }));
  };

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-bg-main text-text-main pb-24 font-sans transition-colors duration-300">
      {/* Header */}
      <header className={`sticky top-0 z-50 bg-bg-main/90 backdrop-blur-xl border-b border-border-main px-4 py-3 flex items-center justify-between transition-shadow ${isScrolled ? 'shadow-sm' : ''}`}>
        <div className="flex items-center gap-3">
          <button className="p-2 -ml-2 rounded-full hover:bg-bg-surface-hover transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold truncate max-w-[200px]">{data.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {saveStatus === 'saving' && (
              <motion.span 
                key="saving"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="text-xs font-medium text-text-muted "
              >
                Saving...
              </motion.span>
            )}
            {saveStatus === 'saved' && (
              <motion.span 
                key="saved"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="text-xs font-medium text-emerald-500"
              >
                Saved ✔
              </motion.span>
            )}
          </AnimatePresence>
          <button className="p-2 rounded-full hover:bg-bg-surface-hover transition-colors">
            <MoreVertical size={24} />
          </button>
        </div>
      </header>

      <main className="p-4 max-w-3xl mx-auto">
        {/* Tags Section */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {data.tags.map(tag => (
            <div 
              key={tag.id} 
              className="px-3 py-1.5 rounded-full text-sm font-medium text-text-main flex items-center gap-1 shadow-sm"
              style={{ backgroundColor: tag.color }}
            >
              <TagIcon size={14} />
              {tag.label}
            </div>
          ))}
          <button 
            onClick={() => setIsTagSheetOpen(true)}
            className="px-3 py-1.5 rounded-full text-sm font-medium bg-bg-surface-hover hover:bg-border-main transition-colors flex items-center gap-1"
          >
            <Plus size={16} />
            Add Tag
          </button>
        </div>

        {/* Tab Groups */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 pr-6 scrollbar-hide snap-x snap-mandatory">
          {data.tabGroups.map(group => (
            <button
              key={group.id}
              onClick={() => setActiveGroupId(group.id)}
              className={`snap-start shrink-0 px-6 py-3 rounded-2xl text-base font-bold transition-all ${
                activeGroupId === group.id
                  ? 'bg-bg-surface text-indigo-500 shadow-sm border border-border-main'
                  : 'text-text-muted  hover:bg-bg-surface-hover'
              }`}
            >
              {group.label}
            </button>
          ))}
        </div>

        {/* Blocks List */}
        {activeGroup && (
          <Reorder.Group 
            axis="y" 
            values={activeGroup.blocks} 
            onReorder={handleBlocksReorder}
            className="flex flex-col gap-4"
          >
            {activeGroup.blocks.map(block => (
              <BlockItem 
                key={block.id} 
                block={block} 
                onUpdate={handleBlockUpdate} 
              />
            ))}
          </Reorder.Group>
        )}
      </main>

      <TagBottomSheet 
        isOpen={isTagSheetOpen} 
        onClose={() => setIsTagSheetOpen(false)} 
        onAddTag={handleAddTag} 
      />
    </div>
  );
}
