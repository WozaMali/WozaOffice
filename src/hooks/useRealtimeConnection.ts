import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useRealtimeConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Realtime connection hook mounted');

    const channel = supabase.channel('realtime_channel');

    channel
      .on('broadcast', { event: 'log' }, (payload) => {
        console.log('Realtime broadcast:', payload);
      })
      .on('system', { event: '*:*' }, (payload) => {
        console.log('Realtime system event:', payload);
        if (payload.type === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
        } else if (payload.type === 'UNSUBSCRIBED') {
          setIsConnected(false);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setError('Channel subscription error');
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    return () => {
      console.log('Realtime connection hook unmounted');
      supabase.removeChannel(channel);
    };
  }, []);

  return { isConnected, error };
}
