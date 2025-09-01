import React from 'react';
import { useStore } from '@nanostores/react';
import { sharedStore, removeNotification } from '../../stores/shared';

export default function NotificationContainer() {
  const shared = useStore(sharedStore);

  if (shared.notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {shared.notifications.map((notification) => (
        <div
          key={notification.id}
          className={`max-w-sm p-4 rounded-lg shadow-lg border transition-all duration-300 ${
            notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium flex-1">{notification.message}</p>
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}