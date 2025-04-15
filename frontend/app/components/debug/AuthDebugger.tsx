'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

/**
 * Auth Debugger Component
 * 
 * This component provides a visual representation of the current authentication state
 * that persists across page refreshes.
 */
export default function AuthDebugger() {
  const { token, user, isAuthenticated } = useAuthStore();
  const [visible, setVisible] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<Record<string, any[]>>({});
  
  // Load logs on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loadLogs = () => {
        const authLogs = JSON.parse(localStorage.getItem('debug-logs') || '[]');
        const serviceLogs = JSON.parse(localStorage.getItem('auth-service-logs') || '[]');
        const routeGuardLogs = JSON.parse(localStorage.getItem('route-guard-logs') || '[]');
        
        setAllLogs({
          'Auth Store': authLogs,
          'Auth Service': serviceLogs,
          'Route Guard': routeGuardLogs
        });
        
        // Combine all logs and sort by timestamp
        const combined = [
          ...authLogs.map((log: any) => ({ ...log, source: 'Auth Store' })),
          ...serviceLogs.map((log: any) => ({ ...log, source: 'Auth Service' })),
          ...routeGuardLogs.map((log: any) => ({ ...log, source: 'Route Guard' })),
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        setLogs(combined.slice(0, 20)); // Show only the latest 20 logs
      };
      
      // Load logs initially
      loadLogs();
      
      // Set up interval to refresh logs
      const interval = setInterval(loadLogs, 1000);
      
      // Record auth state at load
      const authStateLog = {
        timestamp: new Date().toISOString(),
        message: 'Page loaded/refreshed',
        data: JSON.stringify({
          isAuthenticated,
          hasToken: !!token,
          user: user ? { id: user.userId, role: user.role } : null
        }),
        source: 'Debugger'
      };
      
      const existingLogs = JSON.parse(localStorage.getItem('auth-debugger-logs') || '[]');
      existingLogs.push(authStateLog);
      if (existingLogs.length > 50) existingLogs.shift();
      localStorage.setItem('auth-debugger-logs', JSON.stringify(existingLogs));
      
      return () => clearInterval(interval);
    }
  }, [token, user, isAuthenticated]);
  
  if (!visible) {
    return (
      <button 
        className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded-full shadow-lg z-50"
        onClick={() => setVisible(true)}
      >
        🐞
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-0 right-0 w-full md:w-1/2 lg:w-1/3 bg-gray-900 text-white p-4 shadow-lg z-50 overflow-auto max-h-64 opacity-90">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold">Auth Debugger</h3>
        <div>
          <button 
            className="text-xs bg-red-600 px-2 py-1 rounded mr-2"
            onClick={() => {
              localStorage.removeItem('debug-logs');
              localStorage.removeItem('auth-service-logs');
              localStorage.removeItem('route-guard-logs');
              localStorage.removeItem('auth-debugger-logs');
              setLogs([]);
              setAllLogs({});
            }}
          >
            Clear Logs
          </button>
          <button 
            className="text-xs bg-gray-600 px-2 py-1 rounded"
            onClick={() => setVisible(false)}
          >
            Minimize
          </button>
        </div>
      </div>
      
      <div className="flex text-xs mb-2 p-2 bg-gray-800 rounded">
        <div className="w-1/3">
          <div className="font-bold">Auth Status:</div>
          <div className={`${isAuthenticated ? 'text-green-400' : 'text-red-400'}`}>
            {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
          </div>
        </div>
        <div className="w-1/3">
          <div className="font-bold">Token:</div>
          <div className={`${token ? 'text-green-400' : 'text-red-400'}`}>
            {token ? token.substring(0, 12) + '...' : 'No Token'}
          </div>
        </div>
        <div className="w-1/3">
          <div className="font-bold">User:</div>
          <div className={`${user ? 'text-green-400' : 'text-red-400'}`}>
            {user ? `${user.firstName} (${user.role})` : 'No User'}
          </div>
        </div>
      </div>
      
      <div className="text-xs mt-3">
        <div className="font-bold mb-1">Recent Logs:</div>
        <div className="h-24 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className="py-1 border-b border-gray-700">
              <div className="flex justify-between">
                <span className={`
                  font-mono ${
                    log.source === 'Auth Store' 
                      ? 'text-blue-400' 
                      : log.source === 'Auth Service'
                        ? 'text-green-400'
                        : 'text-purple-400'
                  }`
                }>
                  [{log.source}]
                </span>
                <span className="text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
              <div>{log.message}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 