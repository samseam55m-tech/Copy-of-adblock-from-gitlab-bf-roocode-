import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../types';
import { Tag } from '../types';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { Pin, ChevronRight, GripVertical } from 'lucide-react';
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
    transition: transition || 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
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

  return (
    <motion.div 
      ref={setRefs}
      style={style}
      {...attributes}
      {...listeners}
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(staggerIndex * 0.04, 0.4), ease: [0.4, 0, 0.2, 1] }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative rounded-3xl overflow-hidden bg-bg-surface border transition-all duration-300 cursor-pointer mb-4 break-inside-avoid shadow-lg group card-glow card-shimmer",
        selected ? "border-accent ring-2 ring-accent shadow-accent/20" : "border-border-main/50 hover:border-border-main hover:shadow-xl",
        isDragging ? "opacity-80 scale-[1.02] shadow-2xl" : ""
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
          {card.images.length > 0 ? (
            <div className="flex flex-col h-full">
              <div className="relative w-full overflow-hidden shrink-0 bg-bg-main">
                <img 
                  src={card.images[0]} 
                  alt={card.name} 
                  loading="lazy"
                  decoding="async"
                  className="w-full h-auto object-cover relative z-10 transition-transform duration-700 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-main via-transparent to-transparent opacity-60 z-20 pointer-events-none" />
              </div>
              
              <div className="p-4 flex flex-col flex-1 bg-bg-surface">
                <h3 className="font-bold text-lg text-text-main mb-1.5 line-clamp-1">{card.name}</h3>
                {card.summary && (
                  <p className="text-xs text-text-muted line-clamp-2 leading-relaxed mb-3 flex-1">{card.summary}</p>
                )}
                
                {card.tags.length > 0 && (
                  <div 
                    className="relative mt-auto pt-2 border-t border-border-main/50"
                    onMouseEnter={handleTagInteraction}
                    onMouseLeave={() => handleTagInteraction()}
                    onTouchStart={handleTagInteraction}
                  >
                    <div 
                      ref={scrollContainerRef}
                      className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1 snap-x"
                      onScroll={handleTagInteraction}
                    >
                      {mainTagObj && (
                        <span className={cn("shrink-0 snap-start text-[10px] font-bold px-2.5 py-1 rounded-full text-text-main ring-1 ring-white/20", mainTagObj.color)}>
                          {card.mainTag ? '\u2605 ' : ''}{mainTagObj.name}
                        </span>
                      )}
                      
                      {!showAllTags && otherTags.length > 0 && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleTagInteraction(); }}
                          className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-bg-surface-hover text-text-muted hover:text-text-main transition-colors"
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
                            className={cn("shrink-0 snap-start text-[10px] font-medium px-2.5 py-1 rounded-full text-text-main shadow-sm", tag.color)}
                          >
                            {tag.name}
                          </motion.span>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              {showDates === true && (
                <div className="mt-3 flex items-center shrink-0">
                  <div className="bg-accent text-white px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide shadow-md flex items-center gap-1.5 w-max">
                    {card.updatedAt ? (
                      <>
                        <span className="text-white/80">Edited:</span>
                        {new Date(Number(card.updatedAt) || Date.now()).toLocaleDateString()}
                      </>
                    ) : (
                      <>
                        <span className="text-white/80">Created:</span>
                        {new Date(Number(card.createdAt) || Date.now()).toLocaleDateString()}
                      </>
                    )}
                  </div>
                </div>
              )}
              </div>
            </div>
          ) : (
            <div className="p-5 flex flex-col h-full">
              <h3 className="font-bold text-xl text-text-main mb-2 line-clamp-1">{card.name}</h3>
              {card.summary && (
                <p className="text-sm text-text-muted line-clamp-3 leading-relaxed mb-4 flex-1">{card.summary}</p>
              )}
              
              {card.tags.length > 0 && (
                <div 
                  className="relative mt-auto pt-3 border-t border-border-main/50"
                  onMouseEnter={handleTagInteraction}
                  onMouseLeave={() => handleTagInteraction()}
                  onTouchStart={handleTagInteraction}
                >
                  <div 
                    ref={scrollContainerRef}
                    className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1 snap-x"
                    onScroll={handleTagInteraction}
                  >
                    {mainTagObj && (
                      <span className={cn("shrink-0 snap-start text-[10px] font-bold px-2.5 py-1 rounded-full text-text-main ring-1 ring-white/20", mainTagObj.color)}>
                        {card.mainTag ? '\u2605 ' : ''}{mainTagObj.name}
                      </span>
                    )}
                    
                    {!showAllTags && otherTags.length > 0 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleTagInteraction(); }}
                        className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-bg-surface-hover text-text-muted hover:text-text-main transition-colors"
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
                          className={cn("shrink-0 snap-start text-[10px] font-medium px-2.5 py-1 rounded-full text-text-main shadow-sm", tag.color)}
                        >
                          {tag.name}
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {showDates === true && (
                <div className="mt-3 flex items-center shrink-0">
                  <div className="bg-accent text-white px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide shadow-md flex items-center gap-1.5 w-max">
                    {card.updatedAt ? (
                      <>
                        <span className="text-white/80">Edited:</span>
                        {new Date(Number(card.updatedAt) || Date.now()).toLocaleDateString()}
                      </>
                    ) : (
                      <>
                        <span className="text-white/80">Created:</span>
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
      
      {selected && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-10">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-10 h-10 bg-text-main rounded-full flex items-center justify-center shadow-xl"
          >
            <div className="w-4 h-4 bg-bg-surface rounded-full" />
          </motion.div>
        </div>
      )}
    </motion.div>
  );
});
