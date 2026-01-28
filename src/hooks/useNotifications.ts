import { useState, useEffect } from 'react';
import { notificationManager, Notification } from '@/lib/notificationManager';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Subscribe to notifications
    const unsubscribe = notificationManager.subscribe((newNotifications) => {
      setNotifications(newNotifications);
      setUnreadCount(notificationManager.getUnreadCount());
    });

    // Initialize with current notifications
    setNotifications(notificationManager.getNotifications());
    setUnreadCount(notificationManager.getUnreadCount());

    return unsubscribe;
  }, []);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    notificationManager.addNotification(notification);
  };

  const removeNotification = (id: string) => {
    notificationManager.removeNotification(id);
  };

  const clearAllNotifications = () => {
    notificationManager.clearAllNotifications();
  };

  const setAudioEnabled = (enabled: boolean) => {
    notificationManager.setAudioEnabled(enabled);
  };

  const setAudioVolume = (volume: number) => {
    notificationManager.setAudioVolume(volume);
  };

  return {
    notifications,
    unreadCount,
    addNotification,
    removeNotification,
    clearAllNotifications,
    setAudioEnabled,
    setAudioVolume,
    audioEnabled: notificationManager.getAudioEnabled(),
    audioVolume: notificationManager.getAudioVolume()
  };
}
