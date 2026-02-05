# 🚀 Handtrap API - Backend

<div align="center">

![Handtrap API](https://img.shields.io/badge/Handtrap-API-6366f1?style=for-the-badge&logo=express&logoColor=white)
[![Status](https://img.shields.io/badge/Status-Production-10b981?style=for-the-badge)]()
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)]()

**Motor de análise de IA para o melhor Deck Builder de Yu-Gi-Oh!**

[🌐 API](https://api.handtrap.xyz) · [🎮 Frontend](https://handtrap.xyz) · [📦 Frontend Repo](https://github.com/gabbezeira/handtrap)

</div>

---

## 📖 Sobre

Backend robusto e seguro para a aplicação **Handtrap**, fornecendo análises táticas de decks e cartas usando **Google Gemini AI**. Inclui sistema de pagamentos com Stripe e autenticação Firebase.

---

## ✨ Features

| Feature | Descrição |
|---------|-----------|
| 🤖 **Análise de Deck** | Pontos fortes, fracos, consistência e sugestões |
| 🃏 **Análise de Carta** | Análise individual com momentos de uso |
| 🎲 **Análise de Mão** | Avaliação de mão inicial com estratégias |
| 💳 **Stripe Payments** | Checkout, webhooks, billing portal |
| 🔒 **Auth Firebase** | Tokens JWT validados via Admin SDK |
| ⚡ **Rate Limiting** | Proteção contra abuso |
| 📊 **Cost Tracking** | Monitoramento de custos da API Gemini |

---

## 🔌 API Endpoints

| Endpoint | Método | Auth | Descrição |
|----------|--------|:----:|-----------|
| `/api/health` | GET | ❌ | Health check |
| `/api/analyze` | POST | ✅ | Análise de deck |
| `/api/analyze-card` | POST | ✅ | Análise de carta |
| `/api/analyze-hand` | POST | ✅ | Análise de mão |
| `/api/feedback/analysis` | POST | ✅ | Enviar feedback |
| `/api/create-checkout-session` | POST | ✅ | Checkout Stripe |
| `/api/billing-portal` | POST | ✅ | Portal de cobrança |
| `/api/webhook` | POST | ❌ | Webhook Stripe |
| `/api/admin/usage` | GET | ✅ | Estatísticas de uso |

### Exemplo de Requisição

```bash
curl -X POST https://api.handtrap.xyz/api/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer FIREBASE_TOKEN" \
  -d '{
    "deckList": ["Ash Blossom & Joyous Spring", "Effect Veiler", "Snake-Eye Ash"],
    "cardIds": [14558127, 950951, 123456],
    "forceRefresh": false
  }'
```

---

## 🛠️ Tech Stack

| Tecnologia | Uso |
|------------|-----|
| Node.js 18+ | Runtime |
| Express.js | Framework |
| TypeScript | Linguagem |
| Google Gemini | AI (Flash 2.5 / Pro 2.5) |
| Firebase Admin | Autenticação |
| Stripe | Pagamentos |
| Firestore | Database |

---

## 🚀 Execução Local

### Pré-requisitos

- Node.js v18+
- Conta Firebase (Admin SDK)
- Google Gemini API Key
- Stripe Account (opcional)

### Instalação

```bash
# Clone
git clone https://github.com/gabbezeira/handtrap-api.git
cd handtrap-api

# Instale dependências
npm install

# Configure variáveis
cp .env.example .env

# Execute
npm run dev
```

### Variáveis de Ambiente

```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=seu_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@projeto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google Gemini
GEMINI_API_KEY=sua_chave_primaria
GEMINI_API_KEY_BACKUP=sua_chave_backup  # Fallback

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID=price_xxx

# Config
PORT=3000
NODE_ENV=production
```

---

## 🔒 Segurança

| Camada | Implementação |
|--------|---------------|
| **Autenticação** | Firebase JWT validation |
| **Rate Limiting** | 5 deck/min, 10 card/min, 100 general/15min |
| **CORS** | Whitelist de origens permitidas |
| **Helmet** | Headers de segurança HTTP |
| **Validation** | Zod schemas para body |

---

## 📁 Estrutura

```
backend/
├── src/
│   ├── config/
│   │   └── firebase-admin.ts     # Firebase Admin SDK
│   ├── controllers/
│   │   ├── aiController.ts       # Endpoints de IA
│   │   ├── stripeController.ts   # Pagamentos
│   │   ├── feedbackController.ts # Feedback
│   │   └── usageController.ts    # Métricas de uso
│   ├── middleware/
│   │   ├── auth.ts               # Autenticação
│   │   ├── rateLimiter.ts        # Rate limiting
│   │   └── validation.ts         # Body validation
│   ├── services/
│   │   └── geminiService.ts      # Integração Gemini
│   ├── utils/
│   │   ├── logger.ts             # Logging
│   │   └── validation.ts         # Zod schemas
│   └── app.ts                    # Express config
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 💰 Modelo de Custos (Gemini)

| Modelo | Input (1M tokens) | Output (1M tokens) |
|--------|------------------:|-------------------:|
| **Gemini 2.5 Flash** | $0.30 | $2.50 |
| **Gemini 2.5 Pro** | $1.25 | $10.00 |

> Free users → Flash | Premium users → Pro

---

## 📦 Scripts

```bash
npm run dev              # Desenvolvimento (nodemon)
npm run start            # Produção
npm run update-database  # Atualiza cardDatabase.json
npm run download-images  # Baixa imagens das cartas
```

---

## 🌐 Deploy (Vercel)

```bash
# Instale Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Configure as variáveis de ambiente no dashboard da Vercel.

---

## 🤝 Contribuição

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/NovaFeature`)
3. Commit suas mudanças (`git commit -m 'Add: feature X'`)
4. Push (`git push origin feature/NovaFeature`)
5. Abra um Pull Request

---

## 👨‍💻 Autor

**Gabriel Alves** - [@gabbezeira](https://instagram.com/gabbezeira)

---

<div align="center">

Made with ❤️ and ☕ for the Yu-Gi-Oh! Community

**[⭐ Star se foi útil!](https://github.com/gabbezeira/handtrap-api)**

</div>
