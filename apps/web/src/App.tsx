import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import {
  Dashboard,
  NewResearch,
  Workspace,
  History,
  Approvals,
  Payments
} from './pages';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Shell />}>
        <Route index element={<Dashboard />} />
        <Route path="research/new" element={<NewResearch />} />
        <Route path="research/:id" element={<Workspace />} />
        <Route path="history" element={<History />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="payments" element={<Payments />} />
      </Route>
    </Routes>
  );
}

export default App;
