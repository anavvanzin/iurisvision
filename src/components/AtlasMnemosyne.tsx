import React, { useState, useEffect, useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Image as ImageIcon, 
  Type, 
  Link as LinkIcon, 
  Wand2, 
  Trash2, 
  Maximize2, 
  Minimize2, 
  MousePointer2,
  Hand,
  Save,
  Loader2,
  X
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';

type NodeType = 'image' | 'text';

interface AtlasNode {
  id: string;
  type: NodeType;
  content: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AtlasLink {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
}

export function AtlasMnemosyne() {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<AtlasNode[]>([]);
  const [links, setLinks] = useState<AtlasLink[]>([]);
  const [isPanDisabled, setIsPanDisabled] = useState(false);
  const [isAiConnecting, setIsAiConnecting] = useState(false);
  const [isAddingNode, setIsAddingNode] = useState<NodeType | null>(null);
  const [newNodeData, setNewNodeData] = useState({ title: '', content: '' });
  
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    
    const nodesUnsub = onSnapshot(collection(db, 'users', user.uid, 'atlas_nodes'), (snapshot) => {
      setNodes(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AtlasNode)));
    });
    
    const linksUnsub = onSnapshot(collection(db, 'users', user.uid, 'atlas_links'), (snapshot) => {
      setLinks(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AtlasLink)));
    });

    return () => {
      nodesUnsub();
      linksUnsub();
    };
  }, [user]);

  const handleAddNode = async () => {
    if (!user || !isAddingNode) return;
    
    const id = Date.now().toString();
    const newNode: AtlasNode = {
      id,
      type: isAddingNode,
      title: newNodeData.title || (isAddingNode === 'image' ? 'Nova Imagem' : 'Nova Nota'),
      content: newNodeData.content,
      x: 500,
      y: 500,
      width: isAddingNode === 'image' ? 250 : 200,
      height: isAddingNode === 'image' ? 200 : 150,
    };

    try {
      await setDoc(doc(db, 'users', user.uid, 'atlas_nodes', id), newNode);
      setIsAddingNode(null);
      setNewNodeData({ title: '', content: '' });
    } catch (err) {
      console.error("Error adding node:", err);
    }
  };

  const updateNodePosition = async (id: string, x: number, y: number) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'atlas_nodes', id), { x, y }, { merge: true });
    } catch (err) {
      console.error("Error updating position:", err);
    }
  };

  const handleDeleteNode = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'atlas_nodes', id));
      // Also delete links associated with this node
      const linksToDelete = links.filter(l => l.sourceId === id || l.targetId === id);
      for (const link of linksToDelete) {
        await deleteDoc(doc(db, 'users', user.uid, 'atlas_links', link.id));
      }
    } catch (err) {
      console.error("Error deleting node:", err);
    }
  };

  const handleAiConnect = async () => {
    if (!user || nodes.length < 2) return;
    setIsAiConnecting(true);
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

      const ai = new GoogleGenAI({ apiKey });
      
      const nodesContext = nodes.map(n => `ID: ${n.id}, Título: ${n.title}, Conteúdo: ${n.content}`).join('\n');
      
      const prompt = `
Você é um assistente de pesquisa iconográfica (inspirado em Aby Warburg).
Analise os seguintes itens em um quadro de pesquisa e sugira 3 conexões temáticas ou simbólicas entre eles.

Itens:
${nodesContext}

Retorne APENAS um JSON no formato:
[
  { "sourceId": "id1", "targetId": "id2", "label": "Explicação curta da conexão" }
]
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          systemInstruction: "Você é um historiador da arte especialista em encontrar conexões simbólicas entre imagens e textos. Seja profundo e poético, mas conciso."
        }
      });

      const text = response.text || '[]';
      const cleanJson = text.replace(/```json|```/g, '').trim();
      const suggestedLinks = JSON.parse(cleanJson);

      for (const link of suggestedLinks) {
        const linkId = `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await setDoc(doc(db, 'users', user.uid, 'atlas_links', linkId), {
          id: linkId,
          ...link
        });
      }
    } catch (err) {
      console.error("Error in AI Connect:", err);
    } finally {
      setIsAiConnecting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#e9dcc9] relative overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-[#fdf6e3] border-4 border-[#8b5a2b] p-2 rounded-xl shadow-[4px_4px_0px_0px_rgba(139,90,43,0.3)]">
        <button 
          onClick={() => setIsPanDisabled(!isPanDisabled)}
          className={cn(
            "p-2 rounded-lg transition-all border-2",
            !isPanDisabled ? "bg-[#8b5a2b] text-white border-[#5c3a21]" : "bg-white text-[#8b5a2b] border-[#d5c4a1]"
          )}
          title={!isPanDisabled ? "Modo Navegação (Pan)" : "Modo Edição (Seleção)"}
        >
          {!isPanDisabled ? <Hand className="w-5 h-5" /> : <MousePointer2 className="w-5 h-5" />}
        </button>
        
        <div className="w-px h-8 bg-[#d5c4a1] mx-1" />
        
        <button 
          onClick={() => setIsAddingNode('text')}
          className="p-2 bg-white text-[#8b5a2b] border-2 border-[#d5c4a1] rounded-lg hover:border-[#8b5a2b] transition-all"
          title="Adicionar Nota"
        >
          <Type className="w-5 h-5" />
        </button>
        
        <button 
          onClick={() => setIsAddingNode('image')}
          className="p-2 bg-white text-[#8b5a2b] border-2 border-[#d5c4a1] rounded-lg hover:border-[#8b5a2b] transition-all"
          title="Adicionar Imagem"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
        
        <div className="w-px h-8 bg-[#d5c4a1] mx-1" />
        
        <button 
          onClick={handleAiConnect}
          disabled={isAiConnecting || nodes.length < 2}
          className="flex items-center gap-2 px-4 py-2 bg-[#c84b31] text-white border-2 border-[#8a3322] rounded-lg shadow-[2px_2px_0px_0px_#8a3322] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50 transition-all font-pixel text-sm uppercase"
        >
          {isAiConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          Sugerir Conexões
        </button>
      </div>

      {/* Canvas */}
      <TransformWrapper
        initialScale={1}
        minScale={0.2}
        maxScale={3}
        disabled={isPanDisabled}
        limitToBounds={false}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-2">
              <button onClick={() => zoomIn()} className="p-2 bg-white border-2 border-[#8b5a2b] rounded-lg shadow-md hover:bg-[#fdf6e3]"><Maximize2 className="w-5 h-5 text-[#8b5a2b]" /></button>
              <button onClick={() => zoomOut()} className="p-2 bg-white border-2 border-[#8b5a2b] rounded-lg shadow-md hover:bg-[#fdf6e3]"><Minimize2 className="w-5 h-5 text-[#8b5a2b]" /></button>
              <button onClick={() => resetTransform()} className="p-2 bg-white border-2 border-[#8b5a2b] rounded-lg shadow-md hover:bg-[#fdf6e3] font-pixel text-xs text-[#8b5a2b]">1:1</button>
            </div>

            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
              <div 
                ref={canvasRef}
                className="relative bg-[#e9dcc9]"
                style={{ 
                  width: '5000px', 
                  height: '5000px',
                  backgroundImage: 'radial-gradient(#d5c4a1 2px, transparent 2px)',
                  backgroundSize: '40px 40px'
                }}
              >
                {/* Links (Lines) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {links.map(link => {
                    const source = nodes.find(n => n.id === link.sourceId);
                    const target = nodes.find(n => n.id === link.targetId);
                    if (!source || !target) return null;
                    
                    return (
                      <g key={link.id}>
                        <line 
                          x1={source.x + source.width / 2} 
                          y1={source.y + source.height / 2} 
                          x2={target.x + target.width / 2} 
                          y2={target.y + target.height / 2} 
                          stroke="#c84b31" 
                          strokeWidth="2" 
                          strokeDasharray="5,5"
                          className="animate-[dash_20s_linear_infinite]"
                        />
                        <foreignObject 
                          x={(source.x + source.width / 2 + target.x + target.width / 2) / 2 - 60} 
                          y={(source.y + source.height / 2 + target.y + target.height / 2) / 2 - 15} 
                          width="120" 
                          height="60"
                          className="pointer-events-none"
                        >
                          <div className="flex items-center justify-center h-full">
                            <div className="bg-[#fdf6e3] border-2 border-[#c84b31] rounded-md px-2 py-1 text-[9px] font-pixel text-[#c84b31] text-center shadow-[2px_2px_0px_0px_rgba(200,75,49,0.2)] leading-tight max-w-full">
                              {link.label}
                            </div>
                          </div>
                        </foreignObject>
                      </g>
                    );
                  })}
                </svg>

                {/* Nodes */}
                {nodes.map(node => (
                  <motion.div
                    key={node.id}
                    drag={isPanDisabled}
                    dragMomentum={false}
                    onDragEnd={(_, info) => {
                      updateNodePosition(node.id, node.x + info.offset.x, node.y + info.offset.y);
                    }}
                    initial={{ x: node.x, y: node.y }}
                    className={cn(
                      "absolute bg-[#fdf6e3] border-4 border-[#8b5a2b] rounded-xl shadow-[4px_4px_0px_0px_rgba(139,90,43,0.3)] overflow-hidden flex flex-col group",
                      isPanDisabled ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                    )}
                    style={{ width: node.width, height: node.height }}
                  >
                    <div className="bg-[#e9dcc9] border-b-2 border-[#8b5a2b] p-2 flex justify-between items-center shrink-0">
                      <span className="font-pixel text-[10px] text-[#5c3a21] truncate uppercase">{node.title}</span>
                      <button 
                        onClick={() => handleDeleteNode(node.id)}
                        className="text-[#c84b31] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex-1 p-3 overflow-hidden">
                      {node.type === 'image' ? (
                        <img 
                          src={node.content} 
                          alt={node.title} 
                          className="w-full h-full object-cover rounded border border-[#d5c4a1]"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="text-xs text-[#5c3a21] font-medium leading-relaxed line-clamp-6">
                          {node.content}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      {/* Add Node Modal */}
      <AnimatePresence>
        {isAddingNode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#fdf6e3] border-4 border-[#8b5a2b] rounded-xl p-6 shadow-[8px_8px_0px_0px_rgba(139,90,43,0.3)] max-w-md w-full"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-pixel text-xl text-[#5c3a21] uppercase">
                  Adicionar {isAddingNode === 'image' ? 'Imagem' : 'Nota'}
                </h3>
                <button onClick={() => setIsAddingNode(null)} className="text-[#8b5a2b] hover:text-[#c84b31]"><X className="w-6 h-6" /></button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block font-pixel text-xs text-[#8b5a2b] uppercase mb-1">Título</label>
                  <input 
                    type="text" 
                    value={newNodeData.title}
                    onChange={e => setNewNodeData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-white border-2 border-[#8b5a2b] rounded p-2 text-[#5c3a21] focus:outline-none focus:border-[#c84b31]"
                    placeholder="Ex: A Justiça de Trajano"
                  />
                </div>
                <div>
                  <label className="block font-pixel text-xs text-[#8b5a2b] uppercase mb-1">
                    {isAddingNode === 'image' ? 'URL da Imagem' : 'Conteúdo'}
                  </label>
                  {isAddingNode === 'image' ? (
                    <input 
                      type="text" 
                      value={newNodeData.content}
                      onChange={e => setNewNodeData(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full bg-white border-2 border-[#8b5a2b] rounded p-2 text-[#5c3a21] focus:outline-none focus:border-[#c84b31]"
                      placeholder="https://..."
                    />
                  ) : (
                    <textarea 
                      value={newNodeData.content}
                      onChange={e => setNewNodeData(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full bg-white border-2 border-[#8b5a2b] rounded p-2 text-[#5c3a21] focus:outline-none focus:border-[#c84b31] h-32 resize-none"
                      placeholder="Escreva sua nota aqui..."
                    />
                  )}
                </div>
                <button 
                  onClick={handleAddNode}
                  className="w-full bg-[#4a7c59] text-white border-4 border-[#2d4a35] rounded-xl py-3 font-pixel uppercase shadow-[4px_4px_0px_0px_#2d4a35] hover:bg-[#5b966d] active:translate-y-[4px] active:shadow-none transition-all mt-4"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -1000;
          }
        }
      `}</style>
    </div>
  );
}
