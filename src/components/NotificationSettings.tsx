"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Bell, Volume2, VolumeX, TestTube } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { audioNotificationService } from '@/lib/audioNotificationService';

export function NotificationSettings() {
  const { 
    audioEnabled, 
    audioVolume, 
    setAudioEnabled, 
    setAudioVolume,
    addNotification 
  } = useNotifications();

  const [isTesting, setIsTesting] = useState(false);

  const handleVolumeChange = (value: number[]) => {
    setAudioVolume(value[0]);
    // play a short click to confirm volume level (user gesture path)
    audioNotificationService.ensureUnlocked();
    audioNotificationService.playCollectionSound();
  };

  const testCollectionSound = async () => {
    setIsTesting(true);
    audioNotificationService.ensureUnlocked();
    addNotification({
      type: 'collection',
      title: 'Test Collection Notification',
      message: 'This is a test collection notification sound'
    });
    setTimeout(() => setIsTesting(false), 1000);
  };

  const testWithdrawalSound = async () => {
    setIsTesting(true);
    audioNotificationService.ensureUnlocked();
    addNotification({
      type: 'withdrawal',
      title: 'Test Withdrawal Notification',
      message: 'This is a test withdrawal notification sound'
    });
    setTimeout(() => setIsTesting(false), 1000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Audio Notifications
          </CardTitle>
          <CardDescription>
            Configure audio alerts for new collections and withdrawal requests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Audio */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">
                Enable Audio Notifications
              </label>
              <p className="text-sm text-muted-foreground">
                Play sounds when new collections or withdrawals are received
              </p>
            </div>
            <Switch
              checked={audioEnabled}
              onCheckedChange={setAudioEnabled}
            />
          </div>

          {/* Volume Control */}
          {audioEnabled && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Volume
                </label>
                <div className="flex items-center gap-2">
                  {audioVolume === 0 ? (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {Math.round(audioVolume * 100)}%
                  </span>
                </div>
              </div>
              <Slider
                value={[audioVolume]}
                onValueChange={handleVolumeChange}
                max={1}
                min={0}
                step={0.1}
                className="w-full"
              />
            </div>
          )}

          {/* Test Sounds */}
          {audioEnabled && (
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Test Notifications
              </label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testCollectionSound}
                  disabled={isTesting}
                  className="flex items-center gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  Test Collection Sound
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testWithdrawalSound}
                  disabled={isTesting}
                  className="flex items-center gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  Test Withdrawal Sound
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Types of notifications you'll receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Bell className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">New Collections</p>
                <p className="text-xs text-muted-foreground">
                  When customers submit new recycling collections
                </p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {audioEnabled ? '🔊' : '🔇'}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Withdrawal Requests</p>
                <p className="text-xs text-muted-foreground">
                  When users request wallet withdrawals
                </p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {audioEnabled ? '🔊' : '🔇'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
