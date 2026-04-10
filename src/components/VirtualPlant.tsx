import React from 'react';
import { cn } from '@/src/lib/utils';

interface VirtualPlantProps {
  level: number;
}

export function VirtualPlant({ level }: VirtualPlantProps) {
  // Determine plant stage based on level
  let emoji = '🌱';
  let message = 'Semente plantada!';
  let color = 'bg-[#82b366]';

  if (level >= 20) {
    emoji = '🌳✨';
    message = 'Árvore Mística do Conhecimento!';
    color = 'bg-[#c84b31]';
  } else if (level >= 15) {
    emoji = '🌳';
    message = 'Grande Carvalho Acadêmico!';
    color = 'bg-[#4a7c59]';
  } else if (level >= 10) {
    emoji = '🪴';
    message = 'Planta em plena floração!';
    color = 'bg-[#82b366]';
  } else if (level >= 5) {
    emoji = '🌿';
    message = 'Brotinho de pesquisa!';
    color = 'bg-[#a8d08d]';
  } else if (level >= 2) {
    emoji = '🌱';
    message = 'A semente germinou!';
    color = 'bg-[#c5e0b4]';
  }

  const progress = (level % 5) * 20;

  return (
    <div className="bg-[#fdf6e3] border-2 border-[#8b5a2b] rounded-lg p-3 flex flex-col items-center justify-center shadow-[2px_2px_0px_0px_rgba(139,90,43,0.2)] relative overflow-hidden group">
      {/* Background glow for high levels */}
      {level >= 15 && (
        <div className="absolute inset-0 bg-gradient-to-t from-[#82b366]/10 to-transparent animate-pulse" />
      )}
      
      <div className={cn(
        "text-4xl mb-2 transition-all duration-500 transform group-hover:scale-110",
        level >= 5 ? "animate-bounce" : ""
      )} style={{ animationDuration: '3s' }}>
        {emoji}
      </div>
      
      <div className="w-full bg-[#e9dcc9] h-2 rounded-full overflow-hidden border border-[#8b5a2b] mb-1 relative">
        <div 
          className={cn("h-full transition-all duration-1000", color)}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
        {/* Sparkle effect on progress bar for high levels */}
        {level >= 10 && (
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_2s_infinite]" />
        )}
      </div>
      
      <div className="flex justify-between w-full px-1 mb-1">
        <span className="text-[8px] font-pixel text-[#8b5a2b]">LVL {level}</span>
        <span className="text-[8px] font-pixel text-[#8b5a2b]">{progress}%</span>
      </div>

      <p className="text-[10px] font-pixel text-[#5c3a21] text-center uppercase leading-tight">
        {message}
      </p>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
