import { useState, useEffect } from 'react';
import api from '@/lib/axios';

let cachedLanIp: string | null = null;
let fetchPromise: Promise<string | null> | null = null;

export const fetchNetworkIp = async (): Promise<string | null> => {
  if (cachedLanIp) return cachedLanIp;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const res = await api.get('/report-config/network-ip');
      if (res.data?.ip && res.data.ip !== 'localhost' && res.data.ip !== '127.0.0.1') {
        cachedLanIp = res.data.ip;
        return cachedLanIp;
      }
    } catch (e) {
      // ignore
    }
    return null;
  })();

  return fetchPromise;
};

export const getDynamicBaseUrl = (lanIp?: string | null): string => {
  const override = localStorage.getItem('custom_qr_base_url');
  if (override && override.trim()) {
    return override.trim().replace(/\/$/, '');
  }
  if (import.meta.env.VITE_PUBLIC_URL) {
    return import.meta.env.VITE_PUBLIC_URL.replace(/\/$/, '');
  }
  const { protocol, hostname, port } = window.location;
  const ipToUse = lanIp || cachedLanIp;
  if ((hostname === 'localhost' || hostname === '127.0.0.1') && ipToUse) {
    return `${protocol}//${ipToUse}${port ? `:${port}` : ''}`;
  }
  return window.location.origin;
};

export const useDynamicBaseUrl = () => {
  const [url, setUrl] = useState<string>(() => getDynamicBaseUrl());

  useEffect(() => {
    fetchNetworkIp().then((ip) => {
      setUrl(getDynamicBaseUrl(ip));
    });

    const handleStorage = () => {
      setUrl(getDynamicBaseUrl(cachedLanIp));
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('qr_url_updated', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('qr_url_updated', handleStorage);
    };
  }, []);

  return url;
};
