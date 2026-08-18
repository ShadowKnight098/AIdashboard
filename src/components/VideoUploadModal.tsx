import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileVideo, BookOpen, Hammer, Popcorn, Clock } from 'lucide-react';
import { Category, Difficulty, Format } from '../../shared/types.js';
import { supabase } from '../lib/supabase.js';
import { api } from '../api.js';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

type ContentPillar = 'Study' | 'Building' | 'Timepass';

export const VideoUploadModal: React.FC<VideoUploadModalProps> = ({ isOpen, onClose, onUploaded }) => {
  const [title, setTitle] = useState('');
  const [pillar, setPillar] = useState<ContentPillar>('Study');
  const [category, setCategory] = useState<Category>('HLD');
  const [difficulty, setDifficulty] = useState<Difficulty>('Intermediate');
  const [format, setFormat] = useState<Format>('Explainer');
  const [durationSeconds, setDurationSeconds] = useState(45);
  const [educationalValue, setEducationalValue] = useState(85);
  const [hypeScore, setHypeScore] = useState(20);
  const [description, setDescription] = useState('');
  const [transcript, setTranscript] = useState('');

  // Video file upload state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Or paste a direct URL instead of uploading
  const [useDirectUrl, setUseDirectUrl] = useState(false);
  const [directUrl, setDirectUrl] = useState('');

  if (!isOpen) return null;

  const categories: Category[] = [
    'HLD',
    'DSA',
    'AI',
    'Java',
    'Cybersecurity',
    'Cloud',
    'Hardware',
    'Career',
    'WebDev',
    'DevOps',
  ];
  const formats: Format[] = [
    'Explainer',
    'Tutorial',
    'Comparison',
    'Meme',
    'Vlog',
    'News',
  ];
  const difficulties: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced'];

  const handlePillarChange = (newPillar: ContentPillar) => {
    setPillar(newPillar);
    if (newPillar === 'Timepass') {
      setCategory('Career');
      setFormat('Meme');
      setEducationalValue(25);
      setHypeScore(80);
    } else if (newPillar === 'Building') {
      setCategory('WebDev');
      setFormat('Tutorial');
      setEducationalValue(85);
      setHypeScore(15);
    } else {
      setCategory('HLD');
      setFormat('Explainer');
      setEducationalValue(95);
      setHypeScore(10);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const maxSizeBytes = 15 * 1024 * 1024; // 15MB limit
      if (file.size > maxSizeBytes) {
        setError('Video file size exceeds the 15MB storage quota. Please use the "Paste Direct URL" tab for larger videos!');
        setVideoFile(null);
        return;
      }
      setError(null);
      setVideoFile(file);
      // Auto-detect video duration from file metadata
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = URL.createObjectURL(file);
      tempVideo.onloadedmetadata = () => {
        URL.revokeObjectURL(tempVideo.src);
        if (tempVideo.duration && !isNaN(tempVideo.duration)) {
          setDurationSeconds(Math.max(5, Math.round(tempVideo.duration)));
        }
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }

    let videoUrl = '';

    try {
      setUploading(true);
      setError(null);

      if (useDirectUrl) {
        if (!directUrl.trim()) { setError('Paste a video URL'); setUploading(false); return; }
        videoUrl = directUrl.trim();
      } else {
        // Upload file to Supabase Storage
        if (!videoFile) { setError('Select a video file'); setUploading(false); return; }

        setUploadProgress('Uploading video to Supabase Storage...');
        const filename = `${Date.now()}-${videoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { data, error: uploadErr } = await supabase.storage
          .from('reels-videos')
          .upload(filename, videoFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

        // Get public URL
        const { data: urlData } = supabase.storage.from('reels-videos').getPublicUrl(data.path);
        videoUrl = urlData.publicUrl;
        setUploadProgress('Video uploaded! Saving reel metadata to database...');
      }

      // Save reel metadata via API
      await api.uploadReel({
        title: title.trim(),
        description: (description || title).trim(),
        transcript: (transcript || description || title).trim(),
        category,
        difficulty,
        format,
        educational_value: educationalValue,
        hype_score: hypeScore,
        video_url: videoUrl,
        duration_seconds: Number(durationSeconds) || 45,
      });

      onUploaded();
      onClose();
      // Reset form
      setTitle(''); setDescription(''); setTranscript(''); setVideoFile(null); setDirectUrl('');
    } catch (err: any) {
      console.error('Reel upload error:', err);
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[#FFFFFF] rounded-[10px] border border-[#E4E7EC] p-4 sm:p-6 relative my-auto space-y-4 shadow-2xl">
        <button onClick={onClose} className="absolute top-3.5 right-3.5 p-1.5 rounded-[4px] text-slate-400 hover:text-[#12172B] active:scale-95">
          <X className="w-4 h-4" />
        </button>

        <div>
          <h2 className="text-xl font-display font-bold text-[#12172B] flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-[#3654FF]" /> Upload Tech Reel
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">Upload a video file or link to categorize under Study, Building, or Timepass.</p>
        </div>

        {error && <div className="p-2.5 rounded-[6px] bg-rose-50 border border-rose-200 text-rose-600 text-xs font-mono">{error}</div>}
        {uploadProgress && <div className="p-2.5 rounded-[6px] bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono">{uploadProgress}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section / Intent Pillar Selector */}
          <div>
            <label className="text-xs font-medium text-[#12172B] block mb-1.5">Content Section / Mode</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handlePillarChange('Study')}
                className={`py-2 px-2.5 rounded-[6px] border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  pillar === 'Study'
                    ? 'bg-[#0F9C93]/10 border-[#0F9C93] text-[#0F9C93] font-bold shadow-sm'
                    : 'bg-[#F7F8FA] border-[#E4E7EC] text-slate-600 hover:border-slate-300'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" /> Study
              </button>
              <button
                type="button"
                onClick={() => handlePillarChange('Building')}
                className={`py-2 px-2.5 rounded-[6px] border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  pillar === 'Building'
                    ? 'bg-[#3654FF]/10 border-[#3654FF] text-[#3654FF] font-bold shadow-sm'
                    : 'bg-[#F7F8FA] border-[#E4E7EC] text-slate-600 hover:border-slate-300'
                }`}
              >
                <Hammer className="w-3.5 h-3.5" /> Building
              </button>
              <button
                type="button"
                onClick={() => handlePillarChange('Timepass')}
                className={`py-2 px-2.5 rounded-[6px] border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  pillar === 'Timepass'
                    ? 'bg-[#C98A2C]/15 border-[#C98A2C] text-[#C98A2C] font-bold shadow-sm'
                    : 'bg-[#F7F8FA] border-[#E4E7EC] text-slate-600 hover:border-slate-300'
                }`}
              >
                <Popcorn className="w-3.5 h-3.5" /> Timepass
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#12172B] block mb-1">Title</label>
            <input
              type="text"
              placeholder={pillar === 'Timepass' ? "e.g. When the code compiles on first try 😂" : "e.g. Raft Consensus Algorithm in 60 Seconds"}
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-[6px] border border-[#E4E7EC] text-xs focus:outline-none focus:border-[#3654FF]"
              required
            />
          </div>

          {/* Category / Difficulty / Format / Time (Duration) Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="text-xs font-medium block mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as Category)}
                className="w-full px-2 py-2 rounded-[6px] border border-[#E4E7EC] text-xs font-mono focus:outline-none focus:border-[#3654FF]"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as Difficulty)}
                className="w-full px-2 py-2 rounded-[6px] border border-[#E4E7EC] text-xs font-mono focus:outline-none focus:border-[#3654FF]"
              >
                {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Format</label>
              <select
                value={format}
                onChange={e => setFormat(e.target.value as Format)}
                className="w-full px-2 py-2 rounded-[6px] border border-[#E4E7EC] text-xs font-mono focus:outline-none focus:border-[#3654FF]"
              >
                {formats.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#3654FF]" /> Time (sec)
              </label>
              <input
                type="number"
                min="5"
                max="600"
                value={durationSeconds}
                onChange={e => setDurationSeconds(Math.max(5, +e.target.value))}
                placeholder="45"
                className="w-full px-2 py-2 rounded-[6px] border border-[#E4E7EC] text-xs font-mono focus:outline-none focus:border-[#3654FF]"
              />
            </div>
          </div>

          {/* Video Source Toggle */}
          <div>
            <div className="flex rounded-[6px] bg-[#F7F8FA] p-1 border border-[#E4E7EC] mb-3">
              <button
                type="button"
                onClick={() => setUseDirectUrl(false)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-[4px] transition-colors ${!useDirectUrl ? 'bg-white text-[#12172B] shadow-sm' : 'text-slate-500'}`}
              >
                Upload Video File
              </button>
              <button
                type="button"
                onClick={() => setUseDirectUrl(true)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-[4px] transition-colors ${useDirectUrl ? 'bg-white text-[#12172B] shadow-sm' : 'text-slate-500'}`}
              >
                Paste Direct URL
              </button>
            </div>

            {useDirectUrl ? (
              <input
                type="url"
                placeholder="https://example.com/video.mp4"
                value={directUrl}
                onChange={e => setDirectUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-[6px] border border-[#E4E7EC] text-xs font-mono focus:outline-none focus:border-[#3654FF]"
              />
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-5 rounded-[6px] border-2 border-dashed border-[#E4E7EC] hover:border-[#3654FF] cursor-pointer text-center transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileSelected}
                />
                {videoFile ? (
                  <div className="flex items-center justify-center gap-2 text-xs text-[#12172B]">
                    <FileVideo className="w-5 h-5 text-[#3654FF]" />
                    <span className="font-mono">{videoFile.name}</span>
                    <span className="text-slate-400">({(videoFile.size / 1024 / 1024).toFixed(1)} MB • {durationSeconds}s)</span>
                  </div>
                ) : (
                  <div>
                    <UploadCloud className="w-8 h-8 mx-auto mb-1.5 text-slate-400" />
                    <p className="text-xs text-slate-600 font-medium">Click to select video (MP4, WebM)</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Maximum size: 15MB. For larger videos, use a direct link.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Edu / Hype Sliders */}
          <div className="grid grid-cols-2 gap-4 p-3 rounded-[6px] bg-[#F7F8FA] border border-[#E4E7EC]">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-[#0F9C93] font-semibold">Educational Value</span>
                <span className="font-bold">{educationalValue}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={educationalValue}
                onChange={e => setEducationalValue(+e.target.value)}
                className="w-full accent-[#0F9C93]"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-[#C98A2C] font-semibold">Hype / Entertainment</span>
                <span className="font-bold">{hypeScore}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={hypeScore}
                onChange={e => setHypeScore(+e.target.value)}
                className="w-full accent-[#C98A2C]"
              />
            </div>
          </div>

          {/* Transcript */}
          <div>
            <label className="text-xs font-medium block mb-1">Description / Transcript</label>
            <textarea
              rows={2}
              placeholder="Key concepts or punchline for semantic ranking..."
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              className="w-full px-3 py-2 rounded-[6px] border border-[#E4E7EC] text-xs font-mono focus:outline-none focus:border-[#3654FF]"
            />
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Publish Reel'}
          </button>
        </form>
      </div>
    </div>
  );
};
