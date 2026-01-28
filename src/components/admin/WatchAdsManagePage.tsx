'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  Edit, 
  Save,
  X,
  Upload,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Plus,
  Play,
  Coins,
  Clock
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { uploadAdMedia } from '@/lib/app-settings';
import { toast } from '@/components/ui/sonner';

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

export default function WatchAdsManagePage() {
  const [videos, setVideos] = useState<WatchAdsVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [editingVideo, setEditingVideo] = useState<string | null>(null);
  const [isCreatingVideo, setIsCreatingVideo] = useState(false);
  const [editForm, setEditForm] = useState<Partial<WatchAdsVideo>>({});
  const [newVideoForm, setNewVideoForm] = useState<Partial<WatchAdsVideo>>({
    display_order: 0,
    is_active: true,
    video_type: 'direct',
    credit_amount: 5.00,
    watch_duration_seconds: 30,
    watch_percentage_required: 80,
    max_watches_per_day: 3
  });
  const [uploadingThumbnail, setUploadingThumbnail] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [creatingVideo, setCreatingVideo] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadVideos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/watch-ads/videos?admin=true');
      
      if (!response.ok) {
        throw new Error('Failed to load videos');
      }

      const result = await response.json();
      const data = result.videos || [];
      // Sort by display_order
      data.sort((a: WatchAdsVideo, b: WatchAdsVideo) => a.display_order - b.display_order);
      setVideos(data);
    } catch (error) {
      console.error('Error loading videos:', error);
      toast.error('Failed to load videos');
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      loadVideos();
    }
  }, [mounted, loadVideos]);

  const startEdit = (video: WatchAdsVideo) => {
    setEditingVideo(video.id);
    setEditForm({ ...video });
  };

  const cancelEdit = () => {
    setEditingVideo(null);
    setEditForm({});
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
        setEditForm(prev => ({ ...prev, thumbnail_url: result.url }));
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
      setSaving(true);
      const response = await fetch('/api/watch-ads/videos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: videoId,
          ...editForm
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save video');
      }

      toast.success('Video updated successfully');
      setEditingVideo(null);
      setEditForm({});
      loadVideos();
    } catch (error: any) {
      console.error('Error saving video:', error);
      toast.error(error.message || 'Failed to save video');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (video: WatchAdsVideo) => {
    try {
      const response = await fetch('/api/watch-ads/videos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: video.id,
          is_active: !video.is_active
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update video');
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

  // Prevent hydration mismatch by not rendering anything until mounted
  if (!mounted) {
    return null;
  }

  // Show loading state only after component has mounted
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 w-full">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 w-full">
      <div className="w-full space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Manage Watch Ads Videos
            </h1>
            <p className="text-gray-600 mt-2 text-base sm:text-lg">
              Manage videos that users can watch to earn credits
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <Badge className="text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 px-4 py-2 rounded-full shadow-lg">
              <Video className="w-4 h-4 mr-2" />
              {videos.filter(v => v.is_active).length} Videos Active
            </Badge>
            <Button
              onClick={() => setIsCreatingVideo(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Video
            </Button>
          </div>
        </div>

        {/* Videos Section */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Video className="w-6 h-6 text-blue-500" />
                Watch Ads Videos
              </h2>
              <p className="text-gray-600 mt-1">Manage videos that users can watch to earn credits</p>
            </div>
          </div>

          {/* Videos Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* New Video Form Card */}
            {isCreatingVideo && (
              <Card className="border-2 border-dashed border-blue-300 shadow-xl">
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
                <CardContent className="p-6 space-y-4 bg-gray-50">
                  {/* Title */}
                  <div>
                    <Label>Title *</Label>
                    <Input
                      value={newVideoForm.title || ''}
                      onChange={(e) => setNewVideoForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Video title"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={newVideoForm.description || ''}
                      onChange={(e) => setNewVideoForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Video description"
                      rows={2}
                    />
                  </div>

                  {/* Video Type */}
                  <div>
                    <Label>Video Type *</Label>
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

                  {/* Video URL */}
                  <div>
                    <Label>Video URL *</Label>
                    <Input
                      value={newVideoForm.video_url || ''}
                      onChange={(e) => setNewVideoForm(prev => ({ ...prev, video_url: e.target.value }))}
                      placeholder="https://www.youtube.com/watch?v=... or direct video URL"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      For YouTube: https://www.youtube.com/watch?v=VIDEO_ID<br />
                      For Vimeo: https://vimeo.com/VIDEO_ID<br />
                      For direct: Full URL to video file
                    </p>
                  </div>

                  {/* Thumbnail Upload */}
                  <div>
                    <Label>Thumbnail Image (Optional)</Label>
                    <div className="mt-2 flex items-center gap-4">
                      {newVideoForm.thumbnail_url && (
                        <img
                          src={newVideoForm.thumbnail_url}
                          alt="Thumbnail preview"
                          className="w-32 h-32 object-cover rounded-lg border"
                          loading="lazy"
                          decoding="async"
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
                    <Label>Credit Amount (C)</Label>
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
                    <Label>Minimum Watch Duration (seconds)</Label>
                    <Input
                      type="number"
                      value={newVideoForm.watch_duration_seconds || 30}
                      onChange={(e) => setNewVideoForm(prev => ({ ...prev, watch_duration_seconds: parseInt(e.target.value) || 0 }))}
                      placeholder="30"
                    />
                  </div>

                  {/* Watch Percentage Required */}
                  <div>
                    <Label>Watch Percentage Required (%)</Label>
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
                    <Label>Max Watches Per Day (leave empty for unlimited)</Label>
                    <Input
                      type="number"
                      value={newVideoForm.max_watches_per_day || ''}
                      onChange={(e) => setNewVideoForm(prev => ({ ...prev, max_watches_per_day: e.target.value ? parseInt(e.target.value) : undefined }))}
                      placeholder="3"
                    />
                  </div>

                  {/* Display Order */}
                  <div>
                    <Label>Display Order</Label>
                    <Input
                      type="number"
                      value={newVideoForm.display_order ?? 0}
                      onChange={(e) => setNewVideoForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                      placeholder="Lower numbers appear first"
                    />
                  </div>

                  {/* Advertiser Name */}
                  <div>
                    <Label>Advertiser Name (Optional)</Label>
                    <Input
                      value={newVideoForm.advertiser_name || ''}
                      onChange={(e) => setNewVideoForm(prev => ({ ...prev, advertiser_name: e.target.value }))}
                      placeholder="Advertiser/sponsor name"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <Label>Category (Optional)</Label>
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
                          const response = await fetch('/api/watch-ads/videos', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(newVideoForm)
                          });

                          if (!response.ok) {
                            const error = await response.json();
                            throw new Error(error.error || 'Failed to create video');
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
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg"
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
              const form = isEditing ? editForm : video;

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
                          onClick={() => toggleActive(video)}
                        >
                          {video.is_active ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                          {video.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {!isEditing && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEdit(video)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteVideo(video.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4 bg-gray-50">
                    {isEditing ? (
                      <>
                        {/* Title */}
                        <div>
                          <Label>Title *</Label>
                          <Input
                            value={form.title || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Video title"
                          />
                        </div>

                        {/* Description */}
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={form.description || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Video description"
                            rows={2}
                          />
                        </div>

                        {/* Video Type */}
                        <div>
                          <Label>Video Type *</Label>
                          <Select
                            value={form.video_type || 'direct'}
                            onValueChange={(value: any) => setEditForm(prev => ({ ...prev, video_type: value }))}
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

                        {/* Video URL */}
                        <div>
                          <Label>Video URL *</Label>
                          <Input
                            value={form.video_url || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, video_url: e.target.value }))}
                            placeholder="Video URL"
                          />
                        </div>

                        {/* Thumbnail Upload */}
                        <div>
                          <Label>Thumbnail Image</Label>
                          <div className="mt-2 flex items-center gap-4">
                            {form.thumbnail_url && (
                              <img
                                src={form.thumbnail_url}
                                alt="Thumbnail preview"
                                className="w-32 h-32 object-cover rounded-lg border"
                                loading="lazy"
                                decoding="async"
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
                          <Label>Credit Amount (C)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={form.credit_amount || 0}
                            onChange={(e) => setEditForm(prev => ({ ...prev, credit_amount: parseFloat(e.target.value) || 0 }))}
                          />
                        </div>

                        {/* Watch Duration */}
                        <div>
                          <Label>Minimum Watch Duration (seconds)</Label>
                          <Input
                            type="number"
                            value={form.watch_duration_seconds || 0}
                            onChange={(e) => setEditForm(prev => ({ ...prev, watch_duration_seconds: parseInt(e.target.value) || 0 }))}
                          />
                        </div>

                        {/* Watch Percentage Required */}
                        <div>
                          <Label>Watch Percentage Required (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={form.watch_percentage_required || 0}
                            onChange={(e) => setEditForm(prev => ({ ...prev, watch_percentage_required: parseInt(e.target.value) || 0 }))}
                          />
                        </div>

                        {/* Max Watches Per Day */}
                        <div>
                          <Label>Max Watches Per Day (leave empty for unlimited)</Label>
                          <Input
                            type="number"
                            value={form.max_watches_per_day || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, max_watches_per_day: e.target.value ? parseInt(e.target.value) : undefined }))}
                          />
                        </div>

                        {/* Display Order */}
                        <div>
                          <Label>Display Order</Label>
                          <Input
                            type="number"
                            value={form.display_order ?? 0}
                            onChange={(e) => setEditForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                          />
                        </div>

                        {/* Advertiser Name */}
                        <div>
                          <Label>Advertiser Name</Label>
                          <Input
                            value={form.advertiser_name || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, advertiser_name: e.target.value }))}
                          />
                        </div>

                        {/* Category */}
                        <div>
                          <Label>Category</Label>
                          <Input
                            value={form.category || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-4">
                          <Button
                            onClick={() => saveVideo(video.id)}
                            disabled={saving}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg"
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
                        <div className="space-y-3">
                          {video.thumbnail_url && (
                            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                              <img
                                src={video.thumbnail_url}
                                alt={video.title}
                                className="absolute top-0 left-0 w-full h-full object-cover rounded-lg"
                                loading="lazy"
                                decoding="async"
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
      </div>
    </div>
  );
}


