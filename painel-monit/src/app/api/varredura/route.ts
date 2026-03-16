import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';
import puppeteer from 'puppeteer';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';
import pLimit from 'p-limit';

const EXCEL_PATH = path.join(process.cwd(), '..', 'Lista de Concorrentes.xlsx');
// process.cwd() aqui no app dir fica em: C:\Users\sorai\OneDrive\Desktop\WorkshopG\Ferramenta\painel-monit
// Portanto '..' joga para C:\Users\sorai\OneDrive\Desktop\WorkshopG\Ferramenta\
// Confirmando caminho seguro:
const EXCEL_FINAL_PATH = fs.existsSync(EXCEL_PATH) ? EXCEL_PATH : path.join(process.cwd(), 'Lista de Concorrentes.xlsx');

const DATA_FINAL_PATH = path.join(process.cwd(), 'src', 'dossie_final.json');
const TARGET_EMAIL = 'guilhermecoelho@eji9consultoria.com';

// ============================
// 1. EXTRAÇÃO (Scraper)
// ============================
async function extrairDados(alvos: any[]) {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080'
    ] 
  });
  
  const resultadosBrutos: any[] = [];
  
  // Limite removido, analisando todos os alvos informados na planilha
  const limit = pLimit(3); // 3 abas sendo processadas simultaneamente no máximo
  
  const extractPromises = alvos.map(alvo => limit(async () => {
    let textoSite: string | null = null;
    if (alvo.Site && alvo.Site.startsWith('http')) {
      try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        });
        // Desabilitar carregamento de imagens e fontes pesadas para acelerar (apenas texto importa)
        await page.setRequestInterception(true);
        page.on('request', (req) => {
          if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
            req.abort();
          } else {
            req.continue();
          }
        });

        await page.goto(alvo.Site, { waitUntil: 'domcontentloaded', timeout: 15000 });
        textoSite = await page.evaluate(() => {
          document.querySelectorAll('script, style, nav, footer, noscript').forEach(el => el.remove());
          return document.body.innerText.replace(/\s+/g, ' ').trim();
        });
        await page.close();
      } catch (e: any) {
        console.error(`Erro ao raspar ${alvo.Site}:`, e.message);
      }
    }
    
    // Insere no array mesmo se houver erro pra tentar usar o Gemini depois
    resultadosBrutos.push({
      alvo: alvo.Empresa,
      nicho: alvo.Nicho,
      site: textoSite ? textoSite.substring(0, 3000) : 'Sem dados capturados do site'
    });
  }));
  
  await Promise.all(extractPromises);
  await browser.close();
  return resultadosBrutos;
}

// ============================
// 2. INTERROGATÓRIO IA
// ============================
async function gerarDossieIA(dadosBrutos: any[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  const useMock = !apiKey;
  const ai = useMock ? null : new GoogleGenAI({ apiKey: apiKey || '' });
  const relatorios: any[] = [];

  const limitIA = pLimit(5); // 5 requisições em paralelo para o Gemini para não tomar Rate Limit

  const iaPromises = dadosBrutos.map(item => limitIA(async () => {
    if (useMock || !ai) {
      await new Promise(r => setTimeout(r, 800)); // mock delay
      const alvoStr = item.alvo ? item.alvo.toString() : '';
      relatorios.push({
        alvo: item.alvo,
        eventos: alvoStr.includes('3778') ? "Sim, evento XP Saúde em breve." : "Nada mapeado.",
        diferenciais: "Foco forte em barateamento da Folha, corte de custos operacionais via IA.",
        estrategia_nova: "Marketing focado no c-level financeiro.",
        analise_completa: "Esse é um texto gerado em mock pois a chave da IA não foi informada. Para ver o dossiê massivo real, cadastre o GEMINI_API_KEY no .env",
        nivel_agressividade: alvoStr.includes('3778') ? 9 : 3,
        tipo_evento: alvoStr.includes('3778') ? "Presencial" : "Nenhum"
      });
      return; // return para não cair no catch do for
    }

    const prompt = `Você é analista de espionagem corporativa. Extraia dados sobre o alvo "${item.alvo}":\nTexto Extraído: ${item.site}\n\nGere APENAS UM JSON (sem crases Markdown) neste formato:\n{\n  "eventos": "Quais eventos ou webinars vão participar? (Resuma em uma frase)",\n  "diferenciais": "Qual o principal diferencial ou oferta listada?",\n  "estrategia_nova": "Uma hipótese de mudança estratégica recente.",\n  "analise_completa": "Faça uma resenha elaborada para o CEO de no mínimo 3 parágrafos focando em fraquezas e pontos fortes e estratégias competitivas",\n  "nivel_agressividade": [Número inteiro de 1 a 10 representando agressividade mercadológica e tom de voz],\n  "tipo_evento": ["Nenhum", "Online", ou "Presencial"]\n}`;
    try {
      const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
      const rawJson = (response.text || "").replace(/```json/g, '').replace(/```/g, '').trim();
      const extracted = JSON.parse(rawJson);
      
      relatorios.push({
         alvo: item.alvo,
         eventos: extracted.eventos || "Sem eventos",
         diferenciais: extracted.diferenciais || "-",
         estrategia_nova: extracted.estrategia_nova || "-",
         analise_completa: extracted.analise_completa || "Não gerado pela IA. Erro.",
         nivel_agressividade: isNaN(extracted.nivel_agressividade) ? 5 : extracted.nivel_agressividade,
         tipo_evento: extracted.tipo_evento || "Nenhum"
      });
    } catch (e: any) {
      console.error(`Falha IA no alvo ${item.alvo}:`, e.message);
      relatorios.push({
         alvo: item.alvo,
         eventos: "Falha na IA",
         diferenciais: "Falha na IA",
         estrategia_nova: "Falha na IA",
         analise_completa: "Erro durante chamada de IA: " + e.message,
         nivel_agressividade: 0,
         tipo_evento: "Nenhum"
      });
    }
  }));

  await Promise.all(iaPromises);
  return relatorios;
}

// ============================
// 3. COMUNICAÇÃO (Email)
// ============================
async function enviarEmail(dossieList: any[]) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log("Variáveis de e-mail ausentes. Ignorando envio SMTP real.");
      return;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // Ajuste para seu provedor se necessário
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS, // Gerar App Password no Gmail
    },
  });

  let htmlBody = `
    <h1 style="color: #f97316;">VIGIA.IA - Relatório Tático Dominical</h1>
    <p>Operação Concorrência sob Vigilância gerou os seguintes dados nesta semana:</p>
  `;

  dossieList.forEach(alvo => {
    htmlBody += `
      <div style="border-left: 4px solid #f97316; padding-left: 15px; margin-bottom: 20px;">
        <h3>Alvo: ${alvo.alvo}</h3>
        <p><strong>Diferenciais Mapeados:</strong> ${alvo.diferenciais}</p>
        <p><strong>Movimentação de Eventos:</strong> ${alvo.eventos}</p>
        <p><strong>Nova Estratégia Identificada:</strong> ${alvo.estrategia_nova}</p>
      </div>
    `;
  });

  await transporter.sendMail({
    from: '"QG Operação" <' + process.env.SMTP_USER + '>',
    to: TARGET_EMAIL,
    subject: "🔥 Dossiê Dominical Vigia.IA - Seus Concorrentes Mapeados",
    html: htmlBody
  });
}

// ============================
// HANDLER DA ROTA API
// ============================
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // 1. Ler o Excel Base
    if (!fs.existsSync(EXCEL_FINAL_PATH)) {
      return NextResponse.json({ error: `Planilha não encontrada. Buscou em: ${EXCEL_FINAL_PATH}` }, { status: 404 });
    }
    const fileBuffer = fs.readFileSync(EXCEL_FINAL_PATH);
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const alvos = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    console.log(`[🔍 NEXT API] Planilha lida. Alvos encontrados: ${alvos.length}`);

    // 2. Orquestrar Fase de Coleta
    const dadosBrutos = await extrairDados(alvos);
    console.log(`[🔍 NEXT API] Fase de coleta (Puppeteer) concluida. Sites lidos: ${dadosBrutos.length}`);

    // 3. Processamento de IA
    const dossieList = await gerarDossieIA(dadosBrutos);
    console.log(`[🔍 NEXT API] Fase de IA concluida. Dossiês gerados: ${dossieList.length}`);

    // 4. Salva localmente para o frontend renderizar instantaneamente
    fs.writeFileSync(DATA_FINAL_PATH, JSON.stringify(dossieList, null, 2));

    // 5. Se o disparo for manual e pedir envio tbm, envia email
    if (action === 'run_and_email' || action === 'cron_weekly') {
       await enviarEmail(dossieList);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Varredura completa e salva localmente", 
      data: dossieList 
    });

  } catch (error: any) {
    console.error("Erro Crítico no Interrogatório:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
