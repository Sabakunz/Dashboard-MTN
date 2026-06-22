import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { apiFetch } from './api.js';
import { useAuth } from './AuthContext.jsx';

const AppContext = createContext(null);

const EMPTY_KPI = { breakdowns: 0, downtime_hrs: 0, planned_hours: 0, availability: 0, performance: 0, quality: 0, oee: 0, mtbf: 0, mttr: 0 };

export function AppProvider({ children }) {
  const { logout } = useAuth();
  const [period, setPeriod] = useState('week');
  const [kpi, setKpi] = useState(EMPTY_KPI);
  const [machines, setMachines] = useState([]);
  const [breakdowns, setBreakdowns] = useState([]);
  const [pareto, setPareto] = useState([]);
  const [paretoMachines, setParetoMachines] = useState([]);
  const [downtime, setDowntime] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('—');
  const [notifications, setNotifications] = useState([]);
  const loadingRef = useRef(false);

  const addNotif = useCallback((text, color = 'yellow') => {
    setNotifications((n) => [{ text, color, time: new Date(), unread: true, id: Math.random() }, ...n]);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((n) => n.map((x) => ({ ...x, unread: false })));
  }, []);

  const clearNotifs = useCallback(() => setNotifications([]), []);

  const loadAll = useCallback(async (p) => {
    const usePeriod = p || period;
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLastUpdate('Updating…');
    const [k, m, b, pr, pm, dt] = await Promise.all([
      apiFetch(`/kpi?period=${usePeriod}`, EMPTY_KPI, logout),
      apiFetch(`/machines?period=${usePeriod}`, [], logout),
      apiFetch(`/breakdowns?period=${usePeriod}`, [], logout),
      apiFetch(`/pareto?period=${usePeriod}`, [], logout),
      apiFetch(`/pareto-machines?period=${usePeriod}`, [], logout),
      apiFetch(`/downtime-by-day?period=${usePeriod}`, [], logout),
    ]);
    setConnected(true);
    setKpi(k); setMachines(m); setBreakdowns(b); setPareto(pr); setParetoMachines(pm); setDowntime(dt);
    setLastUpdate('Updated ' + new Date().toLocaleTimeString());
    loadingRef.current = false;
  }, [period, logout]);

  return (
    <AppContext.Provider value={{
      period, setPeriod, kpi, machines, breakdowns, pareto, paretoMachines, downtime,
      connected, lastUpdate, loadAll, notifications, addNotif, markAllRead, clearNotifs,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
