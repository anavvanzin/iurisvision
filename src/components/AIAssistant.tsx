import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { Send, Bot, User, Loader2, Search, BrainCircuit, BookOpen } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import Markdown from 'react-markdown';

type Message = {
  role: 'user' | 'model';
  content: string;
  isThinking?: boolean;
};

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: 'Olá! Sou o assistente de IA do projeto IURIS VISIO. Como posso ajudar com o roadmap, análise iconográfica ou pesquisa jurídica hoje? Se você salvou documentos na Base de Conhecimento, eu também posso analisá-los para você!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'pro' | 'flash'>('pro');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Get Knowledge Base documents
      const savedDocs = localStorage.getItem('thesis_kb_docs');
      const docs = savedDocs ? JSON.parse(savedDocs) : [];
      let docsContext = '';
      if (docs.length > 0) {
        docsContext = '\n\n--- CONTEXTO DA BASE DE CONHECIMENTO DO USUÁRIO ---\n' + 
          docs.map((d: any) => `Documento: ${d.title}\nConteúdo:\n${d.content}`).join('\n\n---\n\n');
      }

      let responseText = '';

      if (mode === 'pro') {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: userMessage + docsContext,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
            tools: [{ googleSearch: {} }],
            toolConfig: { includeServerSideToolInvocations: true },
            systemInstruction: "Você é um assistente especializado no projeto IURIS VISIO. Você tem acesso aos documentos da Base de Conhecimento do usuário. Use-os para responder se a pergunta for sobre eles. Se precisar de informações externas ou atualizadas, use a busca do Google."
          }
        });
        responseText = response.text || 'Desculpe, não consegui gerar uma resposta.';
        
        // Extract grounding links if any
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks && chunks.length > 0) {
          responseText += '\n\n**Fontes Externas:**\n';
          chunks.forEach((chunk: any, index: number) => {
            if (chunk.web?.uri) {
              responseText += `[${index + 1}] [${chunk.web.title}](${chunk.web.uri})\n`;
            }
          });
        }
      } else {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: userMessage + docsContext,
          config: {
            tools: [{ googleSearch: {} }],
            systemInstruction: "Você é um assistente especializado no projeto IURIS VISIO. Use a busca do Google para trazer informações atualizadas. Você também tem acesso aos documentos da Base de Conhecimento do usuário."
          }
        });
        responseText = response.text || 'Desculpe, não consegui gerar uma resposta.';
        
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks && chunks.length > 0) {
          responseText += '\n\n**Fontes:**\n';
          chunks.forEach((chunk: any, index: number) => {
            if (chunk.web?.uri) {
              responseText += `[${index + 1}] [${chunk.web.title}](${chunk.web.uri})\n`;
            }
          });
        }
      }

      setMessages(prev => [...prev, { role: 'model', content: responseText }]);
    } catch (error) {
      console.error("Error calling Gemini:", error);
      setMessages(prev => [...prev, { role: 'model', content: 'Ocorreu um erro ao processar sua solicitação. Verifique a chave da API e tente novamente.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="px-4 sm:px-6 py-4 border-b-4 border-[#8b5a2b] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#e9dcc9] shadow-sm z-10">
        <div>
          <h2 className="font-pixel text-xl sm:text-2xl text-[#5c3a21] flex items-center gap-2 uppercase tracking-wide">
            <Bot className="w-6 h-6 text-[#c84b31]" />
            IURIS VISIO Assistant
          </h2>
          <p className="text-sm text-[#8b5a2b] mt-1 font-medium flex items-center gap-1">
            <BookOpen className="w-4 h-4" /> Conectado à sua Base de Conhecimento
          </p>
        </div>
        
        <div className="flex items-center bg-[#d5c4a1] p-1 rounded-lg border-2 border-[#8b5a2b] shadow-[2px_2px_0px_0px_rgba(139,90,43,0.2)] w-full sm:w-auto">
          <button
            onClick={() => setMode('pro')}
            className={cn(
              "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-pixel uppercase tracking-wide rounded-md transition-all",
              mode === 'pro' ? "bg-[#fdf6e3] text-[#c84b31] border-2 border-[#8b5a2b] shadow-[2px_2px_0px_0px_rgba(139,90,43,0.3)]" : "text-[#5c3a21] hover:text-[#c84b31] border-2 border-transparent"
            )}
          >
            <BrainCircuit className="w-4 h-4" />
            Deep Thinking
          </button>
          <button
            onClick={() => setMode('flash')}
            className={cn(
              "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-pixel uppercase tracking-wide rounded-md transition-all",
              mode === 'flash' ? "bg-[#fdf6e3] text-[#c84b31] border-2 border-[#8b5a2b] shadow-[2px_2px_0px_0px_rgba(139,90,43,0.3)]" : "text-[#5c3a21] hover:text-[#c84b31] border-2 border-transparent"
            )}
          >
            <Search className="w-4 h-4" />
            Web Search
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={cn("flex gap-3 sm:gap-4 max-w-4xl mx-auto", msg.role === 'user' ? "flex-row-reverse" : "")}>
            <div className={cn(
              "w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border-2 shadow-[2px_2px_0px_0px_rgba(139,90,43,0.3)]",
              msg.role === 'user' ? "bg-[#4a7c59] text-[#fdf6e3] border-[#2d4a35]" : "bg-[#c84b31] text-[#fdf6e3] border-[#8a3322]"
            )}>
              {msg.role === 'user' ? <User className="w-5 h-5 sm:w-6 sm:h-6" /> : <Bot className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <div className={cn(
              "px-4 py-3 sm:px-5 sm:py-4 rounded-xl max-w-[85%] sm:max-w-[80%] border-4 shadow-[4px_4px_0px_0px_rgba(139,90,43,0.3)]",
              msg.role === 'user' 
                ? "bg-[#fdf6e3] text-[#5c3a21] border-[#4a7c59] rounded-tr-none" 
                : "bg-[#fdf6e3] text-[#5c3a21] border-[#8b5a2b] rounded-tl-none"
            )}>
              <div className="prose prose-sm max-w-none prose-headings:font-pixel prose-headings:text-[#5c3a21] prose-a:text-[#c84b31] prose-strong:text-[#8b5a2b]">
                <Markdown>{msg.content}</Markdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4 max-w-4xl mx-auto">
            <div className="w-10 h-10 rounded-xl bg-[#c84b31] text-[#fdf6e3] border-2 border-[#8a3322] shadow-[2px_2px_0px_0px_rgba(139,90,43,0.3)] flex items-center justify-center shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div className="px-5 py-4 rounded-xl bg-[#fdf6e3] text-[#5c3a21] border-4 border-[#8b5a2b] shadow-[4px_4px_0px_0px_rgba(139,90,43,0.3)] rounded-tl-none flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-[#c84b31]" />
              <span className="text-sm font-pixel uppercase tracking-wide text-[#8b5a2b] mt-1">
                {mode === 'pro' ? 'Pensando profundamente...' : 'Pesquisando na web...'}
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-[#e9dcc9] border-t-4 border-[#8b5a2b] z-10">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'pro' ? "Faça uma pergunta complexa..." : "Pesquise informações recentes..."}
            className="w-full pl-4 pr-14 py-4 bg-[#fdf6e3] border-4 border-[#8b5a2b] text-[#5c3a21] font-medium focus:outline-none focus:border-[#c84b31] rounded-xl shadow-[4px_4px_0px_0px_rgba(139,90,43,0.3)] transition-all placeholder:text-[#d5c4a1]"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-3 top-3 p-2 bg-[#c84b31] text-[#fdf6e3] border-2 border-[#8a3322] rounded-lg shadow-[2px_2px_0px_0px_#8a3322] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[2px_2px_0px_0px_#8a3322] transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
