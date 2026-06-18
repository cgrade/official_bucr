'use client';

import { Bell } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notifications</h1>
        <p className="text-slate-500 mt-1">System notifications and alerts</p>
      </div>

      {/* Empty State */}
      <div className="glass-card rounded-xl p-12 text-center">
        <Bell className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
          No Notifications
        </h3>
        <p className="text-slate-500 text-sm">
          System notifications will appear here when there are important events.
        </p>
      </div>
    </div>
  );
}
