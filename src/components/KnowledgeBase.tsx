import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Plus, Trash2, Send, Bot, User, Loader2, Save, X, MessageSquare, FileText, Search, Wand2, List, Quote } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

type Document = {
  id: string;
  title: string;
  content: string;
};

type Message = {
  role: 'user' | 'model';
  content: string;
};

type Persona = 'default' | 'devil' | 'formalist' | 'art_historian';

const PERSONAS: Record<Persona, { name: string; icon: string; instruction: string }> = {
  default: {
    name: 'Assistente Padrão',
    icon: '🤖',
    instruction: 'Você é um assistente de pesquisa acadêmica equilibrado e preciso.'
  },
  devil: {
    name: 'Advogado do Diabo',
    icon: '😈',
    instruction: 'Você é um crítico acadêmico rigoroso. Seu objetivo é encontrar lacunas, contradições e pontos fracos nos argumentos do texto. Seja provocativo e ajude o usuário a fortalecer sua tese através do questionamento.'
  },
  formalist: {
    name: 'O Formalista',
    icon: '📏',
    instruction: 'Você é um especialista em metodologia e normas acadêmicas. Foque na estrutura, clareza lógica, rigor metodológico e na precisão dos termos utilizados.'
  },
  art_historian: {
    name: 'Historiador da Arte',
    icon: '🖼️',
    instruction: 'Você é um especialista em iconografia e iconologia. Analise o texto focando nos símbolos, na tradição visual, nos significados ocultos das imagens descritas e no contexto histórico-artístico.'
  }
};

export function KnowledgeBase() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isCompiling, setIsCompiling] = useState(false);
  
  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isAiActionLoading, setIsAiActionLoading] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<Record<string, Message[]>>(() => {
    const saved = localStorage.getItem('thesis_kb_chats');
    return saved ? JSON.parse(saved) : {};
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activePersona, setActivePersona] = useState<Persona>('default');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'documents'));
    const unsub = onSnapshot(q, (snapshot) => {
      setDocuments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Document)));
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    localStorage.setItem('thesis_kb_chats', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeDocId]);

  const activeDoc = documents.find(d => d.id === activeDocId);
  const activeMessages = activeDocId ? (messages[activeDocId] || []) : [];

  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewDoc = () => {
    setIsEditing(true);
    setEditTitle('');
    setEditContent('');
    setActiveDocId(null);
  };

  const handleSaveDoc = async () => {
    if (!editTitle.trim() || !editContent.trim() || !user) return;

    const docId = activeDocId || Date.now().toString();
    
    try {
      await setDoc(doc(db, 'users', user.uid, 'documents', docId), {
        userId: user.uid,
        title: editTitle,
        content: editContent,
        createdAt: serverTimestamp()
      }, { merge: true });
      
      setActiveDocId(docId);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    // Use custom modal or just proceed for now since window.confirm is restricted in iframe
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'documents', id));
      setMessages(prev => {
        const newMsgs = { ...prev };
        delete newMsgs[id];
        return newMsgs;
      });
      if (activeDocId === id) {
        setActiveDocId(null);
        setIsEditing(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !activeDoc) return;

    const userMessage = input.trim();
    setInput('');
    
    const newMessages = [...activeMessages, { role: 'user' as const, content: userMessage }];
    setMessages(prev => ({ ...prev, [activeDoc.id]: newMessages }));
    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
Você é um assistente de pesquisa acadêmica (um "Mini NotebookLM").
Sua tarefa é responder à pergunta do usuário baseando-se EXCLUSIVAMENTE no documento fornecido abaixo.
Se a resposta não estiver no documento, diga claramente que o documento não contém essa informação. Não invente dados.
Você pode citar trechos do documento se for útil.

Documento: "${activeDoc.title}"
Conteúdo:
${activeDoc.content}

Pergunta do usuário: ${userMessage}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          systemInstruction: `${PERSONAS[activePersona].instruction} Baseie-se EXCLUSIVAMENTE no documento fornecido. Se a resposta não estiver lá, admita. Seja preciso e cite o texto quando relevante.`
        }
      });

      setMessages(prev => ({
        ...prev,
        [activeDoc.id]: [...newMessages, { role: 'model', content: response.text || 'Sem resposta.' }]
      }));
    } catch (error) {
      console.error("Error calling Gemini:", error);
      setMessages(prev => ({
        ...prev,
        [activeDoc.id]: [...newMessages, { role: 'model', content: 'Ocorreu um erro ao processar sua solicitação.' }]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiAction = async (actionType: 'improve' | 'summarize' | 'extract') => {
    if (!editContent.trim()) return;
    setIsAiActionLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

      const ai = new GoogleGenAI({ apiKey });
      
      let prompt = '';
      let systemInstruction = '';

      if (actionType === 'improve') {
        prompt = `Reescreva o texto a seguir para que ele tenha um tom mais acadêmico, coeso e claro. Mantenha as ideias originais intactas.\n\nTexto:\n${editContent}`;
        systemInstruction = "Você é um revisor acadêmico. Melhore a escrita do texto fornecido.";
      } else if (actionType === 'summarize') {
        prompt = `Gere um resumo em tópicos (bullet points) dos principais argumentos e informações do texto a seguir:\n\nTexto:\n${editContent}`;
        systemInstruction = "Você é um assistente de pesquisa. Resuma o texto em tópicos claros e concisos.";
      } else if (actionType === 'extract') {
        prompt = `Extraia as citações mais importantes ou afirmações centrais do texto a seguir. Formate-as como uma lista.\n\nTexto:\n${editContent}`;
        systemInstruction = "Você é um assistente de pesquisa. Extraia as citações principais do texto.";
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { systemInstruction }
      });

      const result = response.text || '';
      
      if (actionType === 'improve') {
        setEditContent(result);
      } else {
        setEditContent(prev => prev + `\n\n--- ${actionType === 'summarize' ? 'RESUMO DA IA' : 'CITAÇÕES EXTRAÍDAS'} ---\n\n` + result);
      }

    } catch (error) {
      console.error("Error calling Gemini for AI action:", error);
      alert('Ocorreu um erro ao processar a ação da IA.');
    } finally {
      setIsAiActionLoading(false);
    }
  };

  const handleCompileDraft = async () => {
    if (selectedDocs.size === 0) return;
    setIsCompiling(true);
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

      const ai = new GoogleGenAI({ apiKey });
      
      const docsToCompile = documents.filter(d => selectedDocs.has(d.id));
      const context = docsToCompile.map(d => `--- TÍTULO: ${d.title} ---\n${d.content}`).join('\n\n');

      const prompt = `Você é um assistente acadêmico. Seu objetivo é compilar as anotações e documentos fornecidos em um rascunho estruturado e coeso, ideal para iniciar a escrita de um capítulo ou seção de tese.
Organize as ideias de forma lógica, crie subtítulos se necessário, e conecte os pontos principais.

DOCUMENTOS FONTE:
${context}

Gere o rascunho em formato Markdown.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          systemInstruction: "Você é um especialista em redação acadêmica. Sintetize e estruture as anotações em um rascunho coeso."
        }
      });

      const draftContent = response.text || '';
      
      // Create a new document with the draft
      const docId = Date.now().toString();
      await setDoc(doc(db, 'users', user!.uid, 'documents', docId), {
        userId: user!.uid,
        title: `[Rascunho Compilado] ${new Date().toLocaleDateString()}`,
        content: draftContent,
        createdAt: serverTimestamp()
      });
      
      setSelectedDocs(new Set());
      setActiveDocId(docId);
      setIsEditing(false);
      
    } catch (error) {
      console.error("Error compiling draft:", error);
      alert("Ocorreu um erro ao compilar o rascunho.");
    } finally {
      setIsCompiling(false);
    }
  };

  const toggleDocSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelection = new Set(selectedDocs);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedDocs(newSelection);
  };

  const panelClass = "bg-[#fdf6e3] border-4 border-[#8b5a2b] rounded-xl shadow-[4px_4px_0px_0px_rgba(139,90,43,0.3)] overflow-hidden flex flex-col";
  const btnClass = "font-pixel uppercase text-sm px-4 py-2 border-2 border-[#8b5a2b] rounded-lg active:translate-y-1 active:shadow-none transition-all";

  return (
    <div className="flex-1 overflow-hidden p-4 sm:p-8 flex flex-col">
      <header className="mb-6 shrink-0 flex justify-between items-end">
        <div>
          <h2 className="text-3xl sm:text-4xl font-pixel text-[#5c3a21] drop-shadow-sm flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-[#c84b31]" />
            Base de Conhecimento
          </h2>
          <p className="text-[#8b5a2b] font-medium mt-1">Seu Mini NotebookLM: Cole textos e converse com eles.</p>
        </div>
        {selectedDocs.size > 0 && (
          <button
            onClick={handleCompileDraft}
            disabled={isCompiling}
            className="hidden sm:flex items-center gap-2 bg-[#d79b00] text-white border-2 border-[#b05c00] px-4 py-2 rounded-lg font-pixel text-sm shadow-[2px_2px_0px_0px_#b05c00] hover:bg-[#b05c00] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
          >
            {isCompiling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            Compilar Rascunho ({selectedDocs.size})
          </button>
        )}
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Left Sidebar: Document List */}
        <div className={cn(panelClass, "lg:w-1/3 shrink-0")}>
          <div className="p-4 border-b-4 border-[#8b5a2b] bg-[#e9dcc9] flex justify-between items-center">
            <h3 className="font-pixel text-xl text-[#5c3a21] uppercase">Documentos</h3>
            <button 
              onClick={handleNewDoc}
              className="p-2 bg-[#4a7c59] text-[#fdf6e3] border-2 border-[#2d4a35] rounded-lg shadow-[2px_2px_0px_0px_#2d4a35] hover:bg-[#5b966d] active:translate-y-[2px] active:shadow-none transition-all"
              title="Novo Documento"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-3 border-b-4 border-[#8b5a2b] bg-[#fdf6e3]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b5a2b]" />
              <input
                type="text"
                placeholder="Buscar documentos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border-2 border-[#8b5a2b] rounded-lg text-sm text-[#5c3a21] focus:outline-none focus:border-[#c84b31] placeholder:text-[#d5c4a1] font-medium"
              />
            </div>
            
            {/* Mobile compile button */}
            {selectedDocs.size > 0 && (
              <button
                onClick={handleCompileDraft}
                disabled={isCompiling}
                className="sm:hidden w-full mt-3 flex items-center justify-center gap-2 bg-[#d79b00] text-white border-2 border-[#b05c00] px-4 py-2 rounded-lg font-pixel text-sm shadow-[2px_2px_0px_0px_#b05c00] hover:bg-[#b05c00] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
              >
                {isCompiling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Compilar ({selectedDocs.size})
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {documents.length === 0 ? (
              <div className="text-center text-[#8b5a2b] font-medium mt-8">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum documento ainda.</p>
                <p className="text-sm mt-1">Adicione um para começar!</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center text-[#8b5a2b] font-medium mt-8">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum documento encontrado.</p>
              </div>
            ) : (
              filteredDocuments.map(doc => (
                <div 
                  key={doc.id}
                  onClick={() => { setActiveDocId(doc.id); setIsEditing(false); }}
                  className={cn(
                    "p-3 border-2 rounded-lg cursor-pointer transition-all flex justify-between items-center group",
                    activeDocId === doc.id && !isEditing
                      ? "bg-[#8b5a2b] text-[#fdf6e3] border-[#5c3a21] shadow-[2px_2px_0px_0px_#5c3a21] translate-y-[-2px]"
                      : "bg-white text-[#5c3a21] border-[#d5c4a1] hover:border-[#8b5a2b] hover:shadow-[2px_2px_0px_0px_rgba(139,90,43,0.3)]"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <input 
                      type="checkbox" 
                      checked={selectedDocs.has(doc.id)}
                      onChange={(e) => { e.stopPropagation(); toggleDocSelection(doc.id, e as any); }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-[#8b5a2b] text-[#c84b31] focus:ring-[#c84b31] cursor-pointer shrink-0"
                    />
                    <div className="truncate font-medium flex-1 mr-2">{doc.title}</div>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteDoc(doc.id, e)}
                    className={cn(
                      "p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100 shrink-0",
                      activeDocId === doc.id && !isEditing ? "text-[#fdf6e3] hover:bg-[#5c3a21]" : "text-[#c84b31] hover:bg-[#f8cecc]"
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Area: Editor or Chat */}
        <div className={cn(panelClass, "flex-1")}>
          {isEditing ? (
            // Editor View
            <div className="flex flex-col h-full">
              <div className="p-4 border-b-4 border-[#8b5a2b] bg-[#e9dcc9] flex justify-between items-center">
                <h3 className="font-pixel text-xl text-[#5c3a21] uppercase">
                  {activeDocId ? 'Editar Documento' : 'Novo Documento'}
                </h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setIsEditing(false); if (!activeDocId) setActiveDocId(documents[0]?.id || null); }}
                    className="p-2 bg-[#f8cecc] text-[#b85450] border-2 border-[#b85450] rounded-lg shadow-[2px_2px_0px_0px_#b85450] hover:bg-[#f4b3b0] active:translate-y-[2px] active:shadow-none transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleSaveDoc}
                    className="p-2 bg-[#4a7c59] text-[#fdf6e3] border-2 border-[#2d4a35] rounded-lg shadow-[2px_2px_0px_0px_#2d4a35] hover:bg-[#5b966d] active:translate-y-[2px] active:shadow-none transition-all"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="Título do Documento (ex: Capítulo 1, Artigo sobre CLIP)"
                  className="w-full bg-white border-2 border-[#8b5a2b] rounded-lg p-3 font-pixel text-lg text-[#5c3a21] focus:outline-none focus:border-[#c84b31]"
                />
                
                {/* AI Tools Toolbar */}
                <div className="flex flex-wrap gap-2 bg-[#e9dcc9] p-2 rounded-lg border-2 border-[#8b5a2b]">
                  <button
                    onClick={() => handleAiAction('improve')}
                    disabled={isAiActionLoading || !editContent.trim()}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white text-[#5c3a21] border-2 border-[#8b5a2b] rounded-md shadow-[2px_2px_0px_0px_rgba(139,90,43,0.3)] hover:bg-[#fdf6e3] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 text-sm font-pixel"
                  >
                    {isAiActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4 text-[#c84b31]" />}
                    Melhorar Escrita
                  </button>
                  <button
                    onClick={() => handleAiAction('summarize')}
                    disabled={isAiActionLoading || !editContent.trim()}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white text-[#5c3a21] border-2 border-[#8b5a2b] rounded-md shadow-[2px_2px_0px_0px_rgba(139,90,43,0.3)] hover:bg-[#fdf6e3] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 text-sm font-pixel"
                  >
                    {isAiActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <List className="w-4 h-4 text-[#4a7c59]" />}
                    Resumir
                  </button>
                  <button
                    onClick={() => handleAiAction('extract')}
                    disabled={isAiActionLoading || !editContent.trim()}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white text-[#5c3a21] border-2 border-[#8b5a2b] rounded-md shadow-[2px_2px_0px_0px_rgba(139,90,43,0.3)] hover:bg-[#fdf6e3] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 text-sm font-pixel"
                  >
                    {isAiActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Quote className="w-4 h-4 text-[#b05c00]" />}
                    Extrair Citações
                  </button>
                </div>

                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  placeholder="Cole o texto do seu documento aqui..."
                  className="flex-1 w-full bg-white border-2 border-[#8b5a2b] rounded-lg p-4 text-[#5c3a21] focus:outline-none focus:border-[#c84b31] resize-none font-medium"
                />
              </div>
            </div>
          ) : activeDoc ? (
            // Chat View
            <div className="flex flex-col h-full">
              <div className="p-4 border-b-4 border-[#8b5a2b] bg-[#e9dcc9] flex flex-wrap justify-between items-center shrink-0 gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-pixel text-xl text-[#5c3a21] uppercase truncate pr-4">
                    Conversando com: {activeDoc.title}
                  </h3>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex bg-[#fdf6e3] border-2 border-[#8b5a2b] rounded-lg p-1">
                    {(Object.keys(PERSONAS) as Persona[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setActivePersona(p)}
                        title={PERSONAS[p].name}
                        className={cn(
                          "p-1.5 rounded transition-all",
                          activePersona === p ? "bg-[#8b5a2b] text-white" : "text-[#8b5a2b] hover:bg-[#e9dcc9]"
                        )}
                      >
                        <span className="text-lg leading-none">{PERSONAS[p].icon}</span>
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => { setEditTitle(activeDoc.title); setEditContent(activeDoc.content); setIsEditing(true); }}
                    className="shrink-0 font-pixel text-xs px-3 py-2 bg-[#d5c4a1] text-[#5c3a21] border-2 border-[#8b5a2b] rounded-md shadow-[2px_2px_0px_0px_rgba(139,90,43,0.3)] hover:bg-[#e9dcc9] active:translate-y-[2px] active:shadow-none transition-all"
                  >
                    Ver/Editar Texto
                  </button>
                </div>
              </div>
              
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-[#fdf6e3]">
                {activeMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-[#8b5a2b] opacity-70">
                    <MessageSquare className="w-16 h-16 mb-4" />
                    <p className="font-pixel text-lg text-center">Faça perguntas sobre este documento!</p>
                    <p className="text-sm mt-2 text-center max-w-md">Ex: "Resuma os principais pontos", "O que o autor diz sobre X?", "Extraia as citações mais importantes."</p>
                  </div>
                ) : (
                  activeMessages.map((msg, idx) => (
                    <div key={idx} className={cn("flex gap-3 sm:gap-4 max-w-3xl mx-auto", msg.role === 'user' ? "flex-row-reverse" : "")}>
                      <div className={cn(
                        "w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border-2 shadow-[2px_2px_0px_0px_rgba(139,90,43,0.3)]",
                        msg.role === 'user' ? "bg-[#4a7c59] text-[#fdf6e3] border-[#2d4a35]" : "bg-[#c84b31] text-[#fdf6e3] border-[#8a3322]"
                      )}>
                        {msg.role === 'user' ? <User className="w-5 h-5 sm:w-6 sm:h-6" /> : <Bot className="w-5 h-5 sm:w-6 sm:h-6" />}
                      </div>
                      <div className={cn(
                        "px-4 py-3 sm:px-5 sm:py-4 rounded-xl max-w-[85%] sm:max-w-[80%] border-4 shadow-[4px_4px_0px_0px_rgba(139,90,43,0.3)]",
                        msg.role === 'user' 
                          ? "bg-white text-[#5c3a21] border-[#4a7c59] rounded-tr-none" 
                          : "bg-white text-[#5c3a21] border-[#8b5a2b] rounded-tl-none"
                      )}>
                        <div className="prose prose-sm max-w-none prose-headings:font-pixel prose-headings:text-[#5c3a21] prose-a:text-[#c84b31] prose-strong:text-[#8b5a2b]">
                          <Markdown>{msg.content}</Markdown>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex gap-3 sm:gap-4 max-w-3xl mx-auto">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#c84b31] text-[#fdf6e3] border-2 border-[#8a3322] shadow-[2px_2px_0px_0px_rgba(139,90,43,0.3)] flex items-center justify-center shrink-0">
                      <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="px-4 py-3 sm:px-5 sm:py-4 rounded-xl bg-white text-[#5c3a21] border-4 border-[#8b5a2b] shadow-[4px_4px_0px_0px_rgba(139,90,43,0.3)] rounded-tl-none flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-[#c84b31]" />
                      <span className="text-sm font-pixel uppercase tracking-wide text-[#8b5a2b] mt-1">
                        Analisando documento...
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-[#e9dcc9] border-t-4 border-[#8b5a2b] shrink-0">
                <form onSubmit={handleChatSubmit} className="relative max-w-3xl mx-auto">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Pergunte algo sobre o texto..."
                    className="w-full pl-4 pr-14 py-3 sm:py-4 bg-white border-4 border-[#8b5a2b] text-[#5c3a21] font-medium focus:outline-none focus:border-[#c84b31] rounded-xl shadow-[4px_4px_0px_0px_rgba(139,90,43,0.3)] transition-all placeholder:text-[#d5c4a1]"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2 sm:right-3 top-2 sm:top-3 p-2 bg-[#c84b31] text-[#fdf6e3] border-2 border-[#8a3322] rounded-lg shadow-[2px_2px_0px_0px_#8a3322] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[2px_2px_0px_0px_#8a3322] transition-all"
                  >
                    <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            // Empty State
            <div className="flex-1 flex flex-col items-center justify-center text-[#8b5a2b] p-8 text-center">
              <BookOpen className="w-20 h-20 mb-6 opacity-50" />
              <h3 className="font-pixel text-2xl text-[#5c3a21] mb-2 uppercase">Base de Conhecimento</h3>
              <p className="max-w-md font-medium">
                Selecione um documento na lista ao lado ou crie um novo para começar a conversar com seus textos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
