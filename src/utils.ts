import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useState, useCallback, useRef } from 'react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId() {
  return crypto.randomUUID();
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

export function compressImage(file: File, maxWidth = 1200, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onerror = error => reject(error);
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch {
          resolve(reader.result as string);
        }
      };
      img.onerror = () => resolve(reader.result as string);
      img.src = reader.result as string;
    };
  });
}

export const haptics = {
  light: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  },
  medium: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
  },
  heavy: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }
  }
};

export function useUndoRedo<T>(initialState: T, onChange?: (state: T) => void) {
  const [state, setState] = useState<{ past: T[], present: T, future: T[] }>({
    past: [],
    present: initialState,
    future: []
  });
  const lastSetTime = useRef<number>(Date.now());
  const onChangeRef = useRef(onChange);

  onChangeRef.current = onChange;

  const set = useCallback((newState: T) => {
    const now = Date.now();
    
    setState(prevState => {
      // Group changes if they happen within 500ms of each other
      if (now - lastSetTime.current < 500 && prevState.past.length > 0) {
        return {
          ...prevState,
          present: newState
        };
      }
      return {
        past: [...prevState.past, prevState.present],
        present: newState,
        future: []
      };
    });
    
    lastSetTime.current = now;
  }, []);

  const undo = useCallback(() => {
    setState(prevState => {
      if (prevState.past.length === 0) return prevState;
      
      const previous = prevState.past[prevState.past.length - 1];
      const newPast = prevState.past.slice(0, prevState.past.length - 1);
      
      if (onChangeRef.current) {
        onChangeRef.current(previous);
      }
      
      return {
        past: newPast,
        present: previous,
        future: [prevState.present, ...prevState.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(prevState => {
      if (prevState.future.length === 0) return prevState;
      
      const next = prevState.future[0];
      const newFuture = prevState.future.slice(1);
      
      if (onChangeRef.current) {
        onChangeRef.current(next);
      }
      
      return {
        past: [...prevState.past, prevState.present],
        present: next,
        future: newFuture
      };
    });
  }, []);

  const commit = useCallback(() => {
    lastSetTime.current = 0;
  }, []);

  const reset = useCallback((newState: T) => {
    setState({
      past: [],
      present: newState,
      future: []
    });
    lastSetTime.current = Date.now();
  }, []);

  return {
    state: state.present,
    set,
    undo,
    redo,
    commit,
    reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0
  };
}
