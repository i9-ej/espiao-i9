require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const DATA_BRUTA_PATH = path.join(__dirname, '..', 'data_bruta.json');
const DOSSIE_FINAL_PATH = path.join(__dirname, '..', 'dossie_final.json');

async function processarIA() {
  console.log('\n======================================');
  console.log('[Interrogador] Iniciando análise de dados com Inteligência Artificial...');
  
  if (!fs.existsSync(DATA_BRUTA_PATH)) {
    console.error('Nenhum dado bruto encontrado. Execute o coletor (Fase 2) primeiro!');
    return;
  }

  const dadosBrutos = JSON.parse(fs.readFileSync(DATA_BRUTA_PATH, 'utf-8'));
  const apiKey = process.env.GEMINI_API_KEY;
  let useMock = false;

  if (!apiKey) {
    console.log('[Interrogador] AVISO: GEMINI_API_KEY não encontrada no .env.');
    console.log('[Interrogador] Ativando protocolo de Simulação (Mock Mode) para não parar a operação.');
    useMock = true;
  }

  const ai = useMock ? null : new GoogleGenAI({ apiKey: apiKey });
  const dossieDaOperacao = [];

  for (const alvo of dadosBrutos) {
    console.log(`\n[Interrogador] Torturando os dados do Alvo: ${alvo.alvo} ...`);
    
    // Preparando as provas (O Prompt)
    const prompt = `
Você é um analista de inteligência competitiva implacável.
Aqui estão as evidências coletadas sobre o concorrente "${alvo.alvo}" (${alvo.nicho}):

--- TEXTO DO SITE ---
${alvo.captura_site ? alvo.captura_site.substring(0, 3000) : 'Sem dados.'}

--- TEXTO DO INSTAGRAM ---
${alvo.captura_insta ? alvo.captura_insta : 'Sem dados.'}

Sua missão é extrair exatamente 3 informações brutas.
Retorne APENAS um objeto JSON neste formato, sem crases de markdown:
{
  "eventos": "Quais eventos presenciais ou webinars eles estão participando ou vão participar? (Resuma. Se nenhum, 'Nenhum detectado')",
  "diferenciais": "Quais propostas de valor únicas, promessas agressivas ou diferenciais tecnológicos eles destacam?",
  "estrategia_nova": "Qual parece ser a estratégia recente deles com base nas atualizações?"
}`;

    if (useMock) {
      // Simula a resposta da IA para a demonstração tática
      await new Promise(r => setTimeout(r, 1500)); // suspense timing
      
      dossieDaOperacao.push({
        alvo: alvo.alvo,
        eventos: alvo.alvo.toString().includes("3778") ? "Participação confirmada no Hospitalar 2026." : "Nenhum evento detectado.",
        diferenciais: "Foco extremo em IA voltada para eficiência corporativa. Prometem redução de 30% em custos com saúde.",
        estrategia_nova: "Estão direcionando o marketing mais agressivamente para líderes de RH em vez de médicos."
      });
      console.log(`[Interrogador] Confissão obtida (Mock)!`);
    } else {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        
        const rawJsonText = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const extracted = JSON.parse(rawJsonText);
        
        dossieDaOperacao.push({
          alvo: alvo.alvo,
          eventos: extracted.eventos,
          diferenciais: extracted.diferenciais,
          estrategia_nova: extracted.estrategia_nova
        });
        console.log(`[Interrogador] Confissão obtida brutalmente!`);
        
      } catch (err) {
        console.error(`[Interrogador] Indivíduo resistiu ao interrogatório:`, err.message);
      }
    }
  }

  // Salvando o dossiê final mastigado no cofre
  fs.writeFileSync(DOSSIE_FINAL_PATH, JSON.stringify(dossieDaOperacao, null, 2));
  console.log('\n[Interrogador] >>> Dossiê Completo Arquivado com Sucesso em src/dossie_final.json <<<');
}

processarIA();
