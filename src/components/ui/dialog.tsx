'use client';

import { ReactNode } from 'react';

interface DialogProps {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
}

export function Dialog({ children, open, onClose }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg p-6 max-w-md w-full">
        {children}
      </div>
    </div>
  );
}