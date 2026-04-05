export const roadmapData = {
  title: "IURIS VISIO",
  subtitle: "Roadmap Estratégico",
  description: "Motor de Análise Iconográfica Jurídica com IA",
  transition: "De: tese de doutorado → Para: plataforma SaaS + propriedade intelectual",
  assets: [
    { name: "Corpus anotado", status: "116 itens, 10 indicadores de purificação codificados (0–3), 7 países", location: "corpus/corpus-data.json + data/processed/corpus_dataset.csv" },
    { name: "Schemas formais", status: "master-record, iconocode-output, webscout-output — JSON Schema Draft 2020-12", location: "tools/schemas/" },
    { name: "Pipeline dual-agent", status: "WebScout (busca) + IconoCode (classificação) com confidence scoring", location: "Pipeline + schemas" },
    { name: "Taxonomia LPAI v2", status: "8 classes-base, 4 camadas de modificadores, 6 extensões nacionais, concordância Iconclass (~70 códigos)", location: "Skill lpai-iconographic-indexer" },
    { name: "Codebook de purificação", status: "10 indicadores ordinais com escala 0–3 documentada", location: "data/docs/codebook.md" },
    { name: "Companion App", status: "9 tabs, Cloudflare Workers", location: "deploy/iconocracia-companion/" },
    { name: "Galeria de referência", status: "~30 imagens curadas (Gallica, Hemeroteca, Senado)", location: "gallery/" },
    { name: "Notebooks estatísticos", status: "Exploratório, Kruskal-Wallis, Regressão, Análise de Correspondência", location: "notebooks/" },
    { name: "Scripts de exportação", status: "SKOS, SQLite, IIIF enrichment, feminist network extraction, Notion sync", location: "tools/scripts/" },
    { name: "Vault Obsidian", status: "63 candidatos, 3 controles negativos, 18 painéis Zwischenraum, 8 sessões", location: "vault/" },
    { name: "Manuscrito da tese", status: "Introdução, Cap. 1, Cap. 2 (metodologia), artigos em draft", location: "tese/manuscrito/" }
  ],
  phases: [
    {
      id: "0",
      title: "Fase 0 — Fundação Científica",
      timeframe: "Meses 1–3",
      goal: "Publicar o paper-benchmark que legitima o produto e cria a referência citável.",
      sections: [
        {
          title: "0.1 Expansão do Corpus para N ≥ 250",
          tasks: [
            "Usar o pipeline WebScout existente para adicionar ~50 itens franceses, ~30 alemães, ~30 americanos, ~25 belgas",
            "Executar IconoCode + codificação de purificação nos novos itens",
            "Meta de Cohen κ ≥ 0.75 na intercoder reliability",
            "Registrar o dataset no Zenodo com DOI"
          ]
        },
        {
          title: "0.2 Embeddings CLIP do Corpus",
          tasks: [
            "Script Python: carregar CLIP ViT-B/32, gerar embedding de cada imagem do corpus",
            "Gerar embeddings textuais para cada classe LPAI v2",
            "Calcular matriz de similaridade coseno imagem↔conceito",
            "Benchmark zero-shot: accuracy, precision, recall por classe LPAI",
            "Comparar CLIP vanilla vs. CultureCLIP vs. CLIP fine-tuned com LoRA"
          ]
        },
        {
          title: "0.3 Paper-Benchmark",
          tasks: [
            "Escrever paper: Legal Iconography Classification Using Vision-Language Models",
            "Submeter para Digital Scholarship in the Humanities ou similar"
          ]
        }
      ]
    },
    {
      id: "1",
      title: "Fase 1 — Ontologia + API",
      timeframe: "Meses 3–6",
      goal: "Transformar a taxonomia LPAI em recurso interoperável e lançar API beta.",
      sections: [
        {
          title: "1.1 LPAI como Linked Data",
          tasks: [
            "Converter LPAI v2 para SKOS-XL",
            "Mapear para CIDOC-CRM",
            "Cross-link com Iconclass, Getty AAT, Wikidata",
            "Publicar no GitHub Pages como ontologia navegável",
            "Registrar namespace no Linked Open Vocabularies (LOV)"
          ]
        },
        {
          title: "1.2 API REST (MVP)",
          tasks: [
            "Criar endpoints: /classify, /search, /similar/{id}, /taxonomy",
            "Setup FastAPI + ONNX Runtime",
            "Hosting no Cloudflare Workers ou Railway/Fly.io"
          ]
        },
        {
          title: "1.3 Upgrade do Companion App → Atlas Interativo",
          tasks: [
            "Migrar companion de JSON estático para API",
            "Adicionar busca multimodal (imagem, texto, Iconclass)",
            "Visualização de constelações (grafo de similaridade)",
            "Filtros: país, período, regime, purificação"
          ]
        }
      ]
    },
    {
      id: "2",
      title: "Fase 2 — Produto + Monetização",
      timeframe: "Meses 6–12",
      goal: "Gerar receita inicial e validar product-market fit.",
      sections: [
        {
          title: "2.1 Tiers de Acesso",
          tasks: [
            "Definir tier Open Scholar (Gratuito)",
            "Definir tier Researcher (€19/mês)",
            "Definir tier Institution (€990/ano)",
            "Definir tier Enterprise/Museum (Sob consulta)"
          ]
        },
        {
          title: "2.2 Primeiros Clientes-Alvo",
          tasks: [
            "Contatar Europeana (pilot para subcoleção jurídica)",
            "Contatar Yale Visual Law Project",
            "Contatar KU Leuven / Stefan Huygebaert",
            "Contatar Max Planck Institute (LHLT)",
            "Contatar IBCCRIM / FGV Direito"
          ]
        },
        {
          title: "2.3 Dataset como Produto",
          tasks: [
            "Publicar dataset de embeddings no Hugging Face Hub",
            "Submeter ao Journal of Open Humanities Data",
            "Posicionar como benchmark de referência"
          ]
        }
      ]
    },
    {
      id: "3",
      title: "Fase 3 — Escala + Sustentabilidade",
      timeframe: "Meses 12–24",
      goal: "Escalar o produto e garantir financiamento.",
      sections: [
        {
          title: "3.1 Expansão de Domínio",
          tasks: [
            "Módulo educacional: Letramento Visual Jurídico",
            "Expansão temporal: incluir séc. XXI",
            "Expansão geográfica: Índia, Japão, México"
          ]
        },
        {
          title: "3.2 Propriedade Intelectual",
          tasks: [
            "Proteger Taxonomia LPAI v2 (CC BY-NC-SA + RDA)",
            "Proteger Dataset curado (DOI Zenodo)",
            "Proteger Modelo fine-tuned (Hugging Face)",
            "Registrar Brand Iuris Visio (INPI + EUIPO)",
            "Publicar Paper-benchmark (prior art)"
          ]
        },
        {
          title: "3.3 Funding",
          tasks: [
            "Aplicar FAPESC (Programa Pesquisador)",
            "Aplicar CNPq Universal",
            "Aplicar Horizon Europe",
            "Aplicar Google Arts & Culture Open Call",
            "Aplicar NEH Digital Humanities",
            "Aplicar Startup Chile / Start-Up Brasil"
          ]
        }
      ]
    }
  ],
  risks: [
    { risk: "Corpus pequeno (N=116) para fine-tuning robusto", mitigation: "Data augmentation + few-shot learning com LoRA" },
    { risk: "Direitos autorais das imagens do corpus", mitigation: "Usar apenas domínio público + fair use acadêmico; IIIF manifests existentes" },
    { risk: "Sobrecarga vs. tese (prazo do doutorado)", mitigation: "Fase 0 é a tese; Fases 1–2 são pós-defesa ou paralelas com bolsista" },
    { risk: "CLIP não 'entende' simbolismo profundo", mitigation: "O diferencial é justamente humano-no-loop: CLIP classifica, LPAI interpreta" },
    { risk: "Concorrência de big tech", mitigation: "Nicho ultra-especializado que big tech nunca vai servir (TAM pequeno demais)" }
  ],
  timeline: [
    { period: "2026 Abr–Jun", phase: "Fase 0: Expansão corpus + embeddings + paper draft", progress: 60 },
    { period: "2026 Jul–Set", phase: "Fase 0→1: Paper submetido + LPAI linked data + API MVP", progress: 20 },
    { period: "2026 Out–Dez", phase: "Fase 1: API beta + Atlas interativo + primeiros pilotos", progress: 0 },
    { period: "2027 Jan–Jun", phase: "Fase 2: Monetização + dataset Hugging Face + workshops", progress: 0 },
    { period: "2027 Jul–Dez", phase: "Fase 3: Módulo educacional + expansão + funding", progress: 0 }
  ],
  nextActions: [
    "Criar branch feature/clip-embeddings no monorepo",
    "Script Python: gerar embeddings CLIP para as 116 imagens atuais",
    "Benchmark zero-shot: quão bem CLIP vanilla classifica as classes LPAI?",
    "Isso responde a pergunta fundamental: vale a pena fine-tunar, ou o zero-shot já é surpreendentemente bom?"
  ]
};
