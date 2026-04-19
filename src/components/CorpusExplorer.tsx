import React, { useState } from 'react';
import { BookMarked, Save, Loader2, Maximize2, Minimize2, ExternalLink, Quote, Search } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';

interface GoogleSearchTool {
  googleSearch: Record<string, unknown>;
}

export function CorpusExplorer() {
  const { user } = useAuth();
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Citation Generator State
  const [citationInput, setCitationInput] = useState('');
  const [isGeneratingCitation, setIsGeneratingCitation] = useState(false);
  const [generatedCitation, setGeneratedCitation] = useState('');

  const CORPUS_URL = "https://anavvanzin.github.io/iconocracy-corpus/";

  const handleGenerateCitation = async () => {
    if (!citationInput.trim()) return;
    setIsGeneratingCitation(true);
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
Encontre os metadados e gere uma citação acadêmica completa (formato ABNT e Chicago) para a seguinte imagem ou fonte iconográfica:
"${citationInput}"

Se for um link da Gallica, British Museum ou similar, use as informações da URL.
Se for uma descrição, procure a obra mais provável.

Retorne no seguinte formato:
**ABNT:** [Citação aqui]
**Chicago:** [Citação aqui]
**Metadados:** [Autor, Título, Data, Instituição, Link]
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', // Using flash for fast search
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }] as GoogleSearchTool[],
          systemInstruction: "Você é um bibliotecário acadêmico especialista em iconografia jurídica. Sua tarefa é gerar citações precisas e encontrar metadados de obras de arte e gravuras históricas."
        }
      });

      setGeneratedCitation(response.text || 'Não foi possível gerar a citação.');
    } catch (error) {
      console.error("Error generating citation:", error);
      alert("Erro ao gerar citação. Verifique sua conexão.");
    } finally {
      setIsGeneratingCitation(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim() || !user) return;
    
    setIsSaving(true);
    try {
      const docId = Date.now().toString();
      await setDoc(doc(db, 'users', user.uid, 'documents', docId), {
        userId: user.uid,
        title: `[Corpus] ${noteTitle}`,
        content: noteContent,
        createdAt: serverTimestamp()
      });
      
      setToastMessage('Nota salva na Base de Conhecimento! 📚');
      setNoteTitle('');
      setNoteContent('');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error) {
      console.error("Erro ao salvar nota:", error);
      setToastMessage('Erro ao salvar nota.');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-hidden p-4 sm:p-8 flex flex-col h-full relative">
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#4a7c59] text-white px-6 py-3 rounded-lg shadow-lg font-pixel z-50 animate-in fade-in slide-in-from-top-4">
          {toastMessage}
        </div>
      )}

      <header className="mb-6 shrink-0 flex justify-between items-end">
        <div>
          <h2 className="text-3xl sm:text-4xl font-pixel text-[#5c3a21] drop-shadow-sm flex items-center gap-3">
            <BookMarked className="w-8 h-8 text-[#c84b31]" />
            Explorador de Corpus
          </h2>
          <p className="text-[#8b5a2b] font-medium mt-1">
            Navegue pelo seu repositório externo e extraia apenas o essencial.
          </p>
        </div>
        <a 
          href={CORPUS_URL} 
          target="_blank" 
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-2 text-[#8b5a2b] hover:text-[#c84b31] font-pixel text-sm transition-colors"
        >
          Abrir em nova aba <ExternalLink className="w-4 h-4" />
        </a>
      </header>

      <div className={cn("flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden transition-all", isExpanded ? "lg:flex-col" : "")}>
        
        {/* Iframe Container */}
        <div className={cn("flex flex-col bg-[#fdf6e3] border-4 border-[#8b5a2b] rounded-xl shadow-[4px_4px_0px_0px_rgba(139,90,43,0.3)] overflow-hidden transition-all", isExpanded ? "flex-1" : "flex-1 lg:w-2/3")}>
          <div className="bg-[#e9dcc9] border-b-4 border-[#8b5a2b] p-2 flex justify-between items-center">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-[#b85450]"></div>
              <div className="w-3 h-3 rounded-full bg-[#d79b00]"></div>
              <div className="w-3 h-3 rounded-full bg-[#82b366]"></div>
            </div>
            <div className="font-pixel text-xs text-[#8b5a2b] truncate px-4">
              {CORPUS_URL}
            </div>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[#8b5a2b] hover:text-[#5c3a21] transition-colors"
              title={isExpanded ? "Restaurar painel" : "Expandir visualização"}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
          <iframe 
            src={CORPUS_URL} 
            className="w-full h-full bg-white"
            title="Iconocracy Corpus"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>

        {/* Scratchpad / Notes Panel */}
        <div className={cn("flex flex-col gap-6 transition-all", isExpanded ? "h-auto shrink-0" : "lg:w-1/3")}>
          
          {/* Scratchpad */}
          <div className="flex flex-col bg-[#fff9e6] border-4 border-[#d79b00] rounded-xl shadow-[4px_4px_0px_0px_rgba(215,155,0,0.3)] overflow-hidden h-64 lg:h-1/2">
            <div className="bg-[#ffe6cc] border-b-4 border-[#d79b00] p-3">
              <h3 className="font-pixel text-[#b05c00] flex items-center gap-2">
                <BookMarked className="w-4 h-4" />
                Bloco de Extração
              </h3>
            </div>
            <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
              <input 
                type="text" 
                placeholder="Título da nota..."
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="w-full bg-white border-2 border-[#d79b00] rounded p-2 font-pixel text-sm text-[#5c3a21] focus:outline-none focus:ring-2 focus:ring-[#d79b00]"
              />
              <textarea 
                placeholder="Cole trechos do corpus ou escreva suas reflexões..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="flex-1 w-full bg-white border-2 border-[#d79b00] rounded p-3 text-[#5c3a21] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#d79b00] custom-scrollbar"
              />
              <button 
                onClick={handleSaveNote}
                disabled={!noteTitle.trim() || !noteContent.trim() || isSaving}
                className="w-full bg-[#d79b00] text-white border-2 border-[#b05c00] rounded-lg p-3 font-pixel uppercase text-sm shadow-[0_4px_0_0_#b05c00] hover:bg-[#b05c00] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_0_0_#b05c00] flex items-center justify-center gap-2 shrink-0"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar na Base
              </button>
            </div>
          </div>

          {/* Citation Generator */}
          <div className="flex flex-col bg-[#fdf6e3] border-4 border-[#c84b31] rounded-xl shadow-[4px_4px_0px_0px_rgba(200,75,49,0.3)] overflow-hidden h-64 lg:h-1/2">
            <div className="bg-[#f8cecc] border-b-4 border-[#c84b31] p-3">
              <h3 className="font-pixel text-[#b85450] flex items-center gap-2">
                <Quote className="w-4 h-4" />
                Gerador de Citação
              </h3>
            </div>
            <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Cole o link da imagem ou descreva a obra..."
                  value={citationInput}
                  onChange={(e) => setCitationInput(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 bg-white border-2 border-[#c84b31] rounded-lg text-xs text-[#5c3a21] focus:outline-none focus:border-[#b85450] font-medium"
                />
                <button 
                  onClick={handleGenerateCitation}
                  disabled={!citationInput.trim() || isGeneratingCitation}
                  className="absolute right-1 top-1 p-1.5 bg-[#c84b31] text-white rounded-md hover:bg-[#b85450] disabled:opacity-50 transition-colors"
                >
                  {isGeneratingCitation ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                </button>
              </div>

              {generatedCitation ? (
                <div className="bg-white border-2 border-[#c84b31] rounded-lg p-3 relative group">
                  <div className="text-[10px] text-[#5c3a21] whitespace-pre-wrap font-mono leading-tight">
                    {generatedCitation}
                  </div>
                  <button 
                    onClick={() => {
                      setNoteTitle(`Citação: ${citationInput.slice(0, 20)}...`);
                      setNoteContent(generatedCitation);
                    }}
                    className="absolute top-1 right-1 p-1 bg-[#fdf6e3] border border-[#c84b31] rounded text-[#c84b31] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#f8cecc]"
                    title="Copiar para Bloco de Notas"
                  >
                    <Save className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[#b85450] opacity-50 text-center">
                  <Quote className="w-8 h-8 mb-2" />
                  <p className="text-[10px] font-pixel uppercase">Insira uma obra para gerar a citação ABNT/Chicago</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
