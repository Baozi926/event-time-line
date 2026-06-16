'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type ConfirmDialogVariant = 'default' | 'destructive';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '确定',
  cancelLabel = '取消',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open) return null;

  const confirmClass =
    variant === 'destructive'
      ? 'rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-red-200/60 transition hover:from-red-600 hover:to-orange-600 disabled:opacity-50'
      : 'rounded-full bg-gradient-to-r from-brand-600 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-200/60 transition hover:from-brand-700 hover:to-blue-600 disabled:opacity-50';

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/25 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm overflow-hidden rounded-[1.35rem] border border-blue-100 bg-white shadow-2xl shadow-slate-900/15"
      >
        <div className="h-1 bg-gradient-to-r from-brand-500 via-blue-400 to-orange-400" />
        <div className="p-5">
          <h2 id="confirm-dialog-title" className="text-base font-bold text-slate-900">
            {title}
          </h2>
          {description && (
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {description}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
              disabled={loading}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={confirmClass}
              disabled={loading}
            >
              {loading ? '处理中…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
