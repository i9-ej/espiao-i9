"use client";

import React, { useEffect, useState } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Activity, Bell, Calendar, Crosshair, Eye, Flame, 
  MapPin, Search, ShieldAlert, Target, TrendingUp, ChevronRight, FileText, ChevronDown
} from 'lucide-react';
import dossieDataImport from '../dossie_final.json';

// --- MOCK DA TIMELINE ---
// A IA gera o JSON de dossiê, mas a timeline também pode ser alimentada aqui dinamicamente
const mockFeed = [
  { id: 1, action: "SITE_CHANGE", icon: <Globe className="w-5 h-5 text-primary" />, target: "Concorrente A", time: "Há 10 min", text: "Alterou a headline da Landing Page para: 'A Plataforma Definitiva em 2026'." },
  { id: 2, action: "EVENT_DETECTED", icon: <MapPin className="w-5 h-5 text-red-500" />, target: "Concorrente C", time: "Há 2 horas", text: "Stories analisados. A IA detectou evento presencial programado no Expominas." },
  { id: 3, action: "INSTA_POST", icon: <Activity className="w-5 h-5 text-purple-500" />, target: "Concorrente B", time: "Há 4 horas", text: "Novo Reel com Call to Action agressivo. Promessa de 'desconto de 40% nas próximas 24h'." },
];

const mockRadarData = [
  { subject: 'Preço Menor', Nós: 90, Eles: 60, fullMark: 100 },
  { subject: 'Entrega Rápida', Nós: 100, Eles: 80, fullMark: 100 },
  { subject: 'Marketing', Nós: 60, Eles: 95, fullMark: 100 },
  { subject: 'Diferencial Tech', Nós: 85, Eles: 50, fullMark: 100 },
  { subject: 'Branding / Confiança', Nós: 70, Eles: 90, fullMark: 100 },
];

function Globe(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
}

export default function PainelCentral() {
  const [dossieList, setDossieList] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'geral' | 'dossie' | 'termometro' | 'radar'>('geral');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    // Carregar o dossiê final gerado pelo node na carga inicial
    setDossieList(dossieDataImport || []);
    setLastUpdated(new Date().toLocaleTimeString('pt-BR'));
  }, []);

  const triggerVarredura = async () => {
    setIsRefreshing(true);
    console.log("Iniciando varredura manual pelo Painel...");
    try {
      const response = await fetch('/api/varredura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store', // Evitar cache agressivo do Next
        body: JSON.stringify({ action: "manual" })
      });
      console.log("Resposta HTTP Recebida, status:", response.status);
      const res = await response.json();
      console.log("Corpo da Resposta JSON:", res);
      if (res.success && res.data) {
        setDossieList(res.data);
        setLastUpdated(new Date().toLocaleTimeString('pt-BR'));
        alert(`Operação Concluída com Sucesso! ${res.data.length} suspeitos foram recálculados e o painel foi atualizado.`);
      } else {
        alert("Falha na varredura: " + res.error);
      }
    } catch (e: any) {
      console.error("Erro catch bloc:", e);
      alert("Erro ao acionar a API: " + e.message);
    } finally {
      setIsRefreshing(false);
      console.log("Varredura finalizada.");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      
      {/* Sidebar */}
      <aside className="w-64 bg-panel border-r border-panel-border flex flex-col z-20">
        <div className="h-16 flex items-center px-6 border-b border-panel-border">
          <Target className="w-6 h-6 text-primary mr-2 shadow-primary/20" />
          <span className="text-lg font-bold tracking-widest text-white uppercase">Vigia.IA</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button 
            onClick={() => setActiveTab('geral')}
            className={`w-full flex items-center px-4 py-3 rounded-lg border-l-2 transition-all ${activeTab === 'geral' ? 'bg-primary/10 text-primary border-primary' : 'text-zinc-400 border-transparent hover:text-white hover:bg-zinc-800/50'}`}>
            <Eye className="w-5 h-5 mr-3" />
            <span className="font-semibold">Visão Geral</span>
          </button>
          <button 
            onClick={() => setActiveTab('dossie')}
            className={`w-full flex items-center px-4 py-3 rounded-lg border-l-2 transition-all ${activeTab === 'dossie' ? 'bg-primary/10 text-primary border-primary' : 'text-zinc-400 border-transparent hover:text-white hover:bg-zinc-800/50'}`}>
            <FileText className="w-5 h-5 mr-3 transition-colors" />
            <span className="font-semibold">Dossiê Analítico</span>
          </button>
          <button 
            onClick={() => setActiveTab('termometro')}
            className={`w-full flex items-center px-4 py-3 rounded-lg border-l-2 transition-all ${activeTab === 'termometro' ? 'bg-primary/10 text-primary border-primary' : 'text-zinc-400 border-transparent hover:text-white hover:bg-zinc-800/50'}`}>
            <Flame className="w-5 h-5 mr-3 transition-colors" />
            <span className="font-medium">Termômetro Alvos</span>
          </button>
          <button 
            onClick={() => setActiveTab('radar')}
            className={`w-full flex items-center px-4 py-3 rounded-lg border-l-2 transition-all ${activeTab === 'radar' ? 'bg-primary/10 text-primary border-primary' : 'text-zinc-400 border-transparent hover:text-white hover:bg-zinc-800/50'}`}>
            <Calendar className="w-5 h-5 mr-3" />
            <span className="font-medium">Radar de Eventos</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-y-auto">
        <header className="h-16 flex items-center justify-between px-8 bg-panel/50 backdrop-blur-md border-b border-panel-border sticky top-0 z-10 w-full">
          <div className="relative w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Buscar histórico de um suspeito..." 
              className="w-full bg-zinc-900 border border-zinc-700/50 text-sm text-zinc-200 rounded-full pl-10 pr-4 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          </div>
        </header>

        <div className="p-8 space-y-8 pb-20">
          
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Status da Operação</h1>
              <p className="text-zinc-400 mt-2">
                {activeTab === 'geral' && "Dossiê de análise de concorrentes extraído via Inteligência Artificial nas últimas 24h."}
                {activeTab === 'dossie' && "Leitura detalhada e aprofundada da espionagem corporativa sobre cada alvo monitorado."}
                {activeTab === 'termometro' && "Mapeamento quantitativo do nível de agressividade e saúde das empresas concorrentes."}
                {activeTab === 'radar' && "Rastreamento focado apenas nas participações em eventos físicos ou webinars das vítimas."}
              </p>
              {lastUpdated && activeTab === 'geral' && (
                <p className="text-xs text-primary/80 mt-2 font-mono flex items-center">
                  <Activity className="w-3 h-3 mr-1" />
                  Última varredura realizada às: {lastUpdated}
                </p>
              )}
            </div>
            <button 
              onClick={triggerVarredura}
              disabled={isRefreshing}
              className={`bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-md font-semibold text-sm transition-all shadow-[0_0_20px_rgba(249,115,22,0.4)] flex items-center ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isRefreshing ? (
                <>
                  <Activity className="w-4 h-4 mr-2 animate-spin" />
                  Interrogando Alvos...
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 mr-2" />
                  Rodar Nova Varredura
                </>
              )}
            </button>
          </div>

          {activeTab === 'geral' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-panel border border-panel-border rounded-xl p-6 relative overflow-hidden group">
                  <Crosshair className="w-24 h-24 absolute top-0 right-0 p-4 opacity-10" />
                  <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Alvos Vigiados</h3>
                  <div className="text-4xl font-bold text-white">114 <span className="text-lg text-zinc-500 font-normal">empresas</span></div>
                </div>
                <div className="bg-panel border border-panel-border rounded-xl p-6 relative overflow-hidden group">
                  <TrendingUp className="w-24 h-24 absolute top-0 right-0 p-4 opacity-10 text-primary" />
                  <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Novas Estratégias</h3>
                  <div className="text-4xl font-bold text-white">{dossieList.length} <span className="text-lg text-green-500 font-medium">descobertas</span></div>
                </div>
                <div className="bg-panel border border-panel-border rounded-xl p-6 relative overflow-hidden group">
                  <Calendar className="w-24 h-24 absolute top-0 right-0 p-4 opacity-10 text-red-500" />
                  <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Eventos Encontrados</h3>
                  <div className="text-4xl font-bold text-red-500">2 <span className="text-lg text-red-400/70 font-medium">próximos</span></div>
                </div>
              </div>

              {/* Seção Dossiê IA Dinâmico */}
              <div className="bg-panel border border-panel-border rounded-xl flex flex-col mt-8">
                <div className="px-6 py-5 border-b border-panel-border flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <Target className="w-5 h-5 mr-2 text-primary" />
                    Relatórios Táticos da IA (Conclusões)
                  </h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {dossieList.length > 0 ? dossieList.map((dossie, idx) => (
                    <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                      <h3 className="text-lg font-bold text-primary mb-3 uppercase tracking-wider">{dossie.alvo}</h3>
                      <div className="space-y-4">
                        <div>
                          <span className="text-xs text-zinc-500 font-bold uppercase block mb-1">🎯 Diferenciais Focados</span>
                          <p className="text-sm text-zinc-200">{dossie.diferenciais}</p>
                        </div>
                        <div>
                          <span className="text-xs text-zinc-500 font-bold uppercase block mb-1">📅 Eventos Planejados</span>
                          <p className="text-sm text-zinc-300 italic">{dossie.eventos}</p>
                        </div>
                        <div>
                          <span className="text-xs text-zinc-500 font-bold uppercase block mb-1">⚡ Estratégia Recente</span>
                          <p className="text-sm text-zinc-300">{dossie.estrategia_nova}</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-zinc-500 col-span-2 text-center py-10">Nenhum dossiê foi gerado. Rode o robô interceptador.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                <div className="lg:col-span-2 bg-panel border border-panel-border rounded-xl flex flex-col">
                  <div className="px-6 py-5 border-b border-panel-border flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-primary" />
                      Feed Bruto de Movimentações
                    </h2>
                    <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Live Mode</span>
                  </div>
                  <div className="p-6 flex-1">
                    <div className="relative border-l border-zinc-800 ml-3 space-y-8">
                      {mockFeed.map((item, idx) => (
                        <div key={item.id} className="relative pl-8 group">
                          <div className="absolute -left-[18px] top-0 p-2 bg-zinc-950 border border-zinc-800 rounded-full text-zinc-300 shadow-md">
                            {item.icon}
                          </div>
                          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-5 hover:bg-zinc-800/40 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-zinc-200">{item.target}</h4>
                              <span className="text-xs text-zinc-500 font-mono tracking-widest">{item.time}</span>
                            </div>
                            <p className="text-sm text-zinc-400">{item.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-panel border border-panel-border rounded-xl flex flex-col">
                  <div className="px-6 py-5 border-b border-panel-border">
                    <h2 className="text-xl font-bold text-white flex items-center">
                      <Flame className="w-5 h-5 mr-2 text-primary" />
                      Radar Comparativo
                    </h2>
                  </div>
                  <div className="flex-1 p-4 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="55%" data={mockRadarData}>
                        <PolarGrid stroke="#3f3f46" strokeDasharray="3 3" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }} />
                        <Radar dataKey="Nós" stroke="#f97316" strokeWidth={2} fill="#ea580c" fillOpacity={0.4} />
                        <Radar dataKey="Eles" stroke="#ef4444" strokeWidth={2} fill="#ef4444" fillOpacity={0.15} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'dossie' && (
            <div className="bg-panel border border-panel-border rounded-xl flex flex-col mt-4">
               <div className="px-6 py-5 border-b border-panel-border flex items-center justify-between">
                 <h2 className="text-xl font-bold text-white flex items-center">
                   <FileText className="w-5 h-5 mr-2 text-primary" />
                   Inteligência Competitiva - Relatórios Estendidos
                 </h2>
                 <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Análise Vertical</span>
               </div>
               
               <div className="p-6 space-y-4">
                 {dossieList.length > 0 ? dossieList.map((dossie, idx) => (
                   <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden transition-all duration-300">
                     <button 
                       onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                       className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                       <h3 className="text-lg font-bold text-zinc-100 flex items-center">
                         <Target className="w-4 h-4 mr-2 text-primary" /> {dossie.alvo}
                       </h3>
                       <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform duration-300 ${expandedIndex === idx ? 'rotate-180' : ''}`} />
                     </button>
                     
                     <div className={`transition-all duration-500 ease-in-out ${expandedIndex === idx ? 'max-h-[2000px] opacity-100 border-t border-zinc-800 relative' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                       <div className="p-6 bg-zinc-950/40">
                         {/* Resumo Rápido */}
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pb-6 border-b border-zinc-800/50">
                           <div className="bg-zinc-900/80 p-4 rounded-md border border-zinc-800/50">
                             <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Diferenciais Focados</span>
                             <p className="text-xs text-zinc-300">{dossie.diferenciais}</p>
                           </div>
                           <div className="bg-zinc-900/80 p-4 rounded-md border border-zinc-800/50">
                             <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Estratégia Recente</span>
                             <p className="text-xs text-zinc-300">{dossie.estrategia_nova}</p>
                           </div>
                           <div className="bg-zinc-900/80 p-4 rounded-md border border-zinc-800/50">
                             <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Eventos Planejados</span>
                             <p className="text-xs text-zinc-400 italic">{dossie.eventos}</p>
                           </div>
                         </div>
                         
                         {/* Relatório Aprofundado (1 página fake/real) */}
                         <div className="flex items-start mb-4">
                           <FileText className="w-5 h-5 text-primary mt-1 mr-3 shrink-0" />
                           <div>
                             <h4 className="text-sm font-bold text-zinc-100 uppercase tracking-wide mb-2">Relatório Executivo Detalhado</h4>
                             {dossie.analise_completa ? (
                               <div className="prose prose-invert prose-sm max-w-none text-zinc-300 leading-relaxed space-y-3 font-sans" dangerouslySetInnerHTML={{ __html: dossie.analise_completa.replace(/\n\n/g, '<br/><br/>').replace(/\n/g, '<br/>') }} />
                             ) : (
                               <p className="text-sm text-zinc-500 italic">Relatório aprofundado não registrado no último scan deste alvo. Tente rodar a varredura novamente.</p>
                             )}
                           </div>
                         </div>
                         
                       </div>
                     </div>
                   </div>
                 )) : (
                   <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                     <FileText className="w-12 h-12 mb-4 opacity-20" />
                     <p>Nenhum dossiê estendido disponível na base local.</p>
                   </div>
                 )}
               </div>
            </div>
          )}

          {activeTab === 'termometro' && (
            <div className="bg-panel border border-panel-border rounded-xl flex flex-col mt-4">
               <div className="px-6 py-5 border-b border-panel-border flex items-center justify-between">
                 <h2 className="text-xl font-bold text-white flex items-center">
                   <Flame className="w-5 h-5 mr-2 text-primary" />
                   Termômetro de Agressividade
                 </h2>
                 <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Ranking de Ameaças</span>
               </div>
               <div className="p-6 space-y-4">
                 {dossieList.length > 0 ? [...dossieList].sort((a, b) => (b.nivel_agressividade || 0) - (a.nivel_agressividade || 0)).map((dossie, idx) => {
                   const nivel = dossie.nivel_agressividade || 0;
                   const corFogo = nivel >= 8 ? 'text-red-500 bg-red-500/10 border-red-500/20' : nivel >= 5 ? 'text-orange-500 bg-orange-500/10 border-orange-500/20' : 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
                   return (
                     <div key={idx} className={`border rounded-lg p-5 flex items-center justify-between transition-all hover:scale-[1.01] ${corFogo}`}>
                       <div>
                         <h3 className="text-lg font-bold text-zinc-100 flex items-center mb-1">
                           <span className="text-2xl mr-3 font-black opacity-80">#{idx + 1}</span>
                           {dossie.alvo}
                         </h3>
                         <p className="text-sm text-zinc-300 ml-9">{dossie.estrategia_nova}</p>
                       </div>
                       <div className="text-center shrink-0 ml-4">
                         <div className="text-3xl font-black mb-1 flex items-center justify-center">
                           {nivel} <span className="text-base text-current font-normal ml-1 opacity-50">/10</span>
                         </div>
                         <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Agressividade</span>
                       </div>
                     </div>
                   );
                 }) : (
                   <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                     <Flame className="w-12 h-12 mb-4 opacity-20" />
                     <p>Nenhuma ameaça medida ainda.</p>
                   </div>
                 )}
               </div>
            </div>
          )}

          {activeTab === 'radar' && (
            <div className="bg-panel border border-panel-border rounded-xl flex flex-col mt-4">
               <div className="px-6 py-5 border-b border-panel-border flex items-center justify-between">
                 <h2 className="text-xl font-bold text-white flex items-center">
                   <Calendar className="w-5 h-5 mr-2 text-primary" />
                   Radar de Eventos e Webinars
                 </h2>
                 <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Mapeamento Físico e Digital</span>
               </div>
               <div className="p-6 space-y-4">
                 {dossieList.filter(d => d.tipo_evento && d.tipo_evento !== 'Nenhum' && d.tipo_evento !== 'Falha na IA').length > 0 ? dossieList.filter(d => d.tipo_evento && d.tipo_evento !== 'Nenhum' && d.tipo_evento !== 'Falha na IA').map((dossie, idx) => (
                   <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex items-start hover:bg-zinc-800/60 transition-colors">
                     <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-md mr-4 shrink-0 shadow-lg">
                       {dossie.tipo_evento === 'Online' ? <Activity className="w-6 h-6 text-blue-500" /> : <MapPin className="w-6 h-6 text-green-500" />}
                     </div>
                     <div>
                       <div className="flex items-center mb-2">
                         <h3 className="text-lg font-bold text-zinc-100 mr-3">{dossie.alvo}</h3>
                         <span className={`text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider ${dossie.tipo_evento === 'Online' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                           {dossie.tipo_evento}
                         </span>
                       </div>
                       <p className="text-sm text-zinc-300 leading-relaxed">{dossie.eventos}</p>
                     </div>
                   </div>
                 )) : (
                   <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                     <Calendar className="w-12 h-12 mb-4 opacity-20" />
                     <p>Nenhum evento online ou presencial mapeado no último scan de inteligência.</p>
                   </div>
                 )}
               </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
