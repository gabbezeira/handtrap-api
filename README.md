# 🚀 Handtrap API - Backend

> **Motor de análise de IA para o melhor Deck Builder de Yu-Gi-Oh!**  
> Backend robusto e seguro com Google Gemini AI.

Status: 🚀 **Em Produção**  
🌐 **API Online**: [api.handtrap.xyz](https://api.handtrap.xyz)  
🎮 **Frontend**: [handtrap.xyz](https://handtrap.xyz) | [Repositório Frontend](https://github.com/gabbezeira/handtrap)

---

## 📖 Sobre o Projeto

Este é o backend da aplicação **Handtrap**, responsável por fornecer análises táticas de decks e cartas de Yu-Gi-Oh! usando inteligência artificial (Google Gemini). 

O backend foi projetado com **segurança first**, implementando autenticação Firebase, rate limiting e CORS restrito para proteger contra abuso de API.

---

## ✨ Funcionalidades Principais

- **🤖 Análise de Deck com IA**: Recebe listas de cards e retorna análise completa com pontos fortes, fracos, consistência e sugestões
- **🃏 Análise Individual de Carta**: Análise detalhada de cartas específicas com momentos de uso e estratégias
- **🔒 Autenticação Firebase**: Apenas usuários autenticados podem acessar endpoints de IA
- **⚡ Rate Limiting**: Proteção contra abuso (5 análises deck/min, 10 cartas/min)
- **🌐 CORS Restrito**: Whitelist de origens permitidas
- **📝 Logging Completo**: Rastreamento de todas as requisições

---

## 🛠️ Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/) v18+
- **Framework**: [Express](https://expressjs.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **IA**: [Google Gemini API](https://ai.google.dev/)
- **Auth**: [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- **Security**: [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)

---

## 🔌 Endpoints Disponíveis

| Endpoint | Método | Auth Required | Descrição |
|----------|--------|---------------|-----------|
| `/` | GET | ❌ | Status do servidor |
| `/api/health` | GET | ❌ | Health check |
| `/analyze` | POST | ✅ | Análise completa de deck |
| `/analyze-card` | POST | ✅ | Análise individual de carta |

### Exemplo de Requisição

**Análise de Deck:**
```bash
curl -X POST https://api.handtrap.xyz/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "deckList": [
      "3x Ash Blossom & Joyous Spring",
      "2x Effect Veiler",
      "3x Snake-Eye Ash"
    ]
  }'
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos

- Node.js v18+
- Conta Firebase (para autenticação)
- Google Gemini API Key

### Instalação

1. **Clone o repositório**
   ```bash
   git clone https://github.com/gabbezeira/handtrap-api.git
   cd handtrap-api
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as Variáveis de Ambiente**
   
   Crie um arquivo `.env` na raiz do projeto (veja `.env.example`):
   
   ```env
   # Firebase Admin SDK (Obrigatório)
   FIREBASE_PROJECT_ID=seu_project_id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave aqui\n-----END PRIVATE KEY-----\n"
   
   # Google Gemini API
   GEMINI_API_KEY=sua_chave_primaria
   GEMINI_API_KEY_BACKUP=sua_chave_backup  # Opcional
   
   # Configuração
   PORT=3000
   NODE_ENV=development
   ```

4. **Obtenha as Credenciais Firebase Admin**
   
   - Acesse [Firebase Console](https://console.firebase.google.com)
   - Vá em **Project Settings** > **Service Accounts**
   - Clique em **Generate New Private Key**
   - Extraia `project_id`, `client_email` e `private_key` do JSON baixado

5. **Execute o servidor**
   ```bash
   npm run dev
   ```
   
   O servidor estará disponível em `http://localhost:3000`

---

## 🔒 Segurança

Este backend implementa múltiplas camadas de segurança:

### Autenticação
- ✅ Firebase Admin SDK valida tokens JWT
- ✅ Apenas usuários logados acessam endpoints de IA
- ✅ Tokens expirados/inválidos retornam 401

### Rate Limiting
- ✅ **Deck Analysis**: 5 requisições/minuto
- ✅ **Card Analysis**: 10 requisições/minuto  
- ✅ **Geral**: 100 requisições/15 minutos

### CORS
- ✅ Whitelist estrita de origens
- ✅ Localhost permitido apenas em desenvolvimento
- ✅ Proteção contra CSRF

---

## 📁 Estrutura do Projeto

```
backend/
├── src/
│   ├── config/
│   │   └── firebase-admin.ts    # Configuração Firebase Admin
│   ├── controllers/
│   │   └── aiController.ts      # Lógica dos endpoints de IA
│   ├── middleware/
│   │   ├── auth.ts              # Middleware de autenticação
│   │   └── rateLimiter.ts       # Rate limiting
│   ├── services/
│   │   └── geminiService.ts     # Integração com Gemini API
│   ├── app.ts                   # Configuração Express
│   └── index.ts                 # Entry point
├── .env.example                 # Template de variáveis
├── package.json
└── tsconfig.json
```

---

## 🤝 Como Contribuir

Contribuições são bem-vindas! Se você quer ajudar:

1. Faça um **Fork** do projeto
2. Crie uma **Branch** (`git checkout -b feature/MinhaFeature`)
3. Faça o **Commit** (`git commit -m 'Adiciona feature X'`)
4. Faça o **Push** (`git push origin feature/MinhaFeature`)
5. Abra um **Pull Request**

---

## 📦 Scripts Disponíveis

```bash
npm run dev          # Inicia servidor em desenvolvimento (nodemon)
npm run start        # Inicia servidor em produção
npm run update-database  # Atualiza cardDatabase.json (PT/EN híbrido)
npm run download-images  # Baixa imagens das cartas
```

---

## 🌐 Links Úteis

- **Frontend**: [handtrap.xyz](https://handtrap.xyz)
- **Repositório Frontend**: [github.com/gabbezeira/handtrap](https://github.com/gabbezeira/handtrap)
- **API Docs**: [api.handtrap.xyz](https://api.handtrap.xyz)
- **Google Gemini**: [ai.google.dev](https://ai.google.dev/)

---

## 👨‍💻 Créditos

Desenvolvido com ❤️ e ☕ por **Gabriel Alves** ([@gabbezeira](https://instagram.com/gabbezeira)).

---

## 📄 Licença

Este projeto é Open Source para fins educacionais.
