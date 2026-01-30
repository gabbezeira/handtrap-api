import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiService {
  private primaryAI: GoogleGenerativeAI;
  private backupAI: GoogleGenerativeAI | null = null;
  private primaryModel: any;
  private backupModel: any | null = null;
  private readonly TIMEOUT_MS = 30000; // 30 seconds

  constructor() {
    // Primary API Key (Required)
    const primaryKey = process.env.GEMINI_API_KEY;
    if (!primaryKey) throw new Error("GEMINI_API_KEY is missing");
    
    this.primaryAI = new GoogleGenerativeAI(primaryKey);
    this.primaryModel = this.primaryAI.getGenerativeModel({ model: "gemini-2.0-flash-lite-001" });

    // Backup API Key (Optional)
    const backupKey = process.env.GEMINI_API_KEY_BACKUP;
    if (backupKey) {
      console.log("✅ Backup Gemini API configured");
      this.backupAI = new GoogleGenerativeAI(backupKey);
      this.backupModel = this.backupAI.getGenerativeModel({ model: "gemini-2.0-flash-lite-001" });
    } else {
      console.warn("⚠️ No backup API key configured. Fallback disabled.");
    }
  }

  /**
   * Execute a request with automatic fallback to backup API if primary times out
   */
  private async callWithFallback<T>(
    operation: (model: any) => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      // Try primary API with timeout
      console.log(`🔵 Calling primary Gemini API for ${operationName}...`);
      const result = await this.withTimeout(
        operation(this.primaryModel),
        this.TIMEOUT_MS,
        `Primary API timeout for ${operationName}`
      );
      console.log(`✅ Primary API succeeded for ${operationName}`);
      return result;
    } catch (primaryError: any) {
      console.error(`❌ Primary API failed for ${operationName}:`, primaryError.message);

      // If no backup configured, throw original error
      if (!this.backupModel) {
        console.error("❌ No backup API available. Failing.");
        throw primaryError;
      }

      // Try backup API
      try {
        console.log(`🟡 Trying backup Gemini API for ${operationName}...`);
        const result = await this.withTimeout(
          operation(this.backupModel),
          this.TIMEOUT_MS,
          `Backup API timeout for ${operationName}`
        );
        console.log(`✅ Backup API succeeded for ${operationName}`);
        return result;
      } catch (backupError: any) {
        console.error(`❌ Backup API also failed for ${operationName}:`, backupError.message);
        // Both failed - throw the backup error
        throw backupError;
      }
    }
  }

  /**
   * Wrapper to add timeout to any promise
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      ),
    ]);
  }

  async analyzeDeck(deckList: string[]) {
    const prompt = `
    ATUE COMO: Um Campeão Mundial de Yu-Gi-Oh! Master Duel e Juiz Oficial (Judge).
    CONTEXTO: Formato Master Duel (Best of 1). Banlist atualizada.
    
    TAREFA: Analise profundamente a lista de deck fornecida (Main Deck + Extra Deck).
    
    LISTA DO DECK (Total de Cartas na lista abaixo):
    ${deckList.join(', ')}

    DIRETRIZES DE ANÁLISE:
    1. SEJA RUTHLESS (IMPLACÁVEL): Compare este deck com os Tier 0/1 atuais (Maliss, Tenpai Dragon, Snake-Eye, Yubel). Se o deck for fraco contra eles, DÊ NOTA BAIXA. Não seja gentil.
    2. SINERGIA TOTAL: Analise como o Main Deck alimenta o Extra Deck.
    3. COMBOS REAIS: Descreva combos que são legalmente possíveis.
    4. CUSTO/BENEFÍCIO: Identifique "Garnets" e cartas sub-otimizadas.

    FORMATO DE RESPOSTA OBRIGATÓRIO (JSON ESTRITO - SEM MARKDOWN):
    {
      "metaScore": {
        "poderOfensivo": 0-10,
        "consistencia": 0-10,
        "resiliencia": 0-10,
        "controle": 0-10
      },
      "arquetipo": "Nome do Arquétipo",
      "analiseGeral": "Resumo técnico de 2 parágrafos.",
      "matchups": [
        {
          "deckName": "Maliss",
          "winRate": 0-100,
          "estrategia": "Como vencer ou por que perde (ex: Sofre para Dimension Shifter)."
        },
        {
          "deckName": "Tenpai Dragon",
          "winRate": 0-100,
          "estrategia": "Dica de side deck ou jogada específica."
        },
        {
          "deckName": "Snake-Eye / Fire King",
          "winRate": 0-100,
          "estrategia": "Pontos fracos da match."
        }
      ],
      "pontosFortes": ["ponto 1", "ponto 2", "ponto 3"],
      "pontosFracos": ["fraqueza 1", "fraqueza 2", "fraqueza 3"],
      "combosChave": [
        {
          "nome": "Combo de 1 Carta",
          "passos": ["1. ...", "2. ..."]
        },
        {
           "nome": "Interação de Extra Deck",
           "passos": ["..."]
        }
      ],
      "planoDeJogo": {
        "turno1": "Setup ideal.",
        "turno2": "Como quebrar board."
      },
      "sugestoesMelhoria": [
        {
          "carta": "Nome da Carta",
          "acao": "Adicionar",
          "qtd": 1,
          "motivo": "Motivo técnico baseado no meta."
        },
        {
          "carta": "Nome da Carta",
          "acao": "Remover",
          "qtd": 1,
          "motivo": "Motivo."
        }
      ]
    }
    `;

    const result = await this.callWithFallback(
      async (model) => await model.generateContent(prompt),
      "analyzeDeck"
    );

    return this.cleanAndParseJSON(result.response.text());
  }

  async analyzeCard(cardName: string) {
    const prompt = `
    Como campeão mundial de Yu-Gi-Oh, analise a carta "${cardName}".
    Retorne APENAS JSON válido:
    {
      "summary": "Resumo estratégico de 2 linhas sobre a carta.",
      "usage_moments": [
        "Melhor momento para ativar",
        "Interação específica com meta decks"
      ]
    }
    `;

    const result = await this.callWithFallback(
      async (model) => await model.generateContent(prompt),
      "analyzeCard"
    );

    return this.cleanAndParseJSON(result.response.text());
  }

  private cleanAndParseJSON(text: string): any {
    try {
      // Remove markdown code blocks if present
      const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(clean);
    } catch (error) {
        console.error("JSON Parse Error. Raw text:", text);
        // Fallback or re-throw
        throw new Error("Falha ao processar resposta da IA");
    }
  }
}
