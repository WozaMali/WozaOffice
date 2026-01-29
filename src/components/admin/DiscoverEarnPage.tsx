'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useBackgroundRefresh } from '@/hooks/useBackgroundRefresh';
import { useRealtimeConnection } from '@/hooks/useRealtimeConnection';
import { backgroundRefreshService } from '@/lib/backgroundRefreshService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Edit, 
  Save,
  X,
  Upload,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Film,
  Plus,
  Video,
  Play,
  Coins,
  Clock,
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  Filter,
  Loader2,
  Download,
  Timer,
  CheckCircle2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { uploadAdMedia } from '@/lib/app-settings';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { compressImageForCard, compressImageForSlide, recompressImageFromUrl } from '@/lib/image-compression';
import { compressVideoForMobile } from '@/lib/video-compression';
import { toast } from '@/components/ui/sonner';
import { exportToCSV, exportToXLSX, exportToPDF } from '@/lib/export-utils';
import { exportToEnhancedPDF } from '@/lib/export-utils-enhanced';

interface DiscoverEarnCard {
  id: string;
  card_type: 'monthly_challenge' | 'daily_tips' | 'watch_ads' | 'dropoff_points' | 'upcoming_events';
  display_order: number;
  is_active: boolean;
  image_url: string;
  title: string;
  description?: string;
  subtitle?: string;
  button_text?: string;
  button_action?: string;
  button_color: 'yellow' | 'orange' | 'white' | 'indigo' | 'violet';
  additional_data?: any;
  card_width: string;
  card_height: string;
  created_at: string;
  updated_at: string;
}

interface HeroSlide {
  id: string;
  display_order: number;
  is_active: boolean;
  image_url: string;
  background_position: string;
  card_text?: string;
  card_route?: string;
  auto_play_interval: number;
  brand_text?: string;
  heading?: string;
  description?: string;
  button_text?: string;
  button_route?: string;
  created_at: string;
  updated_at: string;
}

interface WatchAdsVideo {
  id: string;
  title: string;
  description?: string;
  video_url: string;
  video_type: 'direct' | 'youtube' | 'vimeo';
  thumbnail_url?: string;
  credit_amount: number;
  watch_duration_seconds: number;
  watch_percentage_required: number;
  display_order: number;
  is_active: boolean;
  max_watches_per_day?: number;
  max_watches_total?: number;
  advertiser_name?: string;
  category?: string;
  created_at: string;
  updated_at: string;
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
  participants: number;
  rewards?: string | null;
  status: 'upcoming' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

const CARD_TYPE_LABELS: Record<string, string> = {
  monthly_challenge: 'Monthly Challenge',
  daily_tips: 'Daily Tips',
  watch_ads: 'Watch Ads',
  dropoff_points: 'Drop-off Points',
  upcoming_events: 'Upcoming Events'
};

const CARD_TYPE_DESCRIPTIONS: Record<string, string> = {
  monthly_challenge: 'Display monthly recycling goals and progress',
  daily_tips: 'Show daily tips and educational content',
  watch_ads: 'Promote ad watching for rewards',
  dropoff_points: 'Show nearby drop-off locations',
  upcoming_events: 'Display upcoming community events'
};

// Helper function to handle image load errors
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.target as HTMLImageElement;
  // Use a data URI placeholder if image fails to load
  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="Arial" font-size="14"%3EImage not found%3C/text%3E%3C/svg%3E';
  target.onerror = null; // Prevent infinite loop
};

export default function DiscoverEarnPage() {
  const [cards, setCards] = useState<DiscoverEarnCard[]>([]);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [videos, setVideos] = useState<WatchAdsVideo[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [slidesLoading, setSlidesLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editingSlide, setEditingSlide] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [isCreatingSlide, setIsCreatingSlide] = useState(false);
  const [isCreatingVideo, setIsCreatingVideo] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [editForm, setEditForm] = useState<Partial<DiscoverEarnCard>>({});
  const [editSlideForm, setEditSlideForm] = useState<Partial<HeroSlide>>({});
  const [editVideoForm, setEditVideoForm] = useState<Partial<WatchAdsVideo>>({});
  const [editEventForm, setEditEventForm] = useState<Partial<CommunityEvent>>({});
  const [newCardForm, setNewCardForm] = useState<Partial<DiscoverEarnCard>>({
    display_order: 0,
    is_active: true,
    button_color: 'yellow',
    card_width: '140px',
    card_height: '140px',
    additional_data: {}
  });
  const [newSlideForm, setNewSlideForm] = useState<Partial<HeroSlide>>({
    display_order: 0,
    is_active: true,
    background_position: 'center center',
    auto_play_interval: 5
  });
  const [newVideoForm, setNewVideoForm] = useState<Partial<WatchAdsVideo>>({
    display_order: 0,
    is_active: true,
    video_type: 'direct',
    credit_amount: 5.00,
    watch_duration_seconds: 30,
    watch_percentage_required: 80,
    max_watches_per_day: 3
  });
  const [newEventForm, setNewEventForm] = useState<Partial<CommunityEvent>>({
    status: 'upcoming',
    participants: 0
  });
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingSlide, setSavingSlide] = useState(false);
  const [savingVideo, setSavingVideo] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [creatingCard, setCreatingCard] = useState(false);
  const [creatingSlide, setCreatingSlide] = useState(false);
  const [creatingVideo, setCreatingVideo] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  
  // Stats state
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [statsError, setStatsError] = useState('');
  const [statsFilters, setStatsFilters] = useState({
    video_id: '',
    user_id: '',
    start_date: '',
    end_date: ''
  });
  const [statsViewMode, setStatsViewMode] = useState<'summary' | 'by_video' | 'by_user' | 'detailed'>('summary');

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadCards = useCallback(async () => {
    try {
      setCardsLoading(true);
      // In Vite, API routes don't exist - query directly via Supabase
      const client = supabaseAdmin || supabase;
      
      const { data, error } = await client
        .from('discover_earn_cards')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      const cards = (data || []) as DiscoverEarnCard[];
      setCards(cards);
    } catch (error) {
      console.error('Exception loading cards:', error);
      toast.error('Failed to load cards');
      setCards([]);
    } finally {
      setCardsLoading(false);
    }
  }, []);

  const loadSlides = useCallback(async () => {
    try {
      setSlidesLoading(true);
      // In Vite, API routes don't exist - query directly via Supabase
      const client = supabaseAdmin || supabase;
      
      const { data, error } = await client
        .from('hero_slides')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      const slides = (data || []) as HeroSlide[];
      setSlides(slides);
    } catch (error) {
      console.error('Exception loading slides:', error);
      toast.error('Failed to load slides');
      setSlides([]);
    } finally {
      setSlidesLoading(false);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      setEventsLoading(true);
      // Use admin API route to avoid RLS/permission issues in the browser.
      const res = await fetch('/api/admin/community-events', { cache: 'no-store' });
      const json = await res.json();
      // Note: this route returns 200 even when Supabase errors; error will be in the payload.
      if (json?.error) {
        throw new Error(json.error);
      }
      const events = (json?.events || []) as CommunityEvent[];
      events.sort((a, b) => {
        if (a.status !== b.status) {
            if (a.status === 'upcoming') return -1;
            if (b.status === 'upcoming') return 1;
          }
          if (a.event_date === b.event_date) {
            const aTime = a.start_time || '';
            const bTime = b.start_time || '';
            return aTime.localeCompare(bTime);
          }
          return a.event_date.localeCompare(b.event_date);
        });
        setEvents(events);
      } catch (error) {
        console.error('Exception loading community events:', error);
        toast.error('Failed to load community events');
        setEvents([]);
      } finally {
        setEventsLoading(false);
      }
  }, []);

  const loadVideos = useCallback(async () => {
    try {
      setVideosLoading(true);
      // In Vite, API routes don't exist - query directly via Supabase
      const client = supabaseAdmin || supabase;
      
      const { data, error } = await client
        .from('watch_ads_videos')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      const videos = (data || []) as WatchAdsVideo[];
      setVideos(videos);
    } catch (error) {
      console.error('Error loading videos:', error);
      toast.error('Failed to load videos');
      setVideos([]);
    } finally {
      setVideosLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      setStatsError('');

      const queryParams = new URLSearchParams();
      if (statsFilters.video_id) queryParams.append('video_id', statsFilters.video_id);
      if (statsFilters.user_id) queryParams.append('user_id', statsFilters.user_id);
      if (statsFilters.start_date) queryParams.append('start_date', statsFilters.start_date);
      if (statsFilters.end_date) queryParams.append('end_date', statsFilters.end_date);

      const response = await fetch(`/api/watch-ads/stats?${queryParams.toString()}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load stats from API');
      }

      setStats(result);
    } catch (err: any) {
      console.error('Error loading stats:', err);
      setStatsError(err.message || 'Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  }, [statsFilters]);

  // Quick date filter presets
  const applyDatePreset = useCallback((preset: string) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const endDate = today.toISOString().split('T')[0];

    let startDate = '';
    
    switch (preset) {
      case 'today':
        startDate = today.toISOString().split('T')[0];
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = yesterday.toISOString().split('T')[0];
        break;
      case 'last7days':
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 7);
        startDate = last7.toISOString().split('T')[0];
        break;
      case 'last30days':
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 30);
        startDate = last30.toISOString().split('T')[0];
        break;
      case 'thisMonth':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        break;
      case 'lastMonth':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        startDate = lastMonthStart.toISOString().split('T')[0];
        return setStatsFilters(prev => ({ ...prev, start_date: startDate, end_date: lastMonthEnd.toISOString().split('T')[0] }));
      case 'thisYear':
        startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        break;
      case 'all':
        return setStatsFilters(prev => ({ ...prev, start_date: '', end_date: '' }));
      default:
        return;
    }
    
    setStatsFilters(prev => ({ ...prev, start_date: startDate, end_date: endDate }));
  }, []);

  // Export functions
  const exportDetailedList = useCallback(() => {
    if (!stats || !stats.watches) {
      toast.error('No data to export');
      return;
    }

    const columns = ['User Name', 'Email', 'Employee Number', 'Video Title', 'Watched At', 'Status', 'Credits', 'Watch Duration (sec)', 'Watch Percentage'];
    const rows = stats.watches.map((watch: any) => ({
      'User Name': watch.user?.full_name || watch.user?.email || 'Unknown',
      'Email': watch.user?.email || '',
      'Employee Number': watch.user?.employee_number || '',
      'Video Title': watch.video?.title || 'Unknown',
      'Watched At': new Date(watch.created_at).toLocaleString(),
      'Status': watch.is_qualified ? 'Qualified' : 'Not Qualified',
      'Credits': watch.credits_awarded || 0,
      'Watch Duration (sec)': watch.watch_duration_seconds || 0,
      'Watch Percentage': watch.watch_percentage || 0
    }));

    const dateRange = statsFilters.start_date || statsFilters.end_date 
      ? `-${statsFilters.start_date || 'all'}-to-${statsFilters.end_date || 'all'}`
      : '';
    const filename = `watch-ads-stats-detailed${dateRange}-${new Date().toISOString().split('T')[0]}`;
    
    exportToCSV(`${filename}.csv`, columns, rows);
    toast.success('CSV exported successfully');
  }, [stats, statsFilters]);

  const exportDetailedListPDF = useCallback(async () => {
    if (!stats || !stats.watches) {
      toast.error('No data to export');
      return;
    }

    const columns = ['User Name', 'Email', 'Employee Number', 'Video Title', 'Watched At', 'Status', 'Credits', 'Watch Duration (sec)', 'Watch Percentage'];
    const rows = stats.watches.map((watch: any) => ({
      'User Name': watch.user?.full_name || watch.user?.email || 'Unknown',
      'Email': watch.user?.email || '',
      'Employee Number': watch.user?.employee_number || '',
      'Video Title': watch.video?.title || 'Unknown',
      'Watched At': new Date(watch.created_at).toLocaleString(),
      'Status': watch.is_qualified ? 'Qualified' : 'Not Qualified',
      'Credits': watch.credits_awarded || 0,
      'Watch Duration (sec)': watch.watch_duration_seconds || 0,
      'Watch Percentage': watch.watch_percentage || 0
    }));

    const dateRange = statsFilters.start_date || statsFilters.end_date 
      ? `-${statsFilters.start_date || 'all'}-to-${statsFilters.end_date || 'all'}`
      : '';
    const filename = `watch-ads-stats-detailed${dateRange}-${new Date().toISOString().split('T')[0]}`;
    
    // Get top performers
    const topVideos = stats.by_video
      ?.sort((a: any, b: any) => (b.total_watches || 0) - (a.total_watches || 0))
      .slice(0, 3)
      .map((v: any) => ({
        title: v.video_title || 'Unknown',
        watches: v.total_watches || 0,
        credits: v.total_credits || 0
      })) || [];

    const topUsers = stats.by_user
      ?.sort((a: any, b: any) => (b.total_credits || 0) - (a.total_credits || 0))
      .slice(0, 3)
      .map((u: any) => ({
        name: u.user_name || u.user_email || 'Unknown',
        watches: u.total_watches || 0,
        credits: u.total_credits || 0
      })) || [];

    await exportToEnhancedPDF({
      title: 'Watch Ads Statistics - Detailed Watch List',
      filename: `${filename}.pdf`,
      columns,
      rows,
      logoPath: '/Woza logo white.png',
      summary: stats.summary ? {
        total_watches: stats.summary.total_watches,
        qualified_watches: stats.summary.qualified_watches,
        total_credits_awarded: typeof stats.summary.total_credits_awarded === 'number' 
          ? stats.summary.total_credits_awarded 
          : parseFloat(String(stats.summary.total_credits_awarded || '0')),
        qualification_rate: stats.summary.qualification_rate,
        unique_viewers: stats.summary.unique_viewers,
        avg_watch_duration_seconds: stats.summary.avg_watch_duration_seconds,
        completion_rate: stats.summary.completion_rate
      } : undefined,
      dateRange: {
        start_date: statsFilters.start_date || undefined,
        end_date: statsFilters.end_date || undefined
      },
      filters: {
        video_id: statsFilters.video_id || undefined,
        user_id: statsFilters.user_id || undefined
      },
      topPerformers: {
        topVideos,
        topUsers
      }
    });
    
    toast.success('Enhanced PDF exported successfully');
  }, [stats, statsFilters]);

  const exportByVideo = useCallback(() => {
    if (!stats || !stats.by_video) {
      toast.error('No data to export');
      return;
    }

    const columns = ['Video Title', 'Total Watches', 'Qualified Watches', 'Total Credits', 'Qualification Rate'];
    const rows = stats.by_video.map((video: any) => ({
      'Video Title': video.video_title,
      'Total Watches': video.total_watches || 0,
      'Qualified Watches': video.qualified_watches || 0,
      'Total Credits': video.total_credits || 0,
      'Qualification Rate': video.total_watches > 0 ? ((video.qualified_watches / video.total_watches) * 100).toFixed(2) + '%' : '0%'
    }));

    const dateRange = statsFilters.start_date || statsFilters.end_date 
      ? `-${statsFilters.start_date || 'all'}-to-${statsFilters.end_date || 'all'}`
      : '';
    const filename = `watch-ads-stats-by-video${dateRange}-${new Date().toISOString().split('T')[0]}`;
    
    exportToCSV(`${filename}.csv`, columns, rows);
    toast.success('CSV exported successfully');
  }, [stats, statsFilters]);

  const exportByVideoPDF = useCallback(async () => {
    if (!stats || !stats.by_video) {
      toast.error('No data to export');
      return;
    }

    const columns = ['Video Title', 'Total Watches', 'Qualified Watches', 'Total Credits', 'Qualification Rate'];
    const rows = stats.by_video.map((video: any) => ({
      'Video Title': video.video_title,
      'Total Watches': video.total_watches || 0,
      'Qualified Watches': video.qualified_watches || 0,
      'Total Credits': video.total_credits || 0,
      'Qualification Rate': video.total_watches > 0 ? ((video.qualified_watches / video.total_watches) * 100).toFixed(2) + '%' : '0%'
    }));

    const dateRange = statsFilters.start_date || statsFilters.end_date 
      ? `-${statsFilters.start_date || 'all'}-to-${statsFilters.end_date || 'all'}`
      : '';
    const filename = `watch-ads-stats-by-video${dateRange}-${new Date().toISOString().split('T')[0]}`;
    
    const topVideos = stats.by_video
      .sort((a: any, b: any) => (b.total_watches || 0) - (a.total_watches || 0))
      .slice(0, 3)
      .map((v: any) => ({
        title: v.video_title || 'Unknown',
        watches: v.total_watches || 0,
        credits: v.total_credits || 0
      }));

    await exportToEnhancedPDF({
      title: 'Watch Ads Statistics - By Video Performance',
      filename: `${filename}.pdf`,
      columns,
      rows,
      logoPath: '/Woza logo white.png',
      summary: stats.summary ? {
        total_watches: stats.summary.total_watches,
        qualified_watches: stats.summary.qualified_watches,
        total_credits_awarded: typeof stats.summary.total_credits_awarded === 'number' 
          ? stats.summary.total_credits_awarded 
          : parseFloat(String(stats.summary.total_credits_awarded || '0')),
        qualification_rate: stats.summary.qualification_rate,
        unique_viewers: stats.summary.unique_viewers,
        avg_watch_duration_seconds: stats.summary.avg_watch_duration_seconds,
        completion_rate: stats.summary.completion_rate
      } : undefined,
      dateRange: {
        start_date: statsFilters.start_date || undefined,
        end_date: statsFilters.end_date || undefined
      },
      filters: {
        video_id: statsFilters.video_id || undefined,
        user_id: statsFilters.user_id || undefined
      },
      topPerformers: {
        topVideos,
        topUsers: stats.by_user
          ?.sort((a: any, b: any) => (b.total_credits || 0) - (a.total_credits || 0))
          .slice(0, 3)
          .map((u: any) => ({
            name: u.user_name || u.user_email || 'Unknown',
            watches: u.total_watches || 0,
            credits: u.total_credits || 0
          })) || []
      }
    });
    
    toast.success('Enhanced PDF exported successfully');
  }, [stats, statsFilters]);

  const exportByUser = useCallback(() => {
    if (!stats || !stats.by_user) {
      toast.error('No data to export');
      return;
    }

    const columns = ['User Name', 'Email', 'Employee Number', 'Total Watches', 'Qualified Watches', 'Total Credits', 'Qualification Rate'];
    const rows = stats.by_user.map((user: any) => ({
      'User Name': user.user_name || user.user_email,
      'Email': user.user_email || '',
      'Employee Number': user.employee_number || '',
      'Total Watches': user.total_watches || 0,
      'Qualified Watches': user.qualified_watches || 0,
      'Total Credits': user.total_credits || 0,
      'Qualification Rate': user.total_watches > 0 ? ((user.qualified_watches / user.total_watches) * 100).toFixed(2) + '%' : '0%'
    }));

    const dateRange = statsFilters.start_date || statsFilters.end_date 
      ? `-${statsFilters.start_date || 'all'}-to-${statsFilters.end_date || 'all'}`
      : '';
    const filename = `watch-ads-stats-by-user${dateRange}-${new Date().toISOString().split('T')[0]}`;
    
    exportToCSV(`${filename}.csv`, columns, rows);
    toast.success('CSV exported successfully');
  }, [stats, statsFilters]);

  const exportByUserPDF = useCallback(async () => {
    if (!stats || !stats.by_user) {
      toast.error('No data to export');
      return;
    }

    const columns = ['User Name', 'Email', 'Employee Number', 'Total Watches', 'Qualified Watches', 'Total Credits', 'Qualification Rate'];
    const rows = stats.by_user.map((user: any) => ({
      'User Name': user.user_name || user.user_email,
      'Email': user.user_email || '',
      'Employee Number': user.employee_number || '',
      'Total Watches': user.total_watches || 0,
      'Qualified Watches': user.qualified_watches || 0,
      'Total Credits': user.total_credits || 0,
      'Qualification Rate': user.total_watches > 0 ? ((user.qualified_watches / user.total_watches) * 100).toFixed(2) + '%' : '0%'
    }));

    const dateRange = statsFilters.start_date || statsFilters.end_date 
      ? `-${statsFilters.start_date || 'all'}-to-${statsFilters.end_date || 'all'}`
      : '';
    const filename = `watch-ads-stats-by-user${dateRange}-${new Date().toISOString().split('T')[0]}`;
    
    const topUsers = stats.by_user
      .sort((a: any, b: any) => (b.total_credits || 0) - (a.total_credits || 0))
      .slice(0, 3)
      .map((u: any) => ({
        name: u.user_name || u.user_email || 'Unknown',
        watches: u.total_watches || 0,
        credits: u.total_credits || 0
      }));

    await exportToEnhancedPDF({
      title: 'Watch Ads Statistics - By User Performance',
      filename: `${filename}.pdf`,
      columns,
      rows,
      logoPath: '/Woza logo white.png',
      summary: stats.summary ? {
        total_watches: stats.summary.total_watches,
        qualified_watches: stats.summary.qualified_watches,
        total_credits_awarded: typeof stats.summary.total_credits_awarded === 'number' 
          ? stats.summary.total_credits_awarded 
          : parseFloat(String(stats.summary.total_credits_awarded || '0')),
        qualification_rate: stats.summary.qualification_rate,
        unique_viewers: stats.summary.unique_viewers,
        avg_watch_duration_seconds: stats.summary.avg_watch_duration_seconds,
        completion_rate: stats.summary.completion_rate
      } : undefined,
      dateRange: {
        start_date: statsFilters.start_date || undefined,
        end_date: statsFilters.end_date || undefined
      },
      filters: {
        video_id: statsFilters.video_id || undefined,
        user_id: statsFilters.user_id || undefined
      },
      topPerformers: {
        topVideos: stats.by_video
          ?.sort((a: any, b: any) => (b.total_watches || 0) - (a.total_watches || 0))
          .slice(0, 3)
          .map((v: any) => ({
            title: v.video_title || 'Unknown',
            watches: v.total_watches || 0,
            credits: v.total_credits || 0
          })) || [],
        topUsers
      }
    });
    
    toast.success('Enhanced PDF exported successfully');
  }, [stats, statsFilters]);

  const exportSummary = useCallback(() => {
    if (!stats || !stats.summary) {
      toast.error('No data to export');
      return;
    }

    const columns = ['Metric', 'Value'];
    const rows = [
      { 'Metric': 'Total Watches', 'Value': stats.summary.total_watches || 0 },
      { 'Metric': 'Qualified Watches', 'Value': stats.summary.qualified_watches || 0 },
      { 'Metric': 'Total Credits Awarded', 'Value': typeof stats.summary.total_credits_awarded === 'number' ? stats.summary.total_credits_awarded.toFixed(2) : parseFloat(stats.summary.total_credits_awarded || '0').toFixed(2) },
      { 'Metric': 'Qualification Rate', 'Value': stats.summary.qualification_rate || '0.00' + '%' },
      { 'Metric': 'Unique Viewers', 'Value': stats.summary.unique_viewers || 0 },
      { 'Metric': 'Average Watch Duration (seconds)', 'Value': stats.summary.avg_watch_duration_seconds || 0 },
      { 'Metric': 'Completion Rate', 'Value': stats.summary.completion_rate || '0.00' + '%' }
    ];

    const dateRange = statsFilters.start_date || statsFilters.end_date 
      ? `-${statsFilters.start_date || 'all'}-to-${statsFilters.end_date || 'all'}`
      : '';
    const filename = `watch-ads-stats-summary${dateRange}-${new Date().toISOString().split('T')[0]}`;
    
    exportToCSV(`${filename}.csv`, columns, rows);
    toast.success('CSV exported successfully');
  }, [stats, statsFilters]);

  const exportSummaryPDF = useCallback(async () => {
    if (!stats || !stats.summary) {
      toast.error('No data to export');
      return;
    }

    const columns = ['Metric', 'Value'];
    const rows = [
      { 'Metric': 'Total Watches', 'Value': stats.summary.total_watches || 0 },
      { 'Metric': 'Qualified Watches', 'Value': stats.summary.qualified_watches || 0 },
      { 'Metric': 'Total Credits Awarded', 'Value': typeof stats.summary.total_credits_awarded === 'number' ? stats.summary.total_credits_awarded.toFixed(2) : parseFloat(stats.summary.total_credits_awarded || '0').toFixed(2) },
      { 'Metric': 'Qualification Rate', 'Value': stats.summary.qualification_rate || '0.00' + '%' },
      { 'Metric': 'Unique Viewers', 'Value': stats.summary.unique_viewers || 0 },
      { 'Metric': 'Average Watch Duration (seconds)', 'Value': stats.summary.avg_watch_duration_seconds || 0 },
      { 'Metric': 'Completion Rate', 'Value': stats.summary.completion_rate || '0.00' + '%' }
    ];

    const dateRange = statsFilters.start_date || statsFilters.end_date 
      ? `-${statsFilters.start_date || 'all'}-to-${statsFilters.end_date || 'all'}`
      : '';
    const filename = `watch-ads-stats-summary${dateRange}-${new Date().toISOString().split('T')[0]}`;
    
    // Get top performers for enhanced PDF
    const topVideos = stats.by_video
      ?.sort((a: any, b: any) => (b.total_watches || 0) - (a.total_watches || 0))
      .slice(0, 3)
      .map((v: any) => ({
        title: v.video_title || 'Unknown',
        watches: v.total_watches || 0,
        credits: v.total_credits || 0
      })) || [];

    const topUsers = stats.by_user
      ?.sort((a: any, b: any) => (b.total_credits || 0) - (a.total_credits || 0))
      .slice(0, 3)
      .map((u: any) => ({
        name: u.user_name || u.user_email || 'Unknown',
        watches: u.total_watches || 0,
        credits: u.total_credits || 0
      })) || [];

    await exportToEnhancedPDF({
      title: 'Watch Ads Statistics - Summary Report',
      filename: `${filename}.pdf`,
      columns,
      rows,
      logoPath: '/Woza logo white.png',
      summary: {
        total_watches: stats.summary.total_watches,
        qualified_watches: stats.summary.qualified_watches,
        total_credits_awarded: typeof stats.summary.total_credits_awarded === 'number' 
          ? stats.summary.total_credits_awarded 
          : parseFloat(String(stats.summary.total_credits_awarded || '0')),
        qualification_rate: stats.summary.qualification_rate,
        unique_viewers: stats.summary.unique_viewers,
        avg_watch_duration_seconds: stats.summary.avg_watch_duration_seconds,
        completion_rate: stats.summary.completion_rate
      },
      dateRange: {
        start_date: statsFilters.start_date || undefined,
        end_date: statsFilters.end_date || undefined
      },
      filters: {
        video_id: statsFilters.video_id || undefined,
        user_id: statsFilters.user_id || undefined
      },
      topPerformers: {
        topVideos,
        topUsers
      }
    });
    
    toast.success('Enhanced PDF exported successfully');
  }, [stats, statsFilters]);

  // Reload all data function - same pattern as Collections page
  const reloadAllData = useCallback(async () => {
    console.log('🔄 Discover & Earn: Reloading all data...');
    await Promise.all([
      loadCards(),
      loadSlides(),
      loadVideos(),
      loadEvents(),
      loadStats()
    ]);
  }, [loadCards, loadSlides, loadVideos, loadEvents, loadStats]);

  // Background refresh - refreshes every 30 seconds (same pattern as Collections page)
  // Use stable callback ref to ensure proper cleanup
  const reloadAllDataRef = useRef(reloadAllData);
  reloadAllDataRef.current = reloadAllData;
  
  const stableReloadAllData = useCallback(() => {
    return reloadAllDataRef.current();
  }, []);
  
  const { forceRefresh, isRefreshing } = useBackgroundRefresh(
    'discover-earn-page',
    stableReloadAllData
  );
  
  // Explicit cleanup to ensure background refresh stops when component unmounts
  useEffect(() => {
    return () => {
      // Stop background refresh when component unmounts
      backgroundRefreshService.stopBackgroundRefresh('discover-earn-page');
    };
  }, []);

  // Realtime connection status
  const { isConnected } = useRealtimeConnection();

  // Initial load (same pattern as Collections page)
  useEffect(() => {
    // Prevent scroll restoration that might cause layout jumps
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    reloadAllData();
  }, [reloadAllData]);

  const startEdit = (card: DiscoverEarnCard) => {
    setEditingCard(card.id);
    setEditForm({
      ...card,
      additional_data: card.additional_data || {}
    });
  };

  const cancelEdit = () => {
    setEditingCard(null);
    setEditForm({});
  };

  const handleImageUpload = async (cardId: string, file: File) => {
    try {
      setUploadingImage(cardId);
      toast.info('Compressing image...');
      
      // Compress image before upload (reduces file size significantly)
      const compressedFile = await compressImageForCard(file);
      console.log(`Image compressed: ${(file.size / 1024).toFixed(2)}KB → ${(compressedFile.size / 1024).toFixed(2)}KB`);
      
      const result = await uploadAdMedia(compressedFile);
      if (result.error) {
        toast.error('Failed to upload image');
        return;
      }
      if (result.url) {
        setEditForm(prev => ({ ...prev, image_url: result.url }));
        toast.success('Image uploaded successfully');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(null);
    }
  };

  const saveCard = async (cardId: string) => {
    try {
      setSaving(true);
      // In Vite, API routes don't exist - update directly via Supabase
      const client = supabaseAdmin || supabase;
      
      const { error } = await client
        .from('discover_earn_cards')
        .update({
          ...editForm,
          updated_at: new Date().toISOString()
        })
        .eq('id', cardId);

      if (error) {
        throw new Error(error.message || 'Failed to save card');
      }

      toast.success('Card updated successfully');
      setEditingCard(null);
      setEditForm({});
      loadCards();
    } catch (error: any) {
      console.error('Error saving card:', error);
      toast.error(error.message || 'Failed to save card');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (card: DiscoverEarnCard) => {
    try {
      // In Vite, API routes don't exist - update directly via Supabase
      const client = supabaseAdmin || supabase;
      
      const { error } = await client
        .from('discover_earn_cards')
        .update({
          is_active: !card.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', card.id);

      if (error) {
        throw new Error(error.message || 'Failed to update card');
      }

      toast.success(`Card ${!card.is_active ? 'activated' : 'deactivated'}`);
      loadCards();
    } catch (error) {
      console.error('Error toggling card:', error);
      toast.error('Failed to update card');
    }
  };

  // Hero Slides functions
  const startEditSlide = (slide: HeroSlide) => {
    setEditingSlide(slide.id);
    setEditSlideForm({ ...slide });
  };

  const cancelEditSlide = () => {
    setEditingSlide(null);
    setEditSlideForm({});
  };

  const handleSlideImageUpload = async (slideId: string, file: File) => {
    try {
      setUploadingImage(slideId);
      toast.info('Compressing image...');
      
      // Compress image before upload (reduces file size significantly)
      const compressedFile = await compressImageForSlide(file);
      console.log(`Image compressed: ${(file.size / 1024).toFixed(2)}KB → ${(compressedFile.size / 1024).toFixed(2)}KB`);
      
      const result = await uploadAdMedia(compressedFile);
      if (result.error) {
        toast.error('Failed to upload image');
        return;
      }
      if (result.url) {
        setEditSlideForm(prev => ({ ...prev, image_url: result.url }));
        toast.success('Image uploaded successfully');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(null);
    }
  };

  const saveSlide = async (slideId: string) => {
    try {
      setSavingSlide(true);
      // In Vite, API routes don't exist - update directly via Supabase
      const client = supabaseAdmin || supabase;
      
      const { error } = await client
        .from('hero_slides')
        .update({
          ...editSlideForm,
          updated_at: new Date().toISOString()
        })
        .eq('id', slideId);

      if (error) {
        throw new Error(error.message || 'Failed to save slide');
      }

      toast.success('Slide updated successfully');
      setEditingSlide(null);
      setEditSlideForm({});
      loadSlides();
    } catch (error: any) {
      console.error('Error saving slide:', error);
      toast.error(error.message || 'Failed to save slide');
    } finally {
      setSavingSlide(false);
    }
  };

  const toggleSlideActive = async (slide: HeroSlide) => {
    try {
      // In Vite, API routes don't exist - update directly via Supabase
      const client = supabaseAdmin || supabase;
      
      const { error } = await client
        .from('hero_slides')
        .update({
          is_active: !slide.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', slide.id);

      if (error) {
        throw new Error(error.message || 'Failed to update slide');
      }

      toast.success(`Slide ${!slide.is_active ? 'activated' : 'deactivated'}`);
      loadSlides();
    } catch (error) {
      console.error('Error toggling slide:', error);
      toast.error('Failed to update slide');
    }
  };

  // Watch Ads Videos functions
  const startEditVideo = (video: WatchAdsVideo) => {
    setEditingVideo(video.id);
    setEditVideoForm({ ...video });
  };

  const cancelEditVideo = () => {
    setEditingVideo(null);
    setEditVideoForm({});
  };

  const handleThumbnailUpload = async (videoId: string, file: File) => {
    try {
      setUploadingThumbnail(videoId);
      toast.info('Uploading thumbnail...');
      
      const result = await uploadAdMedia(file);
      if (result.error) {
        toast.error('Failed to upload thumbnail');
        return;
      }
      if (result.url) {
        setEditVideoForm(prev => ({ ...prev, thumbnail_url: result.url }));
        toast.success('Thumbnail uploaded successfully');
      }
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      toast.error('Failed to upload thumbnail');
    } finally {
      setUploadingThumbnail(null);
    }
  };

  const saveVideo = async (videoId: string) => {
    try {
      setSavingVideo(true);
      // In Vite, API routes don't exist - update directly via Supabase
      const client = supabaseAdmin || supabase;
      
      const { error } = await client
        .from('watch_ads_videos')
        .update({
          ...editVideoForm,
          updated_at: new Date().toISOString()
        })
        .eq('id', videoId);

      if (error) {
        throw new Error(error.message || 'Failed to save video');
      }

      toast.success('Video updated successfully');
      setEditingVideo(null);
      setEditVideoForm({});
      loadVideos();
    } catch (error: any) {
      console.error('Error saving video:', error);
      toast.error(error.message || 'Failed to save video');
    } finally {
      setSavingVideo(false);
    }
  };

  const toggleVideoActive = async (video: WatchAdsVideo) => {
    try {
      // In Vite, API routes don't exist - update directly via Supabase
      const client = supabaseAdmin || supabase;
      
      const { error } = await client
        .from('watch_ads_videos')
        .update({
          is_active: !video.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', video.id);

      if (error) {
        throw new Error(error.message || 'Failed to update video');
      }

      toast.success(`Video ${!video.is_active ? 'activated' : 'deactivated'}`);
      loadVideos();
    } catch (error) {
      console.error('Error toggling video:', error);
      toast.error('Failed to update video');
    }
  };

  const deleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/watch-ads/videos?id=${videoId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete video');
      }

      toast.success('Video deleted successfully');
      loadVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Failed to delete video');
    }
  };

  // Community Events helpers
  const handleCreateEvent = async () => {
    if (!newEventForm.title || !newEventForm.event_date) {
      toast.error('Title and Event Date are required');
      return;
    }

    try {
      setCreatingEvent(true);
      setSavingEvent(true);

      // In Vite, API routes don't exist - create directly via Supabase
      const client = supabaseAdmin || supabase;
      
      const { error } = await client
        .from('community_events')
        .insert({
          ...newEventForm,
          participants: newEventForm.participants ?? 0
        });

      if (error) {
        throw new Error(error.message || 'Failed to create event');
      }

      toast.success('Event created successfully');
      setIsCreatingEvent(false);
      setNewEventForm({
        status: 'upcoming',
        participants: 0
      });
      await loadEvents();
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast.error(error?.message || 'Failed to create event');
    } finally {
      setCreatingEvent(false);
      setSavingEvent(false);
    }
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent || !editEventForm.title || !editEventForm.event_date) {
      toast.error('Title and Event Date are required');
      return;
    }

    try {
      setSavingEvent(true);

      // In Vite, API routes don't exist - update directly via Supabase
      const client = supabaseAdmin || supabase;
      
      const { error } = await client
        .from('community_events')
        .update({
          ...editEventForm,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingEvent);

      if (error) {
        const message = error.message || 'Failed to update event';
        throw new Error(message);
      }

      toast.success('Event updated successfully');
      setEditingEvent(null);
      setEditEventForm({});
      await loadEvents();
    } catch (error: any) {
      console.error('Error updating event:', error);
      toast.error(error?.message || 'Failed to update event');
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const response = await fetch(`/api/admin/community-events?id=${encodeURIComponent(eventId)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message = errorData?.error || 'Failed to delete event';
        throw new Error(message);
      }

      toast.success('Event deleted successfully');
      await loadEvents();
    } catch (error: any) {
      console.error('Error deleting event:', error);
      toast.error(error?.message || 'Failed to delete event');
    }
  };

  // Always render the same structure to avoid hydration mismatch
  // Ensure all sections are always rendered regardless of loading/error states
  return (
    <div className="w-full space-y-6 sm:space-y-8 p-6" key="discover-earn-page-container">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Discover & Earn
            </h1>
            <p className="text-gray-600 mt-2 text-base sm:text-lg">
              Manage the 5 cards and hero slideshow displayed in the Discover & Earn section
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <Badge className="text-sm bg-gradient-to-r from-orange-600 to-orange-700 text-white border-0 px-4 py-2 rounded-full shadow-lg" suppressHydrationWarning>
              <Sparkles className="w-4 h-4 mr-2" />
              {cards.filter(c => c.is_active).length} Cards Active
            </Badge>
            <Badge className="text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 px-4 py-2 rounded-full shadow-lg" suppressHydrationWarning>
              <Film className="w-4 h-4 mr-2" />
              {slides.filter(s => s.is_active).length} Slides Active
            </Badge>
          </div>
        </div>

        {/* Cards Section */}
        <div className="pt-8 border-t-2 border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-orange-500" />
                Discover & Earn Cards
              </h2>
              <p className="text-gray-600 mt-1">Manage the 5 cards displayed in the Discover & Earn section</p>
            </div>
            <Button
              onClick={() => setIsCreatingCard(true)}
              className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white border-0 shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Card
            </Button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* New Card Form Card */}
            {isCreatingCard && (
              <Card className="border-2 border-dashed border-orange-300 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-gray-900 to-black text-white border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-white">New Card</CardTitle>
                    <CardDescription className="text-gray-300">Fill in the details to create a new card</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCreatingCard(false);
                      setNewCardForm({
                        display_order: 0,
                        is_active: true,
                        button_color: 'yellow',
                        card_width: '140px',
                        card_height: '140px',
                        additional_data: {}
                      });
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4 bg-gray-50">
                {/* Card Type */}
                <div>
                  <Label>Card Type *</Label>
                  <Select
                    value={newCardForm.card_type || ''}
                    onValueChange={(value: any) => setNewCardForm(prev => ({ ...prev, card_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select card type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly_challenge">Monthly Challenge</SelectItem>
                      <SelectItem value="daily_tips">Daily Tips</SelectItem>
                      <SelectItem value="watch_ads">Watch Ads</SelectItem>
                      <SelectItem value="dropoff_points">Drop-off Points</SelectItem>
                      <SelectItem value="upcoming_events">Upcoming Events</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">Note: If a card of this type already exists, it will be replaced.</p>
                </div>

                {/* Image Upload */}
                <div>
                  <Label>Card Image *</Label>
                  <div className="mt-2 flex items-center gap-4">
                    {newCardForm.image_url && (
                      <img
                        src={newCardForm.image_url}
                        alt="Card preview"
                        className="w-32 h-32 object-cover rounded-lg border"
                        loading="lazy"
                        decoding="async"
                        onError={handleImageError}
                      />
                    )}
                    <div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              setUploadingImage('new-card');
                              toast.info('Compressing image...');
                              
                              // Compress image before upload
                              const compressedFile = await compressImageForCard(file);
                              console.log(`Image compressed: ${(file.size / 1024).toFixed(2)}KB → ${(compressedFile.size / 1024).toFixed(2)}KB`);
                              
                              const result = await uploadAdMedia(compressedFile);
                              if (result.error) {
                                toast.error('Failed to upload image');
                                return;
                              }
                              if (result.url) {
                                setNewCardForm(prev => ({ ...prev, image_url: result.url }));
                                toast.success('Image uploaded successfully');
                              }
                            } catch (error) {
                              console.error('Error uploading image:', error);
                              toast.error('Failed to upload image');
                            } finally {
                              setUploadingImage(null);
                            }
                          }
                        }}
                        disabled={uploadingImage === 'new-card'}
                        className="w-64"
                      />
                      {uploadingImage === 'new-card' && (
                        <p className="text-sm text-gray-500 mt-1">Uploading...</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={newCardForm.title || ''}
                    onChange={(e) => setNewCardForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Card title"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newCardForm.description || ''}
                    onChange={(e) => setNewCardForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Card description"
                    rows={2}
                  />
                </div>

                {/* Subtitle */}
                <div>
                  <Label>Subtitle</Label>
                  <Input
                    value={newCardForm.subtitle || ''}
                    onChange={(e) => setNewCardForm(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="Card subtitle"
                  />
                </div>

                {/* Button Text */}
                <div>
                  <Label>Button Text</Label>
                  <Input
                    value={newCardForm.button_text || ''}
                    onChange={(e) => setNewCardForm(prev => ({ ...prev, button_text: e.target.value }))}
                    placeholder="e.g., Learn More, Watch Now"
                  />
                </div>

                {/* Button Action */}
                <div>
                  <Label>Button Action (Route/URL)</Label>
                  <Input
                    value={newCardForm.button_action || ''}
                    onChange={(e) => setNewCardForm(prev => ({ ...prev, button_action: e.target.value }))}
                    placeholder="e.g., /monthly-challenge, /maisha-daily-tips, /watch-ads, /drop-off-points, /upcoming-events"
                  />
                </div>

                {/* Button Color */}
                <div>
                  <Label>Button Color</Label>
                  <Select
                    value={newCardForm.button_color || 'yellow'}
                    onValueChange={(value: any) => setNewCardForm(prev => ({ ...prev, button_color: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yellow">Yellow</SelectItem>
                      <SelectItem value="orange">Orange</SelectItem>
                      <SelectItem value="white">White</SelectItem>
                      <SelectItem value="indigo">Indigo</SelectItem>
                      <SelectItem value="violet">Violet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Display Order */}
                <div>
                  <Label>Display Order</Label>
                  <Input
                    type="number"
                    value={newCardForm.display_order ?? 0}
                    onChange={(e) => setNewCardForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                    placeholder="Lower numbers appear first"
                  />
                </div>

                {/* Card Dimensions */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Card Width</Label>
                    <Input
                      value={newCardForm.card_width || '140px'}
                      onChange={(e) => setNewCardForm(prev => ({ ...prev, card_width: e.target.value }))}
                      placeholder="140px or 200px"
                    />
                  </div>
                  <div>
                    <Label>Card Height</Label>
                    <Input
                      value={newCardForm.card_height || '140px'}
                      onChange={(e) => setNewCardForm(prev => ({ ...prev, card_height: e.target.value }))}
                      placeholder="140px or 144px"
                    />
                  </div>
                </div>

                {/* Additional Data (JSON) */}
                <div>
                  <Label>Additional Data (JSON)</Label>
                  <Textarea
                    value={JSON.stringify(newCardForm.additional_data || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setNewCardForm(prev => ({ ...prev, additional_data: parsed }));
                      } catch {
                        // Invalid JSON, ignore
                      }
                    }}
                    placeholder='{"progress": 58, "current": 290, "goal": 500}'
                    rows={4}
                    className="font-mono text-sm"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={async () => {
                      try {
                        if (!newCardForm.card_type || !newCardForm.image_url || !newCardForm.title) {
                          toast.error('Please fill in all required fields (Card Type, Image, Title)');
                          return;
                        }
                        setCreatingCard(true);
                        // In Vite, API routes don't exist - create directly via Supabase
                        const client = supabaseAdmin || supabase;
                        
                        const { error } = await client
                          .from('discover_earn_cards')
                          .insert(newCardForm);

                        if (error) {
                          throw new Error(error.message || 'Failed to create card');
                        }

                        toast.success('Card created successfully');
                        setIsCreatingCard(false);
                        setNewCardForm({
                          display_order: 0,
                          is_active: true,
                          button_color: 'yellow',
                          card_width: '140px',
                          card_height: '140px',
                          additional_data: {}
                        });
                        loadCards();
                      } catch (error: any) {
                        console.error('Error creating card:', error);
                        toast.error(error.message || 'Failed to create card');
                      } finally {
                        setCreatingCard(false);
                      }
                    }}
                    disabled={creatingCard}
                    className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white border-0 shadow-lg"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {creatingCard ? 'Creating...' : 'Create Card'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreatingCard(false);
                      setNewCardForm({
                        display_order: 0,
                        is_active: true,
                        button_color: 'yellow',
                        card_width: '140px',
                        card_height: '140px',
                        additional_data: {}
                      });
                    }}
                    disabled={creatingCard}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        {cards.map((card) => {
          const isEditing = editingCard === card.id;
          const form = isEditing ? editForm : card;

          return (
            <Card key={card.id} className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-gray-900 to-black text-white border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-white">
                      {CARD_TYPE_LABELS[card.card_type]}
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      {CARD_TYPE_DESCRIPTIONS[card.card_type]}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      className={`${card.is_active ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gray-400'} text-white border-0 cursor-pointer shadow-md`}
                      onClick={() => toggleActive(card)}
                    >
                      {card.is_active ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                      {card.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {!isEditing && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(card)}
                          className="bg-white/10 hover:bg-white/20 text-white border-white/30 hover:border-white/50"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              setUploadingImage(card.id);
                              toast.info('Re-compressing image...');
                              
                              // Re-compress existing image
                              const compressedFile = await recompressImageFromUrl(card.image_url, true);
                              console.log(`Image re-compressed: ${(compressedFile.size / 1024).toFixed(2)}KB`);
                              
                              // Upload compressed version
                              const result = await uploadAdMedia(compressedFile);
                              if (result.error) {
                                toast.error('Failed to re-compress image');
                                return;
                              }
                              if (result.url) {
                                // Update the card with new compressed image
                                const client = supabaseAdmin || supabase;
                                const { error: updateError } = await client
                                  .from('discover_earn_cards')
                                  .update({
                                    image_url: result.url,
                                    updated_at: new Date().toISOString()
                                  })
                                  .eq('id', card.id);
                                
                                if (!updateError) {
                                  toast.success('Image re-compressed successfully');
                                  loadCards(); // Reload to show new image
                                } else {
                                  toast.error('Failed to update image');
                                }
                              }
                            } catch (error) {
                              console.error('Error re-compressing image:', error);
                              toast.error('Failed to re-compress image');
                            } finally {
                              setUploadingImage(null);
                            }
                          }}
                          disabled={uploadingImage === card.id}
                          title="Re-compress image to reduce file size"
                          className="bg-white/10 hover:bg-white/20 text-white border-white/30 hover:border-white/50"
                        >
                          <ImageIcon className="w-4 h-4 mr-1" />
                          {uploadingImage === card.id ? 'Compressing...' : 'Re-compress'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4 bg-gray-50">
                {isEditing ? (
                  <>
                    {/* Image Upload */}
                    <div>
                      <Label>Card Image</Label>
                      <div className="mt-2 flex items-center gap-4">
                        {form.image_url && (
                          <img
                            src={form.image_url}
                            alt="Card preview"
                            className="w-32 h-32 object-cover rounded-lg border"
                            loading="lazy"
                            decoding="async"
                            onError={handleImageError}
                          />
                        )}
                        <div>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(card.id, file);
                            }}
                            disabled={uploadingImage === card.id}
                            className="w-64"
                          />
                          {uploadingImage === card.id && (
                            <p className="text-sm text-gray-500 mt-1">Uploading...</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <Label>Title *</Label>
                      <Input
                        value={form.title || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Card title"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={form.description || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Card description"
                        rows={2}
                      />
                    </div>

                    {/* Subtitle */}
                    <div>
                      <Label>Subtitle</Label>
                      <Input
                        value={form.subtitle || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, subtitle: e.target.value }))}
                        placeholder="Card subtitle"
                      />
                    </div>

                    {/* Button Text */}
                    <div>
                      <Label>Button Text</Label>
                      <Input
                        value={form.button_text || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, button_text: e.target.value }))}
                        placeholder="e.g., Learn More, Watch Now"
                      />
                    </div>

                    {/* Button Action */}
                    <div>
                      <Label>Button Action (Route/URL)</Label>
                      <Input
                        value={form.button_action || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, button_action: e.target.value }))}
                        placeholder="e.g., /monthly-challenge, /maisha-daily-tips, /watch-ads, /drop-off-points, /upcoming-events"
                      />
                    </div>

                    {/* Button Color */}
                    <div>
                      <Label>Button Color</Label>
                      <Select
                        value={form.button_color || 'yellow'}
                        onValueChange={(value: any) => setEditForm(prev => ({ ...prev, button_color: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yellow">Yellow</SelectItem>
                          <SelectItem value="orange">Orange</SelectItem>
                          <SelectItem value="white">White</SelectItem>
                          <SelectItem value="indigo">Indigo</SelectItem>
                          <SelectItem value="violet">Violet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Display Order */}
                    <div>
                      <Label>Display Order</Label>
                      <Input
                        type="number"
                        value={form.display_order ?? 0}
                        onChange={(e) => setEditForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                        placeholder="Lower numbers appear first"
                      />
                    </div>

                    {/* Card Dimensions */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Card Width</Label>
                        <Input
                          value={form.card_width || '140px'}
                          onChange={(e) => setEditForm(prev => ({ ...prev, card_width: e.target.value }))}
                          placeholder="140px or 200px"
                        />
                      </div>
                      <div>
                        <Label>Card Height</Label>
                        <Input
                          value={form.card_height || '140px'}
                          onChange={(e) => setEditForm(prev => ({ ...prev, card_height: e.target.value }))}
                          placeholder="140px or 144px"
                        />
                      </div>
                    </div>

                    {/* Additional Data (JSON) */}
                    <div>
                      <Label>Additional Data (JSON)</Label>
                      <Textarea
                        value={JSON.stringify(form.additional_data || {}, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setEditForm(prev => ({ ...prev, additional_data: parsed }));
                          } catch {
                            // Invalid JSON, ignore
                          }
                        }}
                        placeholder='{"progress": 58, "current": 290, "goal": 500}'
                        rows={4}
                        className="font-mono text-sm"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={() => saveCard(card.id)}
                        disabled={saving}
                        className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white border-0 shadow-lg"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={cancelEdit}
                        disabled={saving}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Preview Mode */}
                    <div className="flex gap-4 items-start">
                      {/* Card Preview - Show actual card */}
                      <div className="relative rounded-lg overflow-hidden border-2 border-gray-300 shadow-lg flex-shrink-0" style={{ width: card.card_width || '140px', height: card.card_height || '140px' }}>
                        <img
                          src={card.image_url}
                          alt={card.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                          onError={handleImageError}
                        />
                        {/* Overlay with card content */}
                        <div className="absolute inset-0 flex flex-col justify-between p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                          <div className="flex-1"></div>
                          <div className={`${card.card_type === 'watch_ads' ? 'bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg' : ''}`}>
                            {card.title && (
                              <h3 className={`font-bold text-sm mb-1 ${
                                card.card_type === 'watch_ads' 
                                  ? 'text-gray-900' 
                                  : 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                              }`}>
                                {card.title}
                              </h3>
                            )}
                            {card.subtitle && (
                              <p className={`text-xs ${
                                card.card_type === 'watch_ads' 
                                  ? 'text-gray-700' 
                                  : 'text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]'
                              }`}>
                                {card.subtitle}
                              </p>
                            )}
                            {card.button_text && (
                              <div className="mt-2">
                                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                                  card.button_color === 'yellow' ? 'bg-yellow-400 text-gray-900' :
                                  card.button_color === 'orange' ? 'bg-orange-400 text-white' :
                                  card.button_color === 'white' ? 'bg-white text-gray-900' :
                                  card.button_color === 'indigo' ? 'bg-indigo-400 text-white' :
                                  card.button_color === 'violet' ? 'bg-violet-400 text-white' :
                                  'bg-gray-400 text-white'
                                }`}>
                                  {card.button_text}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Card Details - Next to image */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-gray-900">{card.title}</h3>
                        {card.description && (
                          <p className="text-sm text-gray-600 mt-1">{card.description}</p>
                        )}
                        {card.subtitle && (
                          <p className="text-sm text-gray-500 mt-1">{card.subtitle}</p>
                        )}
                        <div className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200 space-y-1">
                          <p>Order: {card.display_order}</p>
                          <p>Size: {card.card_width} × {card.card_height}</p>
                          <p>Button Color: {card.button_color}</p>
                          {card.button_text && (
                            <p>Button: "{card.button_text}"</p>
                          )}
                          {card.button_action && (
                            <p>Route: {card.button_action}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
        
        {cards.length === 0 && !isCreatingCard && (
          <Card className="border-0 shadow-xl">
            <CardContent className="p-12 text-center">
              <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Cards Found</h3>
              <p className="text-gray-600">Run the SQL script to create the default cards.</p>
            </CardContent>
          </Card>
        )}
      </div>
        </div>

        {/* Hero Slides Section - Always render */}
        <div className="pt-8 border-t-2 border-gray-200" key="hero-slides-section">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Film className="w-6 h-6 text-blue-500" />
                Hero Slideshow
              </h2>
              <p className="text-gray-600 mt-1">Manage slides displayed in the hero slideshow section</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
                <Film className="w-4 h-4 mr-2" />
                {slides.filter(s => s.is_active).length} Active
              </Badge>
              <Button
                onClick={() => setIsCreatingSlide(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Slide
              </Button>
            </div>
          </div>

          {/* Slides Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* New Slide Form Card */}
            {isCreatingSlide && (
              <Card className="border-2 border-dashed border-blue-300 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-gray-900 to-black text-white border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-white">New Slide</CardTitle>
                    <CardDescription className="text-gray-300">Fill in the details to create a new slide</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCreatingSlide(false);
                      setNewSlideForm({
                        display_order: 0,
                        is_active: true,
                        background_position: 'center center',
                        auto_play_interval: 5
                      });
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                </CardHeader>
              <CardContent className="p-6 space-y-4 bg-white">
                {/* Image Upload */}
                <div>
                  <Label>Slide Image *</Label>
                  <div className="mt-2 flex items-center gap-4">
                    {newSlideForm.image_url && (
                      <img
                        src={newSlideForm.image_url}
                        alt="Slide preview"
                        className="w-32 h-32 object-cover rounded-lg border"
                        loading="lazy"
                        decoding="async"
                        onError={handleImageError}
                      />
                    )}
                    <div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              setUploadingImage('new-slide');
                              toast.info('Compressing image...');
                              
                              // Compress image before upload
                              const compressedFile = await compressImageForSlide(file);
                              console.log(`Image compressed: ${(file.size / 1024).toFixed(2)}KB → ${(compressedFile.size / 1024).toFixed(2)}KB`);
                              
                              const result = await uploadAdMedia(compressedFile);
                              if (result.error) {
                                toast.error('Failed to upload image');
                                return;
                              }
                              if (result.url) {
                                setNewSlideForm(prev => ({ ...prev, image_url: result.url }));
                                toast.success('Image uploaded successfully');
                              }
                            } catch (error) {
                              console.error('Error uploading image:', error);
                              toast.error('Failed to upload image');
                            } finally {
                              setUploadingImage(null);
                            }
                          }
                        }}
                        disabled={uploadingImage === 'new-slide'}
                        className="w-64"
                      />
                      {uploadingImage === 'new-slide' && (
                        <p className="text-sm text-gray-500 mt-1">Uploading...</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Background Position */}
                <div>
                  <Label>Background Position</Label>
                  <Input
                    value={newSlideForm.background_position || 'center center'}
                    onChange={(e) => setNewSlideForm(prev => ({ ...prev, background_position: e.target.value }))}
                    placeholder="e.g., center center, center bottom"
                  />
                </div>

                {/* Card Text */}
                <div>
                  <Label>Card Button Text</Label>
                  <Input
                    value={newSlideForm.card_text || ''}
                    onChange={(e) => setNewSlideForm(prev => ({ ...prev, card_text: e.target.value }))}
                    placeholder="e.g., Lets Compost, Zero Waste Pledge"
                  />
                </div>

                {/* Card Route */}
                <div>
                  <Label>Card Button Route/URL</Label>
                  <Input
                    value={newSlideForm.card_route || ''}
                    onChange={(e) => setNewSlideForm(prev => ({ ...prev, card_route: e.target.value }))}
                    placeholder="e.g., /lets-compost, /zero-waste-pledge"
                  />
                </div>

                {/* Main Content Section */}
                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-sm text-gray-700 mb-3">Main Content (Left Side)</h4>
                  
                  {/* Brand Text */}
                  <div className="mb-4">
                    <Label>Brand Text</Label>
                    <Input
                      value={newSlideForm.brand_text || ''}
                      onChange={(e) => setNewSlideForm(prev => ({ ...prev, brand_text: e.target.value }))}
                      placeholder="e.g., Sebenza Nathi Waste"
                    />
                  </div>

                  {/* Heading */}
                  <div className="mb-4">
                    <Label>Heading</Label>
                    <Input
                      value={newSlideForm.heading || ''}
                      onChange={(e) => setNewSlideForm(prev => ({ ...prev, heading: e.target.value }))}
                      placeholder="e.g., Make a Difference"
                    />
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <Label>Description</Label>
                    <Textarea
                      value={newSlideForm.description || ''}
                      onChange={(e) => setNewSlideForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="e.g., Turn waste into rewards"
                      rows={2}
                    />
                  </div>
                </div>

                {/* Main Action Button Section */}
                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-sm text-gray-700 mb-3">Main Action Button</h4>
                  
                  {/* Button Text */}
                  <div className="mb-4">
                    <Label>Button Text</Label>
                    <Input
                      value={newSlideForm.button_text || ''}
                      onChange={(e) => setNewSlideForm(prev => ({ ...prev, button_text: e.target.value }))}
                      placeholder="e.g., Withdraw Credits →"
                    />
                  </div>

                  {/* Button Route */}
                  <div className="mb-4">
                    <Label>Button Route/URL</Label>
                    <Input
                      value={newSlideForm.button_route || ''}
                      onChange={(e) => setNewSlideForm(prev => ({ ...prev, button_route: e.target.value }))}
                      placeholder="e.g., /withdrawal"
                    />
                  </div>
                </div>

                {/* Auto Play Interval */}
                <div>
                  <Label>Auto-play Interval (seconds)</Label>
                  <Input
                    type="number"
                    value={newSlideForm.auto_play_interval ?? 5}
                    onChange={(e) => setNewSlideForm(prev => ({ ...prev, auto_play_interval: parseInt(e.target.value) || 5 }))}
                    placeholder="5"
                  />
                </div>

                {/* Display Order */}
                <div>
                  <Label>Display Order</Label>
                  <Input
                    type="number"
                    value={newSlideForm.display_order ?? 0}
                    onChange={(e) => setNewSlideForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                    placeholder="Lower numbers appear first"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={async () => {
                      try {
                        if (!newSlideForm.image_url) {
                          toast.error('Please upload an image');
                          return;
                        }
                        setCreatingSlide(true);
                        // In Vite, API routes don't exist - create directly via Supabase
                        const client = supabaseAdmin || supabase;
                        
                        const { error } = await client
                          .from('hero_slides')
                          .insert(newSlideForm);

                        if (error) {
                          throw new Error(error.message || 'Failed to create slide');
                        }

                        toast.success('Slide created successfully');
                        setIsCreatingSlide(false);
                        setNewSlideForm({
                          display_order: 0,
                          is_active: true,
                          background_position: 'center center',
                          auto_play_interval: 5
                        });
                        loadSlides();
                      } catch (error: any) {
                        console.error('Error creating slide:', error);
                        toast.error(error.message || 'Failed to create slide');
                      } finally {
                        setCreatingSlide(false);
                      }
                    }}
                    disabled={creatingSlide}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {creatingSlide ? 'Creating...' : 'Create Slide'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreatingSlide(false);
                      setNewSlideForm({
                        display_order: 0,
                        is_active: true,
                        background_position: 'center center',
                        auto_play_interval: 5
                      });
                    }}
                    disabled={creatingSlide}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {slides.map((slide) => {
            const isEditing = editingSlide === slide.id;
            const form = isEditing ? editSlideForm : slide;

            return (
              <Card key={slide.id} className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-gray-900 to-black text-white border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-semibold text-white">
                        {slide.heading || `Slide #${slide.display_order}`}
                      </CardTitle>
                      <CardDescription className="text-gray-300">
                        {slide.brand_text || slide.card_text || 'No content'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={`${slide.is_active ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gray-400'} text-white border-0 cursor-pointer shadow-md`}
                        onClick={() => toggleSlideActive(slide)}
                      >
                        {slide.is_active ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                        {slide.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {!isEditing && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditSlide(slide)}
                            className="bg-white/10 hover:bg-white/20 text-white border-white/30 hover:border-white/50"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                setUploadingImage(slide.id);
                                toast.info('Re-compressing image...');
                                
                                // Re-compress existing image
                                const compressedFile = await recompressImageFromUrl(slide.image_url, false);
                                console.log(`Image re-compressed: ${(compressedFile.size / 1024).toFixed(2)}KB`);
                                
                                // Upload compressed version
                                const result = await uploadAdMedia(compressedFile);
                                if (result.error) {
                                  toast.error('Failed to re-compress image');
                                  return;
                                }
                                if (result.url) {
                                  // Update the slide with new compressed image
                                  const client = supabaseAdmin || supabase;
                                  const { error: updateError } = await client
                                    .from('hero_slides')
                                    .update({
                                      image_url: result.url,
                                      updated_at: new Date().toISOString()
                                    })
                                    .eq('id', slide.id);
                                  
                                  if (!updateError) {
                                    toast.success('Image re-compressed successfully');
                                    loadSlides(); // Reload to show new image
                                  } else {
                                    toast.error('Failed to update image');
                                  }
                                }
                              } catch (error) {
                                console.error('Error re-compressing image:', error);
                                toast.error('Failed to re-compress image');
                              } finally {
                                setUploadingImage(null);
                              }
                            }}
                            disabled={uploadingImage === slide.id}
                            title="Re-compress image to reduce file size"
                            className="bg-white/10 hover:bg-white/20 text-white border-white/30 hover:border-white/50"
                          >
                            <ImageIcon className="w-4 h-4 mr-1" />
                            {uploadingImage === slide.id ? 'Compressing...' : 'Re-compress'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4 bg-white">
                  {isEditing ? (
                    <>
                      {/* Image Upload */}
                      <div>
                        <Label>Slide Image *</Label>
                        <div className="mt-2 flex items-center gap-4">
                          {form.image_url && (
                            <img
                              src={form.image_url}
                              alt="Slide preview"
                              className="w-32 h-32 object-cover rounded-lg border"
                              loading="lazy"
                              decoding="async"
                              onError={handleImageError}
                            />
                          )}
                          <div>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleSlideImageUpload(slide.id, file);
                              }}
                              disabled={uploadingImage === slide.id}
                              className="w-64"
                            />
                            {uploadingImage === slide.id && (
                              <p className="text-sm text-gray-500 mt-1">Uploading...</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Background Position */}
                      <div>
                        <Label>Background Position</Label>
                        <Input
                          value={form.background_position || 'center center'}
                          onChange={(e) => setEditSlideForm(prev => ({ ...prev, background_position: e.target.value }))}
                          placeholder="e.g., center center, center bottom"
                        />
                      </div>

                      {/* Card Text */}
                      <div>
                        <Label>Button Text</Label>
                        <Input
                          value={form.card_text || ''}
                          onChange={(e) => setEditSlideForm(prev => ({ ...prev, card_text: e.target.value }))}
                          placeholder="e.g., Lets Compost, Zero Waste Pledge"
                        />
                      </div>

                      {/* Card Route */}
                      <div>
                        <Label>Card Button Route/URL</Label>
                        <Input
                          value={form.card_route || ''}
                          onChange={(e) => setEditSlideForm(prev => ({ ...prev, card_route: e.target.value }))}
                          placeholder="e.g., /lets-compost, /zero-waste-pledge"
                        />
                      </div>

                      {/* Main Content Section */}
                      <div className="pt-4 border-t">
                        <h4 className="font-semibold text-sm text-gray-700 mb-3">Main Content (Left Side)</h4>
                        
                        {/* Brand Text */}
                        <div className="mb-4">
                          <Label>Brand Text</Label>
                          <Input
                            value={form.brand_text || ''}
                            onChange={(e) => setEditSlideForm(prev => ({ ...prev, brand_text: e.target.value }))}
                            placeholder="e.g., Sebenza Nathi Waste"
                          />
                        </div>

                        {/* Heading */}
                        <div className="mb-4">
                          <Label>Heading</Label>
                          <Input
                            value={form.heading || ''}
                            onChange={(e) => setEditSlideForm(prev => ({ ...prev, heading: e.target.value }))}
                            placeholder="e.g., Make a Difference"
                          />
                        </div>

                        {/* Description */}
                        <div className="mb-4">
                          <Label>Description</Label>
                          <Textarea
                            value={form.description || ''}
                            onChange={(e) => setEditSlideForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="e.g., Turn waste into rewards"
                            rows={2}
                          />
                        </div>
                      </div>

                      {/* Main Action Button Section */}
                      <div className="pt-4 border-t">
                        <h4 className="font-semibold text-sm text-gray-700 mb-3">Main Action Button</h4>
                        
                        {/* Button Text */}
                        <div className="mb-4">
                          <Label>Button Text</Label>
                          <Input
                            value={form.button_text || ''}
                            onChange={(e) => setEditSlideForm(prev => ({ ...prev, button_text: e.target.value }))}
                            placeholder="e.g., Withdraw Credits →"
                          />
                        </div>

                        {/* Button Route */}
                        <div className="mb-4">
                          <Label>Button Route/URL</Label>
                          <Input
                            value={form.button_route || ''}
                            onChange={(e) => setEditSlideForm(prev => ({ ...prev, button_route: e.target.value }))}
                            placeholder="e.g., /withdrawal"
                          />
                        </div>
                      </div>

                      {/* Auto Play Interval */}
                      <div>
                        <Label>Auto-play Interval (seconds)</Label>
                        <Input
                          type="number"
                          value={form.auto_play_interval ?? 5}
                          onChange={(e) => setEditSlideForm(prev => ({ ...prev, auto_play_interval: parseInt(e.target.value) || 5 }))}
                          placeholder="5"
                        />
                      </div>

                      {/* Display Order */}
                      <div>
                        <Label>Display Order</Label>
                        <Input
                          type="number"
                          value={form.display_order ?? 0}
                          onChange={(e) => setEditSlideForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                          placeholder="Lower numbers appear first"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-4">
                        <Button
                          onClick={() => saveSlide(slide.id)}
                          disabled={savingSlide}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {savingSlide ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={cancelEditSlide}
                          disabled={savingSlide}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Preview Mode */}
                      <div className="flex gap-4 items-start">
                        {/* Slide Preview - Show actual slide */}
                        <div className="relative rounded-lg overflow-hidden border-2 border-gray-300 shadow-lg flex-shrink-0" style={{ width: '300px', height: '200px' }}>
                          <img
                            src={slide.image_url}
                            alt={slide.card_text || 'Slide'}
                            className="w-full h-full object-cover"
                            style={{ objectPosition: slide.background_position || 'center center' }}
                            loading="lazy"
                            decoding="async"
                            onError={handleImageError}
                          />
                          {/* Overlay with slide content */}
                          <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                            <div className="text-white">
                              {slide.brand_text && (
                                <p className="text-xs font-semibold mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{slide.brand_text}</p>
                              )}
                              {slide.heading && (
                                <h3 className="font-bold text-lg mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{slide.heading}</h3>
                              )}
                              {slide.description && (
                                <p className="text-sm drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{slide.description}</p>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              {slide.button_text && (
                                <span className="inline-block px-3 py-1.5 text-sm font-semibold bg-white text-gray-900 rounded shadow-lg">
                                  {slide.button_text}
                                </span>
                              )}
                              {slide.card_text && (
                                <span className="inline-block px-3 py-1.5 text-sm font-semibold bg-blue-500 text-white rounded shadow-lg">
                                  {slide.card_text}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Slide Details - Next to image */}
                        <div className="flex-1 min-w-0">
                          {slide.brand_text && (
                            <p className="text-xs font-semibold text-gray-800">{slide.brand_text}</p>
                          )}
                          {slide.heading && (
                            <h4 className="font-semibold text-lg mt-1 text-gray-800">{slide.heading}</h4>
                          )}
                          {slide.description && (
                            <p className="text-sm text-gray-800 mt-1">{slide.description}</p>
                          )}
                          {slide.button_text && (
                            <Badge className="mt-2 text-gray-800" variant="outline">
                              {slide.button_text}
                            </Badge>
                          )}
                          {slide.card_text && (
                            <Badge className="mt-2 ml-2 text-gray-800" variant="outline">
                              Card: {slide.card_text}
                            </Badge>
                          )}
                          <div className="text-xs text-gray-800 mt-3 pt-3 border-t border-gray-200 space-y-1">
                            <p>Order: {slide.display_order}</p>
                            <p>Background Position: {slide.background_position}</p>
                            <p>Auto-play: {slide.auto_play_interval}s</p>
                            {slide.button_route && (
                              <p>Button Route: {slide.button_route}</p>
                            )}
                            {slide.card_route && (
                              <p>Card Route: {slide.card_route}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
          
          {slides.length === 0 && !isCreatingSlide && (
            <Card className="border-0 shadow-xl">
              <CardContent className="p-12 text-center">
                <Film className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Slides Found</h3>
                <p className="text-gray-600">Run the SQL script to create the default slides.</p>
              </CardContent>
            </Card>
          )}
        </div>
        </div>

        {/* Community Events Section - Always render */}
        <div className="pt-8 border-t-2 border-gray-200" key="community-events-section">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-green-600" />
                Community Events
              </h2>
              <p className="text-gray-600 mt-1">
                Manage upcoming community events that appear on the Discover &amp; Earn Upcoming Events card.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="text-sm bg-gradient-to-r from-green-600 to-emerald-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
                <Clock className="w-4 h-4 mr-2" />
                {events.filter(e => e.status === 'upcoming').length} Upcoming
              </Badge>
              <Button
                onClick={() => {
                  setIsCreatingEvent(true);
                  setNewEventForm({
                    status: 'upcoming',
                    participants: 0
                  });
                }}
                className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white border-0 shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Event
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* New Event Form */}
            {isCreatingEvent && (
              <Card className="border-2 border-dashed border-green-300 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-gray-900 to-black text-white border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-semibold text-white">New Community Event</CardTitle>
                      <CardDescription className="text-gray-300">
                        Capture the details for an upcoming community or collection event
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsCreatingEvent(false);
                        setNewEventForm({
                          status: 'upcoming',
                          participants: 0
                        });
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4 bg-gray-50">
                  <div>
                    <Label>Title *</Label>
                    <Input
                      value={newEventForm.title || ''}
                      onChange={(e) => setNewEventForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Soweto Clean-up Day"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={newEventForm.description || ''}
                      onChange={(e) => setNewEventForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Short description of the event"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Event Date *</Label>
                      <Input
                        type="date"
                        value={newEventForm.event_date || ''}
                        onChange={(e) => setNewEventForm(prev => ({ ...prev, event_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={newEventForm.start_time || ''}
                        onChange={(e) => setNewEventForm(prev => ({ ...prev, start_time: e.target.value ? `${e.target.value}:00+02` : null }))}
                      />
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={newEventForm.end_time || ''}
                        onChange={(e) => setNewEventForm(prev => ({ ...prev, end_time: e.target.value ? `${e.target.value}:00+02` : null }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Location Name</Label>
                    <Input
                      value={newEventForm.location || ''}
                      onChange={(e) => setNewEventForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g. Johannesburg City Park"
                    />
                  </div>
                  <div>
                    <Label>Full Address</Label>
                    <Textarea
                      value={newEventForm.address || ''}
                      onChange={(e) => setNewEventForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Full address for maps / directions"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Event Flyer (Optional)</Label>
                    <div className="mt-2 flex items-center gap-4">
                      {newEventForm.image_url && (
                        <img
                          src={newEventForm.image_url}
                          alt="Event flyer preview"
                          className="w-32 h-32 object-cover rounded-lg border"
                          loading="lazy"
                          decoding="async"
                          onError={handleImageError}
                        />
                      )}
                      <div>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                setUploadingImage('new-event');
                                toast.info('Compressing flyer image...');

                                const compressedFile = await compressImageForCard(file);
                                console.log(`Event flyer compressed: ${(file.size / 1024).toFixed(2)}KB → ${(compressedFile.size / 1024).toFixed(2)}KB`);

                                const result = await uploadAdMedia(compressedFile);
                                if (result.error) {
                                  toast.error('Failed to upload flyer');
                                  return;
                                }
                                if (result.url) {
                                  setNewEventForm(prev => ({ ...prev, image_url: result.url }));
                                  toast.success('Flyer uploaded successfully');
                                }
                              } catch (error) {
                                console.error('Error uploading flyer:', error);
                                toast.error('Failed to upload flyer');
                              } finally {
                                setUploadingImage(null);
                              }
                            }
                          }}
                          disabled={uploadingImage === 'new-event'}
                          className="w-64"
                        />
                        {uploadingImage === 'new-event' && (
                          <p className="text-sm text-gray-500 mt-1">Uploading...</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={newEventForm.type || ''}
                        onValueChange={(value) => setNewEventForm(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Community Collection">Community Collection</SelectItem>
                          <SelectItem value="Workshop">Workshop</SelectItem>
                          <SelectItem value="Challenge">Challenge</SelectItem>
                          <SelectItem value="School Event">School Event</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={newEventForm.status || 'upcoming'}
                        onValueChange={(value: any) => setNewEventForm(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Expected Participants</Label>
                      <Input
                        type="number"
                        min={0}
                        value={newEventForm.participants ?? 0}
                        onChange={(e) => setNewEventForm(prev => ({ ...prev, participants: Number(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Rewards / Notes</Label>
                    <Textarea
                      value={newEventForm.rewards || ''}
                      onChange={(e) => setNewEventForm(prev => ({ ...prev, rewards: e.target.value }))}
                      placeholder="e.g. Bonus Green Scholar points, prizes, certificates"
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreatingEvent(false);
                        setNewEventForm({
                          status: 'upcoming',
                          participants: 0
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateEvent}
                      disabled={savingEvent}
                      className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white"
                    >
                      {savingEvent ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Event
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Existing Events */}
            <div className="space-y-4">
              {eventsLoading && (
                <Card className="border-0 shadow-xl">
                  <CardContent className="p-6 flex items-center justify-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                    <span className="text-sm text-gray-700">Loading community events...</span>
                  </CardContent>
                </Card>
              )}

              {!eventsLoading && events.length === 0 && !isCreatingEvent && (
                <Card className="border-0 shadow-xl">
                  <CardContent className="p-10 text-center">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Community Events Found</h3>
                    <p className="text-gray-600 mb-4">
                      Click &quot;Add New Event&quot; to schedule your first community event.
                    </p>
                  </CardContent>
                </Card>
              )}

              {events.map(event => {
                const isEditing = editingEvent === event.id;
                const local = isEditing ? editEventForm : event;
                const badgeColor =
                  event.status === 'upcoming'
                    ? 'bg-green-100 text-green-800'
                    : event.status === 'completed'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-red-100 text-red-800';

                return (
                  <Card key={event.id} className="border-0 shadow-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-green-600" />
                            {local.title}
                          </CardTitle>
                          <CardDescription className="text-gray-600 mt-1">
                            {local.description || 'No description provided'}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeColor}`}>
                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                          </div>
                          <div className="text-xs text-gray-700 flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              {event.event_date}
                              {event.start_time ? ` • ${event.start_time.substring(0, 5)}` : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4 bg-white">
                      {isEditing ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Title *</Label>
                              <Input
                                value={editEventForm.title || ''}
                                onChange={(e) => setEditEventForm(prev => ({ ...prev, title: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label>Type</Label>
                              <Select
                                value={editEventForm.type || ''}
                                onValueChange={(value) => setEditEventForm(prev => ({ ...prev, type: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Community Collection">Community Collection</SelectItem>
                                  <SelectItem value="Workshop">Workshop</SelectItem>
                                  <SelectItem value="Challenge">Challenge</SelectItem>
                                  <SelectItem value="School Event">School Event</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Textarea
                              value={editEventForm.description || ''}
                              onChange={(e) => setEditEventForm(prev => ({ ...prev, description: e.target.value }))}
                              rows={2}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label>Event Date *</Label>
                              <Input
                                type="date"
                                value={editEventForm.event_date || event.event_date}
                                onChange={(e) => setEditEventForm(prev => ({ ...prev, event_date: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label>Start Time</Label>
                              <Input
                                type="time"
                                value={editEventForm.start_time?.substring(0, 5) || event.start_time?.substring(0, 5) || ''}
                                onChange={(e) =>
                                  setEditEventForm(prev => ({
                                    ...prev,
                                    start_time: e.target.value ? `${e.target.value}:00+02` : null
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <Label>End Time</Label>
                              <Input
                                type="time"
                                value={editEventForm.end_time?.substring(0, 5) || event.end_time?.substring(0, 5) || ''}
                                onChange={(e) =>
                                  setEditEventForm(prev => ({
                                    ...prev,
                                    end_time: e.target.value ? `${e.target.value}:00+02` : null
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Location Name</Label>
                              <Input
                                value={editEventForm.location || event.location || ''}
                                onChange={(e) => setEditEventForm(prev => ({ ...prev, location: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label>Status</Label>
                              <Select
                                value={editEventForm.status || event.status}
                                onValueChange={(value: any) =>
                                  setEditEventForm(prev => ({ ...prev, status: value }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="upcoming">Upcoming</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label>Expected Participants</Label>
                              <Input
                                type="number"
                                min={0}
                                value={editEventForm.participants ?? event.participants ?? 0}
                                onChange={(e) =>
                                  setEditEventForm(prev => ({
                                    ...prev,
                                    participants: Number(e.target.value) || 0
                                  }))
                                }
                              />
                            </div>
                            <div className="md:col-span-2">
                              <Label>Event Flyer (Optional)</Label>
                              <div className="mt-2 flex items-center gap-4">
                                {(editEventForm.image_url || event.image_url) && (
                                  <img
                                    src={editEventForm.image_url || event.image_url || ''}
                                    alt="Event flyer"
                                    className="w-32 h-32 object-cover rounded-lg border"
                                    loading="lazy"
                                    decoding="async"
                                    onError={handleImageError}
                                  />
                                )}
                                <div>
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        try {
                                          setUploadingImage(event.id);
                                          toast.info('Compressing flyer image...');

                                          const compressedFile = await compressImageForCard(file);
                                          console.log(`Event flyer compressed: ${(file.size / 1024).toFixed(2)}KB → ${(compressedFile.size / 1024).toFixed(2)}KB`);

                                          const result = await uploadAdMedia(compressedFile);
                                          if (result.error) {
                                            toast.error('Failed to upload flyer');
                                            return;
                                          }
                                          if (result.url) {
                                            setEditEventForm(prev => ({ ...prev, image_url: result.url }));
                                            toast.success('Flyer uploaded successfully');
                                          }
                                        } catch (error) {
                                          console.error('Error uploading flyer:', error);
                                          toast.error('Failed to upload flyer');
                                        } finally {
                                          setUploadingImage(null);
                                        }
                                      }
                                    }}
                                    disabled={uploadingImage === event.id}
                                    className="w-64"
                                  />
                                  {uploadingImage === event.id && (
                                    <p className="text-sm text-gray-500 mt-1">Uploading...</p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="md:col-span-2">
                              <Label>Rewards / Notes</Label>
                              <Textarea
                                value={editEventForm.rewards || event.rewards || ''}
                                onChange={(e) => setEditEventForm(prev => ({ ...prev, rewards: e.target.value }))}
                                rows={2}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setEditingEvent(null);
                                setEditEventForm({});
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleUpdateEvent}
                              disabled={savingEvent}
                              className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white"
                            >
                              {savingEvent ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4 mr-2" />
                                  Save Changes
                                </>
                              )}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          {event.image_url && (
                            <div className="mb-4">
                              <img
                                src={event.image_url}
                                alt={event.title}
                                className="w-full max-h-48 object-cover rounded-lg border"
                                loading="lazy"
                                decoding="async"
                                onError={handleImageError}
                              />
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-800">
                            <div className="space-y-1">
                              <p>
                                <span className="font-semibold">Date:</span> {event.event_date}
                              </p>
                              {event.start_time && (
                                <p>
                                  <span className="font-semibold">Time:</span>{' '}
                                  {event.start_time.substring(0, 5)}
                                  {event.end_time ? ` - ${event.end_time.substring(0, 5)}` : ''}
                                </p>
                              )}
                              {event.type && (
                                <p>
                                  <span className="font-semibold">Type:</span> {event.type}
                                </p>
                              )}
                              {event.participants != null && event.participants >= 0 && (
                                <p>
                                  <span className="font-semibold">Participants:</span>{' '}
                                  {event.participants}
                                </p>
                              )}
                            </div>
                            <div className="space-y-1">
                              {event.location && (
                                <p>
                                  <span className="font-semibold">Location:</span> {event.location}
                                </p>
                              )}
                              {event.address && (
                                <p>
                                  <span className="font-semibold">Address:</span> {event.address}
                                </p>
                              )}
                              {event.rewards && (
                                <p>
                                  <span className="font-semibold">Rewards:</span> {event.rewards}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingEvent(event.id);
                                setEditEventForm({ ...event });
                              }}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleDeleteEvent(event.id)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {/* Watch Ads Videos Section - Always render */}
        <div className="pt-8 border-t-2 border-gray-200" key="watch-ads-videos-section">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Video className="w-6 h-6 text-purple-500" />
                Watch Ads Videos
              </h2>
              <p className="text-gray-600 mt-1">Manage videos that users can watch to earn credits</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="text-sm bg-gradient-to-r from-purple-600 to-purple-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
                <Video className="w-4 h-4 mr-2" />
                {videos.filter(v => v.is_active).length} Active
              </Badge>
              <Button
                onClick={() => setIsCreatingVideo(true)}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Video
              </Button>
            </div>
          </div>

          {/* Videos Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* New Video Form Card */}
            {isCreatingVideo && (
              <Card className="border-2 border-dashed border-purple-300 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-gray-900 to-black text-white border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-semibold text-white">New Video</CardTitle>
                      <CardDescription className="text-gray-300">Fill in the details to create a new video</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsCreatingVideo(false);
                        setNewVideoForm({
                          display_order: 0,
                          is_active: true,
                          video_type: 'direct',
                          credit_amount: 5.00,
                          watch_duration_seconds: 30,
                          watch_percentage_required: 80,
                          max_watches_per_day: 3
                        });
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4 bg-white">
                  {/* Title */}
                  <div>
                    <Label className="text-gray-900">Title *</Label>
                    <Input
                      value={newVideoForm.title || ''}
                      onChange={(e) => setNewVideoForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Video title"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label className="text-gray-900">Description</Label>
                    <Textarea
                      value={newVideoForm.description || ''}
                      onChange={(e) => setNewVideoForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Video description"
                      rows={2}
                    />
                  </div>

                  {/* Video Type */}
                  <div>
                    <Label className="text-gray-900">Video Type *</Label>
                    <Select
                      value={newVideoForm.video_type || 'direct'}
                      onValueChange={(value: any) => setNewVideoForm(prev => ({ ...prev, video_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct">Direct URL</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="vimeo">Vimeo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Video Upload or URL */}
                  <div>
                    <Label className="text-gray-900">Video File Upload (Optional)</Label>
                    <Input
                      type="file"
                      accept="video/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            setUploadingThumbnail('new-video-upload');
                            toast.info('Compressing video... This may take a moment.');
                            
                            // Compress video before upload
                            const compressedFile = await compressVideoForMobile(file);
                            const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);
                            const compressedSizeMB = (compressedFile.size / (1024 * 1024)).toFixed(2);
                            console.log(`Video compressed: ${originalSizeMB}MB → ${compressedSizeMB}MB`);
                            
                            toast.info('Uploading compressed video...');
                            const result = await uploadAdMedia(compressedFile);
                            if (result.error) {
                              toast.error('Failed to upload video');
                              return;
                            }
                            if (result.url) {
                              setNewVideoForm(prev => ({ 
                                ...prev, 
                                video_url: result.url,
                                video_type: 'direct'
                              }));
                              toast.success(`Video uploaded! (${originalSizeMB}MB → ${compressedSizeMB}MB)`);
                            }
                          } catch (error) {
                            console.error('Error uploading video:', error);
                            toast.error('Failed to upload video');
                          } finally {
                            setUploadingThumbnail(null);
                          }
                        }
                      }}
                      disabled={uploadingThumbnail === 'new-video-upload'}
                      className="w-full"
                    />
                    {uploadingThumbnail === 'new-video-upload' && (
                      <p className="text-sm text-blue-600 mt-1">⏳ Compressing and uploading video... Please wait.</p>
                    )}
                    {newVideoForm.video_url && newVideoForm.video_type === 'direct' && (
                      <p className="text-sm text-green-600 mt-1">✅ Video uploaded: {newVideoForm.video_url}</p>
                    )}
                  </div>

                  {/* Video URL */}
                  <div>
                    <Label className="text-gray-900">Video URL * (or use upload above)</Label>
                    <Input
                      value={newVideoForm.video_url || ''}
                      onChange={(e) => setNewVideoForm(prev => ({ ...prev, video_url: e.target.value }))}
                      placeholder="https://www.youtube.com/watch?v=... or direct video URL"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      For YouTube: https://www.youtube.com/watch?v=VIDEO_ID<br />
                      For Vimeo: https://vimeo.com/VIDEO_ID<br />
                      For direct: Full URL to video file (or upload above)
                    </p>
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-xs font-semibold text-blue-900 mb-1">📱 Mobile Video Recommendations:</p>
                      <ul className="text-xs text-blue-800 space-y-0.5 ml-4 list-disc">
                        <li>Resolution: 720p (1280×720) or 1080p (1920×1080)</li>
                        <li>Duration: 15-60 seconds (optimal for mobile)</li>
                        <li>File size: 5-15 MB (max 25 MB) - Videos are automatically compressed</li>
                        <li>Format: MP4 (H.264 codec, AAC audio) - Auto-converted to WebM if needed</li>
                        <li>Aspect ratio: 16:9 (landscape) or 9:16 (portrait)</li>
                      </ul>
                      <p className="text-xs text-blue-700 mt-2 font-semibold">💡 Tip: Upload videos directly to automatically compress them for mobile!</p>
                    </div>
                  </div>

                  {/* Thumbnail Upload */}
                  <div>
                    <Label className="text-gray-900">Thumbnail Image (Optional)</Label>
                    <div className="mt-2 flex items-center gap-4">
                      {newVideoForm.thumbnail_url && (
                        <img
                          src={newVideoForm.thumbnail_url}
                          alt="Thumbnail preview"
                          className="w-32 h-32 object-cover rounded-lg border"
                          loading="lazy"
                          decoding="async"
                          onError={handleImageError}
                        />
                      )}
                      <div>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                setUploadingThumbnail('new-video');
                                toast.info('Uploading thumbnail...');
                                
                                const result = await uploadAdMedia(file);
                                if (result.error) {
                                  toast.error('Failed to upload thumbnail');
                                  return;
                                }
                                if (result.url) {
                                  setNewVideoForm(prev => ({ ...prev, thumbnail_url: result.url }));
                                  toast.success('Thumbnail uploaded successfully');
                                }
                              } catch (error) {
                                console.error('Error uploading thumbnail:', error);
                                toast.error('Failed to upload thumbnail');
                              } finally {
                                setUploadingThumbnail(null);
                              }
                            }
                          }}
                          disabled={uploadingThumbnail === 'new-video'}
                          className="w-64"
                        />
                        {uploadingThumbnail === 'new-video' && (
                          <p className="text-sm text-gray-500 mt-1">Uploading...</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Credit Amount */}
                  <div>
                    <Label className="text-gray-900">Credit Amount (C)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newVideoForm.credit_amount || 5.00}
                      onChange={(e) => setNewVideoForm(prev => ({ ...prev, credit_amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="5.00"
                    />
                  </div>

                  {/* Watch Duration */}
                  <div>
                    <Label className="text-gray-900">Minimum Watch Duration (seconds)</Label>
                    <Input
                      type="number"
                      value={newVideoForm.watch_duration_seconds || 30}
                      onChange={(e) => setNewVideoForm(prev => ({ ...prev, watch_duration_seconds: parseInt(e.target.value) || 0 }))}
                      placeholder="30"
                    />
                  </div>

                  {/* Watch Percentage Required */}
                  <div>
                    <Label className="text-gray-900">Watch Percentage Required (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={newVideoForm.watch_percentage_required || 80}
                      onChange={(e) => setNewVideoForm(prev => ({ ...prev, watch_percentage_required: parseInt(e.target.value) || 0 }))}
                      placeholder="80"
                    />
                  </div>

                  {/* Max Watches Per Day */}
                  <div>
                    <Label className="text-gray-900">Max Watches Per Day (leave empty for unlimited)</Label>
                    <Input
                      type="number"
                      value={newVideoForm.max_watches_per_day || ''}
                      onChange={(e) => setNewVideoForm(prev => ({ ...prev, max_watches_per_day: e.target.value ? parseInt(e.target.value) : undefined }))}
                      placeholder="3"
                    />
                  </div>

                  {/* Display Order */}
                  <div>
                    <Label className="text-gray-900">Display Order</Label>
                    <Input
                      type="number"
                      value={newVideoForm.display_order ?? 0}
                      onChange={(e) => setNewVideoForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                      placeholder="Lower numbers appear first"
                    />
                  </div>

                  {/* Advertiser Name */}
                  <div>
                    <Label className="text-gray-900">Advertiser Name (Optional)</Label>
                    <Input
                      value={newVideoForm.advertiser_name || ''}
                      onChange={(e) => setNewVideoForm(prev => ({ ...prev, advertiser_name: e.target.value }))}
                      placeholder="Advertiser/sponsor name"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <Label className="text-gray-900">Category (Optional)</Label>
                    <Input
                      value={newVideoForm.category || ''}
                      onChange={(e) => setNewVideoForm(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="e.g., education, promotion, sponsor"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={async () => {
                        try {
                          if (!newVideoForm.title || !newVideoForm.video_url) {
                            toast.error('Please fill in all required fields (Title, Video URL)');
                            return;
                          }
                          setCreatingVideo(true);
                          // In Vite, API routes don't exist - create directly via Supabase
                          const client = supabaseAdmin || supabase;
                          
                          const { error } = await client
                            .from('watch_ads_videos')
                            .insert(newVideoForm);

                          if (error) {
                            const errorMessage = error.details 
                              ? `${error.message}: ${error.details}`
                              : error.message || 'Failed to create video';
                            console.error('Video creation error:', error);
                            throw new Error(errorMessage);
                          }

                          toast.success('Video created successfully');
                          setIsCreatingVideo(false);
                          setNewVideoForm({
                            display_order: 0,
                            is_active: true,
                            video_type: 'direct',
                            credit_amount: 5.00,
                            watch_duration_seconds: 30,
                            watch_percentage_required: 80,
                            max_watches_per_day: 3
                          });
                          loadVideos();
                        } catch (error: any) {
                          console.error('Error creating video:', error);
                          toast.error(error.message || 'Failed to create video');
                        } finally {
                          setCreatingVideo(false);
                        }
                      }}
                      disabled={creatingVideo}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 shadow-lg"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {creatingVideo ? 'Creating...' : 'Create Video'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreatingVideo(false);
                        setNewVideoForm({
                          display_order: 0,
                          is_active: true,
                          video_type: 'direct',
                          credit_amount: 5.00,
                          watch_duration_seconds: 30,
                          watch_percentage_required: 80,
                          max_watches_per_day: 3
                        });
                      }}
                      disabled={creatingVideo}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {videos.map((video) => {
              const isEditing = editingVideo === video.id;
              const form = isEditing ? editVideoForm : video;

              return (
                <Card key={video.id} className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-gray-900 to-black text-white border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-semibold text-white">{video.title}</CardTitle>
                        <CardDescription className="text-gray-300">
                          {video.description || 'No description'}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={`${video.is_active ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gray-400'} text-white border-0 cursor-pointer shadow-md`}
                          onClick={() => toggleVideoActive(video)}
                        >
                          {video.is_active ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                          {video.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {!isEditing && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEditVideo(video)}
                              className="bg-white/10 hover:bg-white/20 text-white border-white/30 hover:border-white/50"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteVideo(video.id)}
                              className="bg-red-500/20 hover:bg-red-500/30 text-red-200 border-red-400/30 hover:border-red-400/50 hover:text-red-100"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4 bg-white">
                    {isEditing ? (
                      <>
                        {/* Title */}
                        <div>
                          <Label className="text-gray-900">Title *</Label>
                          <Input
                            value={form.title || ''}
                            onChange={(e) => setEditVideoForm(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Video title"
                          />
                        </div>

                        {/* Description */}
                        <div>
                          <Label className="text-gray-900">Description</Label>
                          <Textarea
                            value={form.description || ''}
                            onChange={(e) => setEditVideoForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Video description"
                            rows={2}
                          />
                        </div>

                        {/* Video Type */}
                        <div>
                          <Label className="text-gray-900">Video Type *</Label>
                          <Select
                            value={form.video_type || 'direct'}
                            onValueChange={(value: any) => setEditVideoForm(prev => ({ ...prev, video_type: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="direct">Direct URL</SelectItem>
                              <SelectItem value="youtube">YouTube</SelectItem>
                              <SelectItem value="vimeo">Vimeo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Video Upload or URL */}
                        <div>
                          <Label className="text-gray-900">Video File Upload (Optional - replaces current video)</Label>
                          <Input
                            type="file"
                            accept="video/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  setUploadingThumbnail(video.id + '-video');
                                  toast.info('Compressing video... This may take a moment.');
                                  
                                  // Compress video before upload
                                  const compressedFile = await compressVideoForMobile(file);
                                  const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);
                                  const compressedSizeMB = (compressedFile.size / (1024 * 1024)).toFixed(2);
                                  console.log(`Video compressed: ${originalSizeMB}MB → ${compressedSizeMB}MB`);
                                  
                                  toast.info('Uploading compressed video...');
                                  const result = await uploadAdMedia(compressedFile);
                                  if (result.error) {
                                    toast.error('Failed to upload video');
                                    return;
                                  }
                                  if (result.url) {
                                    setEditVideoForm(prev => ({ 
                                      ...prev, 
                                      video_url: result.url,
                                      video_type: 'direct'
                                    }));
                                    toast.success(`Video uploaded! (${originalSizeMB}MB → ${compressedSizeMB}MB)`);
                                  }
                                } catch (error) {
                                  console.error('Error uploading video:', error);
                                  toast.error('Failed to upload video');
                                } finally {
                                  setUploadingThumbnail(null);
                                }
                              }
                            }}
                            disabled={uploadingThumbnail === video.id + '-video'}
                            className="w-full"
                          />
                          {uploadingThumbnail === video.id + '-video' && (
                            <p className="text-sm text-blue-600 mt-1">⏳ Compressing and uploading video... Please wait.</p>
                          )}
                          {editVideoForm.video_url && editVideoForm.video_type === 'direct' && (
                            <p className="text-sm text-green-600 mt-1">✅ Video uploaded: {editVideoForm.video_url}</p>
                          )}
                        </div>

                        {/* Video URL */}
                        <div>
                          <Label className="text-gray-900">Video URL * (or use upload above)</Label>
                          <Input
                            value={form.video_url || ''}
                            onChange={(e) => setEditVideoForm(prev => ({ ...prev, video_url: e.target.value }))}
                            placeholder="Video URL"
                          />
                          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-xs font-semibold text-blue-900 mb-1">📱 Mobile Video Recommendations:</p>
                            <ul className="text-xs text-blue-800 space-y-0.5 ml-4 list-disc">
                              <li>Resolution: 720p (1280×720) or 1080p (1920×1080)</li>
                              <li>Duration: 15-60 seconds (optimal for mobile)</li>
                              <li>File size: 5-15 MB (max 25 MB) - Videos are automatically compressed</li>
                              <li>Format: MP4 (H.264 codec, AAC audio) - Auto-converted to WebM if needed</li>
                              <li>Aspect ratio: 16:9 (landscape) or 9:16 (portrait)</li>
                            </ul>
                            <p className="text-xs text-blue-700 mt-2 font-semibold">💡 Tip: Upload videos directly to automatically compress them for mobile!</p>
                          </div>
                        </div>

                        {/* Thumbnail Upload */}
                        <div>
                          <Label className="text-gray-900">Thumbnail Image</Label>
                          <div className="mt-2 flex items-center gap-4">
                            {form.thumbnail_url && (
                              <img
                                src={form.thumbnail_url}
                                alt="Thumbnail preview"
                                className="w-32 h-32 object-cover rounded-lg border"
                                loading="lazy"
                                decoding="async"
                                onError={handleImageError}
                              />
                            )}
                            <div>
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleThumbnailUpload(video.id, file);
                                }}
                                disabled={uploadingThumbnail === video.id}
                                className="w-64"
                              />
                              {uploadingThumbnail === video.id && (
                                <p className="text-sm text-gray-500 mt-1">Uploading...</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Credit Amount */}
                        <div>
                          <Label className="text-gray-900">Credit Amount (C)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={form.credit_amount || 0}
                            onChange={(e) => setEditVideoForm(prev => ({ ...prev, credit_amount: parseFloat(e.target.value) || 0 }))}
                          />
                        </div>

                        {/* Watch Duration */}
                        <div>
                          <Label className="text-gray-900">Minimum Watch Duration (seconds)</Label>
                          <Input
                            type="number"
                            value={form.watch_duration_seconds || 0}
                            onChange={(e) => setEditVideoForm(prev => ({ ...prev, watch_duration_seconds: parseInt(e.target.value) || 0 }))}
                          />
                        </div>

                        {/* Watch Percentage Required */}
                        <div>
                          <Label className="text-gray-900">Watch Percentage Required (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={form.watch_percentage_required || 0}
                            onChange={(e) => setEditVideoForm(prev => ({ ...prev, watch_percentage_required: parseInt(e.target.value) || 0 }))}
                          />
                        </div>

                        {/* Max Watches Per Day */}
                        <div>
                          <Label className="text-gray-900">Max Watches Per Day (leave empty for unlimited)</Label>
                          <Input
                            type="number"
                            value={form.max_watches_per_day || ''}
                            onChange={(e) => setEditVideoForm(prev => ({ ...prev, max_watches_per_day: e.target.value ? parseInt(e.target.value) : undefined }))}
                          />
                        </div>

                        {/* Display Order */}
                        <div>
                          <Label className="text-gray-900">Display Order</Label>
                          <Input
                            type="number"
                            value={form.display_order ?? 0}
                            onChange={(e) => setEditVideoForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                          />
                        </div>

                        {/* Advertiser Name */}
                        <div>
                          <Label className="text-gray-900">Advertiser Name</Label>
                          <Input
                            value={form.advertiser_name || ''}
                            onChange={(e) => setEditVideoForm(prev => ({ ...prev, advertiser_name: e.target.value }))}
                          />
                        </div>

                        {/* Category */}
                        <div>
                          <Label className="text-gray-900">Category</Label>
                          <Input
                            value={form.category || ''}
                            onChange={(e) => setEditVideoForm(prev => ({ ...prev, category: e.target.value }))}
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-4">
                          <Button
                            onClick={() => saveVideo(video.id)}
                            disabled={savingVideo}
                            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 shadow-lg"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {savingVideo ? 'Saving...' : 'Save Changes'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={cancelEditVideo}
                            disabled={savingVideo}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Preview Mode */}
                        <div className="space-y-3">
                          {video.thumbnail_url && (
                            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                              <img
                                src={video.thumbnail_url}
                                alt={video.title}
                                className="absolute top-0 left-0 w-full h-full object-cover rounded-lg"
                                loading="lazy"
                                decoding="async"
                                onError={handleImageError}
                              />
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-blue-100 text-blue-800">
                              <Play className="w-3 h-3 mr-1" />
                              {video.video_type}
                            </Badge>
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <Coins className="w-3 h-3 mr-1" />
                              C {video.credit_amount.toFixed(2)}
                            </Badge>
                            <Badge className="bg-gray-100 text-gray-800">
                              <Clock className="w-3 h-3 mr-1" />
                              {Math.floor(video.watch_duration_seconds / 60)}:{(video.watch_duration_seconds % 60).toString().padStart(2, '0')}
                            </Badge>
                          </div>

                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>Video URL:</strong> <a href={video.video_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{video.video_url}</a></p>
                            <p><strong>Watch {video.watch_percentage_required}%</strong> to qualify for credits</p>
                            {video.max_watches_per_day && (
                              <p><strong>Max watches per day:</strong> {video.max_watches_per_day}</p>
                            )}
                            {video.advertiser_name && (
                              <p><strong>Advertiser:</strong> {video.advertiser_name}</p>
                            )}
                            {video.category && (
                              <p><strong>Category:</strong> {video.category}</p>
                            )}
                            <p><strong>Display Order:</strong> {video.display_order}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {videos.length === 0 && !isCreatingVideo && (
            <Card className="border-0 shadow-xl">
              <CardContent className="p-12 text-center">
                <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Videos Found</h3>
                <p className="text-gray-600">Click "Add New Video" to create your first video.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Watch Ads Statistics Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Watch Ads Statistics
              </h2>
              <p className="text-gray-600 mt-2 text-base sm:text-lg">
                Track which users watched which ads and view detailed analytics
              </p>
            </div>
          </div>

          {/* Filters */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-yellow-50">
            <CardHeader className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 rounded-t-lg">
              <CardTitle className="flex items-center text-xl font-bold">
                <Filter className="w-5 h-5 mr-2" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Quick Date Presets */}
              <div className="mb-4">
                <Label className="text-gray-900 mb-2 block">Quick Filters</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { applyDatePreset('today'); setTimeout(loadStats, 100); }}
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 text-xs"
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { applyDatePreset('yesterday'); setTimeout(loadStats, 100); }}
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 text-xs"
                  >
                    Yesterday
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { applyDatePreset('last7days'); setTimeout(loadStats, 100); }}
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 text-xs"
                  >
                    Last 7 Days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { applyDatePreset('last30days'); setTimeout(loadStats, 100); }}
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 text-xs"
                  >
                    Last 30 Days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { applyDatePreset('thisMonth'); setTimeout(loadStats, 100); }}
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 text-xs"
                  >
                    This Month
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { applyDatePreset('lastMonth'); setTimeout(loadStats, 100); }}
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 text-xs"
                  >
                    Last Month
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { applyDatePreset('thisYear'); setTimeout(loadStats, 100); }}
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 text-xs"
                  >
                    This Year
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { applyDatePreset('all'); setTimeout(loadStats, 100); }}
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 text-xs"
                  >
                    All Time
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={statsFilters.start_date}
                    onChange={(e) => setStatsFilters(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={statsFilters.end_date}
                    onChange={(e) => setStatsFilters(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="video_id">Video ID (optional)</Label>
                  <Input
                    id="video_id"
                    value={statsFilters.video_id}
                    onChange={(e) => setStatsFilters(prev => ({ ...prev, video_id: e.target.value }))}
                    placeholder="Filter by video"
                  />
                </div>
                <div>
                  <Label htmlFor="user_id">User ID (optional)</Label>
                  <Input
                    id="user_id"
                    value={statsFilters.user_id}
                    onChange={(e) => setStatsFilters(prev => ({ ...prev, user_id: e.target.value }))}
                    placeholder="Filter by user"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={loadStats}
                  disabled={statsLoading}
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-yellow-900 font-semibold shadow-md"
                >
                  {statsLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Apply Filters'
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setStatsFilters({ video_id: '', user_id: '', start_date: '', end_date: '' });
                    setTimeout(loadStats, 100);
                  }}
                  className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {statsError && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100">
              <CardContent className="pt-6">
                <p className="text-red-700 font-medium">{statsError}</p>
              </CardContent>
            </Card>
          )}

          {statsLoading && !stats && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-yellow-600" />
            </div>
          )}

          {stats && stats.summary && (
            <>
              {/* Summary Stats - First Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100 hover:shadow-xl transition-all duration-300 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-200 rounded-full -mr-16 -mt-16 opacity-20"></div>
                  <CardContent className="pt-6 relative z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-800 mb-1">Total Watches</p>
                        <p className="text-3xl font-bold text-yellow-900">{stats.summary.total_watches || 0}</p>
                      </div>
                      <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Video className="w-7 h-7 text-yellow-900" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-amber-100 hover:shadow-xl transition-all duration-300 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200 rounded-full -mr-16 -mt-16 opacity-20"></div>
                  <CardContent className="pt-6 relative z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-amber-800 mb-1">Qualified Watches</p>
                        <p className="text-3xl font-bold text-amber-900">{stats.summary.qualified_watches || 0}</p>
                      </div>
                      <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                        <TrendingUp className="w-7 h-7 text-amber-900" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100 hover:shadow-xl transition-all duration-300 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-200 rounded-full -mr-16 -mt-16 opacity-20"></div>
                  <CardContent className="pt-6 relative z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-800 mb-1">Total Credits</p>
                        <p className="text-3xl font-bold text-yellow-900">
                          {typeof stats.summary.total_credits_awarded === 'number' 
                            ? stats.summary.total_credits_awarded.toFixed(2) 
                            : parseFloat(stats.summary.total_credits_awarded || '0').toFixed(2)}
                        </p>
                      </div>
                      <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                        <DollarSign className="w-7 h-7 text-yellow-900" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-amber-100 hover:shadow-xl transition-all duration-300 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200 rounded-full -mr-16 -mt-16 opacity-20"></div>
                  <CardContent className="pt-6 relative z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-amber-800 mb-1">Qualification Rate</p>
                        <p className="text-3xl font-bold text-amber-900">{stats.summary.qualification_rate || '0.00'}%</p>
                      </div>
                      <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Users className="w-7 h-7 text-amber-900" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Summary Stats - Second Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-all duration-300 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200 rounded-full -mr-16 -mt-16 opacity-20"></div>
                  <CardContent className="pt-6 relative z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-800 mb-1">Unique Viewers</p>
                        <p className="text-3xl font-bold text-blue-900">{stats.summary.unique_viewers || 0}</p>
                      </div>
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Users className="w-7 h-7 text-blue-900" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-xl transition-all duration-300 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200 rounded-full -mr-16 -mt-16 opacity-20"></div>
                  <CardContent className="pt-6 relative z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-800 mb-1">Avg Watch Duration</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {stats.summary.avg_watch_duration_seconds 
                            ? `${Math.floor((stats.summary.avg_watch_duration_seconds || 0) / 60)}:${String((stats.summary.avg_watch_duration_seconds || 0) % 60).padStart(2, '0')}`
                            : '0:00'}
                        </p>
                      </div>
                      <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Timer className="w-7 h-7 text-purple-900" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 hover:shadow-xl transition-all duration-300 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-200 rounded-full -mr-16 -mt-16 opacity-20"></div>
                  <CardContent className="pt-6 relative z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800 mb-1">Completion Rate</p>
                        <p className="text-3xl font-bold text-green-900">{stats.summary.completion_rate || '0.00'}%</p>
                      </div>
                      <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="w-7 h-7 text-green-900" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* View Mode Selector and Export Buttons */}
              <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
                <Select value={statsViewMode} onValueChange={(value: any) => setStatsViewMode(value)}>
                  <SelectTrigger className="w-48 border-gray-700 focus:border-yellow-500 focus:ring-yellow-500 bg-gray-800 hover:bg-gray-900 text-white">
                    <SelectValue className="text-white" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="summary" className="hover:bg-gray-700 focus:bg-gray-700 text-white">Summary</SelectItem>
                    <SelectItem value="by_video" className="hover:bg-gray-700 focus:bg-gray-700 text-white">By Video</SelectItem>
                    <SelectItem value="by_user" className="hover:bg-gray-700 focus:bg-gray-700 text-white">By User</SelectItem>
                    <SelectItem value="detailed" className="hover:bg-gray-700 focus:bg-gray-700 text-white">Detailed List</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportSummary}
                    disabled={!stats || !stats.summary}
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Summary CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportSummaryPDF}
                    disabled={!stats || !stats.summary}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Summary PDF
                  </Button>
                  {statsViewMode === 'detailed' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportDetailedList}
                        disabled={!stats || !stats.watches}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportDetailedListPDF}
                        disabled={!stats || !stats.watches}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                      </Button>
                    </>
                  )}
                  {statsViewMode === 'by_video' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportByVideo}
                        disabled={!stats || !stats.by_video}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportByVideoPDF}
                        disabled={!stats || !stats.by_video}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                      </Button>
                    </>
                  )}
                  {statsViewMode === 'by_user' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportByUser}
                        disabled={!stats || !stats.by_user}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportByUserPDF}
                        disabled={!stats || !stats.by_user}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* By Video View */}
              {statsViewMode === 'by_video' && (
                <div className="space-y-4">
                  {stats.by_video.map((video: any) => (
                    <Card key={video.video_id} className="border-0 shadow-lg bg-gradient-to-br from-white to-yellow-50 hover:shadow-xl transition-all duration-300">
                      <CardHeader className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 rounded-t-lg">
                        <CardTitle className="text-xl font-bold">{video.video_title}</CardTitle>
                        <CardDescription className="text-yellow-800">
                          {video.total_watches} total watches • {video.qualified_watches} qualified • {video.total_credits.toFixed(2)} credits
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                            <Users className="w-5 h-5 mr-2 text-yellow-600" />
                            Users who watched:
                          </h4>
                          {video.users.map((user: any) => (
                            <div key={user.watch_id || `${user.user_id}-${user.watched_at}`} className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200 hover:shadow-md transition-all duration-200">
                              <div>
                                <p className="font-semibold text-gray-900">{user.name || user.email}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {user.employee_number && (
                                    <span className="inline-block px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-md text-xs font-medium mr-2">
                                      {user.employee_number}
                                    </span>
                                  )}
                                  {new Date(user.watched_at).toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right">
                                {user.is_qualified ? (
                                  <span className="inline-block px-3 py-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-semibold rounded-lg text-sm shadow-sm">
                                    ✓ Qualified
                                  </span>
                                ) : (
                                  <span className="inline-block px-3 py-1 bg-gray-200 text-gray-600 font-medium rounded-lg text-sm">
                                    Not Qualified
                                  </span>
                                )}
                                <p className="text-sm font-semibold text-yellow-700 mt-1">{user.credits_awarded} credits</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* By User View */}
              {statsViewMode === 'by_user' && (
                <div className="space-y-4">
                  {stats.by_user.map((user: any) => (
                    <Card key={user.user_id} className="border-0 shadow-lg bg-gradient-to-br from-white to-yellow-50 hover:shadow-xl transition-all duration-300">
                      <CardHeader className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 rounded-t-lg">
                        <CardTitle className="text-xl font-bold">{user.user_name || user.user_email}</CardTitle>
                        <CardDescription className="text-yellow-800">
                          {user.employee_number && (
                            <span className="inline-block px-2 py-1 bg-yellow-200 text-yellow-900 rounded-md text-xs font-semibold mr-2">
                              {user.employee_number}
                            </span>
                          )}
                          {user.total_watches} total watches • {user.qualified_watches} qualified • {user.total_credits.toFixed(2)} credits earned
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                            <Video className="w-5 h-5 mr-2 text-yellow-600" />
                            Videos watched:
                          </h4>
                          {user.videos.map((video: any) => (
                            <div key={video.watch_id || `${video.video_id}-${video.watched_at}`} className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200 hover:shadow-md transition-all duration-200">
                              <div>
                                <p className="font-semibold text-gray-900">{video.video_title}</p>
                                <p className="text-sm text-gray-600 mt-1">{new Date(video.watched_at).toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                {video.is_qualified ? (
                                  <span className="inline-block px-3 py-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-semibold rounded-lg text-sm shadow-sm">
                                    ✓ Qualified
                                  </span>
                                ) : (
                                  <span className="inline-block px-3 py-1 bg-gray-200 text-gray-600 font-medium rounded-lg text-sm">
                                    Not Qualified
                                  </span>
                                )}
                                <p className="text-sm font-semibold text-yellow-700 mt-1">{video.credits_awarded} credits</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Detailed List View */}
              {statsViewMode === 'detailed' && (
                <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-yellow-50">
                  <CardHeader className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 rounded-t-lg">
                    <CardTitle className="text-xl font-bold">Detailed Watch List</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-yellow-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-800">User</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-800">Video</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-800">Watched At</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-800">Status</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-800">Credits</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.watches.slice(0, 50).map((watch: any) => (
                            <tr key={watch.id} className="border-b border-yellow-100 hover:bg-yellow-50 transition-colors">
                              <td className="py-3 px-4">
                                <div>
                                  <p className="font-medium text-gray-900">{watch.user?.full_name || watch.user?.email || 'Unknown'}</p>
                                  {watch.user?.employee_number && (
                                    <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded">
                                      {watch.user.employee_number}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-gray-700">{watch.video?.title || 'Unknown'}</td>
                              <td className="py-3 px-4 text-gray-600 text-sm">{new Date(watch.created_at).toLocaleString()}</td>
                              <td className="py-3 px-4">
                                {watch.is_qualified ? (
                                  <span className="inline-block px-2 py-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-semibold rounded text-xs">
                                    Qualified
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-1 bg-gray-200 text-gray-600 font-medium rounded text-xs">
                                    Not Qualified
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-semibold text-yellow-700">{watch.credits_awarded || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
    </div>
  );
}
