'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import Dialog from './Dialog';

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const close = useCallback(() => setDialog(null), []);

  const alert = useCallback(
    ({ title = 'Notice', message, variant = 'info', confirmLabel = 'OK' } = {}) =>
      new Promise((resolve) => {
        setDialog({
          open: true,
          type: 'alert',
          title,
          message,
          variant,
          confirmLabel,
          onClose: () => {
            close();
            resolve();
          },
        });
      }),
    [close]
  );

  const confirm = useCallback(
    ({
      title = 'Confirm',
      message,
      variant = 'warning',
      confirmLabel = 'Confirm',
      cancelLabel = 'Cancel',
    } = {}) =>
      new Promise((resolve) => {
        setDialog({
          open: true,
          type: 'confirm',
          title,
          message,
          variant,
          confirmLabel,
          cancelLabel,
          onConfirm: () => {
            close();
            resolve(true);
          },
          onCancel: () => {
            close();
            resolve(false);
          },
        });
      }),
    [close]
  );

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}
      {dialog && (
        <Dialog
          open={dialog.open}
          type={dialog.type}
          title={dialog.title}
          message={dialog.message}
          variant={dialog.variant}
          confirmLabel={dialog.confirmLabel}
          cancelLabel={dialog.cancelLabel}
          onClose={dialog.onClose}
          onConfirm={dialog.onConfirm}
          onCancel={dialog.onCancel}
        />
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return ctx;
}
