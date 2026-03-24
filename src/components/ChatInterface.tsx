import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Trash2, Mic, MicOff, AudioLines, AlertCircle, Music, VolumeX, Moon, Sun, RotateCcw, HelpCircle, Copy, Reply, X, Zap, Heart, ShieldCheck, Ghost, LifeBuoy, Compass, ThumbsUp, ThumbsDown, Cpu, BookOpen, Laugh, Paperclip, FileText, FileSpreadsheet, Image as ImageIcon, File as FileIcon, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import * as XLSX from 'xlsx';
import { Message, Persona } from '../types';
import { processInput } from '../services/botEngine';
import { getGeminiResponse, analyzeSentiment, analyzeFeedback, revokeAllObjectUrls } from '../services/geminiService';
import LiveVoiceChat from './LiveVoiceChat';
import MoodMusic from './MoodMusic';

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('chat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      } catch (e) {
        console.error('Failed to parse chat history:', e);
      }
    }
    return [
      {
        id: '1',
        text: "Hello! I'm a simple chatbot. You can ask me basic things or we can use my AI brain for complex stuff. How can I help you?",
        sender: 'bot',
        timestamp: new Date(),
      }
    ];
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showLiveVoice, setShowLiveVoice] = useState(false);
  const [currentMood, setCurrentMood] = useState<'positive' | 'neutral' | 'negative'>('neutral');
  const [persona, setPersona] = useState<Persona>(() => {
    return (localStorage.getItem('chat_persona') as Persona) || 'Witty';
  });
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('chat_theme') === 'dark';
  });
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [learnings, setLearnings] = useState<string[]>(() => {
    const saved = localStorage.getItem('chat_learnings');
    return saved ? JSON.parse(saved) : [];
  });
  const [attachedFile, setAttachedFile] = useState<Message['file'] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      revokeAllObjectUrls();
    };
  }, []);

  // Save messages to localStorage, but filter out temporary blob URLs
  useEffect(() => {
    const messagesToSave = messages.map(msg => {
      if (msg.file?.url?.startsWith('blob:')) {
        const { url, ...rest } = msg.file;
        return { ...msg, file: rest };
      }
      return msg;
    });
    localStorage.setItem('chat_history', JSON.stringify(messagesToSave));
  }, [messages]);

  // Save persona to localStorage
  useEffect(() => {
    localStorage.setItem('chat_persona', persona);
  }, [persona]);

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem('chat_theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Save learnings to localStorage
  useEffect(() => {
    localStorage.setItem('chat_learnings', JSON.stringify(learnings));
  }, [learnings]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error("Microphone access denied. Please check your browser settings.");
        } else if (event.error === 'no-speech') {
          toast.info("No speech detected. Try speaking again.");
        } else {
          toast.error(`Voice input error: ${event.error}`);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        if (!recognitionRef.current) {
          toast.error("Speech recognition is not supported in your browser.");
          return;
        }
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        toast.error("Could not start microphone. Please check permissions.");
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      let content = "";

      // Extract text content for text-based files
      if (file.type === 'text/plain' || file.type === 'text/csv' || file.name.endsWith('.json')) {
        content = await file.text();
      } else if (file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        content = XLSX.utils.sheet_to_csv(firstSheet);
      }

      setAttachedFile({
        name: file.name,
        type: file.type,
        size: file.size,
        base64: file.type.startsWith('image/') || file.type === 'application/pdf' ? base64 : undefined,
        content: content || undefined
      });
      toast.success(`Attached ${file.name}`);
    };

    if (file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const userMessage: Message = {
      id: messageId,
      text: textToSend,
      sender: 'user',
      timestamp: new Date(),
      file: attachedFile || undefined,
      replyTo: replyingTo ? {
        id: replyingTo.id,
        text: replyingTo.text,
        sender: replyingTo.sender
      } : undefined
    };

    if (!textOverride) {
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setReplyingTo(null);
    }
    setIsTyping(true);

    // Handle Slash Commands
    if (textToSend.startsWith('/')) {
      const command = textToSend.toLowerCase().split(' ')[0];
      const args = textToSend.split(' ').slice(1);
      
      let botResponseText = '';
      let isError = false;

      switch (command) {
        case '/help':
          botResponseText = "Here are the commands I understand:\n\n" + 
            "• **/help**: Show this help message\n" +
            "• **/clear**: Clear the chat history\n" +
            "• **/spark**: Trigger a creative spark\n" +
            "• **/joke**: Tell a random joke\n" +
            "• **/persona [name]**: Change my persona (Witty, Empathetic, Formal, Sarcastic, Helpful Assistant, Curious Explorer)\n" +
            "• **/mood**: Show the current detected mood\n\n" +
            "You can also just talk to me normally!";
          break;
        case '/clear':
          clearChat();
          setIsTyping(false);
          return;
        case '/spark':
          triggerCreativeSpark();
          setIsTyping(false);
          return;
        case '/joke':
          const jokeResponse = processInput('joke');
          botResponseText = jokeResponse || "I'm out of jokes right now!";
          break;
        case '/persona':
          if (args.length > 0) {
            const newPersona = args.join(' ');
            const validPersonas: Persona[] = ['Witty', 'Empathetic', 'Formal', 'Sarcastic', 'Helpful Assistant', 'Curious Explorer'];
            const matched = validPersonas.find(p => p.toLowerCase() === newPersona.toLowerCase());
            if (matched) {
              setPersona(matched);
              botResponseText = `Persona changed to **${matched}**. How do I sound now?`;
            } else {
              botResponseText = `Invalid persona. Choose from: ${validPersonas.join(', ')}`;
              isError = true;
            }
          } else {
            botResponseText = `Current persona is **${persona}**. Use \`/persona [name]\` to change it.`;
          }
          break;
        case '/mood':
          botResponseText = `The current mood is detected as **${currentMood}**.`;
          break;
        default:
          botResponseText = `Unknown command: **${command}**. Type \`/help\` for a list of commands.`;
          isError = true;
      }

      const botMessage: Message = {
        id: `${Date.now()}-bot`,
        text: botResponseText,
        sender: 'bot',
        timestamp: new Date(),
        isError,
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
      return;
    }

    // Analyze sentiment in background
    analyzeSentiment(textToSend).then(sentiment => {
      setMessages(prev => prev.map(m => m.id === userMessage.id ? { ...m, sentiment } : m));
      setCurrentMood(sentiment);
    });

    // 1. Try rule-based engine
    const ruleResponse = processInput(textToSend);
    
    let botResponseText = '';
    let botSources: { uri: string; title: string }[] | undefined = undefined;
    let isError = false;
    let generatedFile: Message['file'] | undefined;
    
    try {
      if (ruleResponse && !userMessage.file) {
        // Small delay to simulate "thinking"
        await new Promise(resolve => setTimeout(resolve, 600));
        botResponseText = ruleResponse;
      } else {
        // 2. Fallback to Gemini
        const response = await getGeminiResponse(textToSend, messages, currentMood, persona, learnings, userMessage.file);
        botResponseText = response.text;
        botSources = response.sources;
        generatedFile = response.generatedFile;
      }
    } catch (error: any) {
      botResponseText = error.message || "I encountered a digital hiccup. Please try again!";
      isError = true;
      toast.error("Connection failed. Check your internet or API key.");
    }

    const botMessage: Message = {
      id: `${Date.now()}-bot`,
      text: botResponseText,
      sender: 'bot',
      timestamp: new Date(),
      isError,
      sources: botSources,
      file: generatedFile
    };

    setMessages(prev => [...prev, botMessage]);
    setIsTyping(false);
    
    // Only clear attached file if it was the one we just sent
    if (!textOverride) {
      setAttachedFile(null);
    }
  };

  const retryMessage = (text: string) => {
    // Remove the last error message if it exists
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages.length > 0 && newMessages[newMessages.length - 1].isError) {
        newMessages.pop();
      }
      return newMessages;
    });
    handleSend(text);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Message copied to clipboard!");
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast.error("Failed to copy message.");
    });
  };

  const handleReply = (msg: Message) => {
    setReplyingTo(msg);
    // Focus the input field
    if (inputRef.current) inputRef.current.focus();
  };

  const handleFeedback = async (messageId: string, type: 'up' | 'down') => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const botMsg = messages[messageIndex];
    const userMsg = messages.slice(0, messageIndex).reverse().find(m => m.sender === 'user');

    if (!userMsg) return;

    // Update UI immediately
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, feedback: type } : m
    ));

    toast.promise(
      (async () => {
        const learning = await analyzeFeedback(userMsg.text, botMsg.text, type);
        if (learning) {
          setLearnings(prev => [...prev.slice(-19), learning]); // Keep last 20 learnings
          return `Learned: ${learning}`;
        }
        throw new Error("Could not analyze feedback");
      })(),
      {
        loading: 'Analyzing feedback to improve...',
        success: (data) => data,
        error: 'Feedback recorded, but analysis failed.',
      }
    );
  };

  const clearChat = () => {
    revokeAllObjectUrls();
    setMessages([{
      id: '1',
      text: "Chat cleared. How can I help you now?",
      sender: 'bot',
      timestamp: new Date(),
    }]);
  };

  const getMoodStyles = () => {
    if (isDarkMode) {
      switch (currentMood) {
        case 'positive':
          return 'bg-[#064e3b]'; // Dark emerald
        case 'negative':
          return 'bg-[#450a0a]'; // Dark red
        default:
          return 'bg-[#030712]'; // Dark gray/black
      }
    }
    switch (currentMood) {
      case 'positive':
        return 'bg-[#f0fdf4]'; // Soft green
      case 'negative':
        return 'bg-[#fef2f2]'; // Soft red/pink
      default:
        return 'bg-[#f5f5f5]'; // Default gray
    }
  };

  const getMoodGradients = () => {
    if (isDarkMode) {
      switch (currentMood) {
        case 'positive':
          return 'from-emerald-900/40 via-transparent to-transparent';
        case 'negative':
          return 'from-rose-900/40 via-transparent to-transparent';
        default:
          return 'from-blue-900/20 via-transparent to-transparent';
      }
    }
    switch (currentMood) {
      case 'positive':
        return 'from-green-100/50 via-emerald-50/30 to-transparent';
      case 'negative':
        return 'from-red-100/50 via-rose-50/30 to-transparent';
      default:
        return 'from-blue-100/30 via-transparent to-transparent';
    }
  };

  const getPersonaConfig = (p: Persona) => {
    switch (p) {
      case 'Witty':
        return { icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10', animation: { rotate: [0, 15, -15, 0] } };
      case 'Empathetic':
        return { icon: Heart, color: 'text-pink-500', bg: 'bg-pink-500/10', animation: { scale: [1, 1.2, 1] } };
      case 'Formal':
        return { icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-600/10', animation: { y: [0, -3, 0] } };
      case 'Sarcastic':
        return { icon: Ghost, color: 'text-purple-500', bg: 'bg-purple-500/10', animation: { x: [-3, 3, -3] } };
      case 'Helpful Assistant':
        return { icon: LifeBuoy, color: 'text-orange-500', bg: 'bg-orange-500/10', animation: { rotate: 360 } };
      case 'Curious Explorer':
        return { icon: Compass, color: 'text-green-500', bg: 'bg-green-500/10', animation: { rotate: [0, 90, -90, 0] } };
      case 'Analytical':
        return { icon: Cpu, color: 'text-cyan-500', bg: 'bg-cyan-500/10', animation: { opacity: [1, 0.5, 1] } };
      case 'Philosophical':
        return { icon: BookOpen, color: 'text-indigo-500', bg: 'bg-indigo-500/10', animation: { scaleX: [1, 0.8, 1] } };
      case 'Humorous':
        return { icon: Laugh, color: 'text-pink-400', bg: 'bg-pink-400/10', animation: { y: [0, -5, 0, -5, 0] } };
      default:
        return { icon: Bot, color: 'text-blue-500', bg: 'bg-blue-500/10', animation: {} };
    }
  };

  const triggerCreativeSpark = async () => {
    const prompts = [
      "Tell me a short, weird story about a robot and a cat.",
      "Give me a creative metaphor for how the internet works.",
      "Write a 4-line poem about the color blue.",
      "What's a creative way to spend a rainy afternoon?",
      "If you were a human for a day, what's the first thing you'd do?"
    ];
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    setInput(randomPrompt);
    // We'll let handleSend take care of it, but we need to wait for state update or pass it directly
    // For simplicity, let's just trigger it directly
    const userMessage: Message = {
      id: Date.now().toString(),
      text: randomPrompt,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    try {
      const response = await getGeminiResponse(randomPrompt, messages, currentMood, persona);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.text,
        sender: 'bot',
        timestamp: new Date(),
        sources: response.sources,
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error.message || "I lost my spark for a second. Try again!",
        sender: 'bot',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={`flex flex-col h-screen transition-colors duration-1000 ease-in-out ${getMoodStyles()} font-sans relative overflow-hidden ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className={`absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full blur-[100px] bg-gradient-to-br ${getMoodGradients()} transition-all duration-1000 ${isDarkMode ? 'opacity-30' : 'opacity-100'}`}
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            x: [0, -50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className={`absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full blur-[100px] bg-gradient-to-tl ${getMoodGradients()} transition-all duration-1000 ${isDarkMode ? 'opacity-30' : 'opacity-100'}`}
        />
      </div>

      {/* Header */}
      <header role="banner" className={`backdrop-blur-lg border-b px-6 py-4 flex justify-between items-center shadow-sm z-10 transition-colors duration-500 ${isDarkMode ? 'bg-gray-900/70 border-gray-800' : 'bg-white/70 border-gray-200/50'}`}>
        <div className="flex items-center gap-3">
          <motion.div 
            key={persona}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} ${getPersonaConfig(persona).bg}`}
            aria-hidden="true"
          >
            <motion.div
              animate={getPersonaConfig(persona).animation}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className={getPersonaConfig(persona).color}
            >
              {React.createElement(getPersonaConfig(persona).icon, { size: 24 })}
            </motion.div>
          </motion.div>
          <div>
            <h1 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{persona} Bot</h1>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true"></span>
              Online & Ready
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center rounded-full px-3 py-1 border mr-2 transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
            <label htmlFor="persona-select" className="text-[10px] uppercase font-bold text-gray-400 mr-2">Persona:</label>
            <select 
              id="persona-select"
              value={persona}
              onChange={(e) => setPersona(e.target.value as Persona)}
              className={`bg-transparent text-xs font-medium outline-none cursor-pointer transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
              aria-label="Select bot persona"
            >
              <option value="Witty">Witty</option>
              <option value="Empathetic">Empathetic</option>
              <option value="Formal">Formal</option>
              <option value="Sarcastic">Sarcastic</option>
              <option value="Helpful Assistant">Helpful Assistant</option>
              <option value="Curious Explorer">Curious Explorer</option>
              <option value="Analytical">Analytical</option>
              <option value="Philosophical">Philosophical</option>
              <option value="Humorous">Humorous</option>
            </select>
          </div>
          <motion.button 
            onClick={triggerCreativeSpark}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{ 
              boxShadow: ["0px 0px 0px rgba(168, 85, 247, 0)", "0px 0px 12px rgba(168, 85, 247, 0.3)", "0px 0px 0px rgba(168, 85, 247, 0)"]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-full text-sm font-medium hover:bg-purple-100 transition-all border border-purple-100 focus:ring-2 focus:ring-purple-500 outline-none"
            aria-label="Get a creative response spark"
            title="Get a creative response"
          >
            <Sparkles size={18} aria-hidden="true" />
            Creative Spark
          </motion.button>
          <button 
            onClick={() => setShowLiveVoice(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-medium hover:bg-blue-100 transition-all border border-blue-100 focus:ring-2 focus:ring-blue-500 outline-none"
            aria-label="Open live voice chat"
          >
            <AudioLines size={18} aria-hidden="true" />
            Live Voice
          </button>
          <button 
            onClick={() => setIsMusicPlaying(!isMusicPlaying)}
            className={`p-2 rounded-lg transition-all border focus:ring-2 focus:ring-orange-500 outline-none ${
              isMusicPlaying 
                ? 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' 
                : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700 dark:hover:bg-gray-700'
            }`}
            aria-label={isMusicPlaying ? 'Stop Mood Music' : 'Start Mood Music'}
            title={isMusicPlaying ? 'Stop Mood Music' : 'Start Mood Music'}
          >
            {isMusicPlaying ? <Music size={20} className="animate-spin-slow" aria-hidden="true" /> : <VolumeX size={20} aria-hidden="true" />}
          </button>
          <button 
            onClick={() => handleSend('/help')}
            className={`p-2 rounded-lg transition-all border bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700 dark:hover:bg-gray-700 focus:ring-2 focus:ring-gray-400 outline-none`}
            aria-label="Show help and commands"
            title="Help & Commands"
          >
            <HelpCircle size={20} aria-hidden="true" />
          </button>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-lg transition-all border focus:ring-2 focus:ring-yellow-500 outline-none ${
              isDarkMode 
                ? 'bg-yellow-50 text-yellow-600 border-yellow-100' 
                : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'
            }`}
            aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
          </button>
          <button 
            onClick={clearChat}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 focus:ring-2 focus:ring-red-500 outline-none"
            aria-label="Clear chat history"
            title="Clear Chat"
          >
            <Trash2 size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main 
        role="log" 
        aria-live="polite" 
        aria-label="Chat history"
        className="flex-1 overflow-y-auto p-6 space-y-6 z-0"
      >
        <div className="max-w-3xl mx-auto space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                role="article"
                aria-label={`Message from ${msg.sender === 'user' ? 'you' : persona + ' Bot'} at ${msg.timestamp.toLocaleTimeString()}`}
              >
                <div className={`flex gap-3 max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm transition-colors ${
                      msg.sender === 'user' ? 'bg-blue-600 text-white' : 
                      msg.isError ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 
                      isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'
                    } ${msg.sender === 'bot' && !msg.isError ? getPersonaConfig(persona).bg : ''}`}
                  >
                    {msg.sender === 'user' ? (
                      <User size={16} />
                    ) : msg.isError ? (
                      <AlertCircle size={16} />
                    ) : (
                      <motion.div
                        animate={getPersonaConfig(persona).animation}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className={getPersonaConfig(persona).color}
                      >
                        {React.createElement(getPersonaConfig(persona).icon, { size: 16 })}
                      </motion.div>
                    )}
                  </motion.div>
                  <div className="space-y-1">
                    {msg.replyTo && (
                      <div className={`text-[10px] px-3 py-1.5 rounded-t-xl border-l-2 mb-[-4px] opacity-80 ${
                        isDarkMode ? 'bg-gray-800/50 border-blue-500 text-gray-400' : 'bg-gray-100 border-blue-400 text-gray-500'
                      }`}>
                        <p className="font-bold flex items-center gap-1">
                          <Reply size={10} />
                          Replying to {msg.replyTo.sender === 'user' ? 'you' : 'SimpleBot'}
                        </p>
                        <p className="truncate italic">{msg.replyTo.text}</p>
                      </div>
                    )}
                    <motion.div 
                      whileHover={{ scale: 1.01, x: msg.sender === 'user' ? -2 : 2 }}
                      className={`group relative px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed cursor-default transition-all hover:shadow-md ${
                        msg.sender === 'user' 
                          ? 'bg-blue-600 text-white rounded-tr-none' 
                          : msg.isError
                          ? 'bg-red-50 text-red-800 rounded-tl-none border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30'
                          : isDarkMode
                          ? 'bg-gray-900 text-gray-100 rounded-tl-none border border-gray-800'
                          : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                      }`}
                    >
                      {msg.sender === 'bot' ? (
                        <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.text
                      )}

                      {msg.file && (
                        <div className={`mt-3 p-2 rounded-lg flex items-center gap-3 border ${
                          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className={`w-10 h-10 rounded flex items-center justify-center ${
                            isDarkMode ? 'bg-gray-700' : 'bg-white'
                          }`}>
                            {msg.file.type.startsWith('image/') ? (
                              <ImageIcon size={20} className="text-blue-500" />
                            ) : msg.file.type === 'application/pdf' ? (
                              <FileText size={20} className="text-red-500" />
                            ) : msg.file.type.includes('spreadsheet') ? (
                              <FileSpreadsheet size={20} className="text-green-500" />
                            ) : (
                              <FileIcon size={20} className="text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{msg.file.name}</p>
                            <p className="text-[10px] text-gray-500">{(msg.file.size / 1024).toFixed(1)} KB</p>
                          </div>
                          {msg.file.url && (
                            <a 
                              href={msg.file.url} 
                              download={msg.file.name}
                              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                              <Download size={14} className="text-blue-500" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Message Actions */}
                      <div className={`absolute top-0 ${msg.sender === 'user' ? 'right-full mr-2' : 'left-full ml-2'} opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex gap-1`}>
                        <button 
                          onClick={() => handleCopy(msg.text)}
                          className={`p-1.5 rounded-full transition-colors focus:ring-2 focus:ring-blue-400 outline-none ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-white text-gray-400 hover:bg-gray-100 border border-gray-100'}`}
                          title="Copy message"
                          aria-label="Copy message text"
                        >
                          <Copy size={12} aria-hidden="true" />
                        </button>
                        <button 
                          onClick={() => handleReply(msg)}
                          className={`p-1.5 rounded-full transition-colors focus:ring-2 focus:ring-blue-400 outline-none ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-white text-gray-400 hover:bg-gray-100 border border-gray-100'}`}
                          title="Reply to message"
                          aria-label="Reply to this message"
                        >
                          <Reply size={12} aria-hidden="true" />
                        </button>
                        {msg.sender === 'bot' && !msg.isError && (
                          <>
                            <button 
                              onClick={() => handleFeedback(msg.id, 'up')}
                              className={`p-1.5 rounded-full transition-colors focus:ring-2 focus:ring-green-400 outline-none ${
                                msg.feedback === 'up' 
                                  ? 'bg-green-100 text-green-600 border-green-200' 
                                  : isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-white text-gray-400 hover:bg-gray-100 border border-gray-100'
                              }`}
                              title="Helpful response"
                              aria-label="Mark as helpful"
                            >
                              <ThumbsUp size={12} aria-hidden="true" />
                            </button>
                            <button 
                              onClick={() => handleFeedback(msg.id, 'down')}
                              className={`p-1.5 rounded-full transition-colors focus:ring-2 focus:ring-red-400 outline-none ${
                                msg.feedback === 'down' 
                                  ? 'bg-red-100 text-red-600 border-red-200' 
                                  : isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-white text-gray-400 hover:bg-gray-100 border border-gray-100'
                              }`}
                              title="Not helpful response"
                              aria-label="Mark as not helpful"
                            >
                              <ThumbsDown size={12} aria-hidden="true" />
                            </button>
                          </>
                        )}
                      </div>

                      {msg.sources && msg.sources.length > 0 && (
                        <div className={`mt-3 pt-3 border-t space-y-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sources:</p>
                          <div className="flex flex-wrap gap-2">
                            {msg.sources.map((source, idx) => (
                              <a 
                                key={idx}
                                href={source.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-[10px] px-2 py-1 rounded-md transition-colors flex items-center gap-1 max-w-full overflow-hidden ${
                                  isDarkMode 
                                    ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' 
                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                }`}
                              >
                                <span className="truncate">{source.title}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                    <div className={`flex items-center gap-2 text-[10px] text-gray-400 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {msg.sentiment && (
                        <span className={`px-1.5 py-0.5 rounded-full border transition-colors ${
                          msg.sentiment === 'positive' ? (isDarkMode ? 'border-green-900/50 text-green-400 bg-green-900/20' : 'border-green-200 text-green-600 bg-green-50') :
                          msg.sentiment === 'negative' ? (isDarkMode ? 'border-red-900/50 text-red-400 bg-red-900/20' : 'border-red-200 text-red-600 bg-red-50') :
                          (isDarkMode ? 'border-gray-800 text-gray-500 bg-gray-900' : 'border-gray-200 text-gray-500 bg-gray-50')
                        }`}>
                          {msg.sentiment}
                        </span>
                      )}
                      {msg.isError && (
                        <button 
                          onClick={() => {
                            // Find the last user message to retry
                            const lastUserMsg = [...messages].reverse().find(m => m.sender === 'user');
                            if (lastUserMsg) retryMessage(lastUserMsg.text);
                          }}
                          className="flex items-center gap-1 text-blue-500 hover:text-blue-600 font-bold uppercase tracking-tighter"
                        >
                          <RotateCcw size={10} />
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
              aria-live="polite"
              aria-label={`${persona} Bot is typing...`}
            >
              <div className="flex gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-colors ${
                  isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'
                } ${getPersonaConfig(persona).bg}`} aria-hidden="true">
                  <motion.div
                    animate={getPersonaConfig(persona).animation}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className={getPersonaConfig(persona).color}
                  >
                    {React.createElement(getPersonaConfig(persona).icon, { size: 16 })}
                  </motion.div>
                </div>
                <div className={`px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1.5 items-center border ${
                  isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
                }`}>
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ 
                        y: [0, -5, 0],
                        opacity: [0.3, 1, 0.3]
                      }}
                      transition={{ 
                        duration: 0.6, 
                        repeat: Infinity, 
                        delay: i * 0.15,
                        ease: "easeInOut"
                      }}
                      className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                      aria-hidden="true"
                    />
                  ))}
                  <span className="sr-only">Typing...</span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer role="contentinfo" className={`backdrop-blur-lg border-t p-4 z-10 transition-colors duration-500 ${isDarkMode ? 'bg-gray-900/70 border-gray-800' : 'bg-white/70 border-gray-200/50'}`}>
        <div className="max-w-3xl mx-auto space-y-3">
          <AnimatePresence>
            {attachedFile && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`flex items-center justify-between p-2 rounded-xl border transition-colors mb-2 ${
                  isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-800'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-8 h-8 rounded flex items-center justify-center ${
                    isDarkMode ? 'bg-gray-700' : 'bg-white'
                  }`}>
                    {attachedFile.type.startsWith('image/') ? (
                      <ImageIcon size={16} className="text-blue-500" />
                    ) : attachedFile.type === 'application/pdf' ? (
                      <FileText size={16} className="text-red-500" />
                    ) : attachedFile.type.includes('spreadsheet') ? (
                      <FileSpreadsheet size={16} className="text-green-500" />
                    ) : (
                      <FileIcon size={16} className="text-gray-500" />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-medium truncate">{attachedFile.name}</p>
                    <p className="text-[10px] text-gray-500">{(attachedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button 
                  onClick={() => setAttachedFile(null)}
                  className="p-1 hover:bg-black/5 rounded-full transition-colors"
                  aria-label="Remove file"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </motion.div>
            )}
            {replyingTo && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`flex items-center justify-between p-3 rounded-xl border-l-4 transition-colors ${
                  isDarkMode ? 'bg-gray-800 border-blue-500 text-gray-300' : 'bg-blue-50 border-blue-500 text-blue-800'
                }`}
                role="status"
                aria-label={`Replying to ${replyingTo.sender === 'user' ? 'your' : persona + ' Bot\'s'} message: ${replyingTo.text}`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Reply size={16} className="flex-shrink-0" aria-hidden="true" />
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Replying to {replyingTo.sender === 'user' ? 'you' : persona + ' Bot'}</p>
                    <p className="text-xs truncate italic">{replyingTo.text}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setReplyingTo(null)}
                  className="p-1 hover:bg-black/5 rounded-full transition-colors focus:ring-2 focus:ring-blue-500 outline-none"
                  aria-label="Cancel reply"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="relative flex items-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.txt,.csv,.json,.xlsx,.xls"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`absolute left-2 p-2 rounded-xl transition-all focus:ring-2 focus:ring-blue-500 outline-none ${
                isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-200'
              }`}
              aria-label="Attach file"
              title="Attach File"
            >
              <Paperclip size={20} aria-hidden="true" />
            </button>
            <input
              type="text"
              id="chat-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              aria-label="Message input"
              className={`w-full border-none rounded-2xl py-4 pl-12 pr-24 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none backdrop-blur-sm ${
                isDarkMode 
                  ? 'bg-gray-800/50 text-white placeholder-gray-500 focus:bg-gray-800/80' 
                  : 'bg-gray-100/50 text-gray-800 placeholder-gray-400 focus:bg-white/80'
              }`}
            />
            <div className="absolute right-2 flex items-center gap-1">
              <button
                onClick={toggleListening}
                className={`p-2 rounded-xl transition-all focus:ring-2 focus:ring-blue-500 outline-none ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-200'
                }`}
                aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                {isListening ? <MicOff size={20} aria-hidden="true" /> : <Mic size={20} aria-hidden="true" />}
              </button>
              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className={`p-2 rounded-xl transition-all focus:ring-2 focus:ring-blue-500 outline-none ${
                  input.trim() 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' 
                    : isDarkMode ? 'bg-gray-800 text-gray-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                aria-label="Send message"
                title="Send Message"
              >
                <Send size={20} aria-hidden="true" />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-center text-gray-400 mt-3 flex items-center justify-center gap-1">
            <Sparkles size={10} aria-hidden="true" /> Powered by Rule Engine & Gemini AI
          </p>
        </div>
      </footer>

      <AnimatePresence>
        {showLiveVoice && (
          <LiveVoiceChat 
            onClose={() => setShowLiveVoice(false)} 
            persona={persona}
            mood={currentMood}
          />
        )}
      </AnimatePresence>
      <MoodMusic mood={currentMood} isPlaying={isMusicPlaying} />
    </div>
  );
}
