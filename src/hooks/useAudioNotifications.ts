import { useEffect, useRef, useState } from 'react';

interface AudioNotificationOptions {
  enabled: boolean;
  volume: number;
  collectionSound: string;
  withdrawalSound: string;
}

const defaultOptions: AudioNotificationOptions = {
  enabled: true,
  volume: 0.7,
  collectionSound: '/sounds/collection-ping.mp3',
  withdrawalSound: '/sounds/withdrawal-ping.mp3'
};

export function useAudioNotifications() {
  const [options, setOptions] = useState<AudioNotificationOptions>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('audio-notifications');
      return saved ? { ...defaultOptions, ...JSON.parse(saved) } : defaultOptions;
    }
    return defaultOptions;
  });

  const collectionAudioRef = useRef<HTMLAudioElement | null>(null);
  const withdrawalAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio elements
  useEffect(() => {
    if (typeof window !== 'undefined') {
      collectionAudioRef.current = new Audio(options.collectionSound);
      withdrawalAudioRef.current = new Audio(options.withdrawalSound);
      
      // Set volume
      if (collectionAudioRef.current) {
        collectionAudioRef.current.volume = options.volume;
      }
      if (withdrawalAudioRef.current) {
        withdrawalAudioRef.current.volume = options.volume;
      }
    }
  }, [options.collectionSound, options.withdrawalSound, options.volume]);

  const playCollectionSound = async () => {
    if (!options.enabled || !collectionAudioRef.current) return;
    
    try {
      collectionAudioRef.current.currentTime = 0;
      await collectionAudioRef.current.play();
      console.log('🔔 Collection notification sound played');
    } catch (error) {
      console.warn('Failed to play collection sound:', error);
    }
  };

  const playWithdrawalSound = async () => {
    if (!options.enabled || !withdrawalAudioRef.current) return;
    
    try {
      withdrawalAudioRef.current.currentTime = 0;
      await withdrawalAudioRef.current.play();
      console.log('🔔 Withdrawal notification sound played');
    } catch (error) {
      console.warn('Failed to play withdrawal sound:', error);
    }
  };

  const updateOptions = (newOptions: Partial<AudioNotificationOptions>) => {
    const updated = { ...options, ...newOptions };
    setOptions(updated);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('audio-notifications', JSON.stringify(updated));
    }
  };

  const toggleEnabled = () => {
    updateOptions({ enabled: !options.enabled });
  };

  const setVolume = (volume: number) => {
    updateOptions({ volume: Math.max(0, Math.min(1, volume)) });
  };

  return {
    options,
    playCollectionSound,
    playWithdrawalSound,
    updateOptions,
    toggleEnabled,
    setVolume
  };
}
