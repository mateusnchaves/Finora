# Finora — Planejamento do MVP

> Status: as oito fases foram concluídas. Detalhes técnicos no README.

> Aplicativo web de gestão financeira pessoal. Projeto de portfólio.

## 1. Decisões

| Tema | Decisão |
|---|---|
| Plataforma | Web responsiva (desktop e celular) |
| Stack | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui |
| Banco e login | Supabase (Postgres + Auth com e-mail e Google) |
| Gráficos | Recharts |
| Deploy | Vercel |
| Acesso | Login real + botão **"Entrar como demo"** (conta com 6 meses de dados fictícios) |
| Entrada de dados | Lançamento manual + importação de extrato (OFX/CSV) |
| Visual | Tema claro com opção de modo escuro; verde para receitas, vermelho para despesas |
| Idioma | Interface em PT-BR; código, commits e README em inglês |

## 2. Telas

### 2.1 Dashboard (tela principal)
- **Cards no topo**: Receitas do mês, Despesas do mês, Saldo do mês, Patrimônio total
- **Seletor de mês** (‹ outubro 2026 ›)
- **Para onde foi o dinheiro**: gráfico de rosca das despesas por categoria; clicar em uma categoria filtra os lançamentos
- **Receitas x Despesas**: gráfico de barras dos últimos 6 meses
- **Orçamentos**: barras de progresso por categoria (verde até 80%, amarelo de 80% a 100%, vermelho acima de 100%)
- **Maiores gastos do mês**: top 5 lançamentos
- **Botão flutuante "+"**: lançamento rápido em menos de 5 segundos

### 2.2 Lançamentos
- Lista com filtros (período, conta, categoria, tipo e busca por texto)
- Criar, editar e excluir lançamentos
- Marcar um lançamento como **recorrente** (mensal)
- **Importar extrato**: upload de OFX/CSV → prévia em tabela → categorização automática por palavra-chave (ex.: "IFOOD" → Alimentação) → confirmar
- Detecção de duplicados na importação

### 2.3 Contas
- Contas correntes, carteira (dinheiro) e cartão de crédito
- Saldo de cada conta = saldo inicial + receitas − despesas
- Transferência entre contas (não conta como receita nem como despesa)

### 2.4 Orçamentos
- Limite mensal por categoria
- Comparação entre o orçado e o realizado

### 2.5 Investimentos
- **Resumo**: total investido, valor atual, rentabilidade em R$ e em %
- **Gráfico de alocação** por classe: Ações BR, FIIs, ETFs, Renda Fixa, Cripto, Internacional
- **Tabela de ativos**: quantidade, preço médio, preço atual, variação
- **Cadastro de operações**: compra e venda (o preço médio é calculado pelo app)
- **Renda fixa**: cadastro de valor, data de aplicação, indexador (Pré, % do CDI, IPCA+) e vencimento → valor atual calculado

### 2.6 Configurações
- Categorias personalizadas (nome, ícone e cor)
- Tema claro/escuro
- Perfil

## 3. APIs de cotação

| Classe | Fonte | Observação |
|---|---|---|
| Ações, FIIs, ETFs (B3) | brapi.dev | Plano gratuito com token; limite de requisições |
| Ações dos EUA | brapi.dev ou Alpha Vantage | Preço em USD |
| Dólar (câmbio) | AwesomeAPI (economia.awesomeapi.com.br) | Gratuita, sem token |
| Cripto | CoinGecko | Gratuita, com limite de taxa |
| CDI / IPCA / Selic | API do Banco Central (SGS) | Gratuita, sem token |
| Tesouro Direto | Tesouro Transparente (dados abertos) | Preço diário por título |

**Estratégia de cache:** guardar as cotações numa tabela `quotes`, atualizadas no máximo a cada 15 min (ações e cripto) e uma vez por dia (CDI, IPCA e Tesouro). Isso evita estourar o limite das APIs gratuitas e deixa o app rápido. As chamadas às APIs ficam no servidor (Route Handlers do Next.js) e nunca no navegador, para não expor os tokens.

## 4. Modelo de dados (Postgres / Supabase)

```
profiles        (id, name, avatar_url, created_at)
accounts        (id, user_id, name, type[checking|wallet|credit_card], initial_balance, color)
categories      (id, user_id, name, type[income|expense], icon, color)
transactions    (id, user_id, account_id, category_id, type[income|expense|transfer],
                 amount, date, description, recurring_id?, import_batch_id?, external_id?)
recurring_rules (id, user_id, account_id, category_id, type, amount, description,
                 day_of_month, start_date, end_date?)
budgets         (id, user_id, category_id, month, amount)
assets          (id, user_id, class[stock_br|fii|etf|crypto|stock_us|fixed_income],
                 ticker?, name)
asset_trades    (id, asset_id, type[buy|sell], quantity, price, date, fees)
fixed_income    (id, asset_id, principal, start_date, maturity_date,
                 index[pre|cdi|ipca], rate)
quotes          (ticker, price, currency, updated_at)   -- cache compartilhado
```

Todas as tabelas com `user_id` usam **Row Level Security (RLS)**, para que cada usuário veja somente os próprios dados. Vale destacar isso no README.

## 5. Fases de desenvolvimento

Cada fase termina com algo funcionando e publicado na Vercel.

| Fase | Entrega | Estimativa* |
|---|---|---|
| 0. Setup | Projeto Next.js, Tailwind, shadcn, Supabase, deploy na Vercel, layout com menu lateral, tema claro/escuro | 1 semana |
| 1. Autenticação | Cadastro, login por e-mail, conta demo com seed de dados (Google fica para depois) | 1 semana |
| 2. Lançamentos | Contas, categorias, CRUD de lançamentos, filtros | 1–2 semanas |
| 3. Dashboard | Cards, gráfico de rosca, barras, top gastos, seletor de mês | 1 semana |
| 4. Orçamentos + recorrentes | Limites por categoria e geração automática mensal | 1 semana |
| 5. Importação | Upload de OFX/CSV, prévia, auto-categorização, duplicados | 1 semana |
| 6. Investimentos (renda variável) | Ativos, operações, preço médio, cotações (brapi, CoinGecko, câmbio) | 1–2 semanas |
| 7. Renda fixa | Cálculo com CDI, IPCA e prefixado; Tesouro Direto | 1 semana |
| 8. Patrimônio + polimento | Evolução do patrimônio, responsividade, estados vazios, README com GIFs | 1 semana |

\* Estimativa para quem está aprendendo e dedica algumas horas por dia.

**Dica:** se quiser algo para mostrar logo, as fases 0 a 3 já formam um portfólio apresentável. O restante entra em seguida.

## 6. Diferenciais para o portfólio
- README em inglês com GIF, link do deploy, botão de demo, diagrama do banco e decisões técnicas
- RLS no Supabase (segurança)
- Testes no cálculo de renda fixa e de preço médio (Vitest), que é onde está a regra de negócio
- CI no GitHub Actions (lint + testes)
- Commits organizados (Conventional Commits)

## 7. Pré-requisitos (contas gratuitas)
- [ ] GitHub
- [ ] Supabase
- [ ] Vercel (login com GitHub)
- [ ] brapi.dev (gerar token)
- [ ] Node.js LTS instalado na máquina
- [ ] VS Code

## 8. Fora do MVP (ideias futuras)
- Open Finance (Pluggy/Belvo)
- Metas de economia ("Viagem: R$ 5.000 até dez/2027")
- Fatura de cartão com parcelamentos
- Insights com IA ("Você gastou 30% a mais com delivery este mês")
- Exportar relatório em PDF
- PWA instalável
