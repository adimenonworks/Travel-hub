import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { PageSkeleton } from '../design/components';
import { AuthProvider, useAuth } from '../data/hooks';
import { SignIn } from '../features/auth/SignIn';
import { Home } from '../features/home/Home';
import { Trips } from '../features/home/Trips';
import { Join } from '../features/trip/Join';
import { TripPage } from '../features/trip/TripPage';
import { CountryCollection, Favourites } from '../features/saves/Collections';
import { ProfilePage } from '../features/profile/ProfilePage';
import { Shell } from './Shell';

// The design reference page is for builders only, so it loads on demand.
const DesignSystem = lazy(() => import('../features/design/DesignSystem').then((m) => ({ default: m.DesignSystem })));

function Routed() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  if (loading) return <PageSkeleton />;
  if (pathname === '/design' && !user) return <DesignSystem />;
  if (!user) {
    const joining = pathname.startsWith('/join/');
    return <SignIn message={joining ? "You've been invited to a trip. Sign in to join." : undefined} />;
  }
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/trips" element={<Trips />} />
        {/* Links shared to Rove arrive at #/save?url=… (the Shell opens Save to Rove) */}
        <Route path="/save" element={<Home />} />
        <Route path="/trip/:tripId/*" element={<TripPage />} />
        <Route path="/join/:code" element={<Join />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/favourites" element={<Favourites />} />
        <Route path="/profile/collections/*" element={<Navigate to="/profile/favourites" replace />} />
        <Route path="/saved/:country" element={<CountryCollection />} />
        <Route path="/design" element={<Suspense fallback={null}><DesignSystem /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}

export function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routed />
      </AuthProvider>
    </HashRouter>
  );
}
