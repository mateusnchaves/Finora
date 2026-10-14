# Finora — Próximas etapas

> Continuação do [planejamento do MVP](mvp-plan.md) (fases 0 a 8, concluídas).
> Objetivo final: o Finora instalado no celular como app (PWA).

## 1. Ordem das fases

| Fase | Entrega | Estimativa* |
|---|---|---|
| 9. Base de produção | Login com Google, testes de ponta a ponta, monitoramento de erros | 1 semana |
| 10. Cartão de crédito | Faturas com fechamento e vencimento, compras parceladas, pagamento da fatura | 1–2 semanas |
| 11. Metas | "Caixinhas" com valor-alvo, prazo e progresso | 1 semana |
| 12. Insights com IA | Resumo do mês e perguntas em português sobre os próprios gastos | 1–2 semanas |
| 13. App no celular (PWA) | Instalável, abre sem internet, atalhos e notificações | 1–2 semanas |

\* Para quem está aprendendo e dedica algumas horas por dia.

Cada fase termina publicada na Vercel, com testes e README atualizados.

**Por que essa ordem:** a fase 9 é curta e evita problemas quando outras pessoas usarem o site.
O cartão e as metas deixam o app útil no dia a dia; metas vêm antes da IA por serem mais
simples. A IA usa os dados das fases anteriores (faturas, metas) para dar respostas melhores. O
PWA fica por último porque transforma tudo o que já existe em app de celular, inclusive as
notificações de fatura, orçamento e metas.

## 2. Fases

### Fase 9 — Base de produção
- [x] Apagar `.env.vercel`
- [x] Apagar o projeto duplicado `finora` na Vercel
- [x] README: redirect do Supabase passa a ser `https://<domínio>/**`
- [x] Login com Google (Google Cloud: projeto `finora-511523`, app publicado; página `/privacy`)
- [x] Testes de ponta a ponta com Playwright: cadastro/login, demo, criar lançamento, dashboard
- [ ] Playwright no CI do GitHub Actions (job pronto; falta cadastrar os secrets no GitHub)
- [x] Monitoramento de erros: tabela própria no Supabase (`npm run errors`), sem serviço externo

### Fase 10 — Cartão de crédito de verdade
- [x] Cartão ganha dia de fechamento, dia de vencimento e limite
- [x] Tela da fatura: aberta, fechada e próximas; total e itens de cada uma
- [x] Compra parcelada: "12x de R$ 150" gera 12 lançamentos ligados (`installment_group_id`),
      cada um na fatura do seu mês; excluir o grupo inteiro (editar vale por parcela)
- [x] Orçamento conta cada parcela no mês dela
- [x] Pagar fatura = transferência da conta corrente para o cartão (não conta duas vezes)
- [x] Limite disponível e aviso de fatura vencendo no dashboard
- [x] Importação: reconhecer "Parcela 3/12" no CSV do Nubank
- [x] Testes: cálculo de fatura (compra no dia do fechamento, meses curtos, virada de ano)

### Fase 11 — Metas ("caixinhas")
- [ ] Criar meta: nome, ícone, valor-alvo e prazo ("Viagem: R$ 8.000 até jul/2027")
- [ ] Guardar dinheiro na meta (aportes e retiradas), ligada opcionalmente a uma conta ou
      investimento
- [ ] Progresso: quanto já tem, quanto falta e quanto guardar por mês para chegar no prazo
- [ ] Status: no ritmo, atrasada, concluída (sempre com cor + palavra)
- [ ] Card de metas no dashboard
- [ ] Testes: valor mensal necessário, metas vencidas, meta sem prazo

### Fase 12 — Insights com IA
- [ ] Resumo do mês escrito pela IA ("Delivery subiu 18%, puxado pelo iFood de sexta à noite")
- [ ] Perguntas em português ("quanto gastei com Uber em agosto?")
- [ ] A IA só chama funções de leitura já existentes, com o cliente do próprio usuário (RLS
      continua valendo); nunca escreve no banco
- [ ] Cada resposta mostra de onde veio o número (link para os lançamentos filtrados)
- [ ] API do Claude só no servidor; limite de uso por usuário e cache do resumo mensal
- [ ] Conta demo com respostas prontas (sem custo de API)

### Fase 13 — App no celular (PWA) — objetivo final
- [ ] Antes de começar: trocar a secret key e a senha do banco do Supabase (e o token da brapi),
      atualizar `.env.local` e a Vercel, fazer redeploy e apagar as chaves antigas
- [ ] Antes de começar: desligar "Confirm email" no Supabase (o e-mail grátis tem limite de poucos
      envios por hora; Resend só envia para qualquer pessoa com domínio próprio)
- [ ] Manifest com nome, ícones e cores do Alvorada; instalável no Android e no iPhone
- [ ] Service worker: telas abrem sem internet com os últimos dados vistos
- [ ] Lançamento rápido offline, enviado quando a conexão voltar
- [ ] Atalhos no ícone do app: "Novo lançamento", "Fatura", "Metas"
- [ ] Notificações push: fatura vencendo, orçamento estourado, meta atingida
- [ ] Layout revisado para tela cheia (área segura do iPhone, barra inferior)
- [ ] Lighthouse PWA e desempenho no README

## 3. Depois do PWA (ideias)
- Open Finance (Pluggy): transações direto do banco; exige aprovação e cuidado com dados sensíveis
- Patrimônio a preço de mercado no histórico (guardar cotações diárias)
- Preços do Tesouro Direto (Tesouro Transparente)
- Relatório mensal em PDF
