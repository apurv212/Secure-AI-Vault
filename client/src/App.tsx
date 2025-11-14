import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { Login } from './components/pages/Login';
import { Dashboard } from './components/pages/Dashboard';
import { SharedView } from './components/pages/SharedView';
import { Loading } from './components/ui/Loading';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  return (
    <Routes>
      {/* Public shared view route - no authentication required */}
      <Route path="/shared/:token" element={<SharedView />} />
      
      {/* Login route */}
      <Route 
        path="/login" 
        element={
          loading ? <Loading /> : user ? <Navigate to="/" replace /> : <Login />
        } 
      />
      
      {/* Protected dashboard route */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <AppContent />
          </Router>
        </ToastProvider>
      </AuthProvider>
    </Provider>
  );
}

export default App;
