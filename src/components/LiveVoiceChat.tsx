import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Volume2, VolumeX, Bot, Zap, Heart, ShieldCheck, Ghost, LifeBuoy, Compass, Cpu, BookOpen, Laugh } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { connectLiveVoice } from '../services/geminiService';
import { AudioHandler } from '../services/audioHandler';
import { Persona } from '../types';

interface LiveVoiceChatProps {
  onClose: () => void;
  persona: Persona;
  mood: 'positive' | 'neutral' | 'negative';
}

export default function LiveVoiceChat({ onClose, persona, mood }: LiveVoiceChatProps) {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'active' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  
  const audioHandlerRef = useRef<AudioHandler>(new AudioHandler());
  const sessionRef = useRef<any>(null);
  const botSpeakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getPersonaConfig = (p: Persona) => {
    switch (p) {
      case 'Witty': return { icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10', accent: 'bg-yellow-500' };
      case 'Empathetic': return { icon: Heart, color: 'text-pink-500', bg: 'bg-pink-500/10', accent: 'bg-pink-500' };
      case 'Formal': return { icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-600/10', accent: 'bg-blue-600' };
      case 'Sarcastic': return { icon: Ghost, color: 'text-purple-500', bg: 'bg-purple-500/10', accent: 'bg-purple-500' };
      case 'Helpful Assistant': return { icon: LifeBuoy, color: 'text-orange-500', bg: 'bg-orange-500/10', accent: 'bg-orange-500' };
      case 'Curious Explorer': return { icon: Compass, color: 'text-green-500', bg: 'bg-green-500/10', accent: 'bg-green-500' };
      case 'Analytical': return { icon: Cpu, color: 'text-cyan-500', bg: 'bg-cyan-500/10', accent: 'bg-cyan-500' };
      case 'Philosophical': return { icon: BookOpen, color: 'text-indigo-500', bg: 'bg-indigo-500/10', accent: 'bg-indigo-500' };
      case 'Humorous': return { icon: Laugh, color: 'text-pink-400', bg: 'bg-pink-400/10', accent: 'bg-pink-400' };
      default: return { icon: Bot, color: 'text-blue-500', bg: 'bg-blue-500/10', accent: 'bg-blue-500' };
    }
  };

  const personaConfig = getPersonaConfig(persona);

  useEffect(() => {
    const startSession = async () => {
      try {
        const session = await connectLiveVoice({
          onAudioOutput: (base64Audio) => {
            if (!isMuted) {
              audioHandlerRef.current.playAudioChunk(base64Audio);
              setIsBotSpeaking(true);
              if (botSpeakingTimeoutRef.current) clearTimeout(botSpeakingTimeoutRef.current);
              botSpeakingTimeoutRef.current = setTimeout(() => setIsBotSpeaking(false), 1000);
            }
          },
          onInterrupted: () => {
            audioHandlerRef.current.stopPlayback();
            setIsBotSpeaking(false);
          },
          onTranscription: (text, isModel) => {
            console.log(`${isModel ? 'Bot' : 'User'}: ${text}`);
          },
          onError: (err) => {
            console.error('Live session error:', err);
            setStatus('error');
            setErrorMessage(err.message || 'The live session encountered an error.');
          }
        });

        sessionRef.current = session;
        
        await audioHandlerRef.current.startRecording((base64Data) => {
          if (!isMuted) {
            setIsUserSpeaking(true);
            session.sendRealtimeInput({
              audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
            });
            // Reset user speaking state after a short delay if no more data
            setTimeout(() => setIsUserSpeaking(false), 500);
          }
        });

        setStatus('active');
        setIsActive(true);
      } catch (err: any) {
        console.error('Failed to start live session:', err);
        setStatus('error');
        setErrorMessage(err.message || 'Failed to connect to the voice service.');
      }
    };

    startSession();

    return () => {
      audioHandlerRef.current.stopRecording();
      sessionRef.current?.close();
      if (botSpeakingTimeoutRef.current) clearTimeout(botSpeakingTimeoutRef.current);
    };
  }, []);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-chat-title"
    >
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-8 flex flex-col items-center text-center space-y-8">
          <div className="w-full flex justify-between items-center">
            <h2 id="voice-chat-title" className="text-xl font-bold text-gray-900">Live Voice</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors focus:ring-2 focus:ring-gray-400 outline-none"
              aria-label="Close voice chat"
            >
              <X size={24} className="text-gray-500" aria-hidden="true" />
            </button>
          </div>

          <div className="relative">
            {/* AI Avatar Container */}
            <div className="relative w-48 h-48 flex items-center justify-center">
              {/* Outer Glow Rings */}
              <AnimatePresence>
                {(isBotSpeaking || isUserSpeaking) && (
                  <>
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.5, opacity: [0.2, 0.4, 0.2] }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={`absolute inset-0 rounded-full blur-2xl ${personaConfig.accent} opacity-20`}
                    />
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.2, opacity: [0.1, 0.3, 0.1] }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                      className={`absolute inset-0 rounded-full blur-xl ${personaConfig.accent} opacity-10`}
                    />
                  </>
                )}
              </AnimatePresence>

              {/* Main Avatar Body */}
              <motion.div 
                animate={{ 
                  y: isBotSpeaking ? [0, -10, 0] : isUserSpeaking ? [0, 5, 0] : [0, -5, 0],
                  rotate: isBotSpeaking ? [0, 2, -2, 0] : isUserSpeaking ? [0, -1, 1, 0] : 0,
                  scale: isBotSpeaking ? [1, 1.05, 1] : 1
                }}
                transition={{ 
                  duration: isBotSpeaking ? 0.5 : 3, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className={`w-32 h-32 rounded-full flex items-center justify-center z-10 shadow-2xl transition-colors duration-1000 ${
                  status === 'active' ? personaConfig.bg : 'bg-gray-100'
                } border-4 ${status === 'active' ? 'border-white' : 'border-gray-200'}`}
              >
                <motion.div
                  animate={{
                    scale: isBotSpeaking ? [1, 1.2, 1] : 1,
                    rotate: isBotSpeaking ? [0, 10, -10, 0] : 0
                  }}
                  transition={{ duration: 0.3, repeat: isBotSpeaking ? Infinity : 0 }}
                  className={status === 'active' ? personaConfig.color : 'text-gray-400'}
                >
                  {React.createElement(personaConfig.icon, { size: 64 })}
                </motion.div>

                {/* Facial Expression / Eyes (Abstract) */}
                <div className="absolute top-1/3 flex gap-4">
                  <motion.div 
                    animate={{ 
                      height: isBotSpeaking ? [4, 8, 4] : isUserSpeaking ? [4, 2, 4] : 4,
                      scaleY: mood === 'negative' ? 0.5 : 1
                    }}
                    className={`w-2 h-4 rounded-full ${status === 'active' ? personaConfig.accent : 'bg-gray-300'}`}
                  />
                  <motion.div 
                    animate={{ 
                      height: isBotSpeaking ? [4, 8, 4] : isUserSpeaking ? [4, 2, 4] : 4,
                      scaleY: mood === 'negative' ? 0.5 : 1
                    }}
                    className={`w-2 h-4 rounded-full ${status === 'active' ? personaConfig.accent : 'bg-gray-300'}`}
                  />
                </div>

                {/* Mouth / Speaking Indicator */}
                <AnimatePresence>
                  {isBotSpeaking && (
                    <motion.div 
                      initial={{ width: 0, height: 0, opacity: 0 }}
                      animate={{ width: 20, height: 10, opacity: 1 }}
                      exit={{ width: 0, height: 0, opacity: 0 }}
                      className={`absolute bottom-1/4 rounded-full border-b-2 ${personaConfig.accent}`}
                    />
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Listening Waves */}
              {isUserSpeaking && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 2, opacity: 0 }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
                      className={`absolute w-32 h-32 rounded-full border-2 ${personaConfig.accent}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2" role="status" aria-live="polite">
            <p className={`text-lg font-medium ${status === 'error' ? 'text-red-600' : 'text-gray-800'}`}>
              {status === 'connecting' ? 'Connecting to Gemini...' : 
               status === 'error' ? 'Connection Error' : 
               isMuted ? 'Microphone Muted' : 'Listening...'}
            </p>
            <p className="text-sm text-gray-500 px-4">
              {status === 'active' ? 'Speak naturally, I\'m here to listen.' : 
               status === 'error' ? errorMessage : 'Please wait a moment.'}
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={toggleMute}
              disabled={status !== 'active'}
              className={`p-4 rounded-2xl transition-all focus:ring-2 focus:ring-blue-500 outline-none ${
                isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <VolumeX size={24} aria-hidden="true" /> : <Volume2 size={24} aria-hidden="true" />}
            </button>
            <button
              onClick={onClose}
              className="px-8 py-4 bg-black text-white rounded-2xl font-semibold hover:bg-gray-800 transition-all focus:ring-2 focus:ring-gray-600 outline-none"
              aria-label="End voice call"
            >
              End Call
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
