'use client';

import { DialogProvider } from './components/ui/DialogProvider';

export function Providers({ children }) {
  return <DialogProvider>{children}</DialogProvider>;
}
