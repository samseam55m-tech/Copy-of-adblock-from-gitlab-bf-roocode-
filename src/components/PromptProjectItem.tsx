import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Pin } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { cn } from '../utils';
import { PromptProject } from '../types';

interface PromptProjectItemProps {
  project: PromptProject;
  isSelected: boolean;
  selectionMode: boolean;
  onClick: (id: string) => void;
  onLongPress: (id: string) => void;
}

export const PromptProjectItem = React.memo(function PromptProjectItem({
  project,
  isSelected,
  selectionMode,
  onClick,
  onLongPress
}: PromptProjectItemProps) {
  const { ref: inViewRef, inView } = useInView({
    rootMargin: '600px 0px',
    triggerOnce: false,
  });

  const [itemHeight, setItemHeight] = useState<number | undefined>(undefined);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inView && contentRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setItemHeight(entry.contentRect.height);
        }
      });
      observer.observe(contentRef.current);
      return () => observer.disconnect();
    }
  }, [inView]);

  const style = {
    minHeight: itemHeight ? `${itemHeight}px` : '150px',
  };

  let timer: ReturnType<typeof setTimeout>;

  const handleTouchStart = () => {
    timer = setTimeout(() => {
      onLongPress(project.id);
    }, 500);
  };

  const handleTouchEnd = () => {
    clearTimeout(timer);
  };

  return (
    <div
      ref={inViewRef}
      style={{ ...style, boxShadow: isSelected ? undefined : 'var(--surface-elevation-1)' }}
      onClick={() => onClick(project.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress(project.id);
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      className={cn(
        "bg-bg-surface border rounded-[var(--card-radius)] p-5 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all aspect-square relative group select-none",
        isSelected 
          ? "border-accent ring-2 ring-accent/30 bg-accent/5" 
          : "border-border-main/40 hover:bg-bg-surface-hover hover:border-border-main"
      )}
    >
      {inView ? (
        <div ref={contentRef} className="flex flex-col items-center justify-center w-full h-full">
          {project.isPinned && !isSelected && (
            <div className="absolute top-3 left-3 text-text-muted/50">
              <Pin className="w-3.5 h-3.5" />
            </div>
          )}

          <div className="w-14 h-14 rounded-2xl bg-bg-main/50 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <BookOpen className={cn("w-8 h-8 transition-colors", project.color || "text-text-muted group-hover:text-accent")} />
          </div>
          
          <div className="text-center w-full px-2 mt-1">
            <span className="font-semibold text-sm text-text-main line-clamp-1">{project.name}</span>
            <span className="text-xs text-text-muted mt-1 block">{project.blocks?.length || 0} blocks</span>
          </div>
        </div>
      ) : null}
    </div>
  );
});
