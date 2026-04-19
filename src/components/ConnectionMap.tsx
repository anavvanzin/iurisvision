import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, DocumentSnapshot } from 'firebase/firestore';
import { Network, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface FirestoreDoc {
  id: string;
  created_at: string;
  updated_at: string;
  title?: string;
  content?: string;
  [key: string]: unknown;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  content: string;
  group: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  value: number;
}

export function ConnectionMap() {
  const { user } = useAuth();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number, y: number, title: string, content: string } | null>(null);

  useEffect(() => {
    if (!user) return;

    const generateMap = async () => {
      try {
        setLoading(true);
        // Fetch documents
        const q = query(collection(db, 'users', user.uid, 'documents'));
        const querySnapshot = await getDocs(q);
        const docs: FirestoreDoc[] = querySnapshot.docs.map((d: DocumentSnapshot) => {
          const data = d.data() as FirestoreDoc | undefined;
          return { id: d.id, ...data } as FirestoreDoc;
        });

        if (docs.length < 2) {
          setError('Adicione pelo menos 2 documentos na Base de Conhecimento para gerar o mapa de conexões.');
          setLoading(false);
          return;
        }

        // Use Gemini to find connections
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

        const ai = new GoogleGenAI({ apiKey });
        
        const docsContext = docs.map(d => `ID: ${d.id} | Título: ${d.title} | Resumo do conteúdo: ${d.content.substring(0, 500)}...`).join('\n\n');
        
        const prompt = `
Analise os seguintes documentos e identifique conexões temáticas entre eles.
Retorne APENAS um JSON válido contendo um array de links, onde cada link tem 'source' (ID do documento 1), 'target' (ID do documento 2) e 'value' (força da conexão de 1 a 5).
Não inclua crases, markdown ou texto adicional. Apenas o JSON.

Documentos:
${docsContext}
`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-preview',
          contents: prompt,
          config: {
            systemInstruction: "Você é um analista de dados. Retorne apenas JSON válido."
          }
        });

        let linksData: any[] = [];
        try {
          const text = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || '[]';
          linksData = JSON.parse(text);
        } catch (e) {
          console.error("Failed to parse AI response as JSON", e);
          linksData = [];
        }

        const nodes: Node[] = docs.map((d, i) => ({ id: d.id, title: d.title, content: d.content, group: i % 5 }));
        const links: Link[] = linksData.filter(l => nodes.find(n => n.id === l.source) && nodes.find(n => n.id === l.target));

        drawGraph(nodes, links);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Ocorreu um erro ao gerar o mapa.');
        setLoading(false);
      }
    };

    generateMap();
  }, [user]);

  const drawGraph = (nodes: Node[], links: Link[]) => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg.attr("viewBox", [0, 0, width, height]);

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
      .attr("stroke", "#8b5a2b")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", d => Math.sqrt(d.value));

    const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join('circle')
      .attr('r', 15)
      .attr('fill', d => d3.schemeCategory10[d.group])
      .on('mouseover', (event, d) => {
        setTooltip({
          x: event.clientX,
          y: event.clientY,
          title: d.title,
          content: d.content.substring(0, 150) + (d.content.length > 150 ? '...' : '')
        });
      })
      .on('mousemove', (event) => {
        setTooltip(prev => prev ? { ...prev, x: event.clientX, y: event.clientY } : null);
      })
      .on('mouseout', () => {
        setTooltip(null);
      })
      .call(drag(simulation) as unknown as (selection: d3.Selection<SVGCircleElement, Node, SVGGElement, unknown>) => void);

    node.append("title")
      .text(d => d.title);

    const labels = svg.append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text(d => d.title)
      .attr("font-size", "12px")
      .attr("font-family", "monospace")
      .attr("fill", "#5c3a21")
      .attr("dx", 20)
      .attr("dy", 5);

simulation.on(
      'tick',
      () => {
        const getNodeCoord = (node: string | Node) => {
          const n = typeof node === 'string' ? nodes.find(x => x.id === node) : node;
          return n as Node;
        };
        link
          .attr('x1', d => getNodeCoord(d.source).x!)
          .attr('y1', d => getNodeCoord(d.source).y!)
          .attr('x2', d => getNodeCoord(d.target).x!)
          .attr('y2', d => getNodeCoord(d.target).y!);

      node
        .attr("cx", d => d.x!)
        .attr("cy", d => d.y!);
        
      labels
        .attr("x", d => d.x!)
        .attr("y", d => d.y!);
    });
  };

  const drag = (simulation: d3.Simulation<Node, undefined>) => {
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    
    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  };

  return (
    <div className="flex-1 overflow-hidden p-4 sm:p-8 flex flex-col h-full">
      <header className="mb-6 shrink-0">
        <h2 className="text-3xl sm:text-4xl font-pixel text-[#5c3a21] drop-shadow-sm flex items-center gap-3">
          <Network className="w-8 h-8 text-[#c84b31]" />
          Mapa de Conexões
        </h2>
        <p className="text-[#8b5a2b] font-medium mt-1">Visualize as relações entre seus documentos da Base de Conhecimento.</p>
      </header>

      <div className="flex-1 bg-[#fdf6e3] border-4 border-[#8b5a2b] rounded-xl shadow-[4px_4px_0px_0px_rgba(139,90,43,0.3)] overflow-hidden relative" ref={containerRef}>
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#fdf6e3]/80 z-10">
            <Loader2 className="w-12 h-12 animate-spin text-[#c84b31] mb-4" />
            <p className="font-pixel text-[#8b5a2b] uppercase">A IA está analisando suas conexões...</p>
          </div>
        )}
        
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
            <p className="font-pixel text-xl text-[#b85450]">{error}</p>
          </div>
        )}

        <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      </div>

      {tooltip && (
        <div 
          className="fixed z-50 bg-[#fff9e6] border-2 border-[#8b5a2b] p-3 rounded shadow-lg pointer-events-none max-w-xs"
          style={{ left: tooltip.x + 15, top: tooltip.y + 15 }}
        >
          <h4 className="font-pixel text-[#5c3a21] text-sm mb-1">{tooltip.title}</h4>
          <p className="text-xs text-[#8b5a2b] line-clamp-3">{tooltip.content}</p>
        </div>
      )}
    </div>
  );
}
