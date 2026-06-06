// src/App.jsx
import { useState } from 'react';
import { AuthProvider, useAuth } from './store/AuthContext';
import LoginPage from './pages/LoginPage';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import PredictPage from './pages/PredictPage';
import AlertsPage from './pages/AlertsPage';
import ModelsPage from './pages/ModelsPage';

function AppInner() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('dashboard');

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0c0f', color: '#4a9eff', fontFamily: 'monospace', fontSize: 14, letterSpacing: 2 }}>
      INITIALIZING...
    </div>
  );

  if (!user) return <LoginPage />;

  const pages = { dashboard: DashboardPage, transactions: TransactionsPage, predict: PredictPage, alerts: AlertsPage, models: ModelsPage };
  const PageComponent = pages[page] || DashboardPage;

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      <PageComponent onNavigate={setPage} />
    </Layout>
  );
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>;
}
