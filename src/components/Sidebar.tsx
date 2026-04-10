import React, { useEffect, useState } from 'react';
import { cn } from '@/src/lib/utils';
import { LayoutDashboard, ListTodo, AlertTriangle, CalendarDays, Bot, FileText, Target, X, BookOpen, Network, LogOut, Trophy, Globe, Layers, ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VirtualPlant } from './VirtualPlant';

export type TabType = 'overview' | 'phases' | 'risks' | 'timeline' | 'ai' | 'thesis' | 'knowledge' | 'map' | 'corpus' | 'atlas' | 'defense';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen }: SidebarProps) {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) setProfile(doc.data());
    });
    return unsub;
  }, [user]);

  const navItems = [
    { id: 'overview', label: 'Estado Atual', icon: LayoutDashboard },
    { id: 'phases', label: 'Fases do Projeto', icon: ListTodo },
    { id: 'timeline', label: 'Cronograma', icon: CalendarDays },
    { id: 'risks', label: 'Riscos & Mitigação', icon: AlertTriangle },
    { id: 'thesis', label: 'Tese Tracker', icon: Target },
    { id: 'knowledge', label: 'Base de Conhecimento', icon: BookOpen },
    { id: 'atlas', label: 'Atlas Mnemosyne', icon: Layers },
    { id: 'defense', label: 'Simulador de Banca', icon: ShieldCheck },
    { id: 'corpus', label: 'Explorador de Corpus', icon: Globe },
    { id: 'map', label: 'Mapa de Conexões', icon: Network },
    { id: 'ai', label: 'Assistente IA', icon: Bot },
  ] as const;

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}
      <div className={cn(
        "fixed inset-y-0 left-0 w-64 bg-[#d5c4a1] text-[#5c3a21] flex flex-col h-screen border-r-4 border-[#8b5a2b] shadow-[4px_0px_0px_0px_rgba(139,90,43,0.1)] z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 sm:p-6 border-b-4 border-[#8b5a2b] bg-[#e9dcc9] flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl font-pixel text-[#5c3a21] tracking-wide drop-shadow-sm">IURIS VISIO</h1>
            {profile && (
              <div className="mt-2 flex items-center gap-2 bg-[#fdf6e3] p-2 rounded border-2 border-[#8b5a2b]">
                <div className="w-8 h-8 bg-[#c84b31] rounded-full flex items-center justify-center text-white border-2 border-[#8a3322]">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#5c3a21] truncate w-32">{profile.displayName}</p>
                  <p className="text-[10px] font-pixel text-[#8b5a2b]">Nível {profile.level} • {profile.xp} XP</p>
                </div>
              </div>
            )}
          </div>
          <button 
            className="md:hidden p-1 text-[#8b5a2b] hover:text-[#c84b31] transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 py-4 sm:py-6 px-3 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-bold transition-all border-2",
                  isActive 
                    ? "bg-[#8b5a2b] text-[#fdf6e3] border-[#5c3a21] shadow-[2px_2px_0px_0px_#5c3a21] translate-y-[-2px]" 
                    : "bg-[#fdf6e3] text-[#8b5a2b] border-[#d5c4a1] hover:border-[#8b5a2b] hover:text-[#5c3a21] hover:shadow-[2px_2px_0px_0px_rgba(139,90,43,0.3)]"
                )}
              >
                <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-[#fdf6e3]" : "text-[#8b5a2b]")} />
                <span className="font-pixel text-base tracking-wide mt-1 truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t-4 border-[#8b5a2b] bg-[#e9dcc9] space-y-3">
          {profile && <VirtualPlant level={profile.level || 1} />}
          <div className="bg-[#fdf6e3] border-2 border-[#8b5a2b] rounded-lg p-3 sm:p-4 shadow-[2px_2px_0px_0px_rgba(139,90,43,0.2)]">
            <div className="flex items-center space-x-2 text-[#c84b31] mb-2">
              <FileText className="w-4 h-4 shrink-0" />
              <span className="text-xs font-pixel uppercase tracking-wider mt-1">Próxima Ação</span>
            </div>
            <p className="text-xs text-[#5c3a21] leading-relaxed font-medium">
              Criar branch <code className="bg-[#e9dcc9] px-1 py-0.5 rounded border border-[#8b5a2b] text-[#c84b31] break-all">feature/clip-embeddings</code> no monorepo.
            </p>
          </div>
          <button 
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#f8cecc] text-[#b85450] border-2 border-[#b85450] rounded-lg shadow-[2px_2px_0px_0px_#b85450] hover:bg-[#f4b3b0] active:translate-y-[2px] active:shadow-none transition-all font-pixel text-xs uppercase"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>
    </>
  );
}
