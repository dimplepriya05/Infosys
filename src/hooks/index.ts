import { useState, useCallback, useRef, useEffect } from 'react';
import type { FilterState } from '@/types';

// ─── useDisclosure ────────────────────────────────────────────────────────────
// Controls open/close state (modals, dropdowns, etc.)

export function useDisclosure(initial = false) {
  const [isOpen, setOpen] = useState(initial);
  const open    = useCallback(() => setOpen(true), []);
  const close   = useCallback(() => setOpen(false), []);
  const toggle  = useCallback(() => setOpen((o) => !o), []);
  return { isOpen, open, close, toggle };
}

// ─── useOutsideClick ──────────────────────────────────────────────────────────

export function useOutsideClick<T extends HTMLElement>(callback: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) callback();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [callback]);
  return ref;
}

// ─── useFilter ────────────────────────────────────────────────────────────────

export function useFilter(initial?: Partial<FilterState>) {
  const [filters, setFilters] = useState<FilterState>({
    status: 'All', priority: 'All', search: '', assignee: 'All', page: 1,
    ...initial,
  });
  const setFilter = useCallback((key: keyof FilterState, value: string | number) => {
    setFilters((prev) => ({ ...prev, [key]: value, ...(key !== 'page' ? { page: 1 } : {}) }));
  }, []);
  const reset = useCallback(() => {
    setFilters({ status: 'All', priority: 'All', search: '', assignee: 'All', page: 1 });
  }, []);
  return { filters, setFilter, reset };
}

// ─── useLocalStorage ──────────────────────────────────────────────────────────

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });
  const set = useCallback((v: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);
  return [value, set] as const;
}

// ─── useDebounce ──────────────────────────────────────────────────────────────

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── usePagination ────────────────────────────────────────────────────────────

export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const start      = (page - 1) * pageSize;
  const pageItems  = items.slice(start, start + pageSize);
  const goTo       = useCallback((p: number) => setPage(Math.min(Math.max(1, p), totalPages)), [totalPages]);
  const next       = useCallback(() => goTo(page + 1), [page, goTo]);
  const prev       = useCallback(() => goTo(page - 1), [page, goTo]);
  return { page, totalPages, pageItems, goTo, next, prev, hasPrev: page > 1, hasNext: page < totalPages };
}

// ─── useUpload ────────────────────────────────────────────────────────────────

import type { UploadedFile } from '@/types';
import { generateId, isValidFileType } from '@/utils/helpers';

export function useUpload(initialFiles: UploadedFile[] = []) {
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles);

  const addFiles = useCallback((rawFiles: File[]) => {
    const valid = rawFiles.filter((f) => isValidFileType(f.type) && f.size <= 2 * 1024 * 1024);
    const invalidType = rawFiles.filter(f => !isValidFileType(f.type)).length;
    const invalidSize = rawFiles.filter(f => f.size > 2 * 1024 * 1024).length;

    const newFiles: UploadedFile[] = valid.map((f) => ({
      id: generateId('file'), name: f.name, size: f.size,
      mimeType: f.type, progress: 0, status: 'uploading' as const, file: f,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    // Simulate upload progress
    newFiles.forEach((file) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 25 + 5;
        if (progress >= 100) {
          clearInterval(interval);
          setFiles((prev) =>
            prev.map((f) => f.id === file.id ? { ...f, progress: 100, status: 'done' } : f)
          );
        } else {
          setFiles((prev) =>
            prev.map((f) => f.id === file.id ? { ...f, progress: Math.min(99, progress) } : f)
          );
        }
      }, 200);
    });

    return { invalidType, invalidSize };
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const updateFile = useCallback((id: string, updates: Partial<UploadedFile>) => {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, ...updates } : f));
  }, []);

  const clearFiles = useCallback(() => setFiles([]), []);

  return { files, addFiles, removeFile, updateFile, clearFiles };
}
