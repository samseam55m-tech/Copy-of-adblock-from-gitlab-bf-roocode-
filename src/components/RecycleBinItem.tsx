import React, { useState, useEffect, useRef } from 'react';
import { Trash2, RefreshCcw, Image as ImageIcon, FileText, AlignLeft } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

interface RecycleBinItemProps {
  item: any;
  type: 'card' | 'prompt' | 'block';
  daysRemaining: number;
  onRestore: (id: string) => void;
  onDelete: (id: string, type: 'card' | 'prompt' | 'block') => void;
}

export const RecycleBinItem = React.memo(function RecycleBinItem({
  item,
  type,
  daysRemaining,
  onRestore,
  onDelete
}: RecycleBinItemProps) {
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
    minHeight: itemHeight ? `${itemHeight}px` : '80px',
  };

  const isUrgent = daysRemaining <= 7;

  return (
    <div
      ref={inViewRef}
      style={{ ...style, boxShadow: 'var(--surface-elevation-1)' }}
      className="bg-bg-surface border border-border-main/50 rounded-2xl p-4 flex items-center justify-between transition-all hover:bg-bg-surface-hover group"
    >
      {inView ? (
        <div ref={contentRef} className="flex items-center justify-between w-full h-full">
          <div className="flex items-center gap-3.5 min-w-0">
            {type === 'card' ? (
              item.images && item.images.length > 0 ? (
                <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-border-main/30">
                  <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-xl bg-bg-main flex items-center justify-center shrink-0 border border-border-main/30">
                  <FileText className="w-5 h-5 text-text-muted/60" />
                </div>
              )
            ) : type === 'prompt' ? (
              <div className="w-11 h-11 rounded-xl bg-bg-main flex items-center justify-center shrink-0 border border-border-main/30">
                <ImageIcon className="w-5 h-5 text-text-muted/60" />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-xl bg-bg-main flex items-center justify-center shrink-0 border border-border-main/30">
                <AlignLeft className="w-5 h-5 text-text-muted/60" />
              </div>
            )}
            <div className="min-w-0">
              <h4 className="font-semibold text-sm text-text-main line-clamp-1">{item.name || item.title}</h4>
              <p className={`text-xs mt-0.5 ${isUrgent ? 'text-red-400 font-medium' : 'text-text-muted'}`}>
                {daysRemaining} days remaining
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-3">
            <button 
              onClick={() => onRestore(item.id)}
              className="p-2.5 text-text-muted hover:text-green-500 hover:bg-green-500/10 rounded-xl transition-colors"
              title="Restore"
            >
              <RefreshCcw className="w-[18px] h-[18px]" />
            </button>
            <button 
              onClick={() => onDelete(item.id, type)}
              className="p-2.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
              title="Delete Permanently"
            >
              <Trash2 className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
});
