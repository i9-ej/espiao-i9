const xlsx = require('xlsx');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const EXCEL_PATH = path.join(__dirname, '..', '..', '..', 'Lista de Concorrentes.xlsx');

async function lerPlanilha() {
  console.log('Lendo alvo de:', EXCEL_PATH);
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(sheet);
}

async function rasparSite(url) {
  if (!url || !url.startsWith('http')) return null;
  
  console.log(`[Sniper] Iniciando invasão no site: ${url}`);
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Extrai o texto visível e útil do body (Landing Page)
    const textoBruto = await page.evaluate(() => {
      // Remove scripts, styles, etc para não poluir
      const elementsToRemove = document.querySelectorAll('script, style, nav, footer, noscript, iframe');
      elementsToRemove.forEach(el => el.remove());
      
      return document.body.innerText.replace(/\s+/g, ' ').trim();
    });
    
    console.log(`[Sniper] Sucesso! ${textoBruto.length} caracteres capturados.`);
    await browser.close();
    
    // Retorna os primeiros 5000 chars para não estourar tokens da IA
    return textoBruto.substring(0, 5000); 
  } catch (err) {
    console.error(`[Sniper] Falha ao raspar ${url}:`, err.message);
    await browser.close();
    return null;
  }
}

async function instagramScraperModoMaluco(username) {
  // Nota: Fazer scraping agressivo do Instagram sem login bloqueia rápido.
  // Vamos raspar o JSON anônimo se possível ou usar uma bio externa.
  const handle = username.replace('@', '').trim();
  const url = `https://www.instagram.com/${handle}/`;
  
  console.log(`[Insta-Spy] Vigiando perfil: @${handle}`);
  
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Tenta pegar a bio e o título da página
    const bioText = await page.evaluate(() => {
      const title = document.title;
      const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
      return `${title} - Bio: ${metaDesc}`;
    });
    
    console.log(`[Insta-Spy] Capturado: ${bioText}`);
    await browser.close();
    return bioText;
  } catch (err) {
    console.error(`[Insta-Spy] Falha ao investigar Instagram @${handle}:`, err.message);
    await browser.close();
    return null;
  }
}

async function iniciarVarredura() {
  const alvos = await lerPlanilha();
  console.log(`\nIniciando Operação de Extração. Alvos totais: ${alvos.length}\n`);
  
  const resultados = [];
  
  // Vamos processar só os 2 primeiros para teste e validação!
  const alvosParaTestar = alvos.slice(0, 2);
  
  for (const alvo of alvosParaTestar) {
    console.log(`\n--- Focando no Alvo: ${alvo.Empresa} ---`);
    console.log(`Nicho: ${alvo.Nicho}`);
    
    let textoSite = null;
    let textoInsta = null;
    
    if (alvo.Site) {
      textoSite = await rasparSite(alvo.Site);
    }
    
    if (alvo.Instagram) {
      // textoInsta = await instagramScraperModoMaluco(alvo.Instagram);
      // Para o teste, vamos simular o insta pra não tomar IP block da Meta logo de cara.
      textoInsta = `Perfil @${alvo.Instagram.replace('@', '')} ativo e monitorado.`;
    }
    
    resultados.push({
      alvo: alvo.Empresa,
      nicho: alvo.Nicho,
      captura_site: textoSite,
      captura_insta: textoInsta,
      timestamp: new Date().toISOString()
    });
  }
  
  console.log('\n==========================');
  console.log('Varredura Concluída!');
  
  // Salva no cofre temporário (JSON)
  fs.writeFileSync(
    path.join(__dirname, '..', 'data_bruta.json'), 
    JSON.stringify(resultados, null, 2)
  );
  console.log('Dados salvos em src/data_bruta.json prontos para a IA!');
}

iniciarVarredura();
