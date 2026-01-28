'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, CheckCircle, Clock, Coins, AlertCircle, Loader2, Calendar } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useRouter } from 'next/navigation';

interface Video {
  id: string;
  title: string;
  description?: string;
  video_url: string;
  video_type: 'direct' | 'youtube' | 'vimeo';
  thumbnail_url?: string;
  credit_amount: number;
  watch_duration_seconds: number;
  watch_percentage_required: number;
  can_watch?: boolean;
  watches_today?: number;
  max_watches_per_day?: number;
}

interface WatchRecord {
  id: string;
  watch_started_at: string;
  watch_duration_seconds?: number;
  watch_percentage?: number;
  is_qualified: boolean;
  credits_awarded: number;
}

interface CommunityEvent {
  id: string;
  title: string;
  description?: string | null;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  address?: string | null;
  type?: string | null;
  image_url?: string | null;
  rewards?: string | null;
  status: 'upcoming' | 'completed' | 'cancelled';
}

export default function WatchAdsPage() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [currentWatch, setCurrentWatch] = useState<WatchRecord | null>(null);
  const [watchProgress, setWatchProgress] = useState(0);
  const [watchDuration, setWatchDuration] = useState(0);
  const [isWatching, setIsWatching] = useState(false);
  const [creditsAwarded, setCreditsAwarded] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadVideos();
      loadEvents();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // Cleanup intervals on unmount
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/watch-ads/videos?userId=${user?.id || ''}`);
      
      if (!response.ok) {
        throw new Error('Failed to load videos');
      }

      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Error loading videos:', error);
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      setEventsLoading(true);
      const response = await fetch('/api/community-events?status=upcoming');

      if (!response.ok) {
        throw new Error('Failed to load events');
      }

      const data = await response.json();
      const items = (data.events || []) as CommunityEvent[];
      items.sort((a, b) => {
        if (a.event_date === b.event_date) {
          const aTime = a.start_time || '';
          const bTime = b.start_time || '';
          return aTime.localeCompare(bTime);
        }
        return a.event_date.localeCompare(b.event_date);
      });
      setEvents(items);
    } catch (error) {
      console.error('Error loading events:', error);
      // Silent fail is okay here; page still works without events
    } finally {
      setEventsLoading(false);
    }
  };

  const startWatching = async (video: Video) => {
    if (!user) {
      toast.error('Please log in to watch videos');
      router.push('/login');
      return;
    }

    if (!video.can_watch) {
      toast.error('You have reached the daily limit for this video');
      return;
    }

    try {
      // Start tracking
      const trackResponse = await fetch('/api/watch-ads/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          video_id: video.id,
          ip_address: null, // Can be added if needed
          user_agent: navigator.userAgent
        })
      });

      if (!trackResponse.ok) {
        const error = await trackResponse.json();
        throw new Error(error.error || 'Failed to start tracking');
      }

      const { watch } = await trackResponse.json();
      setCurrentWatch(watch);
      setSelectedVideo(video);
      setIsWatching(true);
      setWatchProgress(0);
      setWatchDuration(0);
      setCreditsAwarded(null);

      // Start tracking progress
      startProgressTracking(watch.id, video);
    } catch (error: any) {
      console.error('Error starting watch:', error);
      toast.error(error.message || 'Failed to start watching video');
    }
  };

  const startProgressTracking = (watchId: string, video: Video) => {
    // Track duration every second
    durationIntervalRef.current = setInterval(() => {
      setWatchDuration((prev) => {
        const newDuration = prev + 1;
        
        // Update watch record every 5 seconds
        if (newDuration % 5 === 0) {
          updateWatchProgress(watchId, newDuration, watchProgress);
        }
        
        return newDuration;
      });
    }, 1000);

    // Track video progress if video element exists
    if (videoRef.current) {
      progressIntervalRef.current = setInterval(() => {
        if (videoRef.current) {
          const currentTime = videoRef.current.currentTime;
          const duration = videoRef.current.duration;
          
          if (duration > 0) {
            const percentage = Math.round((currentTime / duration) * 100);
            setWatchProgress(percentage);
            
            // Update watch record every 5 seconds
            if (Math.floor(currentTime) % 5 === 0) {
              updateWatchProgress(watchId, Math.floor(currentTime), percentage);
            }
          }
        }
      }, 1000);
    }
  };

  const updateWatchProgress = async (
    watchId: string,
    duration: number,
    percentage: number
  ) => {
    try {
      await fetch('/api/watch-ads/track', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watch_id: watchId,
          watch_duration_seconds: duration,
          watch_percentage: percentage,
          is_completed: false
        })
      });
    } catch (error) {
      console.error('Error updating watch progress:', error);
    }
  };

  const completeWatch = async () => {
    if (!currentWatch || !selectedVideo) return;

    try {
      const response = await fetch('/api/watch-ads/track', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watch_id: currentWatch.id,
          watch_duration_seconds: watchDuration,
          watch_percentage: watchProgress,
          is_completed: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to complete watch');
      }

      const data = await response.json();
      
      // Stop tracking
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }

      setIsWatching(false);
      
      if (data.credits_awarded) {
        setCreditsAwarded(data.credits_awarded);
        toast.success(`You earned C ${data.credits_awarded.toFixed(2)}!`);
      } else {
        toast.info('Video watched! Credits will be awarded if you meet the requirements.');
      }

      // Reload videos to update availability
      setTimeout(() => {
        loadVideos();
        setSelectedVideo(null);
        setCurrentWatch(null);
        setWatchProgress(0);
        setWatchDuration(0);
      }, 2000);
    } catch (error: any) {
      console.error('Error completing watch:', error);
      toast.error(error.message || 'Failed to complete watch');
    }
  };

  const cancelWatch = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    
    setIsWatching(false);
    setSelectedVideo(null);
    setCurrentWatch(null);
    setWatchProgress(0);
    setWatchDuration(0);
    setCreditsAwarded(null);
  };

  const getVideoEmbedUrl = (video: Video) => {
    if (video.video_type === 'youtube') {
      // Extract YouTube video ID
      const match = video.video_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      if (match) {
        return `https://www.youtube.com/embed/${match[1]}?autoplay=1&controls=1`;
      }
    } else if (video.video_type === 'vimeo') {
      // Extract Vimeo video ID
      const match = video.video_url.match(/vimeo\.com\/(\d+)/);
      if (match) {
        return `https://player.vimeo.com/video/${match[1]}?autoplay=1`;
      }
    }
    return video.video_url;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Discover &amp; Earn
            </h1>
            <p className="text-gray-600 mt-2">
              Watch sponsored videos and join upcoming community events to earn Green Scholar credits.
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-2">
            {profile && (
              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/40 px-3 py-1 rounded-full text-xs sm:text-sm">
                <Coins className="w-4 h-4 mr-1" />
                Logged in as {profile.full_name || profile.email}
              </Badge>
            )}
            <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/40 px-3 py-1 rounded-full text-xs sm:text-sm flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Watch ads and attend events to earn real credits
            </Badge>
          </div>
        </div>

        {/* Community Events + Ads layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Community Events */}
          <Card className="border-0 shadow-xl bg-white lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Calendar className="w-5 h-5 text-green-600" />
                Upcoming Community Events
              </CardTitle>
              <CardDescription>
                Join local clean-up days, challenges and workshops to earn extra credits.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {eventsLoading && (
                <div className="flex items-center justify-center py-6 text-gray-500 text-sm gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading events...
                </div>
              )}
              {!eventsLoading && events.length === 0 && (
                <p className="text-sm text-gray-500 py-4">
                  No upcoming community events yet. Check back soon for new activities.
                </p>
              )}
              {!eventsLoading &&
                events.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs sm:text-sm space-y-1.5"
                  >
                    {event.image_url && (
                      <div className="relative w-full mb-2 overflow-hidden rounded-md">
                        <img
                          src={event.image_url}
                          alt={event.title}
                          className="w-full h-20 object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900 line-clamp-1">{event.title}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200 whitespace-nowrap">
                        {event.event_date}
                      </span>
                    </div>
                    {event.location && (
                      <p className="text-gray-700 text-[11px] sm:text-xs line-clamp-1">
                        {event.location}
                      </p>
                    )}
                    {event.description && (
                      <p className="text-gray-600 text-[11px] sm:text-xs line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    {event.rewards && (
                      <p className="text-amber-700 text-[11px] sm:text-xs">
                        Rewards: {event.rewards}
                      </p>
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* Watch Ads area */}
          <div className="lg:col-span-2 space-y-6">

        {/* Video Player Section */}
        {isWatching && selectedVideo && (
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedVideo.title}</CardTitle>
                  <CardDescription>{selectedVideo.description}</CardDescription>
                </div>
                <Button variant="outline" onClick={cancelWatch}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Video Player */}
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                {selectedVideo.video_type === 'direct' ? (
                  <video
                    ref={videoRef}
                    src={selectedVideo.video_url}
                    controls
                    className="absolute top-0 left-0 w-full h-full rounded-lg"
                    onEnded={completeWatch}
                  />
                ) : (
                  <iframe
                    src={getVideoEmbedUrl(selectedVideo)}
                    className="absolute top-0 left-0 w-full h-full rounded-lg"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                )}
              </div>

              {/* Progress Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Watch Progress</span>
                  <span className="font-semibold">{watchProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${watchProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Watched: {Math.floor(watchDuration / 60)}:{(watchDuration % 60).toString().padStart(2, '0')}</span>
                  <span>Required: {Math.floor(selectedVideo.watch_duration_seconds / 60)}:{(selectedVideo.watch_duration_seconds % 60).toString().padStart(2, '0')}</span>
                </div>
              </div>

              {/* Requirements */}
              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-blue-900">Requirements to earn C {selectedVideo.credit_amount.toFixed(2)}:</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li className="flex items-center gap-2">
                    {watchDuration >= selectedVideo.watch_duration_seconds ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                    Watch for at least {selectedVideo.watch_duration_seconds} seconds
                  </li>
                  <li className="flex items-center gap-2">
                    {watchProgress >= selectedVideo.watch_percentage_required ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                    Watch at least {selectedVideo.watch_percentage_required}% of the video
                  </li>
                </ul>
              </div>

              {/* Complete Button */}
              {(watchDuration >= selectedVideo.watch_duration_seconds && 
                watchProgress >= selectedVideo.watch_percentage_required) && (
                <Button
                  onClick={completeWatch}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                  size="lg"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Complete & Earn C {selectedVideo.credit_amount.toFixed(2)}
                </Button>
              )}

              {creditsAwarded && (
                <div className="bg-green-50 p-4 rounded-lg flex items-center gap-3">
                  <Coins className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">Credits Awarded!</p>
                    <p className="text-sm text-green-700">You earned C {creditsAwarded.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Videos Grid */}
        {!isWatching && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <Card key={video.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  {video.thumbnail_url && (
                    <div className="relative w-full mb-4" style={{ paddingBottom: '56.25%' }}>
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="absolute top-0 left-0 w-full h-full object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <CardTitle className="text-lg">{video.title}</CardTitle>
                  {video.description && (
                    <CardDescription className="line-clamp-2">
                      {video.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                      <Coins className="w-3 h-3 mr-1" />
                      C {video.credit_amount.toFixed(2)}
                    </Badge>
                    {video.watches_today !== undefined && video.max_watches_per_day && (
                      <span className="text-xs text-gray-500">
                        {video.watches_today}/{video.max_watches_per_day} today
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Duration: {Math.floor(video.watch_duration_seconds / 60)}:{(video.watch_duration_seconds % 60).toString().padStart(2, '0')}</p>
                    <p>Watch {video.watch_percentage_required}% to qualify</p>
                  </div>

                  {!video.can_watch ? (
                    <div className="bg-gray-100 p-3 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Daily limit reached</span>
                    </div>
                  ) : (
                    <Button
                      onClick={() => startWatching(video)}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Watch Now
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isWatching && videos.length === 0 && (
          <Card className="border-0 shadow-xl">
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Videos Available</h3>
              <p className="text-gray-600">Check back later for new videos to watch.</p>
            </CardContent>
          </Card>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}

