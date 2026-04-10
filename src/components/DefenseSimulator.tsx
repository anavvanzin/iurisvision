import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Send, 
  User, 
  Bot, 
  AlertTriangle, 
  CheckCircle2, 
  MessageSquare, 
  History,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Loader2,
  Sparkles,
  Gavel,
  Users
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';

interface DefenseMessage {
  id: string;
  role: 'user' | 'assistant';
  persona?: string;
  content: string;
  timestamp: any;
}

const PERSONAS = [
  { 
    id: 'advisor', 
    name: 'O Orientador Rigoroso', 
    role: 'Metodologia & Estrutura',
    avatar: '👨‍🏫',
    instruction: 'Você é um orientador acadêmico rigoroso. Seu foco é na metodologia, na estrutura lógica do argumento e na clareza conceitual. Você não aceita afirmações sem base teórica sólida.'
  },
  { 
    id: 'expert', 
    name: 'O Especialista em Iconografia', 
    role: 'Simbolismo & História',
    avatar: '🖼️',
    instruction: 'Você é um historiador da arte especialista em iconografia e iconologia. Seu foco é na análise profunda das imagens, no contexto histórico e na tradição visual. Você questiona as interpretações simbólicas.'
  },
  { 
    id: 'skeptic', 
    name: 'O Advogado do Diabo', 
    role: 'Crítica & Contradição',
    avatar: '😈',
    instruction: 'Você é um crítico ferrenho. Seu objetivo é encontrar furos na tese, contradições lógicas e pontos onde a evidência é fraca. Você desafia o aluno a defender o indefensável.'
  },
  { 
    id: 'formalist', 
    name: 'O Formalista Jurídico', 
    role: 'Teoria do Direito',
    avatar: '⚖️',
    instruction: 'Você é um jurista focado na teoria do direito e na filosofia política. Você quer saber como a iconografia se traduz em normas, poder e justiça institucional.'
  }
];

export function DefenseSimulator() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DefenseMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDefenseActive, setIsDefenseActive] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [activePersona, setActivePersona] = useState(PERSONAS[0]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'defense_sessions'),
      orderBy('timestamp', 'asc'),
      limit(50)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DefenseMessage)));
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || !input.trim() || isLoading) return;

    const userMsg: DefenseMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: serverTimestamp()
    };

    setInput('');
    setIsLoading(true);

    try {
      await setDoc(doc(db, 'users', user.uid, 'defense_sessions', userMsg.id), userMsg);

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

      const ai = new GoogleGenAI({ apiKey });
      
      const nextPersona = isDefenseActive ? PERSONAS[currentRound % PERSONAS.length] : PERSONAS[0];
      setActivePersona(nextPersona);

      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [...history, { role: 'user', parts: [{ text: input }] }],
        config: {
          systemInstruction: `
            Você está participando de um SIMULADOR DE BANCA DE DEFESA DE TESE.
            Seu papel atual é: ${nextPersona.name} (${nextPersona.role}).
            ${nextPersona.instruction}
            
            REGRAS DA BANCA:
            1. Seja formal, acadêmico e desafiador.
            2. Faça perguntas difíceis.
            3. Não dê respostas prontas, peça justificativas.
            4. Se o aluno for vago, pressione por detalhes.
            5. Mantenha o tom de uma defesa de doutorado real.
            
            Contexto da Tese: IURIS VISIO - A Justiça de Trajano na Iconografia Jurídica.
          `
        }
      });

      const responseText = response.text || 'Desculpe, não consegui gerar uma resposta.';

      const aiMsg: DefenseMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        persona: nextPersona.id,
        content: responseText,
        timestamp: serverTimestamp()
      };

      await setDoc(doc(db, 'users', user.uid, 'defense_sessions', aiMsg.id), aiMsg);
      
      if (isDefenseActive) {
        setCurrentRound(prev => prev + 1);
      }
    } catch (err) {
      console.error("Defense Simulator Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const startDefense = () => {
    setIsDefenseActive(true);
    setCurrentRound(0);
    setInput("Gostaria de iniciar a defesa do meu capítulo sobre a 'Justiça de Trajano' e sua recepção iconográfica no século XVI.");
  };

  const clearSession = async () => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'defense_sessions'));
    const snapshot = await onSnapshot(q, () => {}); // This is a bit hacky, better to use getDocs
    // For now, let's just delete the messages in state and let the user know
    // In a real app, we'd use a batch delete
    messages.forEach(async (m) => {
      await deleteDoc(doc(db, 'users', user.uid, 'defense_sessions', m.id));
    });
    setIsDefenseActive(false);
    setCurrentRound(0);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#e9dcc9] relative overflow-hidden">
      {/* Header */}
      <header className="bg-[#fdf6e3] border-b-4 border-[#8b5a2b] p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-4 z-10">
        <div className="flex items-center gap-4">
          <div className="bg-[#c84b31] border-4 border-[#8a3322] p-3 rounded-xl shadow-[4px_4px_0px_0px_#8a3322]">
            <Gavel className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-pixel text-[#5c3a21] uppercase tracking-wide">Simulador de Banca</h2>
            <p className="text-sm text-[#8b5a2b] font-medium">Prepare-se para o "Juízo Final" acadêmico.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={clearSession}
            className="p-2 text-[#8b5a2b] hover:text-[#c84b31] transition-colors"
            title="Limpar Sessão"
          >
            <RotateCcw className="w-6 h-6" />
          </button>
          {!isDefenseActive ? (
            <button 
              onClick={startDefense}
              className="flex items-center gap-2 px-6 py-3 bg-[#4a7c59] text-white border-4 border-[#2d4a35] rounded-xl font-pixel uppercase shadow-[4px_4px_0px_0px_#2d4a35] hover:translate-y-[2px] hover:shadow-none transition-all"
            >
              <Play className="w-4 h-4" />
              Iniciar Defesa
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#fdf6e3] border-2 border-[#8b5a2b] rounded-lg">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs font-pixel text-[#5c3a21] uppercase">Sessão Ativa • Rodada {currentRound + 1}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto opacity-60">
                <ShieldCheck className="w-16 h-16 text-[#8b5a2b] mb-4" />
                <h3 className="text-xl font-pixel text-[#5c3a21] uppercase mb-2">Tribunal Acadêmico</h3>
                <p className="text-[#8b5a2b] font-medium">
                  Apresente sua tese ou um capítulo específico. Os membros da banca irão analisar seus argumentos e fazer perguntas críticas.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const persona = PERSONAS.find(p => p.id === msg.persona);
                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-4 max-w-3xl",
                      msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 text-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]",
                      msg.role === 'user' ? "bg-[#e9dcc9] border-[#8b5a2b]" : "bg-white border-[#c84b31]"
                    )}>
                      {msg.role === 'user' ? '🎓' : persona?.avatar || '🤖'}
                    </div>
                    <div className={cn(
                      "p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(139,90,43,0.1)] border-2",
                      msg.role === 'user' 
                        ? "bg-[#8b5a2b] text-[#fdf6e3] border-[#5c3a21] rounded-tr-none" 
                        : "bg-[#fdf6e3] text-[#5c3a21] border-[#8b5a2b] rounded-tl-none"
                    )}>
                      {msg.role === 'assistant' && persona && (
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#8b5a2b]/20">
                          <span className="text-[10px] font-pixel text-[#c84b31] uppercase">{persona.name}</span>
                          <span className="text-[8px] font-pixel text-[#8b5a2b] uppercase">• {persona.role}</span>
                        </div>
                      )}
                      <div className="prose prose-sm max-w-none prose-stone">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
            {isLoading && (
              <div className="flex gap-4 mr-auto max-w-3xl">
                <div className="w-10 h-10 rounded-xl border-2 bg-white border-[#c84b31] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
                  <Loader2 className="w-5 h-5 animate-spin text-[#c84b31]" />
                </div>
                <div className="bg-[#fdf6e3] border-2 border-[#8b5a2b] p-4 rounded-2xl rounded-tl-none shadow-[4px_4px_0px_0px_rgba(139,90,43,0.1)]">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-[#8b5a2b] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#8b5a2b] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#8b5a2b] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 sm:p-6 bg-[#e9dcc9] border-t-4 border-[#8b5a2b]">
            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative">
              <textarea 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Apresente seu argumento ou responda à banca..."
                className="w-full bg-[#fdf6e3] border-4 border-[#8b5a2b] rounded-xl p-4 pr-16 text-[#5c3a21] font-medium focus:outline-none focus:border-[#c84b31] shadow-[4px_4px_0px_0px_rgba(139,90,43,0.2)] resize-none h-24"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-4 bottom-4 p-3 bg-[#c84b31] text-white border-2 border-[#8a3322] rounded-lg shadow-[2px_2px_0px_0px_#8a3322] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50 transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            <p className="text-center text-[10px] font-pixel text-[#8b5a2b] mt-3 uppercase">
              Shift + Enter para nova linha • Pressione Enter para enviar
            </p>
          </div>
        </div>

        {/* Sidebar - Committee Info */}
        <aside className="hidden lg:flex w-80 bg-[#fdf6e3] border-l-4 border-[#8b5a2b] flex-col overflow-hidden">
          <div className="p-6 border-b-2 border-[#8b5a2b] bg-[#e9dcc9]">
            <h3 className="font-pixel text-lg text-[#5c3a21] uppercase flex items-center gap-2">
              <Users className="w-5 h-5" />
              Membros da Banca
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {PERSONAS.map((p) => (
              <div 
                key={p.id}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all",
                  activePersona.id === p.id && isDefenseActive
                    ? "bg-white border-[#c84b31] shadow-[4px_4px_0px_0px_rgba(200,75,49,0.2)] scale-[1.02]"
                    : "bg-[#e9dcc9]/50 border-[#d5c4a1] opacity-70"
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{p.avatar}</span>
                  <div>
                    <h4 className="text-xs font-bold text-[#5c3a21]">{p.name}</h4>
                    <p className="text-[10px] font-pixel text-[#c84b31] uppercase">{p.role}</p>
                  </div>
                </div>
                <p className="text-[10px] text-[#8b5a2b] leading-tight italic">
                  {p.instruction.split('.')[0]}.
                </p>
              </div>
            ))}
          </div>
          <div className="p-4 bg-[#e9dcc9] border-t-2 border-[#8b5a2b]">
            <div className="bg-[#fdf6e3] border-2 border-[#8b5a2b] p-3 rounded-lg">
              <div className="flex items-center gap-2 text-[#c84b31] mb-1">
                <Sparkles className="w-3 h-3" />
                <span className="text-[10px] font-pixel uppercase">Dica Pro</span>
              </div>
              <p className="text-[10px] text-[#5c3a21] leading-tight">
                Use o **Advogado do Diabo** para encontrar fraquezas antes da qualificação real.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
