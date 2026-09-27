'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { adminThemeCookie, type AdminTheme } from '@/shared/lib/admin-theme';

type AdminThemeContextValue = {
  theme: AdminTheme;
  setTheme: (theme: AdminTheme) => void;
};

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

/**
 * Holds the dashboard's theme choice and renders the element brandbook.css
 * keys the admin palette off.
 *
 * `:root:has([data-admin-theme='dark'])` re-colours the whole document from
 * that one attribute, so switching needs no reload. The wrapper is
 * `display: contents` and adds nothing to layout.
 */
export function AdminThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: AdminTheme;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState(initialTheme);

  const setTheme = useCallback((next: AdminTheme) => {
    // Persisted so the server renders the same choice on the next request.
    document.cookie = adminThemeCookie(next, window.location.protocol === 'https:');
    setThemeState(next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <AdminThemeContext value={value}>
      <div data-admin-theme={theme} className="contents">
        {children}
      </div>
    </AdminThemeContext>
  );
}

export function useAdminTheme(): AdminThemeContextValue {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error('useAdminTheme() must be used inside <AdminThemeProvider>.');
  }
  return context;
}
