require('dotenv').config();
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const puppeteer = require('puppeteer');
const { GoogleGenAI } = require('@google/genai');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const pLimit = require('p-limit');

const EXCEL_PATH = path.join(__dirname, '..', 'Lista de Concorrentes.xlsx');
const DATA_FINAL_PATH = path.join(__dirname, '..', 'src', 'dossie_final.json');
const TARGET_EMAIL = 'guilhermecoelho@eji9consultoria.com';

async function extrairDados(alvos) {
  const browser = await puppeteer.launch({ 
    headless: 'new', 
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080'
    ] 
  });
  const resultadosBrutos = [];
  
  // Limite removido, analisando todos os alvos com p-limit
  const limit = pLimit(3); 
  
  const extractPromises = alvos.map(alvo => limit(async () => {
    let textoSite = null;
    if (alvo.Site && alvo.Site.startsWith('http')) {
      try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        });
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
      } catch (e) {
        console.error(`Erro raspar ${alvo.Site}:`, e.message);
      }
    }
    resultadosBrutos.push({
      alvo: alvo.Empresa,
      nicho: alvo.Nicho,
      site: textoSite ? textoSite.substring(0, 3000) : 'Sem dados'
    });
  }));
  
  await Promise.all(extractPromises);
  await browser.close();
  return resultadosBrutos;
}

async function gerarDossieIA(dadosBrutos) {
  const apiKey = process.env.GEMINI_API_KEY;
  const useMock = !apiKey;
  let ai = null;
  if (!useMock) { ai = new GoogleGenAI({ apiKey }); }
  
  const relatorios = [];
  const limitIA = pLimit(5);

  const iaPromises = dadosBrutos.map(item => limitIA(async () => {
    if (useMock || !ai) {
      const alvoStr = item.alvo ? item.alvo.toString() : '';
      relatorios.push({
        alvo: item.alvo,
        eventos: alvoStr.includes('3778') ? "Sim, evento XP Saúde." : "Nada mapeado.",
        diferenciais: "Foco forte em barateamento da Folha corporativa.",
        estrategia_nova: "Marketing focado no c-level financeiro.",
        analise_completa: "Mock: Configure a API Key no .env para varreduras completas dominicais com o relatório real do concorrente.",
        nivel_agressividade: alvoStr.includes('3778') ? 9 : 3,
        tipo_evento: alvoStr.includes('3778') ? "Presencial" : "Nenhum"
      });
      return;
    }

    const prompt = `Você é analista de espionagem corporativa. Extraia dados sobre o alvo "${item.alvo}":\nTexto Extraído: ${item.site}\n\nGere APENAS UM JSON (sem crases Markdown) neste formato:\n{\n  "eventos": "Quais eventos ou webinars vão participar? (Resuma em uma frase)",\n  "diferenciais": "Qual o principal diferencial ou oferta listada?",\n  "estrategia_nova": "Uma hipótese de mudança estratégica recente.",\n  "analise_completa": "Faça uma resenha elaborada para o CEO de no mínimo 3 parágrafos focando em fraquezas e pontos fortes e estratégias competitivas",\n  "nivel_agressividade": [Número inteiro de 1 a 10 representando agressividade mercadológica e tom de voz],\n  "tipo_evento": ["Nenhum", "Online", ou "Presencial"]\n}`;
    try {
      const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
      const rawJson = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const extracted = JSON.parse(rawJson);
      relatorios.push({ 
        alvo: item.alvo, 
        eventos: extracted.eventos || "Sem eventos",
        diferenciais: extracted.diferenciais || "-",
        estrategia_nova: extracted.estrategia_nova || "-",
        analise_completa: extracted.analise_completa || "Não disponível",
        nivel_agressividade: isNaN(extracted.nivel_agressividade) ? 5 : extracted.nivel_agressividade,
        tipo_evento: extracted.tipo_evento || "Nenhum"
      });
    } catch (e) {
      console.error(`Falha IA ${item.alvo}:`, e.message);
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

async function enviarEmail(dossieList) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log("Variáveis de e-mail ausentes. Arquivo gerado localmente apenas.");
      return;
  }
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 587, secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  let htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333; max-w-none;">
      <h1 style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 10px;">VIGIA.IA - Relatório Tático Dominical</h1>
      <p style="font-size: 16px;">Operação dominical concluída. Foram vigiados <strong>${dossieList.length}</strong> alvos esta semana.</p>
      <hr style="border: 0; border-top: 1px solid #ccc; margin: 20px 0;" />
  `;

  dossieList.forEach((alvo, idx) => {
    htmlBody += `
      <div style="border-left: 4px solid #f97316; padding-left: 15px; margin-bottom: 30px; background-color: #f9f9f9; padding: 15px; border-radius: 0 8px 8px 0;">
        <h3 style="margin-top: 0; color: #111;">🎯 Alvo ${idx + 1}: ${alvo.alvo}</h3>
        <p><strong>Diferenciais:</strong> ${alvo.diferenciais}</p>
        <p><strong>Novas Estratégias:</strong> ${alvo.estrategia_nova}</p>
        <p><strong>Eventos:</strong> ${alvo.eventos}</p>
        
        <div style="background-color: #fff; padding: 15px; border: 1px solid #eee; margin-top: 15px; border-radius: 4px;">
           <h4 style="margin-top: 0; color: #f97316;">Resumo Executivo Aprofundado</h4>
           <p style="font-size: 14px; line-height: 1.6; color: #444;">${alvo.analise_completa.replace(/\n\n/g, '<br/><br/>').replace(/\n/g, '<br/>')}</p>
        </div>
      </div>`;
  });

  htmlBody += `
      <p style="text-align: center; font-size: 12px; color: #999; margin-top: 40px;">
        Acesse o Painel Central do Vigia.IA para visualizar o Dossiê Dinâmico interativo.<br/>
        Automação Operacional - eJi9 Consultoria
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: '"QG Operação" <' + process.env.SMTP_USER + '>',
    to: TARGET_EMAIL,
    subject: `🔥 Dossiê Dominical Vigia.IA - ${dossieList.length} Concorrentes Mapeados`,
    html: htmlBody
  });
  console.log('-> E-mail Tático (Aprofundado) enviado com sucesso!');
}

async function rodarOperacao() {
  console.log(`[${new Date().toISOString()}] Iniciando Varredura Dominical...`);
  try {
    const workbook = xlsx.readFile(EXCEL_PATH);
    const alvos = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    const dadosBrutos = await extrairDados(alvos);
    const dossieList = await gerarDossieIA(dadosBrutos);
    fs.writeFileSync(DATA_FINAL_PATH, JSON.stringify(dossieList, null, 2));
    await enviarEmail(dossieList);
    console.log(`[${new Date().toISOString()}] Operação concluída. Dormindo até próximo domingo.`);
  } catch (err) {
    console.error('Erro na cron:', err);
  }
}

// "0 8 * * 0" -> Todo Domingo às 08:00am
console.log("Vigia.IA - Cron Job ativado. Aguardando próximo domingo às 08:00...");
cron.schedule('0 8 * * 0', async () => {
  await rodarOperacao();
});
