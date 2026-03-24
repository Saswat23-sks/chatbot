import React, { useEffect, useRef } from 'react';

interface MoodMusicProps {
  mood: 'positive' | 'neutral' | 'negative';
  isPlaying: boolean;
}

const MOOD_TRACKS = {
  positive: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
  neutral: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  negative: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
};

export default function MoodMusic({ mood, isPlaying }: MoodMusicProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.3; // Low volume for background
      if (isPlaying) {
        audioRef.current.play().catch(err => console.error("Audio play failed:", err));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current && isPlaying) {
      // When mood changes, we might want to crossfade or just switch
      // For simplicity, we just switch the source and play
      audioRef.current.src = MOOD_TRACKS[mood];
      audioRef.current.play().catch(err => console.error("Audio mood switch failed:", err));
    }
  }, [mood, isPlaying]);

  return (
    <audio
      ref={audioRef}
      src={MOOD_TRACKS[mood]}
      loop
      style={{ display: 'none' }}
    />
  );
}
