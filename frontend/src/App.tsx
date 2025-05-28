import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Header from './components/Header';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import EmployeeRegistration from './pages/EmployeeRegistration';
import TagManagement from './pages/TagManagement';
import AccessControl from './pages/AccessControl';
import LogSystem from './pages/LogSystem';
import { AuthProvider } from './contexts/AuthContext';
import { AccessControlProvider } from './contexts/AccessControlContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <AccessControlProvider>
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
          <div className="pt-20"> {/* Add padding to account for fixed header */}
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/employees" element={<EmployeeRegistration />} />
                <Route path="/tags" element={<TagManagement />} />
                <Route path="/access" element={<AccessControl />} />
                <Route path="/logs" element={<LogSystem />} />
              </Routes>
            </Layout>
          </div>
        </AccessControlProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;