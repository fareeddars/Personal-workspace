import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, Activity, Search } from 'lucide-react';
import { api } from '../services/api.ts';
import type { ActivityLogItem } from '../types.ts';

export const ActivityLogsView: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getActivityLogs();
      setLogs(res.logs);
    } catch (err) {
      console.error('Failed to load activity logs', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(l => 
    !filter || 
    l.action.toLowerCase().includes(filter.toLowerCase()) || 
    (l.details && l.details.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Security Audit & Activity Trail
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              Immutable Log
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tamper-resistant audit log of document uploads, downloads, sharing grants, and administrative operations.
          </p>
        </div>

        <div className="relative">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter actions or details..."
            className="h-9 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-[#101917] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading audit trail...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <Activity className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p>No activity logs recorded yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredLogs.map(log => (
              <div key={log.id} className="p-4 flex items-start gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                <div className="flex-1 truncate">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300">
                      {log.action.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      • {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    {log.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
