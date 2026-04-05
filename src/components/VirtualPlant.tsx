import React from 'react';
import { cn } from '@/src/lib/utils';

interface VirtualPlantProps {
  level: number;
}

export function VirtualPlant({ level }: VirtualPlantProps) {
  // Determine plant stage based on level
  let stage = 0;
  let emoji = '🌱';
  let message = 'Semente plantada!';

  if (level >= 10) {
    stage = 3;
    emoji = '🌳';
    message = 'Árvore do Conhecimento!';
  } else if (level >= 5) {
    stage = 2;
    emoji = '🪴';
    message = 'Planta crescendo forte!';
  } else if (level >= 3) {
    stage = 1;
    emoji = '🌿';
    message = 'Brotinho de pesquisa!';
  }

  return (
    <div className="bg-[#fdf6e3] border-2 border-[#8b5a2b] rounded-lg p-3 flex flex-col items-center justify-center shadow-[2px_2px_0px_0px_rgba(139,90,43,0.2)]">
      <div className="text-4xl mb-2 animate-bounce" style={{ animationDuration: '3s' }}>
        {emoji}
      </div>
      <div className="w-full bg-[#e9dcc9] h-2 rounded-full overflow-hidden border border-[#8b5a2b] mb-1">
        <div 
          className="bg-[#82b366] h-full transition-all duration-1000"
          style={{ width: `${Math.min(100, (level % 5) * 20)}%` }}
        />
      </div>
      <p className="text-[10px] font-pixel text-[#8b5a2b] text-center uppercase">
        {message}
      </p>
    </div>
  );
}
