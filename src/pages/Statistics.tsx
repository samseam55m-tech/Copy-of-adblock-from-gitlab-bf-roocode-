import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { BarChart3, Copy, FileText, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils';
import { StatItem } from '../components/StatItem';

export default function Statistics() {
  const { cards, promptProjects } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'cards' | 'prompts'>('cards');

  const cardStats = useMemo(() => {
    const activeCards = cards.filter(c => !c.deletedAt);
    const allStats: any[] = [];

    activeCards.forEach(card => {
      (card.headerBlocks || []).forEach(block => {
        if (block.copyCount && block.copyCount > 0) {
          allStats.push({
            ...block,
            parentId: card.id,
            parentName: card.name,
            type: 'card',
            generationName: 'G1',
            variationName: 'V1',
            copyCount: block.copyCount
          });
        }
        if (block.variations) {
          block.variations.forEach(v => {
            if (v.copyCount && v.copyCount > 0) {
              allStats.push({
                ...block,
                parentId: card.id,
                parentName: card.name,
                type: 'card',
                generationName: 'G1',
                variationName: v.name,
                copyCount: v.copyCount
              });
            }
          });
        }
      });

      if (card.variations) {
        card.variations.forEach(gen => {
          (gen.headerBlocks || []).forEach(block => {
            if (block.copyCount && block.copyCount > 0) {
              allStats.push({
                ...block,
                parentId: card.id,
                parentName: card.name,
                type: 'card',
                generationName: gen.name,
                variationName: 'V1',
                copyCount: block.copyCount
              });
            }
            if (block.variations) {
              block.variations.forEach(v => {
                if (v.copyCount && v.copyCount > 0) {
                  allStats.push({
                    ...block,
                    parentId: card.id,
                    parentName: card.name,
                    type: 'card',
                    generationName: gen.name,
                    variationName: v.name,
                    copyCount: v.copyCount
                  });
                }
              });
            }
          });
        });
      }
    });

    return allStats.sort((a, b) => (b.copyCount || 0) - (a.copyCount || 0));
  }, [cards]);

  const promptStats = useMemo(() => {
    const activePrompts = promptProjects.filter(p => !p.deletedAt);
    const allStats: any[] = [];

    activePrompts.forEach(project => {
      (project.blocks || []).forEach(block => {
        if (block.copyCount && block.copyCount > 0) {
          allStats.push({
            ...block,
            parentId: project.id,
            parentName: project.name,
            type: 'prompt',
            variationName: 'V1',
            copyCount: block.copyCount
          });
        }
        if (block.variations) {
          block.variations.forEach(v => {
            if (v.copyCount && v.copyCount > 0) {
              allStats.push({
                ...block,
                parentId: project.id,
                parentName: project.name,
                type: 'prompt',
                variationName: v.name,
                copyCount: v.copyCount
              });
            }
          });
        }
      });
    });

    return allStats.sort((a, b) => (b.copyCount || 0) - (a.copyCount || 0));
  }, [promptProjects]);

  const currentStats = activeTab === 'cards' ? cardStats : promptStats;

  const handleStatClick = React.useCallback((stat: any) => {
    navigate(stat.type === 'card' ? `/entry/${stat.parentId}` : `/prompt/${stat.parentId}`);
  }, [navigate]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Statistics</h2>
            <p className="text-xs text-text-muted">Copy counts across your content</p>
          </div>
        </div>
        
        <div className="pill-tabs">
          <button
            onClick={() => setActiveTab('cards')}
            className={`pill-tab ${activeTab === 'cards' ? 'active' : ''}`}
          >
            <FileText className="w-4 h-4" />
            Cards
          </button>
          <button
            onClick={() => setActiveTab('prompts')}
            className={`pill-tab ${activeTab === 'prompts' ? 'active' : ''}`}
          >
            <ImageIcon className="w-4 h-4" />
            Prompts
          </button>
        </div>
      </div>

      {currentStats.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-text-muted mt-16">
          <div className="float-gentle">
            <div className="w-20 h-20 rounded-3xl bg-bg-surface border border-border-main/50 flex items-center justify-center mb-6" style={{ boxShadow: 'var(--surface-elevation-2)' }}>
              <Copy className="w-9 h-9 opacity-25" />
            </div>
          </div>
          <p className="font-semibold text-base text-text-main mb-1">No copies yet</p>
          <p className="text-sm opacity-70 max-w-[220px] text-center leading-relaxed">Copy header blocks to see your statistics here.</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl mx-auto w-full">
          {currentStats.map((stat, index) => (
            <StatItem
              key={`${stat.parentId}-${stat.id}-${stat.generationName || 'default'}-${stat.variationName}`}
              stat={stat}
              index={index}
              onClick={handleStatClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
