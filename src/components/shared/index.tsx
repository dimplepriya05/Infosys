import type { ReactNode } from 'react';
import type { BadgeVariant } from '@/types';

// ─── Badge ────────────────────────────────────────────────────────────────────

interface BadgeProps { variant?: BadgeVariant; children: ReactNode; dot?: boolean; }

export function Badge({ variant = 'gray', children, dot }: BadgeProps) {
  return (
    <span className={`badge badge-${variant}`}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />}
      {children}
    </span>
  );
}

// ─── Status / Priority Badges ─────────────────────────────────────────────────

import { getStatusBadgeVariant, getPriorityBadgeVariant } from '@/utils/helpers';

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={getStatusBadgeVariant(status)}>{status}</Badge>;
}
export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge variant={getPriorityBadgeVariant(priority)}>{priority}</Badge>;
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ size = 20, color = '#2563eb' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke={color} strokeOpacity=".25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number | string;
}
export function Modal({ isOpen, onClose, title, children, footer, width = 500 }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-box" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
}
export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'primary' }: ConfirmProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} width={420}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className={`btn btn-${variant === 'danger' ? 'danger' : 'primary'}`} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
        </>
      }
    >
      <p style={{ fontSize: '.9375rem', color: '#475569', lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

interface ProgressProps { value: number; color?: string; height?: number; }
export function ProgressBar({ value, color = '#2563eb', height = 6 }: ProgressProps) {
  return (
    <div className="progress-bar" style={{ height }}>
      <div className="progress-fill" style={{ width: `${Math.min(100, value)}%`, background: color }} />
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

interface EmptyProps { icon?: string; title: string; description?: string; action?: ReactNode; }
export function EmptyState({ icon = '📭', title, description, action }: EmptyProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', marginBottom: '.5rem', color: '#334155' }}>{title}</h3>
      {description && <p style={{ color: '#64748b', fontSize: '.875rem', maxWidth: 360, margin: '0 auto' }}>{description}</p>}
      {action && <div style={{ marginTop: '1.25rem' }}>{action}</div>}
    </div>
  );
}

// ─── Alert ────────────────────────────────────────────────────────────────────

type AlertVariant = 'info' | 'success' | 'warning' | 'danger';
const ALERT_ICONS: Record<AlertVariant, string> = { info: 'ℹ️', success: '✅', warning: '⚠️', danger: '❌' };

interface AlertProps { variant?: AlertVariant; title?: string; children: ReactNode; }
export function Alert({ variant = 'info', title, children }: AlertProps) {
  return (
    <div className={`alert alert-${variant}`}>
      <span style={{ fontSize: '1.25rem', flexShrink: 0, marginTop: '.05rem' }}>{ALERT_ICONS[variant]}</span>
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: '.25rem' }}>{title}</div>}
        <div style={{ fontSize: '.875rem', lineHeight: 1.6 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

interface TabsProps {
  tabs: { id: string; label: string; icon?: string }[];
  active: string;
  onChange: (id: string) => void;
}
export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <div
          key={t.id}
          className={`tab-item ${active === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
          role="tab"
          aria-selected={active === t.id}
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onChange(t.id)}
        >
          {t.icon && <span style={{ marginRight: '.3rem' }}>{t.icon}</span>}
          {t.label}
        </div>
      ))}
    </div>
  );
}

// ─── Filter Pills ─────────────────────────────────────────────────────────────

interface FilterPillsProps { options: string[]; active: string; onChange: (v: string) => void; }
export function FilterPills({ options, active, onChange }: FilterPillsProps) {
  return (
    <div className="filter-pills">
      {options.map((opt) => (
        <button key={opt} className={`pill ${active === opt ? 'active' : ''}`} onClick={() => onChange(opt)}>
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─── Shimmer Skeleton ─────────────────────────────────────────────────────────

export function Skeleton({ width = '100%', height = 16, className = '' }: { width?: string | number; height?: number; className?: string }) {
  return <div className={`shimmer ${className}`} style={{ width, height, borderRadius: 8 }} />;
}

// ─── Paginator ────────────────────────────────────────────────────────────────

interface PaginatorProps {
  page: number; totalPages: number; total: number; pageSize: number;
  onPrev: () => void; onNext: () => void; onGoTo: (p: number) => void;
}
export function Paginator({ page, totalPages, total, pageSize, onPrev, onNext }: PaginatorProps) {
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: '.8125rem', color: '#64748b' }}>Showing {start}–{end} of {total}</span>
      <div style={{ display: 'flex', gap: '.5rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={onPrev} disabled={page <= 1}>← Prev</button>
        <span style={{ display: 'flex', alignItems: 'center', fontSize: '.875rem', color: '#475569', padding: '0 .5rem' }}>
          Page {page} of {totalPages}
        </span>
        <button className="btn btn-secondary btn-sm" onClick={onNext} disabled={page >= totalPages}>Next →</button>
      </div>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

interface AvatarProps { initials?: string; bg?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; onClick?: () => void; }
export function Avatar({ initials = '?', bg = 'var(--teal)', size = 'md', onClick }: AvatarProps) {
  return (
    <div className={`avatar avatar-${size}`} style={{ background: bg, color: '#fff' }} onClick={onClick}>
      {initials}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

interface SectionHeaderProps { title: ReactNode; subtitle?: string; actions?: ReactNode; }
export function SectionHeader({ title, subtitle, actions }: SectionHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>{actions}</div>}
      </div>
    </div>
  );
}

// ─── Info Grid ────────────────────────────────────────────────────────────────

interface InfoGridItem { label: string; value: ReactNode; }
interface InfoGridProps { items: InfoGridItem[]; cols?: number; }
export function InfoGrid({ items, cols = 2 }: InfoGridProps) {
  return (
    <div className="info-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {items.map((item) => (
        <div key={item.label}>
          <div className="info-item-label">{item.label}</div>
          <div className="info-item-value">{item.value ?? '—'}</div>
        </div>
      ))}
    </div>
  );
}
