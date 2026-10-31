import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Spinner } from '../design/components';
import { AuthProvider, useAuth } from '../data/hooks';
import { SignIn } from '../features/auth/SignIn';
import { DesignSystem } from '../features/design/DesignSystem';
import { Home } from '../features/home/Home';
import { Join } from '../features/trip/Join';
import { TripPage } from '../features/trip/TripPage';
import { CollectionPage } from '../features/profile/Collections';
import { ProfilePage } from '../features/profile/ProfilePage';
import { Shell } from './Shell';

function Routed() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  if (loading) return <Spinner center />;
  if (pathname === '/design' && !user) return <DesignSystem />;
  if (!user) {
    const joining = pathname.startsWith('/join/');
    return <SignIn message={joining ? "You've been invited to a trip. Sign in to join." : undefined} />;
  }
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/trip/:tripId/*" element={<TripPage />} />
        <Route path="/join/:code" element={<Join />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/collections/:key" element={<CollectionPage />} />
        <Route path="/design" element={<DesignSystem />} />
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
