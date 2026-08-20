import React from 'react';
import { Sidebar } from './Sidebar';
import { Outlet } from 'react-router-dom';

export const Shell = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--color-bg-base)]">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="flex-1 max-w-5xl mx-auto w-full p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
