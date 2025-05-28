import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Header from './components/Header';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import EmployeeRegistration from './pages/EmployeeRegistration';
import AccessControl from './pages/AccessControl';
import LogSystem from './pages/LogSystem';
import Almoxarifado from './pages/Almoxarifado';
import { AuthProvider } from './contexts/AuthContext';
import { AccessControlProvider } from './contexts/AccessControlContext';

const AppContent = () => {
  const location = useLocation();
  const isAlmoxarifado = location.pathname === '/almoxarifado';

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      <Header />
      <div className="pt-20">
        {isAlmoxarifado ? (
          <Almoxarifado />
        ) : (
          <Layout>
            <Routes>
              <Route path="/\" element={<Dashboard />} />
              <Route path="/employees" element={<EmployeeRegistration />} />
              <Route path="/access" element={<AccessControl />} />
              <Route path="/logs" element={<LogSystem />} />
            </Routes>
          </Layout>
        )}
      </div>
    </>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AccessControlProvider>
          <Routes>
            <Route path="*" element={<AppContent />} />
          </Routes>
        </AccessControlProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;