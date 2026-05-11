import { Toaster } from "@/components/ui/toaster"
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query'
import { initAdMob, maybeShowAdOnOpen } from '@/lib/admob';
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import CollectionDetail from '@/pages/CollectionDetail';
import ItemDetail from '@/pages/ItemDetail';
import Appraise from '@/pages/Appraise';
import PublicCollection from '@/pages/PublicCollection';
import Settings from '@/pages/Settings';
import Legal from '@/pages/Legal';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/collections/:id" element={<CollectionDetail />} />
        <Route path="/collections/:collectionId/items/:itemId" element={<ItemDetail />} />
        <Route path="/appraise" element={<Appraise />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  useEffect(() => { initAdMob().then(() => maybeShowAdOnOpen()); }, []);

  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <Routes>
          {/* Fully public — no auth wrapper at all */}
          <Route path="/share/:token" element={<PublicCollection />} />
          <Route path="/legal" element={<Legal />} />

          {/* Everything else requires auth */}
          <Route
            path="*"
            element={
              <AuthProvider>
                <AuthenticatedApp />
                <Toaster />
              </AuthProvider>
            }
          />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;