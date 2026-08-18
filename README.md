# Africanize Radar

Ferramenta interna de monitoramento editorial da Africanize. Funciona como um
"Feedly editorial" focado em pessoas: você cadastra quem importa para a
cobertura (Beyoncé, Burna Boy, Viola Davis, Taís Araújo...), e todo dia às
**09h (horário de Brasília)** o sistema busca notícias novas sobre elas,
filtra menções incidentais, elimina duplicatas, classifica com IA e entrega
uma curadoria pronta em um painel web.

O `.ics` do calendário de produção é usado **uma vez**, na importação inicial,
só para extrair nomes de pessoas. Depois disso o Radar funciona 100%
independente do calendário.

---

## Estrutura do projeto

```
africanize-radar/
├── src/                        # Frontend (React + TypeScript + Tailwind)
│   ├── components/              # Layout, cards de notícia, filtros, modais
│   ├── hooks/                   # usePeople, useNews (acesso ao Supabase)
│   ├── lib/
│   │   ├── icsParser.ts         # extração de candidatos a pessoas do .ics
│   │   ├── supabaseClient.ts    # cliente Supabase (chave anon, frontend)
│   │   └── types.ts
│   └── pages/
│       ├── Dashboard.tsx        # painel principal (pautas quentes/acompanhar/alertas)
│       ├── People.tsx           # pessoas monitoradas (CRUD)
│       ├── ImportIcs.tsx        # upload e revisão do .ics
│       ├── History.tsx          # curadorias anteriores por dia
│       └── RadarStatus.tsx      # status da automação diária
├── netlify/functions/
│   ├── daily-radar.ts           # Scheduled Function — roda 09h America/Sao_Paulo
│   ├── run-radar.ts             # Function HTTP — botão "Executar radar agora"
│   └── lib/
│       ├── collectNews.ts       # coleta (Google News RSS, desacoplado)
│       ├── curateNews.ts        # chamada à API da Anthropic + parsing de JSON
│       ├── prompt.ts            # prompt editorial da Africanize
│       ├── dedupe.ts            # agrupamento de mesma notícia + dedup histórico
│       ├── pipeline.ts          # orquestra tudo e grava no Supabase
│       └── supabaseAdmin.ts     # cliente Supabase com service_role key
├── supabase/schema.sql          # SQL completo das 3 tabelas + RLS
├── netlify.toml
├── .env.example
└── package.json
```

---

## 1. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (plano free serve
   para o MVP).
2. Vá em **SQL Editor > New query**, cole todo o conteúdo de
   `supabase/schema.sql` e rode. Isso cria as tabelas `people`, `news_items`,
   `radar_runs`, os índices e as políticas de RLS.
3. Vá em **Project Settings > API** e copie:
   - `Project URL` → vai virar `VITE_SUPABASE_URL` e `SUPABASE_URL`
   - `anon public` key → vira `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → vira `SUPABASE_SERVICE_ROLE_KEY` (⚠️ nunca exponha
     essa chave no frontend — ela só é usada dentro das Netlify Functions)

## 2. Configurar a Anthropic API

1. Crie/acesse uma conta em [console.anthropic.com](https://console.anthropic.com).
2. Gere uma API key em **API Keys**.
3. Isso vira `ANTHROPIC_API_KEY`.
4. Opcional: `ANTHROPIC_MODEL` sobrescreve o modelo padrão (`claude-sonnet-5`)
   caso a Anthropic lance um identificador de modelo mais recente — confira a
   documentação atual antes de trocar.

## 3. Rodar localmente

```bash
npm install
cp .env.example .env
# edite .env com os valores reais do Supabase e da Anthropic

npm run dev
```

O frontend sobe em `http://localhost:5173`. As Netlify Functions **não**
rodam com `npm run dev` puro — para testar `run-radar` localmente, use a
Netlify CLI:

```bash
npm install -g netlify-cli
netlify dev
```

Isso sobe frontend + functions juntos, lendo as variáveis do `.env`.

## 4. Deploy no Netlify

1. Suba este projeto para um repositório Git (GitHub/GitLab/Bitbucket).
2. No painel do Netlify: **Add new site > Import an existing project** e
   selecione o repositório. O `netlify.toml` já configura build, publish e
   pasta de functions automaticamente.
3. Em **Site settings > Environment variables**, adicione todas as variáveis
   do `.env.example` (os valores reais, claro) — tanto as `VITE_*` quanto as
   de backend (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `ANTHROPIC_API_KEY`).
4. Faça o deploy. Pronto — o site, a function HTTP (`run-radar`) e a function
   agendada (`daily-radar`) já vão junto.

## 5. Configurar a execução diária

Não precisa configurar nada além do deploy: `daily-radar.ts` já declara seu
próprio cron via:

```ts
export const config: Config = { schedule: '0 12 * * *' };
```

Isso equivale a **09:00 no horário de Brasília**. O motivo do `12 * * *` em
vez de `9 * * *`: o cron do Netlify Scheduled Functions é sempre em UTC, e o
Brasil aboliu o horário de verão em 2019 — então `America/Sao_Paulo` é
UTC-3 fixo o ano inteiro, sem exceção sazonal para se preocupar.

Depois do primeiro deploy, confira em **Netlify > Site > Functions** se
`daily-radar` aparece listada como *Scheduled*.

## 6. Importar o calendário (.ics)

1. Abra o Radar → **Importar calendário**.
2. Envie o arquivo `.ics`.
3. O parser identifica candidatos a pessoas (eventos marcados como
   `[aniversário]`, `[falecimento]`, "Morreu X", "X recebe sua estrela" etc.)
   e separa isso de datas comemorativas, jogos, eventos internos da equipe.
4. Revise a lista: desmarque quem não interessa, edite nomes, adicione
   manualmente quem faltar. Há também uma seção de "candidatos de baixa
   confiança" para nomes que apareceram soltos no calendário sem marcador
   explícito — revise manualmente antes de incluir.
5. Escolha categoria/prioridade padrão e confirme a importação.
6. Depois disso, gerencie tudo em **Pessoas monitoradas** — o `.ics` não é
   mais necessário.

> No repositório também deixei `seed-people.csv` (na raiz deste pacote,
> fora da pasta do projeto) com os ~639 nomes já extraídos do seu calendário,
> caso prefira revisar em planilha antes de reimportar pelo app.

## 7. Testar o radar manualmente

Em qualquer página do painel há o botão **▶ Executar radar agora**
(mais visível em **Status do radar**). Ele chama exatamente o mesmo pipeline
da execução automática das 09h — útil para testar sem esperar o cron, e
também serve como atualização manual a qualquer momento.

Se algo falhar, o erro aparece:
- no card de resultado ao lado do botão;
- na tabela de execuções em **Status do radar**;
- nos logs da function no painel do Netlify (**Functions > run-radar / daily-radar**).

## Sobre o plano gratuito do Netlify e o tamanho da lista de pessoas

O plano gratuito do Netlify encerra qualquer execução de função depois de
poucos segundos (Background Functions, que permitem até 15 minutos, exigem
plano pago). Por isso o pipeline foi ajustado para processar só um grupo
pequeno de pessoas por execução (as de prioridade mais alta, e quem faz mais
tempo que não é verificado primeiro) — e vai girando entre todo mundo ao
longo de várias execuções (a automática das 09h + quantas vezes você clicar
em "Executar radar agora").

**Na prática:** com centenas de pessoas cadastradas, cobrir todo mundo leva
vários dias. Duas formas de acelerar:
1. Clique em "Executar radar agora" várias vezes ao longo do dia — cada clique
   processa mais um grupo.
2. Em **Pessoas monitoradas**, use o botão **"Desativar todos"** e depois
   reative manualmente (buscando pelo nome) só quem realmente importa
   acompanhar de perto. Uma lista de 20-50 pessoas de alta prioridade é
   coberta em uma única execução, todo dia.

## Como o pipeline decide o que vira pauta

1. **Coleta** (`collectNews.ts`): busca notícias recentes (últimas 48h) de
   cada pessoa ativa via Google News RSS. Camada desacoplada — dá para trocar
   ou somar fontes sem tocar no resto do pipeline.
2. **Agrupamento** (`dedupe.ts`): se Billboard, Variety e Reuters cobrirem o
   mesmo fato, isso vira UMA notícia com várias fontes, não quatro.
3. **Checagem de histórico**: compara com títulos já salvos para a mesma
   pessoa nos últimos 5 dias, pra não repetir pauta.
4. **Curadoria com IA** (`curateNews.ts` + `prompt.ts`): o Claude avalia
   protagonismo, novidade, relevância jornalística, relevância para a
   Africanize, se é rumor ou fato confirmado, e define classificação
   (HOT/WATCH/DISCARD), nota de 0 a 10, formato recomendado e se é um alerta
   excepcional (morte, prisão, acusação grave etc.).
5. **Gravação**: tudo isso vai para `news_items`; o painel principal já
   esconde os `DISCARD` (ficam guardados só para fins de deduplicação
   histórica, não poluem a tela).

## Segurança

- `ANTHROPIC_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY` ficam **somente** em
  variáveis de ambiente do Netlify, usadas dentro das functions — nunca no
  bundle do frontend.
- O frontend usa apenas a chave `anon` do Supabase, protegida por Row Level
  Security (ver `supabase/schema.sql`): leitura liberada, mas gravação de
  notícias/execuções só acontece via `service_role` dentro das functions.
- Antes de abrir o Radar para mais gente além da equipe interna, vale trocar
  o RLS atual (aberto à chave anon) por Supabase Auth com policies por
  usuário.
