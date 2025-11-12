import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/pages/Login';
import { Dashboard } from './components/pages/Dashboard';
import { Loading } from './components/ui/Loading';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return <Login />;
  }

  return <Dashboard />;
};

function App() {
  return (
    <Provider store={store}>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
    </Provider>
  );
}

export default App;
