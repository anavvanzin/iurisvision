/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sidebar, TabType } from '@/src/components/Sidebar';
import { Dashboard } from '@/src/components/Dashboard';
import { AIAssistant } from '@/src/components/AIAssistant';
import { ThesisDashboard } from '@/src/components/ThesisDashboard';
import { KnowledgeBase } from '@/src/components/KnowledgeBase';
import { Menu, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from './lib/AuthContext';
import { ConnectionMap } from './components/ConnectionMap';
import { CorpusExplorer } from './components/CorpusExplorer';
import { AtlasMnemosyne } from './components/AtlasMnemosyne';
import { DefenseSimulator } from './components/DefenseSimulator';

export default function App() {
  const { user, loading, signIn } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('thesis');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#e9dcc9]">
        <Loader2 className="w-12 h-12 animate-spin text-[#8b5a2b]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div 
        className="flex h-screen w-full items-center justify-center font-sans bg-[#e9dcc9]"
        style={{ backgroundImage: 'radial-gradient(#d5c4a1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      >
        <div className="bg-[#fdf6e3] border-4 border-[#8b5a2b] rounded-xl p-8 shadow-[8px_8px_0px_0px_rgba(139,90,43,0.3)] max-w-md w-full text-center">
          <h1 className="text-4xl font-pixel text-[#5c3a21] uppercase tracking-wide mb-4">IURIS VISIO</h1>
          <p className="text-[#8b5a2b] font-medium mb-8">Faça login para acessar sua tese, base de conhecimento e progresso.</p>
          <button 
            onClick={signIn}
            className="w-full flex items-center justify-center gap-3 bg-[#4a7c59] text-[#fdf6e3] border-4 border-[#2d4a35] rounded-xl px-6 py-4 font-pixel uppercase text-lg shadow-[4px_4px_0px_0px_#2d4a35] hover:bg-[#5b966d] active:translate-y-[4px] active:shadow-none transition-all"
          >
            <LogIn className="w-6 h-6" />
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex h-screen w-full overflow-hidden font-sans bg-[#e9dcc9]"
      style={{ backgroundImage: 'radial-gradient(#d5c4a1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
    >
      {!isFocusMode && (
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }} 
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
        />
      )}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {!isFocusMode && (
          <div className="md:hidden flex items-center p-4 border-b-4 border-[#8b5a2b] bg-[#e9dcc9] z-10 shrink-0">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 bg-[#fdf6e3] border-2 border-[#8b5a2b] rounded-lg shadow-[2px_2px_0px_0px_rgba(139,90,43,0.3)] text-[#5c3a21] active:translate-y-[2px] active:shadow-none transition-all"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="ml-4 text-xl font-pixel text-[#5c3a21] uppercase tracking-wide">IURIS VISIO</h1>
          </div>
        )}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'ai' ? (
            <AIAssistant />
          ) : activeTab === 'knowledge' ? (
            <KnowledgeBase />
          ) : activeTab === 'corpus' ? (
            <CorpusExplorer />
          ) : activeTab === 'map' ? (
            <ConnectionMap />
          ) : activeTab === 'atlas' ? (
            <AtlasMnemosyne />
          ) : activeTab === 'defense' ? (
            <DefenseSimulator />
          ) : activeTab === 'thesis' ? (
            <ThesisDashboard isFocusMode={isFocusMode} setIsFocusMode={setIsFocusMode} />
          ) : (
            <Dashboard activeTab={activeTab} />
          )}
        </div>
      </main>
    </div>
  );
}

