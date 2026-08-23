import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Landing } from './pages/Landing';
import {
  Dashboard,
  NewResearch,
  Workspace,
  History,
  Approvals,
  Payments,
  Login,
  Signup
} from './pages';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Shell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/research/new" element={<NewResearch />} />
          <Route path="/research/:id" element={<Workspace />} />
          <Route path="/history" element={<History />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/payments" element={<Payments />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
