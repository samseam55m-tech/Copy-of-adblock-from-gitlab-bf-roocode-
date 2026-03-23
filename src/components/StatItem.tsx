import React, { useState, useEffect, useRef } from 'react';
import { Copy } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { cn } from '../utils';

interface StatItemProps {
  stat: any;
  index: number;
  onClick: (stat: any) => void;
}

export const StatItem = React.memo(function StatItem({ stat, index, onClick }: StatItemProps) {
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
    minHeight: itemHeight ? `${itemHeight}px` : '72px',
  };

  return (
    <div
      ref={inViewRef}
      style={{ ...style, boxShadow: 'var(--surface-elevation-1)' }}
      onClick={() => onClick(stat)}
      className="bg-bg-surface border border-border-main/50 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-bg-surface-hover transition-all group"
    >
      {inView ? (
        <div ref={contentRef} className="flex items-center justify-between w-full h-full">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold text-sm shrink-0">
              #{index + 1}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-text-main line-clamp-1">
                {stat.title} 
                <span className="text-xs text-text-muted ml-2 font-normal">
                  ({stat.generationName ? `${stat.generationName} - ` : ''}{stat.variationName})
                </span>
              </h3>
              <p className="text-xs text-text-muted line-clamp-1 mt-0.5">
                from {stat.parentName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-text-muted bg-bg-main px-3 py-1.5 rounded-xl border border-border-main/50 shrink-0 ml-3 group-hover:border-accent/30 transition-colors">
            <Copy className="w-3.5 h-3.5" />
            <span className="font-semibold text-sm text-text-main">{stat.copyCount}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
});
