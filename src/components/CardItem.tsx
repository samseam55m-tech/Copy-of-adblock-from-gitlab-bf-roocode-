import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../types';
import { Tag } from '../types';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { Pin, ChevronRight } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useInView } from 'react-intersection-observer';

interface CardItemProps {
  key?: React.Key;
  card: Card;
  selected?: boolean;
  isSortable?: boolean;
  onSelect?: (id: string) => void;
  onLongPress?: (id: string) => void;
  onClick?: (id: string) => void;
  tags?: Tag[];
  onTogglePin?: (card: Card) => void;
  showDates?: boolean;
  staggerIndex?: number;
}

export default React.memo(function CardItem({ card, selected, isSortable = true, onSelect, onLongPress, onClick, tags, onTogglePin, showDates, staggerIndex = 0 }: CardItemProps) {
  const [showAllTags, setShowAllTags] = useState(false);
  const tagTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: card.id,
    disabled: !isSortable
  });

  const { ref: inViewRef, inView } = useInView({
    rootMargin: '600px 0px',
    triggerOnce: false,
  });

  const [cardHeight, setCardHeight] = useState<number | undefined>(undefined);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inView && contentRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setCardHeight(entry.contentRect.height);
        }
      });
      observer.observe(contentRef.current);
      return () => observer.disconnect();
    }
  }, [inView]);

  const setRefs = (node: HTMLElement | null) => {
    setNodeRef(node);
    inViewRef(node);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
    zIndex: isDragging ? 50 : 1,
    minHeight: cardHeight ? `${cardHeight}px` : '200px',
  };

  let timer: ReturnType<typeof setTimeout>;

  const handleTouchStart = () => {
    timer = setTimeout(() => {
      if (onLongPress) onLongPress(card.id);
    }, 500);
  };

  const handleTouchEnd = () => {
    clearTimeout(timer);
  };

  const handleClick = () => {
    if (selected !== undefined && onSelect) {
      onSelect(card.id);
    } else if (onClick) {
      onClick(card.id);
    }
  };

  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTogglePin) onTogglePin(card);
  };

  const handleTagInteraction = (e?: React.MouseEvent | React.TouchEvent | React.UIEvent) => {
    if (e) e.stopPropagation();
    setShowAllTags(true);
    
    if (tagTimerRef.current) {
      clearTimeout(tagTimerRef.current);
    }
    
    tagTimerRef.current = setTimeout(() => {
      setShowAllTags(false);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (tagTimerRef.current) clearTimeout(tagTimerRef.current);
    };
  }, []);

  const mainTagId = card.mainTag || (card.tags && card.tags[0]);
  const mainTagObj = tags?.find(t => t.id === mainTagId);
  const otherTags = (card.tags || []).filter(id => id !== mainTagId).map(id => tags?.find(t => t.id === id)).filter(Boolean);

  const hasImage = card.images.length > 0;

  return (
    <motion.div 
      ref={setRefs}
      style={style}
      {...attributes}
      {...listeners}
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(staggerIndex * 0.04, 0.4), ease: [0.16, 1, 0.3, 1] }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative overflow-hidden bg-bg-surface border transition-all duration-300 cursor-pointer mb-4 break-inside-avoid group card-glow card-shimmer rounded-[var(--card-radius)]",
        selected 
          ? "border-accent ring-2 ring-accent/30" 
          : "border-border-main/40 hover:border-border-main",
        isDragging ? "opacity-80 scale-[1.02]" : ""
      )}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      {inView ? (
        <div ref={contentRef} className="h-full flex flex-col">
          {hasImage ? (
            <div className="flex flex-col h-full">
              {/* Image */}
              <div className="relative w-full overflow-hidden shrink-0 bg-bg-main">
                <img 
                  src={card.images[0]} 
                  alt={card.name} 
                  loading="lazy"
                  decoding="async"
                  className="w-full h-auto object-cover relative z-10 transition-transform duration-500 ease-out group-hover:scale-[1.03]" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-surface/80 via-transparent to-transparent z-20 pointer-events-none" />
                
                {/* Pin indicator overlay */}
                {card.isPinned && (
                  <div className="absolute top-3 right-3 z-30">
                    <div className="w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                      <Pin className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Content below image */}
              <div className="p-4 flex flex-col flex-1 bg-bg-surface">
                <h3 className="font-bold text-[15px] text-text-main mb-1 line-clamp-1 tracking-tight">{card.name}</h3>
                {card.summary && (
                  <p className="text-xs text-text-muted line-clamp-2 leading-relaxed mb-3 flex-1">{card.summary}</p>
                )}
                
                {/* Tags */}
                {card.tags.length > 0 && (
                  <div 
                    className="relative mt-auto pt-2.5 border-t border-border-main/30"
                    onMouseEnter={handleTagInteraction}
                    onMouseLeave={() => handleTagInteraction()}
                    onTouchStart={handleTagInteraction}
                  >
                    <div 
                      ref={scrollContainerRef}
                      className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5 snap-x"
                      onScroll={handleTagInteraction}
                    >
                      {mainTagObj && (
                        <span className={cn("tag-chip text-white shadow-sm", mainTagObj.color)}>
                          {card.mainTag ? '\u2605 ' : ''}{mainTagObj.name}
                        </span>
                      )}
                      
                      {!showAllTags && otherTags.length > 0 && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleTagInteraction(); }}
                          className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-bg-surface-hover text-text-muted hover:text-text-main transition-colors"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}

                      <AnimatePresence>
                        {showAllTags && otherTags.map(tag => tag && (
                          <motion.span 
                            initial={{ opacity: 0, scale: 0.8, width: 0 }}
                            animate={{ opacity: 1, scale: 1, width: 'auto' }}
                            exit={{ opacity: 0, scale: 0.8, width: 0 }}
                            key={tag.id} 
                            className={cn("tag-chip text-white/90 shadow-sm", tag.color)}
                          >
                            {tag.name}
                          </motion.span>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {/* Date badge */}
                {showDates === true && (
                  <div className="mt-2.5 flex items-center shrink-0">
                    <div className="bg-accent/10 text-accent px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide flex items-center gap-1.5 w-max">
                      {card.updatedAt ? (
                        <>
                          <span className="opacity-70">Edited</span>
                          {new Date(Number(card.updatedAt) || Date.now()).toLocaleDateString()}
                        </>
                      ) : (
                        <>
                          <span className="opacity-70">Created</span>
                          {new Date(Number(card.createdAt) || Date.now()).toLocaleDateString()}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* No-image card */
            <div className="p-5 flex flex-col h-full">
              {/* Pin indicator */}
              {card.isPinned && (
                <div className="absolute top-4 right-4">
                  <Pin className="w-3.5 h-3.5 text-text-muted/50" />
                </div>
              )}

              <h3 className="font-bold text-lg text-text-main mb-2 line-clamp-1 tracking-tight">{card.name}</h3>
              {card.summary && (
                <p className="text-sm text-text-muted line-clamp-3 leading-relaxed mb-4 flex-1">{card.summary}</p>
              )}
              
              {/* Tags */}
              {card.tags.length > 0 && (
                <div 
                  className="relative mt-auto pt-3 border-t border-border-main/30"
                  onMouseEnter={handleTagInteraction}
                  onMouseLeave={() => handleTagInteraction()}
                  onTouchStart={handleTagInteraction}
                >
                  <div 
                    ref={scrollContainerRef}
                    className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5 snap-x"
                    onScroll={handleTagInteraction}
                  >
                    {mainTagObj && (
                      <span className={cn("tag-chip text-white shadow-sm", mainTagObj.color)}>
                        {card.mainTag ? '\u2605 ' : ''}{mainTagObj.name}
                      </span>
                    )}
                    
                    {!showAllTags && otherTags.length > 0 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleTagInteraction(); }}
                        className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-bg-surface-hover text-text-muted hover:text-text-main transition-colors"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}

                    <AnimatePresence>
                      {showAllTags && otherTags.map(tag => tag && (
                        <motion.span 
                          initial={{ opacity: 0, scale: 0.8, width: 0 }}
                          animate={{ opacity: 1, scale: 1, width: 'auto' }}
                          exit={{ opacity: 0, scale: 0.8, width: 0 }}
                          key={tag.id} 
                          className={cn("tag-chip text-white/90 shadow-sm", tag.color)}
                        >
                          {tag.name}
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Date badge */}
              {showDates === true && (
                <div className="mt-2.5 flex items-center shrink-0">
                  <div className="bg-accent/10 text-accent px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide flex items-center gap-1.5 w-max">
                    {card.updatedAt ? (
                      <>
                        <span className="opacity-70">Edited</span>
                        {new Date(Number(card.updatedAt) || Date.now()).toLocaleDateString()}
                      </>
                    ) : (
                      <>
                        <span className="opacity-70">Created</span>
                        {new Date(Number(card.createdAt) || Date.now()).toLocaleDateString()}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
      
      {/* Selection overlay */}
      {selected && (
        <div className="absolute inset-0 bg-accent/15 backdrop-blur-[1px] flex items-center justify-center z-10">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-10 h-10 bg-accent rounded-full flex items-center justify-center shadow-lg"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
});
