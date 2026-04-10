import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, CheckSquare, Square, Target, Maximize2, Minimize2, PenTool, Calendar, Bot, Loader2, History, Wand2, FileText, ChevronDown, ChevronRight, X, Coffee, CloudRain, Flame, Music, Plus, Trash2, Volume2, Layers, Sparkles, Filter } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { awardXP } from '../lib/gamification';
import { doc, updateDoc, increment, getDoc, collection, query, onSnapshot, addDoc, deleteDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type Subtask = {
  id: string;
  title: string;
  completed: boolean;
};

type Milestone = {
  id: string;
  title: string;
  date: string;
  completed: boolean;
  subtasks?: Subtask[];
};

type PomodoroSession = {
  id: string;
  type: 'work' | 'break';
  timestamp: string;
  duration: number;
  createdAt?: any;
};

interface ThesisDashboardProps {
  isFocusMode: boolean;
  setIsFocusMode: (focus: boolean) => void;
}

export function ThesisDashboard({ isFocusMode, setIsFocusMode }: ThesisDashboardProps) {
  const { user } = useAuth();
  
  // --- Pomodoro State ---
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Word Count State ---
  const [wordCount, setWordCount] = useState<number>(() => {
    const saved = localStorage.getItem('thesis_wordCount');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [dailyGoal, setDailyGoal] = useState<number>(500);
  const [goalReachedToday, setGoalReachedToday] = useState(() => {
    const lastDate = localStorage.getItem('thesis_goalDate');
    return lastDate === new Date().toLocaleDateString();
  });

  // --- Milestones State ---
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  const filteredMilestones = milestones.filter(milestone => {
    if (!startDateFilter && !endDateFilter) return true;
    const milestoneDate = new Date(milestone.date);
    milestoneDate.setHours(0, 0, 0, 0);
    
    if (startDateFilter) {
      const start = new Date(startDateFilter);
      start.setHours(0, 0, 0, 0);
      if (milestoneDate < start) return false;
    }
    
    if (endDateFilter) {
      const end = new Date(endDateFilter);
      end.setHours(23, 59, 59, 999);
      if (milestoneDate > end) return false;
    }
    
    return true;
  });

  // Persist simple states
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'sessions'));
    const unsub = onSnapshot(q, (snapshot) => {
      setSessions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PomodoroSession)).sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    localStorage.setItem('thesis_wordCount', wordCount.toString());
    if (wordCount >= dailyGoal && !goalReachedToday) {
      addXP(100);
      setGoalReachedToday(true);
      localStorage.setItem('thesis_goalDate', new Date().toLocaleDateString());
      setToastMessage('🎉 Meta de palavras alcançada! +100 XP');
    }
  }, [wordCount, dailyGoal, goalReachedToday]);

  // --- AI Suggestion State ---
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiContext, setAiContext] = useState('');
  
  // --- Daily Report State ---
  const [dailyReport, setDailyReport] = useState<string | null>(null);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [expandedMilestones, setExpandedMilestones] = useState<Record<string, boolean>>({});
  const [isSubtaskLoading, setIsSubtaskLoading] = useState<Record<string, boolean>>({});

  // --- Toast State ---
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [eurekas, setEurekas] = useState<{id: string, text: string, timestamp: any}[]>([]);
  const [isEurekaLoading, setIsEurekaLoading] = useState(false);
  const [newEureka, setNewEureka] = useState('');
  const [activeSound, setActiveSound] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'eurekas'), orderBy('timestamp', 'desc'), limit(5));
    const unsub = onSnapshot(q, (snapshot) => {
      setEurekas(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });
    return unsub;
  }, [user]);

  const addEureka = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newEureka.trim()) return;
    setIsEurekaLoading(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'eurekas'), {
        text: newEureka,
        timestamp: serverTimestamp()
      });
      setNewEureka('');
      addXP(15);
      setToastMessage('💡 Eureka registrado! +15 XP');
    } catch (err) {
      console.error(err);
    } finally {
      setIsEurekaLoading(false);
    }
  };
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- Music Generation State ---
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [musicPrompt, setMusicPrompt] = useState('Cinematic orchestral track for focus');
  const [generatedMusicUrl, setGeneratedMusicUrl] = useState<string | null>(null);
  const [musicLyrics, setMusicLyrics] = useState<string | null>(null);

  useEffect(() => {
    if (activeSound && activeSound !== 'ai_music') {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.loop = true;
      }
      
      let url = '';
      switch (activeSound) {
        case 'rain': url = 'https://www.soundjay.com/nature/sounds/rain-01.mp3'; break;
        case 'fire': url = 'https://www.soundjay.com/ambient/sounds/fireplace-01.mp3'; break;
        case 'cafe': url = 'https://www.soundjay.com/ambient/sounds/coffee-shop-1.mp3'; break;
        case 'lofi': url = 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Gymnopedie_No._1.ogg'; break;
      }
      
      if (url) {
        audioRef.current.src = url;
        audioRef.current.volume = volume;
        audioRef.current.play().catch(e => {
          console.error("Audio play failed", e);
          // Fallback if soundjay fails (sometimes they block hotlinking)
          if (activeSound === 'rain') audioRef.current!.src = 'https://upload.wikimedia.org/wikipedia/commons/4/42/Rain_on_a_tin_roof.ogg';
        });
      }
    } else if (activeSound === 'ai_music' && generatedMusicUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.loop = true;
      }
      audioRef.current.src = generatedMusicUrl;
      audioRef.current.volume = volume;
      audioRef.current.play().catch(e => console.error("AI Music play failed", e));
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [activeSound, generatedMusicUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // --- Todo State ---
  const [todos, setTodos] = useState<any[]>([]);
  const [newTodo, setNewTodo] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'todos'));
    const unsub = onSnapshot(q, (snapshot) => {
      setTodos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim() || !user) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'todos'), {
        userId: user.uid,
        title: newTodo.trim(),
        completed: false,
        createdAt: serverTimestamp()
      });
      setNewTodo('');
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'todos', id), { completed: !completed });
      if (!completed) addXP(10); // 10 XP for a simple todo
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTodo = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'todos', id));
    } catch (err) {
      console.error(err);
    }
  };

  const addXP = async (amount: number) => {
    if (!user) return;
    try {
      const result = await awardXP(user.uid, amount);
      if (result?.leveledUp) {
        setToastMessage(`✨ NÍVEL UP! Agora você é nível ${result.newLevel}! 🌿`);
      } else {
        setToastMessage(`+${amount} XP! 🌟`);
      }
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {
      console.error("Error adding XP", e);
    }
  };

  // Fetch milestones
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'milestones'));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Milestone));
      setMilestones(docs);
      setIsLoading(false);
      
      // Seed if empty
      if (docs.length === 0) {
        seedMilestones(user.uid);
      }
    });
    return unsub;
  }, [user]);

  const seedMilestones = async (userId: string) => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 5);
    const twoWeeks = new Date(today);
    twoWeeks.setDate(today.getDate() + 12);
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);

    const fallbackData = [
      { title: 'Finalizar Capítulo 1', date: nextWeek.toISOString(), completed: false },
      { title: 'Revisão Bibliográfica', date: twoWeeks.toISOString(), completed: false },
      { title: 'Coleta de Dados (Corpus)', date: nextMonth.toISOString(), completed: false },
      { title: 'Submeter Artigo', date: new Date(today.getTime() - 86400000).toISOString(), completed: true },
    ];

    for (const m of fallbackData) {
      await addDoc(collection(db, 'users', userId, 'milestones'), {
        userId,
        ...m,
        createdAt: serverTimestamp()
      });
    }
  };

  // --- Pomodoro Logic ---
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Record session
      if (user) {
        addDoc(collection(db, 'users', user.uid, 'sessions'), {
          userId: user.uid,
          type: mode,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          duration: mode === 'work' ? 25 : 5,
          createdAt: serverTimestamp()
        });
      }

      if (mode === 'work') {
        addXP(50); // 50 XP per work session
      }

      // Play sound or notify
      const nextMode = mode === 'work' ? 'break' : 'work';
      setMode(nextMode);
      setTimeLeft(nextMode === 'work' ? 25 * 60 : 5 * 60);
      setIsActive(false);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, mode]);

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'work' ? 25 * 60 : 5 * 60);
  };

  const switchMode = (newMode: 'work' | 'break') => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(newMode === 'work' ? 25 * 60 : 5 * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- Next Actions Logic ---
  const getNextActions = () => {
    const today = new Date();
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(today.getDate() + 14);

    return milestones
      .filter(m => !m.completed)
      .filter(m => {
        const mDate = new Date(m.date);
        return mDate >= today && mDate <= twoWeeksFromNow;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const nextActions = getNextActions();

  const toggleMilestone = async (id: string) => {
    if (!user) return;
    const milestone = milestones.find(m => m.id === id);
    if (!milestone) return;
    
    const isCompleting = !milestone.completed;
    if (isCompleting) {
      addXP(100); // 100 XP for milestone
    }
    
    try {
      await updateDoc(doc(db, 'users', user.uid, 'milestones', id), {
        completed: isCompleting
      });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSubtask = async (milestoneId: string, subtaskId: string) => {
    if (!user) return;
    const milestone = milestones.find(m => m.id === milestoneId);
    if (!milestone || !milestone.subtasks) return;
    
    const updatedSubtasks = milestone.subtasks.map(st => {
      if (st.id === subtaskId) {
        const isCompleting = !st.completed;
        if (isCompleting) addXP(20);
        return { ...st, completed: isCompleting };
      }
      return st;
    });

    try {
      await updateDoc(doc(db, 'users', user.uid, 'milestones', milestoneId), {
        subtasks: updatedSubtasks
      });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleExpandMilestone = (id: string) => {
    setExpandedMilestones(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const generateSubtasks = async (milestoneId: string, title: string) => {
    setIsSubtaskLoading(prev => ({ ...prev, [milestoneId]: true }));
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Divida a seguinte tarefa acadêmica em 3 a 5 passos menores e acionáveis.\nTarefa: "${title}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "O título do passo ou subtarefa" }
              },
              required: ["title"]
            }
          }
        }
      });
      
      const result = JSON.parse(response.text || '[]');
      const newSubtasks: Subtask[] = result.map((item: any) => ({
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        title: item.title,
        completed: false
      }));

      if (user) {
        await updateDoc(doc(db, 'users', user.uid, 'milestones', milestoneId), {
          subtasks: newSubtasks
        });
      }
      
      setExpandedMilestones(prev => ({ ...prev, [milestoneId]: true }));

    } catch (error) {
      console.error("Error generating subtasks:", error);
      setToastMessage('Erro ao gerar subtarefas.');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsSubtaskLoading(prev => ({ ...prev, [milestoneId]: false }));
    }
  };

  const generateDailyReport = async () => {
    setIsReportLoading(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

      const ai = new GoogleGenAI({ apiKey });
      
      const completedToday = milestones.filter(m => m.completed).length;
      const workSessions = sessions.filter(s => s.type === 'work').length;
      const totalWorkMinutes = sessions.filter(s => s.type === 'work').reduce((acc, s) => acc + s.duration, 0);

      const prompt = `
Gere um relatório de fechamento do dia para um doutorando.
- Palavras escritas hoje: ${wordCount} (Meta: ${dailyGoal})
- Sessões de foco (Pomodoro): ${workSessions} (${totalWorkMinutes} minutos totais)
- Marcos concluídos no total: ${completedToday}

Seja motivador, analise a produtividade e sugira brevemente o foco para amanhã.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "Você é um orientador acadêmico empático. Gere um relatório diário curto e motivacional."
        }
      });
      
      setDailyReport(response.text || 'Não foi possível gerar o relatório.');
    } catch (error) {
      console.error("Error generating report:", error);
      setDailyReport('Ocorreu um erro ao gerar o relatório.');
    } finally {
      setIsReportLoading(false);
    }
  };

  // --- AI Suggestion Logic ---
  const getAiSuggestion = async () => {
    setIsAiLoading(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
Analise meu progresso atual na tese e sugira a próxima tarefa ou tópico de estudo.
Progresso de palavras hoje: ${wordCount} / ${dailyGoal}
Marcos pendentes:
${milestones.filter(m => !m.completed).map(m => `- ${m.title} (Prazo: ${new Date(m.date).toLocaleDateString('pt-BR')})`).join('\n')}
Marcos concluídos:
${milestones.filter(m => m.completed).map(m => `- ${m.title}`).join('\n')}

Contexto adicional do usuário: ${aiContext || 'Nenhum contexto adicional.'}

Por favor, seja direto, encorajador e sugira uma ação clara e acionável.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          systemInstruction: "Você é um orientador acadêmico especializado em ajudar doutorandos a manterem o foco e a produtividade. Suas respostas devem ser curtas (máximo 2 parágrafos), práticas e alinhadas com a técnica Pomodoro e metas diárias."
        }
      });
      
      setAiSuggestion(response.text || 'Não foi possível gerar uma sugestão.');
    } catch (error) {
      console.error("Error getting AI suggestion:", error);
      setAiSuggestion('Ocorreu um erro ao obter a sugestão da IA.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleGenerateMusic = async () => {
    if (!musicPrompt.trim()) return;
    
    // Check for API key selection for Lyria
    const aiStudio = (window as any).aistudio;
    if (aiStudio && !(await aiStudio.hasSelectedApiKey())) {
      await aiStudio.openSelectKey();
      // Proceed after selection
    }

    setIsGeneratingMusic(true);
    setMusicLyrics(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContentStream({
        model: "lyria-3-clip-preview",
        contents: musicPrompt,
        config: {
          responseModalities: [Modality.AUDIO]
        }
      });

      let audioBase64 = "";
      let lyrics = "";
      let mimeType = "audio/wav";

      for await (const chunk of response) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (!audioBase64 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioBase64 += part.inlineData.data;
          }
          if (part.text && !lyrics) {
            lyrics = part.text;
          }
        }
      }

      if (audioBase64) {
        const binary = atob(audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mimeType });
        const audioUrl = URL.createObjectURL(blob);
        setGeneratedMusicUrl(audioUrl);
        setMusicLyrics(lyrics);
        setActiveSound('ai_music');
        setToastMessage('Música gerada com sucesso!');
      } else {
        throw new Error("No audio data received");
      }

    } catch (error) {
      console.error("Error generating music:", error);
      setToastMessage('Erro ao gerar música. Verifique sua chave de API.');
    } finally {
      setIsGeneratingMusic(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // --- Theme Classes ---
  // Stardew Valley / Retro inspired theme
  const panelClass = "bg-[#fdf6e3] border-4 border-[#8b5a2b] rounded-xl p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(139,90,43,0.3)]";
  const titleClass = "font-pixel text-xl sm:text-2xl text-[#5c3a21] mb-4 flex items-center gap-2 uppercase tracking-wide";
  const btnClass = "font-pixel uppercase text-sm sm:text-base px-4 py-2 border-2 border-[#8b5a2b] rounded-lg active:translate-y-1 active:shadow-none transition-all";

  if (isFocusMode) {
    return (
      <div className="flex-1 min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden bg-[#2c3e50]">
        {/* Cozy Room Background Elements */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ecf0f1 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        
        {activeSound === 'rain' && <div className="absolute inset-0 bg-blue-900/10 pointer-events-none animate-pulse"></div>}
        {activeSound === 'fire' && <div className="absolute inset-0 bg-orange-900/10 pointer-events-none animate-pulse"></div>}

        <button 
          onClick={() => setIsFocusMode(false)}
          className="absolute top-4 right-4 sm:top-8 sm:right-8 text-slate-300 hover:text-white flex items-center gap-2 font-pixel z-10 bg-[#34495e] p-3 rounded-lg border-2 border-[#7f8c8d]"
        >
          <Minimize2 className="w-5 h-5" />
          <span className="hidden sm:inline">Sair do Foco</span>
        </button>

        {/* Ambient Sounds Toolbar */}
        <div className="absolute top-4 left-4 sm:top-8 sm:left-8 flex flex-col gap-4 z-10">
          <div className="flex gap-2">
            <button onClick={() => setActiveSound(activeSound === 'rain' ? null : 'rain')} className={cn("p-3 rounded-lg border-2 transition-all", activeSound === 'rain' ? "bg-[#3498db] border-[#2980b9] text-white" : "bg-[#34495e] border-[#7f8c8d] text-slate-300")}>
              <CloudRain className="w-5 h-5" />
            </button>
            <button onClick={() => setActiveSound(activeSound === 'fire' ? null : 'fire')} className={cn("p-3 rounded-lg border-2 transition-all", activeSound === 'fire' ? "bg-[#e67e22] border-[#d35400] text-white" : "bg-[#34495e] border-[#7f8c8d] text-slate-300")}>
              <Flame className="w-5 h-5" />
            </button>
            <button onClick={() => setActiveSound(activeSound === 'cafe' ? null : 'cafe')} className={cn("p-3 rounded-lg border-2 transition-all", activeSound === 'cafe' ? "bg-[#8e44ad] border-[#8e44ad] text-white" : "bg-[#34495e] border-[#7f8c8d] text-slate-300")}>
              <Coffee className="w-5 h-5" />
            </button>
            <button onClick={() => setActiveSound(activeSound === 'lofi' ? null : 'lofi')} className={cn("p-3 rounded-lg border-2 transition-all", activeSound === 'lofi' ? "bg-[#2ecc71] border-[#27ae60] text-white" : "bg-[#34495e] border-[#7f8c8d] text-slate-300")}>
              <Music className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 bg-[#34495e] border-2 border-[#7f8c8d] rounded-lg p-1">
              <input 
                type="text" 
                value={musicPrompt} 
                onChange={(e) => setMusicPrompt(e.target.value)}
                placeholder="Estilo da música..."
                className="bg-transparent text-white text-[10px] font-pixel px-2 focus:outline-none w-24 sm:w-32"
              />
              <button 
                onClick={() => {
                  if (activeSound === 'ai_music') setActiveSound(null);
                  else if (generatedMusicUrl && !isGeneratingMusic) setActiveSound('ai_music');
                  else handleGenerateMusic();
                }} 
                disabled={isGeneratingMusic}
                className={cn("p-2 rounded-md transition-all flex items-center gap-2", activeSound === 'ai_music' ? "bg-[#f1c40f] text-white" : "bg-[#7f8c8d] text-white hover:bg-[#95a5a6]")}
                title="Gerar Música com IA"
              >
                {isGeneratingMusic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          {activeSound === 'ai_music' && musicLyrics && (
            <div className="bg-[#34495e]/80 border-2 border-[#f1c40f] rounded-lg p-3 max-w-xs shadow-lg">
              <p className="text-[10px] font-pixel text-[#f1c40f] mb-1 uppercase">Letra Gerada:</p>
              <p className="text-xs text-white line-clamp-3 italic">"{musicLyrics}"</p>
            </div>
          )}

          {activeSound && (
            <div className="bg-[#34495e] border-2 border-[#7f8c8d] rounded-lg p-3 flex items-center gap-3 shadow-lg">
              <Volume2 className="w-4 h-4 text-slate-300" />
              <input 
                type="range" 
                min="0" max="1" step="0.05" 
                value={volume} 
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-24 sm:w-32 accent-[#3498db]"
              />
            </div>
          )}
        </div>

        <div className="w-full max-w-2xl space-y-8 z-10">
          {/* Giant Pomodoro */}
          <div className="text-center">
            <div className="font-pixel text-[6rem] sm:text-[10rem] text-[#ecf0f1] leading-none drop-shadow-lg mb-8 tabular-nums">
              {formatTime(timeLeft)}
            </div>
            <div className="flex justify-center gap-4">
              <button onClick={toggleTimer} className={cn(btnClass, "bg-[#27ae60] text-white border-[#2ecc71] shadow-[0_4px_0_0_#2ecc71] hover:bg-[#2ecc71]")}>
                {isActive ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
              </button>
              <button onClick={resetTimer} className={cn(btnClass, "bg-[#e74c3c] text-white border-[#c0392b] shadow-[0_4px_0_0_#c0392b] hover:bg-[#c0392b]")}>
                <RotateCcw className="w-8 h-8" />
              </button>
            </div>
          </div>

          {/* Word Count */}
          <div className="bg-[#34495e] border-4 border-[#2c3e50] rounded-2xl p-6 sm:p-8 shadow-2xl">
            <h3 className="font-pixel text-2xl text-[#ecf0f1] mb-4 text-center">Palavras Escritas Hoje</h3>
            <div className="flex items-center justify-center gap-4">
              <input 
                type="number" 
                value={wordCount || ''} 
                onChange={(e) => setWordCount(parseInt(e.target.value) || 0)}
                className="w-32 bg-[#2c3e50] text-white font-pixel text-3xl text-center p-3 rounded-lg border-2 border-[#7f8c8d] focus:outline-none focus:border-[#3498db]"
              />
              <span className="font-pixel text-2xl text-[#95a5a6]">/ {dailyGoal}</span>
            </div>
            <div className="mt-6 h-4 bg-[#2c3e50] rounded-full overflow-hidden border-2 border-[#7f8c8d]">
              <div 
                className="h-full bg-[#3498db] transition-all duration-500"
                style={{ width: `${Math.min(100, (wordCount / dailyGoal) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-pixel text-[#5c3a21] drop-shadow-sm">Tese Tracker</h2>
            <p className="text-[#8b5a2b] font-medium mt-1">Seu companheiro de pesquisa</p>
          </div>
          <button 
            onClick={() => setIsFocusMode(true)}
            className={cn(btnClass, "bg-[#4a7c59] text-white shadow-[0_4px_0_0_#2d4a35] hover:bg-[#5b966d] flex items-center justify-center gap-2")}
          >
            <Maximize2 className="w-4 h-4" />
            Modo Foco
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Timer & Word Count */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Pomodoro */}
            <div className={cn(panelClass, "bg-[#d5e8d4] border-[#82b366]")}>
              <h3 className={cn(titleClass, "text-[#336600]")}>
                <Target className="w-6 h-6" />
                Pomodoro
              </h3>
              
              <div className="flex justify-center gap-2 mb-6">
                <button 
                  onClick={() => switchMode('work')}
                  className={cn("font-pixel text-xs px-3 py-1 rounded border-2 transition-colors", mode === 'work' ? "bg-[#82b366] text-white border-[#336600]" : "bg-white text-[#82b366] border-[#82b366]")}
                >
                  Trabalho
                </button>
                <button 
                  onClick={() => switchMode('break')}
                  className={cn("font-pixel text-xs px-3 py-1 rounded border-2 transition-colors", mode === 'break' ? "bg-[#82b366] text-white border-[#336600]" : "bg-white text-[#82b366] border-[#82b366]")}
                >
                  Pausa
                </button>
              </div>

              <div className="text-center mb-6">
                <div className="font-pixel text-6xl sm:text-7xl text-[#336600] drop-shadow-sm tabular-nums">
                  {formatTime(timeLeft)}
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <button onClick={toggleTimer} className={cn(btnClass, "bg-[#82b366] text-white shadow-[0_4px_0_0_#336600] border-[#336600]")}>
                  {isActive ? 'Pausar' : 'Iniciar'}
                </button>
                <button onClick={resetTimer} className={cn(btnClass, "bg-[#f8cecc] text-[#b85450] shadow-[0_4px_0_0_#b85450] border-[#b85450]")}>
                  Reset
                </button>
              </div>

              {/* Session History */}
              {sessions.length > 0 && (
                <div className="mt-6 border-t-2 border-[#82b366] pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-pixel text-sm text-[#336600] uppercase tracking-wide flex items-center gap-2">
                      <History className="w-4 h-4" />
                      Histórico de Hoje
                    </h4>
                    <button 
                      onClick={generateDailyReport}
                      disabled={isReportLoading}
                      className="font-pixel text-xs px-2 py-1 bg-white text-[#336600] border-2 border-[#82b366] rounded hover:bg-[#d5e8d4] transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      {isReportLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                      Relatório
                    </button>
                  </div>
                  
                  {dailyReport && (
                    <div className="mb-4 bg-white p-3 rounded border-2 border-[#82b366] text-sm text-[#336600] relative">
                      <button onClick={() => setDailyReport(null)} className="absolute top-1 right-1 text-[#82b366] hover:text-[#336600]">
                        <X className="w-4 h-4" />
                      </button>
                      <div className="prose prose-sm prose-p:my-1">
                        <Markdown>{dailyReport}</Markdown>
                      </div>
                    </div>
                  )}

                  <ul className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                    {sessions.map(session => (
                      <li key={session.id} className="flex justify-between items-center bg-white/50 p-2 rounded border border-[#82b366]">
                        <span className="font-medium text-sm text-[#336600] flex items-center gap-2">
                          {session.type === 'work' ? '🎯 Foco' : '☕ Pausa'} ({session.duration}m)
                        </span>
                        <span className="text-xs font-pixel text-[#5b966d]">{session.timestamp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Word Count */}
            <div className={panelClass}>
              <h3 className={titleClass}>
                <PenTool className="w-6 h-6" />
                Palavras (Hoje)
              </h3>
              <div className="flex items-end gap-3 mb-4">
                <input 
                  type="number" 
                  value={wordCount || ''} 
                  onChange={(e) => setWordCount(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#fff9e6] border-2 border-[#8b5a2b] rounded p-2 font-pixel text-2xl text-[#5c3a21] focus:outline-none focus:ring-2 focus:ring-[#d5c4a1]"
                  placeholder="0"
                />
                <div className="font-pixel text-lg text-[#8b5a2b] pb-2">/ {dailyGoal}</div>
              </div>
              <div className="h-4 bg-[#e9dcc9] rounded-full overflow-hidden border-2 border-[#8b5a2b]">
                <div 
                  className="h-full bg-[#c84b31] transition-all duration-500"
                  style={{ width: `${Math.min(100, (wordCount / dailyGoal) * 100)}%` }}
                />
              </div>
            </div>

            {/* Analytics Chart */}
            <div className={panelClass}>
              <h3 className={titleClass}>
                <History className="w-6 h-6" />
                Foco (Últimos 7 dias)
              </h3>
              <div className="h-48 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={
                    Array.from({length: 7}).map((_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() - (6 - i));
                      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                      const count = sessions.filter((s: any) => {
                        if (!s.createdAt) return false;
                        const sDate = s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
                        return sDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) === dateStr && s.type === 'work';
                      }).length;
                      return { name: dateStr, sessions: count };
                    })
                  }>
                    <XAxis dataKey="name" tick={{fontFamily: 'monospace', fontSize: 10, fill: '#8b5a2b'}} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fdf6e3', border: '2px solid #8b5a2b', borderRadius: '8px', fontFamily: 'monospace' }}
                      itemStyle={{ color: '#c84b31' }}
                    />
                    <Bar dataKey="sessions" fill="#4a7c59" radius={[4, 4, 0, 0]}>
                      {
                        Array.from({length: 7}).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 6 ? '#c84b31' : '#4a7c59'} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Argument Heatmap (Outside the Box) */}
            <div className={cn(panelClass, "bg-[#f5f2ed]")}>
              <h3 className={cn(titleClass, "text-[#1a1a1a]")}>
                <Layers className="w-6 h-6" />
                Densidade de Argumentação
              </h3>
              <p className="text-[10px] text-[#8b5a2b] mb-4 uppercase font-pixel tracking-tighter">Distribuição de evidências por capítulo</p>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'Cap. 1', val: 80, color: 'bg-[#c84b31]' },
                  { label: 'Cap. 2', val: 40, color: 'bg-[#e67e22]' },
                  { label: 'Cap. 3', val: 95, color: 'bg-[#27ae60]' },
                  { label: 'Cap. 4', val: 20, color: 'bg-[#f1c40f]' },
                  { label: 'Cap. 5', val: 10, color: 'bg-[#95a5a6]' },
                ].map((cap, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="w-full h-20 bg-[#e9dcc9] rounded-lg relative overflow-hidden border-2 border-[#8b5a2b]/20">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${cap.val}%` }}
                        className={cn("absolute bottom-0 w-full", cap.color)}
                      />
                    </div>
                    <span className="text-[8px] font-pixel text-[#8b5a2b]">{cap.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-2 bg-white/50 rounded border border-[#8b5a2b]/10 text-[10px] text-[#5c3a21] italic">
                Tip: O Capítulo 5 precisa de mais evidências iconográficas.
              </div>
            </div>

          </div>

          {/* Right Column: Next Actions & Milestones */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* To-Do List Section */}
            <div className={cn(panelClass, "bg-[#fdf6e3] border-[#8b5a2b]")}>
              <div className="flex items-center gap-3 mb-6">
                <CheckSquare className="w-6 h-6 text-[#c84b31]" />
                <h3 className="text-xl font-pixel text-[#5c3a21] uppercase tracking-wide">To-Do List</h3>
              </div>
              
              <form onSubmit={addTodo} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  placeholder="Adicionar nova tarefa..."
                  className="flex-1 bg-white border-2 border-[#8b5a2b] rounded-lg px-3 py-2 text-[#5c3a21] font-medium focus:outline-none focus:border-[#c84b31]"
                />
                <button 
                  type="submit"
                  disabled={!newTodo.trim()}
                  className="bg-[#4a7c59] text-[#fdf6e3] border-2 border-[#2d4a35] rounded-lg p-2 hover:bg-[#5b966d] disabled:opacity-50 transition-colors shadow-[2px_2px_0px_0px_#2d4a35] active:translate-y-[2px] active:shadow-none"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {todos.map(todo => (
                  <div key={todo.id} className="flex items-center justify-between p-3 bg-white border-2 border-[#d5c4a1] rounded-lg group hover:border-[#8b5a2b] transition-colors">
                    <button 
                      onClick={() => toggleTodo(todo.id, todo.completed)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      {todo.completed ? (
                        <CheckSquare className="w-5 h-5 text-[#4a7c59] shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-[#8b5a2b] shrink-0" />
                      )}
                      <span className={cn("font-medium text-sm sm:text-base", todo.completed ? "text-[#a0a0a0] line-through" : "text-[#5c3a21]")}>
                        {todo.title}
                      </span>
                    </button>
                    <button 
                      onClick={() => deleteTodo(todo.id)}
                      className="p-1.5 text-slate-400 hover:text-[#c84b31] hover:bg-[#f8cecc] rounded transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {todos.length === 0 && (
                  <p className="text-center text-[#8b5a2b] font-medium py-4 text-sm">Nenhuma tarefa pendente. Aproveite o foco!</p>
                )}
              </div>
            </div>

            {/* What should I do next? */}
            <div className={cn(panelClass, "bg-[#ffe6cc] border-[#d79b00]")}>
              <h3 className={cn(titleClass, "text-[#b05c00]")}>
                <Bot className="w-6 h-6" />
                Orientação da IA
              </h3>
              
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={aiContext}
                    onChange={(e) => setAiContext(e.target.value)}
                    placeholder="Contexto (ex: travado na introdução)"
                    className="flex-1 bg-[#fff9e6] border-2 border-[#d79b00] rounded p-2 font-pixel text-sm text-[#5c3a21] focus:outline-none focus:ring-2 focus:ring-[#d79b00] placeholder:text-[#b05c00]/50"
                  />
                  <button
                    onClick={getAiSuggestion}
                    disabled={isAiLoading}
                    className={cn(btnClass, "bg-[#d79b00] text-white shadow-[0_4px_0_0_#b05c00] border-[#b05c00] hover:bg-[#b05c00] disabled:opacity-50 disabled:shadow-none disabled:translate-y-1 flex items-center justify-center gap-2")}
                  >
                    {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                    Sugerir
                  </button>
                </div>

                {aiSuggestion && (
                  <div className="bg-[#fff2e6] p-4 rounded-lg border-2 border-[#d79b00] text-[#5c3a21] text-sm leading-relaxed prose prose-sm prose-p:my-1 prose-strong:text-[#b05c00]">
                    <Markdown>{aiSuggestion}</Markdown>
                  </div>
                )}

                {!aiSuggestion && !isAiLoading && (
                  <>
                    {isLoading ? (
                      <div className="animate-pulse flex space-x-4 mt-4">
                        <div className="flex-1 space-y-4 py-1">
                          <div className="h-4 bg-[#ffd099] rounded w-3/4"></div>
                          <div className="h-4 bg-[#ffd099] rounded w-1/2"></div>
                        </div>
                      </div>
                    ) : nextActions.length > 0 ? (
                      <div className="mt-4">
                        <p className="font-pixel text-sm text-[#b05c00] mb-3 uppercase tracking-wide">Prazos Próximos:</p>
                        <ul className="space-y-3">
                          {nextActions.slice(0, 3).map(action => (
                            <li key={action.id} className="flex items-start gap-3 bg-[#fff2e6] p-3 rounded-lg border-2 border-[#d79b00]">
                              <button onClick={() => toggleMilestone(action.id)} className="mt-0.5 text-[#b05c00] hover:text-[#d79b00]">
                                <Square className="w-5 h-5" />
                              </button>
                              <div>
                                <p className="font-medium text-[#b05c00]">{action.title}</p>
                                <p className="text-xs font-pixel text-[#d79b00] mt-1">
                                  Prazo: {new Date(action.date).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-[#b05c00] font-pixel mt-4">
                        Nenhum prazo urgente! Aproveite para escrever.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* All Milestones */}
            <div className={panelClass}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h3 className={cn(titleClass, "mb-0")}>
                  <CheckSquare className="w-6 h-6" />
                  Todos os Marcos
                </h3>
                
                <div className="flex items-center gap-2 bg-[#fff2e6] p-2 rounded-lg border-2 border-[#d79b00]">
                  <Filter className="w-4 h-4 text-[#b05c00]" />
                  <div className="flex items-center gap-1">
                    <input 
                      type="date" 
                      value={startDateFilter}
                      onChange={(e) => setStartDateFilter(e.target.value)}
                      className="bg-transparent text-xs font-pixel text-[#b05c00] focus:outline-none"
                    />
                    <span className="text-[#b05c00] text-xs font-pixel">até</span>
                    <input 
                      type="date" 
                      value={endDateFilter}
                      onChange={(e) => setEndDateFilter(e.target.value)}
                      className="bg-transparent text-xs font-pixel text-[#b05c00] focus:outline-none"
                    />
                    {(startDateFilter || endDateFilter) && (
                      <button 
                        onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }}
                        className="ml-1 text-[#b05c00] hover:text-[#c84b31]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {isLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-10 bg-[#e9dcc9] rounded"></div>
                  <div className="h-10 bg-[#e9dcc9] rounded"></div>
                  <div className="h-10 bg-[#e9dcc9] rounded"></div>
                </div>
              ) : (
                <ul className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredMilestones.length > 0 ? (
                    filteredMilestones.map(milestone => (
                      <li 
                        key={milestone.id} 
                        className={cn(
                          "flex flex-col gap-2 p-3 rounded border-2 transition-colors",
                          milestone.completed 
                            ? "bg-[#e9dcc9] border-transparent opacity-60" 
                            : "bg-white border-[#d5c4a1] hover:border-[#8b5a2b]"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => toggleMilestone(milestone.id)} 
                            className={cn("shrink-0", milestone.completed ? "text-[#4a7c59]" : "text-[#8b5a2b]")}
                          >
                            {milestone.completed ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                          </button>
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <p className={cn("truncate font-medium", milestone.completed ? "line-through text-[#8b5a2b]" : "text-[#5c3a21]")}>
                              {milestone.title}
                            </p>
                            {milestone.subtasks && milestone.subtasks.length > 0 && (
                              <button onClick={() => toggleExpandMilestone(milestone.id)} className="text-[#8b5a2b] hover:text-[#5c3a21]">
                                {expandedMilestones[milestone.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                          <div className="shrink-0 text-xs font-pixel text-[#8b5a2b] flex items-center gap-2">
                            {new Date(milestone.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
                            {!milestone.completed && (!milestone.subtasks || milestone.subtasks.length === 0) && (
                              <button 
                                onClick={() => generateSubtasks(milestone.id, milestone.title)}
                                disabled={isSubtaskLoading[milestone.id]}
                                className="p-1 bg-[#fff9e6] rounded border border-[#d5c4a1] hover:bg-[#fdf6e3] hover:border-[#8b5a2b] transition-colors disabled:opacity-50"
                                title="Dividir em passos com IA"
                              >
                                {isSubtaskLoading[milestone.id] ? <Loader2 className="w-3 h-3 animate-spin text-[#b05c00]" /> : <Wand2 className="w-3 h-3 text-[#b05c00]" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Subtasks List */}
                        {milestone.subtasks && milestone.subtasks.length > 0 && expandedMilestones[milestone.id] && (
                          <div className="ml-8 pl-3 border-l-2 border-[#d5c4a1] space-y-2 mt-1">
                            {milestone.subtasks.map(subtask => (
                              <div key={subtask.id} className="flex items-center gap-2">
                                <button 
                                  onClick={() => toggleSubtask(milestone.id, subtask.id)} 
                                  className={cn("shrink-0", subtask.completed ? "text-[#4a7c59]" : "text-[#8b5a2b]")}
                                >
                                  {subtask.completed ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                </button>
                                <p className={cn("text-sm", subtask.completed ? "line-through text-[#8b5a2b]" : "text-[#5c3a21]")}>
                                  {subtask.title}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </li>
                    ))
                  ) : (
                    <div className="text-center py-10 text-[#8b5a2b] font-pixel">
                      Nenhum marco encontrado neste período.
                    </div>
                  )}
                </ul>
              )}
            </div>

            {/* Eureka Tracker (Outside the Box) */}
            <div className={cn(panelClass, "bg-[#fdf6e3] border-[#8b5a2b]")}>
              <h3 className={cn(titleClass, "text-[#5c3a21]")}>
                <Sparkles className="w-6 h-6 text-[#f1c40f]" />
                Laboratório de Eurekas
              </h3>
              <form onSubmit={addEureka} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newEureka}
                  onChange={(e) => setNewEureka(e.target.value)}
                  placeholder="Tive uma ideia brilhante..."
                  className="flex-1 bg-white border-2 border-[#8b5a2b] rounded-lg px-3 py-2 text-[#5c3a21] font-medium focus:outline-none focus:border-[#c84b31]"
                />
                <button 
                  type="submit"
                  disabled={!newEureka.trim() || isEurekaLoading}
                  className="bg-[#f1c40f] text-[#5c3a21] border-2 border-[#8b5a2b] rounded-lg p-2 hover:bg-[#f39c12] disabled:opacity-50 transition-colors shadow-[2px_2px_0px_0px_#8b5a2b] active:translate-y-[2px] active:shadow-none"
                >
                  {isEurekaLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                </button>
              </form>
              <div className="space-y-3">
                {eurekas.map(eureka => (
                  <div key={eureka.id} className="p-3 bg-white border-2 border-[#f1c40f]/30 rounded-lg relative group">
                    <p className="text-sm text-[#5c3a21] leading-relaxed">"{eureka.text}"</p>
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-[8px] font-pixel text-[#8b5a2b] uppercase">Registrado em {new Date(eureka.timestamp?.toDate()).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                {eurekas.length === 0 && (
                  <p className="text-center text-[#8b5a2b] font-medium py-4 text-sm italic">Nenhum Eureka ainda. Continue pesquisando!</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-8 right-8 bg-[#4a7c59] text-[#fdf6e3] border-4 border-[#2d4a35] px-6 py-3 rounded-xl shadow-[4px_4px_0px_0px_rgba(45,74,53,0.5)] font-pixel z-50 flex items-center gap-3"
          >
            <CheckSquare className="w-6 h-6" />
            <span className="text-lg">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
