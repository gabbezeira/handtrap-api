import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../utils/logger";
import { db } from "../config/firebase-admin";


const TOKEN_PRICES = {
  'gemini-2.5-pro': { input: 1.25, output: 10.00 },
  'gemini-2.5-flash': { input: 0.30, output: 2.50 }
};

interface TokenUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export class GeminiService {
	private primaryAI: GoogleGenerativeAI;
	private backupAI: GoogleGenerativeAI | null = null;
	private readonly TIMEOUT_MS = 120000;

	constructor() {
		const primaryKey = process.env.GEMINI_API_KEY;
		if (!primaryKey) throw new Error("GEMINI_API_KEY is missing");

		this.primaryAI = new GoogleGenerativeAI(primaryKey);

		const backupKey = process.env.GEMINI_API_KEY_BACKUP;
		if (backupKey) {
			logger.info('Backup Gemini API configured');
			this.backupAI = new GoogleGenerativeAI(backupKey);
		} else {
			logger.warn('No backup API key configured. Fallback disabled.');
		}
	}

    private getModel(plan: 'free' | 'premium', client: GoogleGenerativeAI) {
        // Strategy: 
        // Free -> Flash 2.5 (High Speed, Low Cost)
        // Premium -> Pro 2.5 (High Reasoning)
        const modelName = plan === 'premium' ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
        return { model: client.getGenerativeModel({ model: modelName }), modelName };
    }

    private async logApiUsage(
        model: string,
        inputTokens: number,
        outputTokens: number,
        operation: string
    ) {
        try {
            const prices = TOKEN_PRICES[model as keyof typeof TOKEN_PRICES] || TOKEN_PRICES['gemini-2.5-flash'];
            const inputCost = (inputTokens / 1_000_000) * prices.input;
            const outputCost = (outputTokens / 1_000_000) * prices.output;
            const totalCost = inputCost + outputCost;

            await db.collection('api_usage').add({
                timestamp: new Date(),
                model,
                operation,
                inputTokens,
                outputTokens,
                totalTokens: inputTokens + outputTokens,
                estimatedCostUSD: totalCost
            });

            logger.info('API usage logged', { 
                operation, 
                metadata: { model, tokens: inputTokens + outputTokens, cost: `$${totalCost.toFixed(6)}` }
            });
        } catch (error) {
            logger.error('Failed to log API usage', error);
        }
    }

	private async callWithFallback<T>(
		operation: (model: any, modelName: string) => Promise<T>,
		operationName: string,
        plan: 'free' | 'premium'
	): Promise<T> {
		try {
            const { model: primaryModel, modelName } = this.getModel(plan, this.primaryAI);
			const startTime = Date.now();
            const result = await this.withTimeout(
				operation(primaryModel, modelName),
				this.TIMEOUT_MS,
				`Primary API timeout for ${operationName}`,
			);
			logger.perf('Gemini API call completed', { operation: operationName, duration: Date.now() - startTime });
			return result;
		} catch (primaryError: any) {
			logger.error(`Primary API failed for ${operationName}`, primaryError);

			if (!this.backupAI) {
				logger.error('No backup API available');
				throw primaryError;
			}

			try {
				logger.info('Trying backup Gemini API', { operation: operationName });
                const { model: backupModel, modelName } = this.getModel(plan, this.backupAI);
				const result = await this.withTimeout(
					operation(backupModel, modelName),
					this.TIMEOUT_MS,
					`Backup API timeout for ${operationName}`,
				);
				logger.perf('Backup API succeeded', { operation: operationName });
				return result;
			} catch (backupError: any) {
				logger.error(`Backup API also failed for ${operationName}`, backupError);
				throw backupError;
			}
		}
	}

	private withTimeout<T>(
		promise: Promise<T>,
		timeoutMs: number,
		errorMessage: string,
	): Promise<T> {
		return Promise.race([
			promise,
			new Promise<T>((_, reject) =>
				setTimeout(() => reject(new Error(errorMessage)), timeoutMs),
			),
		]);
	}

	async analyzeDeck(deckList: string[], plan: 'free' | 'premium' = 'free') {
		const prompt = `
    CONTEXTO: Você é um especialista em Yu-Gi-Oh! Master Duel (formato Best of 1, Fevereiro 2026).
    LINGUA: Português-BR
    TAREFA: Analise a lista de deck fornecida e forneça uma avaliação técnica e construtiva.
    
    LISTA DO DECK:
    ${deckList.join(", ")}
    
    REGRAS IMPORTANTES:
    1. NÃO mencione banlist, cartas proibidas ou limitadas. Ignore completamente a banlist.
    2. RESPEITE as quantidades exatas de cartas informadas na lista. Se a lista diz "3x Blue-Eyes", são 3 cópias.
    3. Seja específico e construtivo. Evite críticas genéricas como "remova tudo".
    4. FOCO: Consistência, Power Ceiling, Resiliência a Hand Traps e Capacidade de Going Second.
    
    FORMATO DE RESPOSTA (JSON):
    Responda APENAS com um objeto JSON válido. Não use Markdown ou blocos de código.
    {
      "metaScore": {
        "poderOfensivo": (1-10),
        "consistencia": (1-10),
        "resiliencia": (1-10),
        "controle": (1-10)
      },
      "arquetipo": "Nome do Arquétipo / Estratégia Principal",
      "analiseGeral": "Resumo detalhado (3-4 parágrafos) sobre como o deck funciona, pontos fortes e fracos.",
      "pontosFortes": ["ponto 1", "ponto 2", "ponto 3"],
      "pontosFracos": ["ponto 1", "ponto 2", "ponto 3"],
      "combosChave": [
        { "nome": "Combo 1 Card", "passos": ["Normal Summon X", "Search Y", "Special Z"] }
      ],
      "planoDeJogo": {
        "turno1": "O que fazer indo primeiro",
        "turno2": "O que fazer indo segundo (board breaker)"
      },
      "sugestoesMelhoria": [
        { "carta": "Nome da Carta", "acao": "Adicionar" | "Remover", "qtd": 1, "motivo": "Explicação" }
      ],
      "matchups": [
           { "deckName": "Snake-Eye", "winRate": 40, "estrategia": "Dica contra esse deck" },
           { "deckName": "Fire King", "winRate": 50, "estrategia": "Dica contra esse deck" }
      ]
    }`;

		return this.callWithFallback(async (model, modelName) => {
			const result = await model.generateContent({
				contents: [{ parts: [{ text: prompt }] }],
				generationConfig: {
					temperature: 0.7,
					maxOutputTokens: 8192,
					responseMimeType: "application/json",
				},
			});
			const response = result.response;
			

			const usage = response.usageMetadata;
			if (usage) {
				this.logApiUsage(modelName, usage.promptTokenCount || 0, usage.candidatesTokenCount || 0, 'analyzeDeck');
			}
			
			return JSON.parse(response.text());
		}, "analyzeDeck", plan);
	}

	async analyzeCard(cardName: string, plan: 'free' | 'premium' = 'premium') {
		const prompt = `Analise a carta "${cardName}" no contexto do meta atual de Yu-Gi-Oh! Master Duel.
				LINGUA: Português-BR
        Responda APENAS JSON:
        {
          "summary": "Resumo curto e direto sobre a utilidade da carta.",
          "usage_moments": ["Situação 1", "Situação 2"]
        }`;

        // HYBRID COST MODEL: Always use 'free' (Flash) for card analysis as it's simple
        // Premium users still get higher limits, but use the cheaper model here.
		return this.callWithFallback(async (model, modelName) => {
			const result = await model.generateContent({
				contents: [{ parts: [{ text: prompt }] }],
				generationConfig: {
                    temperature: 0.7,
                    responseMimeType: "application/json"
                },
			});
			const response = result.response;
			

			const usage = response.usageMetadata;
			if (usage) {
				this.logApiUsage(modelName, usage.promptTokenCount || 0, usage.candidatesTokenCount || 0, 'analyzeCard');
			}
			
			return JSON.parse(response.text());
		}, "analyzeCard", 'free');
	}

	async analyzeHand(handCards: string[], deckList: string[], plan: 'free' | 'premium' = 'free') {
		const prompt = `
        Analise esta mão inicial de 5 cartas: ${handCards.join(", ")}.
        Deck Base: ${deckList.slice(0, 10).join(", ")}... (resumo do deck).
				LINGUA: Português-BR
        Responda APENAS JSON:
        {
            "score": (0-10 de qualidade da mão),
            "strategy_going_first": "Passo a passo detalhado indo primeiro.",
            "strategy_going_second": "Passo a passo detalhado indo segundo.",
            "key_combos": ["Combo principal possível com essa mão"],
            "bricks": ["Cartas mortas na mão se houver"]
        }`;

        // HYBRID COST MODEL: Always use 'free' (Flash) for hand analysis
		return this.callWithFallback(async (model, modelName) => {
			const result = await model.generateContent({
				contents: [{ parts: [{ text: prompt }] }],
				generationConfig: {
                    temperature: 0.7,
                    responseMimeType: "application/json"
                },
			});
			const response = result.response;
			

			const usage = response.usageMetadata;
			if (usage) {
				this.logApiUsage(modelName, usage.promptTokenCount || 0, usage.candidatesTokenCount || 0, 'analyzeHand');
			}
			
			return JSON.parse(response.text());
		}, "analyzeHand", 'free');
	}
}
