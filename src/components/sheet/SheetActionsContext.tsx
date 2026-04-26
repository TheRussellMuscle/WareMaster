import * as React from 'react';
import type { SheetDialogs } from './useSheetDialogs';

/**
 * Exposes the dialog-launcher callbacks to child components without
 * prop-drilling. Use `useSheetActions()` inside any descendant of the
 * character sheet to open the right dialog for a contextual button.
 */
const SheetActionsContext = React.createContext<SheetDialogs | null>(null);

export function SheetActionsProvider({
  value,
  children,
}: {
  value: SheetDialogs;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <SheetActionsContext.Provider value={value}>
      {children}
    </SheetActionsContext.Provider>
  );
}

export function useSheetActions(): SheetDialogs {
  const ctx = React.useContext(SheetActionsContext);
  if (!ctx) {
    throw new Error(
      'useSheetActions must be used inside a <SheetActionsProvider>',
    );
  }
  return ctx;
}

/**
 * Same as useSheetActions, but returns null if not in a SheetActionsProvider.
 * Use this in components that may render either inside the sheet (with action
 * buttons) or in other contexts (reference browser — no action buttons).
 */
export function useOptionalSheetActions(): SheetDialogs | null {
  return React.useContext(SheetActionsContext);
}
