/**
 * Notification Manager
 * Handles both audio and visual notifications for the office app
 */

import { audioNotificationService } from './audioNotificationService';

export interface Notification {
  id: string;
  type: 'collection' | 'withdrawal' | 'system' | 'error';
  title: string;
  message: string;
  timestamp: Date;
}

class NotificationManager {
  private notifications: Notification[] = [];
  private listeners: ((notifications: Notification[]) => void)[] = [];

  addNotification(notification: Omit<Notification, 'id' | 'timestamp'>): void {
    const newNotification: Notification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.notifications.unshift(newNotification);
    
    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }

    // Play appropriate sound
    if (newNotification.type === 'collection') {
      audioNotificationService.playCollectionSound();
    } else if (newNotification.type === 'withdrawal') {
      audioNotificationService.playWithdrawalSound();
    } else if (newNotification.type === 'system') {
      // softer beep or no sound for system by default
    } else if (newNotification.type === 'error') {
      // could add an error tone
    }

    // Notify listeners
    this.notifyListeners();

    console.log(`🔔 New ${newNotification.type} notification:`, newNotification.title);
  }

  removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  clearAllNotifications(): void {
    this.notifications = [];
    this.notifyListeners();
  }

  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  getUnreadCount(): number {
    return this.notifications.length;
  }

  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  // Audio settings
  setAudioEnabled(enabled: boolean): void {
    audioNotificationService.setEnabled(enabled);
  }

  setAudioVolume(volume: number): void {
    audioNotificationService.setVolume(volume);
  }

  getAudioEnabled(): boolean {
    return audioNotificationService.getEnabled();
  }

  getAudioVolume(): number {
    return audioNotificationService.getVolume();
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager();
