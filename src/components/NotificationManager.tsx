import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BIpqfovvAROHIyXg1xxeof8igMhblYBcuae8Qd-uZlnqAuc84L2qXD6GERbzfScG4dgfs1QK9JK5Oa50wNClYLk';

export const NotificationManager = () => {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeUser = async () => {
    if (!user) return;
    
    setIsSubscribing(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      // Send subscription to server
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          user_id: user.id
        })
      });

      if (!response.ok) throw new Error('Failed to save subscription on server');
      
      setPermission('granted');
      console.log('User is subscribed to push notifications');
    } catch (error) {
      console.error('Failed to subscribe user:', error);
    } finally {
      setIsSubscribing(false);
    }
  };

  const testNotification = async () => {
    if (!user) return;
    setIsTesting(true);
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id })
      });
      if (!response.ok) throw new Error('Failed to send test notification');
    } catch (error) {
      console.error('Test notification failed:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return;
    
    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      await subscribeUser();
    }
  };

  if (typeof Notification === 'undefined' || !user) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-3">
      {permission === 'granted' && (
        <button
          onClick={testNotification}
          disabled={isTesting}
          className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-emerald-100 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 hover:bg-emerald-50 transition-colors"
        >
          {isTesting ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Bell className="w-4 h-4" />
            </div>
          )}
          <span className="text-xs font-bold text-gray-900">Send Test Push</span>
        </button>
      )}

      {permission === 'granted' ? (
        <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-emerald-100 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
            <Bell className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-gray-900">Notifications Active</span>
        </div>
      ) : permission === 'denied' ? (
        <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-red-100 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center text-white">
            <BellOff className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-gray-900">Notifications Blocked</span>
        </div>
      ) : (
        <button
          onClick={requestPermission}
          disabled={isSubscribing}
          className="bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-[2rem] shadow-xl shadow-emerald-500/20 flex items-center gap-3 transition-all active:scale-95 group"
        >
          {isSubscribing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Bell className="w-5 h-5 group-hover:animate-bounce" />
          )}
          <span className="text-sm font-black uppercase tracking-wider">Enable Notifications</span>
        </button>
      )}
    </div>
  );
};
