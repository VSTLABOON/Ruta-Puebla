import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

export type AppRoute = '/' | '/taller' | '/admin';

interface RouterContextType {
  currentPath: string;
  activeRoute: AppRoute;
  navigate: (path: string) => void;
}

const RouterContext = createContext<RouterContextType>({
  currentPath: '/',
  activeRoute: '/',
  navigate: () => {}
});

function normalizeRoute(pathname: string): AppRoute {
  const clean = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (clean === '/taller' || clean === '/local' || clean === '/artesano' || clean === '/artesanos') {
    return '/taller';
  }
  if (clean === '/admin' || clean === '/gobierno' || clean === '/secihti' || clean === '/sostenibilidad') {
    return '/admin';
  }
  return '/';
}

export const RouterProvider = ({ children }: { children: ReactNode }) => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  const activeRoute = normalizeRoute(currentPath);

  const navigate = useCallback((path: string) => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname !== path) {
        window.history.pushState({}, '', path);
        setCurrentPath(path);
        window.dispatchEvent(new Event('app:navigation'));
      }
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('app:navigation', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('app:navigation', handlePopState);
    };
  }, []);

  return (
    <RouterContext.Provider value={{ currentPath, activeRoute, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = () => useContext(RouterContext);
