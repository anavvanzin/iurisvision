import React, { useState } from 'react';
import { roadmapData } from '@/src/data/roadmap';
import { CheckCircle2, Circle, ArrowRight, ShieldAlert, Clock, ChevronDown, ChevronRight, Star, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../lib/AuthContext';
import { awardXP } from '../lib/gamification';

type TaskStatus = 'A Fazer' | 'Em Andamento' | 'Concluído';

export function Dashboard({ activeTab }: { activeTab: string }) {
  const { user } = useAuth();
  const [expandedTimeline, setExpandedTimeline] = useState<Record<number, boolean>>({});
  const [taskStatuses, setTaskStatuses] = useState<Record<string, TaskStatus>>(() => {
    const initial: Record<string, TaskStatus> = {};
    roadmapData.phases.forEach((phase, i) => {
      phase.sections.forEach((section, j) => {
        section.tasks.forEach((task, k) => {
          const key = `${i}-${j}-${k}`;
          // Initial distribution
          initial[key] = (i === 0 && j === 0 && k === 0) ? 'Concluído' : (i === 0) ? 'Em Andamento' : 'A Fazer';
        });
      });
    });
    return initial;
  });

  const cycleStatus = (key: string) => {
    setTaskStatuses(prev => {
      const current = prev[key];
      const next: TaskStatus = current === 'A Fazer' ? 'Em Andamento' : current === 'Em Andamento' ? 'Concluído' : 'A Fazer';
      
      if (next === 'Concluído' && user) {
        awardXP(user.uid, 20); // 20 XP for completing a task
      }
      
      return { ...prev, [key]: next };
    });
  };

  const toggleTimeline = (index: number) => {
    setExpandedTimeline(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const panelClass = "bg-[#fdf6e3] border-4 border-[#8b5a2b] rounded-xl shadow-[4px_4px_0px_0px_rgba(139,90,43,0.3)] overflow-hidden";
  const headerClass = "px-6 py-4 border-b-4 border-[#8b5a2b] bg-[#e9dcc9]";
  const titleClass = "font-pixel text-xl sm:text-2xl text-[#5c3a21] uppercase tracking-wide";

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <h2 className="text-4xl font-pixel text-[#5c3a21] drop-shadow-sm">{roadmapData.title}</h2>
          <p className="text-lg text-[#8b5a2b] font-medium mt-2">{roadmapData.description}</p>
          <div className="mt-4 inline-flex items-center space-x-2 bg-[#fdf6e3] text-[#c84b31] border-2 border-[#8b5a2b] px-4 py-2 rounded-lg text-sm font-pixel shadow-[2px_2px_0px_0px_rgba(139,90,43,0.3)]">
            <span className="mt-1">Tese de Doutorado</span>
            <ArrowRight className="w-4 h-4" />
            <span className="mt-1">Plataforma SaaS + PI</span>
          </div>
        </header>

        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className={panelClass}>
              <div className={headerClass}>
                <h3 className={titleClass}>Estado Atual dos Ativos (Inventário Real)</h3>
              </div>
              <div className="divide-y-4 divide-[#8b5a2b]">
                {roadmapData.assets.map((asset, i) => (
                  <div key={i} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 hover:bg-[#f5ebd4] transition-colors">
                    <div className="font-bold text-[#5c3a21]">{asset.name}</div>
                    <div className="text-[#8b5a2b] text-sm font-medium">{asset.status}</div>
                    <div className="text-[#5c3a21] text-sm font-mono bg-[#e9dcc9] border-2 border-[#8b5a2b] px-2 py-1 rounded self-start break-all shadow-[2px_2px_0px_0px_rgba(139,90,43,0.2)]">
                      {asset.location}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'phases' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
              {(['A Fazer', 'Em Andamento', 'Concluído'] as TaskStatus[]).map((status) => (
                <div key={status} className="flex-1 min-w-[300px] bg-[#e9dcc9] border-4 border-[#8b5a2b] rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(139,90,43,0.3)] flex flex-col max-h-[70vh]">
                  <h3 className="font-pixel text-xl text-[#5c3a21] uppercase tracking-wide mb-4 border-b-2 border-[#8b5a2b] pb-2 flex items-center justify-between">
                    {status}
                    <span className="text-xs bg-[#8b5a2b] text-[#fdf6e3] px-2 py-1 rounded-full">
                      {Object.values(taskStatuses).filter(s => s === status).length}
                    </span>
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                    {roadmapData.phases.map((phase, i) => (
                      phase.sections.map((section, j) => (
                        section.tasks.map((task, k) => {
                          const key = `${i}-${j}-${k}`;
                          const taskStatus = taskStatuses[key];
                          
                          if (taskStatus !== status) return null;

                          return (
                            <div 
                              key={key} 
                              onClick={() => cycleStatus(key)}
                              className="bg-[#fdf6e3] border-2 border-[#8b5a2b] p-3 rounded-lg shadow-[2px_2px_0px_0px_rgba(139,90,43,0.2)] cursor-pointer hover:bg-[#fff9e6] transition-all hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(139,90,43,0.2)] group"
                            >
                              <div className="flex items-start gap-2">
                                {status === 'Concluído' ? (
                                  <CheckCircle2 className="w-4 h-4 text-[#4a7c59] shrink-0 mt-0.5" />
                                ) : status === 'Em Andamento' ? (
                                  <Clock className="w-4 h-4 text-[#d79b00] shrink-0 mt-0.5" />
                                ) : (
                                  <Circle className="w-4 h-4 text-[#8b5a2b] shrink-0 mt-0.5" />
                                )}
                                <div>
                                  <span className="text-[10px] font-pixel text-[#c84b31] uppercase block mb-1 opacity-70">{phase.title.split('—')[0]}</span>
                                  <p className="text-sm text-[#5c3a21] font-medium leading-tight">{task}</p>
                                  <div className="mt-2 text-[8px] font-pixel text-[#8b5a2b] opacity-0 group-hover:opacity-100 transition-opacity">
                                    Clique para mover →
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ))
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'timeline' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className={cn(panelClass, "p-8")}>
              <div className="relative border-l-4 border-[#d5c4a1] ml-3 space-y-12">
                {roadmapData.timeline.map((item, i) => {
                  const isExpanded = expandedTimeline[i];
                  const phaseMatch = item.phase.match(/Fase (\d+)/);
                  const phaseId = phaseMatch ? phaseMatch[1] : null;
                  const phase = roadmapData.phases.find(p => p.id === phaseId);

                  return (
                    <div key={i} className="relative pl-8 group">
                      {/* Marker */}
                      <div className={cn(
                        "absolute -left-[14px] top-1.5 w-6 h-6 rounded-full border-4 flex items-center justify-center transition-all z-10",
                        item.progress === 100 ? "bg-[#4a7c59] border-[#2d4a35]" : "bg-[#fdf6e3] border-[#c84b31]"
                      )}>
                        {item.progress === 100 ? (
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        ) : item.progress > 0 ? (
                          <Star className="w-3 h-3 text-[#c84b31] animate-pulse" />
                        ) : (
                          <Flag className="w-3 h-3 text-[#8b5a2b]" />
                        )}
                      </div>

                      <div 
                        onClick={() => toggleTimeline(i)}
                        className="cursor-pointer hover:bg-[#f5ebd4] p-4 rounded-xl transition-colors -ml-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <h4 className="font-pixel text-xl text-[#5c3a21] uppercase tracking-wide">{item.period}</h4>
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-[#8b5a2b]" /> : <ChevronRight className="w-4 h-4 text-[#8b5a2b]" />}
                          </div>
                          <span className={cn(
                            "text-xs font-pixel px-2.5 py-1 rounded-lg border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]",
                            item.progress === 100 ? "bg-[#4a7c59] text-[#fdf6e3] border-[#2d4a35]" : "bg-[#e9dcc9] text-[#8b5a2b] border-[#8b5a2b]"
                          )}>
                            {item.progress}% Concluído
                          </span>
                        </div>
                        <p className="text-[#8b5a2b] font-medium text-lg">{item.phase}</p>
                        
                        <div className="mt-4 h-3 w-full bg-[#e9dcc9] rounded-full overflow-hidden border-2 border-[#8b5a2b]">
                          <div 
                            className="h-full bg-[#c84b31] transition-all duration-1000" 
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>

                        <AnimatePresence>
                          {isExpanded && phase && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-6 pt-6 border-t-2 border-[#d5c4a1] space-y-4">
                                <p className="text-xs font-pixel text-[#c84b31] uppercase mb-2">Objetivo da Fase:</p>
                                <p className="text-sm text-[#5c3a21] italic mb-4 bg-[#e9dcc9]/50 p-3 rounded-lg border border-[#d5c4a1]">
                                  "{phase.goal}"
                                </p>
                                
                                <div className="space-y-4">
                                  {phase.sections.map((section, sIdx) => (
                                    <div key={sIdx} className="space-y-2">
                                      <h5 className="text-sm font-bold text-[#5c3a21] flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#c84b31]" />
                                        {section.title}
                                      </h5>
                                      <ul className="pl-6 space-y-1">
                                        {section.tasks.map((task, tIdx) => (
                                          <li key={tIdx} className="text-xs text-[#8b5a2b] flex items-start gap-2">
                                            <span className="mt-1 opacity-50">•</span>
                                            {task}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'risks' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {roadmapData.risks.map((item, i) => (
              <div key={i} className={cn(panelClass, "flex flex-col sm:flex-row items-start gap-4 p-6")}>
                <div className="bg-[#ffe6cc] border-2 border-[#d79b00] p-3 rounded-lg shrink-0 shadow-[2px_2px_0px_0px_#d79b00]">
                  <ShieldAlert className="w-6 h-6 text-[#b05c00]" />
                </div>
                <div>
                  <h4 className="font-pixel text-lg text-[#5c3a21] mb-1 uppercase tracking-wide">{item.risk}</h4>
                  <p className="text-[#8b5a2b] text-sm font-medium leading-relaxed">
                    <span className="font-bold text-[#c84b31]">Mitigação:</span> {item.mitigation}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
