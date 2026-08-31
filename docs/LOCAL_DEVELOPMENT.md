# Ambiente local e contrato de portas — LingoPilot

Este documento é normativo para desenvolvimento local do LingoPilot.

O objetivo é impedir colisões com projetos e infraestrutura que já executam na máquina de desenvolvimento, evitar comportamento não determinístico de ferramentas que escolhem portas automaticamente e manter URLs estáveis para autenticação, E2E e documentação.

## 1. Princípios

1. **Nenhum serviço do LingoPilot deve assumir a porta padrão de uma ferramenta.**
2. **Nenhum processo deve procurar automaticamente "a próxima porta livre".** Se a porta contratada estiver ocupada, o comando deve falhar com mensagem clara.
3. Portas de host são diferentes de portas internas de containers. Um PostgreSQL do LingoPilot pode continuar ouvindo `5432` dentro do container, mas deve ser publicado em uma porta de host exclusiva.
4. Novas portas só podem ser adicionadas após checar este documento e o registro local de projetos.
5. Não reutilizar uma porta de outro projeto apenas porque ele parece estar desligado naquele momento.
6. CI é um ambiente isolado e pode usar portas internas/default quando não houver colisão; isso não altera o contrato do host local.
7. Serviços locais devem preferir bind em `127.0.0.1`/`localhost` quando não houver necessidade explícita de exposição na rede.

## 2. Portas já ocupadas no ambiente

### Trabalho

| Porta | Serviço/projeto             |
| ----: | --------------------------- |
|  3000 | caiena                      |
|  3001 | fi-editor-api               |
|  3002 | fi-observatorio-app         |
|  3003 | fi-editor-local             |
|  3004 | caiena-reserved             |
|  3005 | caiena-reserved             |
|  3006 | caiena-reserved             |
|  3035 | fi-ferramentas-webpacker    |
|  1025 | fi-ferramentas-mailhog-smtp |
|  8025 | fi-ferramentas-mailhog-web  |
| 12345 | fi-ferramentas              |
| 12346 | fi-ferramentas              |

### Infraestrutura

| Porta | Serviço   |
| ----: | --------- |
|    80 | apache    |
|   443 | tailscale |
|  3306 | mysql     |
| 33060 | mysql-x   |
|  5432 | postgres  |
|  6379 | redis     |
| 11211 | memcached |

### Projetos pessoais

| Projeto           | Portas                                 |
| ----------------- | -------------------------------------- |
| home-music        | web `5173`, api `8787`, e2e `8791`     |
| dev-dashboard     | web `5174`, preview `4173`, api `4343` |
| controle-gastos   | web `5100`                             |
| loto-lab          | app `5200`, postgres `5434`            |
| portfolio-copilot | web `5300`, postgres `5433`            |

Os caminhos absolutos desses projetos são detalhes da máquina do desenvolvedor e não devem virar requisito de runtime do LingoPilot. O checkout pode ficar, por convenção pessoal, em `$HOME/Projetos/lingo-pilot`.

## 3. Portas reservadas para o LingoPilot

| Finalidade                       | Host        |    Porta | Observação                                                                                  |
| -------------------------------- | ----------- | -------: | ------------------------------------------------------------------------------------------- |
| Web / Next.js em desenvolvimento | `127.0.0.1` | **5400** | UI e endpoints HTTP da aplicação; não haverá API local separada no monólito modular inicial |
| Web para Playwright/E2E          | `127.0.0.1` | **5401** | servidor isolado de teste para não disputar a sessão de desenvolvimento                     |
| PostgreSQL local do projeto      | `127.0.0.1` | **5435** | mapping esperado `host:5435 -> container:5432`                                              |

Estas portas ficam reservadas ao projeto mesmo quando o processo não estiver ativo.

### URLs canônicas locais

```text
App dev:  http://localhost:5400
App E2E:  http://localhost:5401
Postgres: localhost:5435
```

Não usar `3000` como fallback do Next.js: essa porta já pertence ao ambiente de trabalho.

## 4. Contrato implementado no bootstrap

A Foundation já configura explicitamente as portas do web shell e impede o fallback automático do Next.js.

Comandos canônicos:

```text
pnpm dev      -> 127.0.0.1:5400
pnpm dev:e2e  -> 127.0.0.1:5401
```

Antes de iniciar o Next.js, `apps/web/scripts/port-contract.mjs` verifica se a porta contratada está livre. Se estiver ocupada, o processo termina com código diferente de zero e mensagem explícita; ele não tenta `5401`, `5402` ou qualquer outra porta como substituição silenciosa.

O bootstrap também versiona `.env.example` apenas com configuração pública que já existe de fato:

```dotenv
NEXT_PUBLIC_APP_URL=http://127.0.0.1:5400
```

Variáveis de PostgreSQL, autenticação e providers **não são antecipadas**. Elas entram nas issues que implementarem essas capacidades, com schema/validação e placeholders seguros.

A porta `5435` permanece reservada para PostgreSQL, mas nenhum banco é criado pela issue #7. A implementação do banco local pertence à #10; a configuração validada mais ampla pertence à #9; o isolamento completo de E2E pertence à #16.

## 5. Docker / PostgreSQL

Se PostgreSQL for executado por Docker Compose, a publicação de porta deve ser explícita:

```text
127.0.0.1:5435 -> postgres container:5432
```

Regras:

- não publicar `5432:5432` no host;
- não usar `5433` ou `5434`, pois já pertencem a outros projetos;
- usar volume/nome de projeto próprios para evitar colisão de containers, networks e volumes;
- o banco de testes deve ser isolado por database/schema/container conforme definido em #10/#16;
- CI pode usar `5432` dentro do runner isolado.

## 6. E2E

O Playwright deve iniciar/usar a aplicação em `5401` por configuração explícita.

O bootstrap já expõe `pnpm dev:e2e` em `5401`, mas Playwright e a infraestrutura E2E completa são responsabilidade da #16.

O E2E não deve:

- matar processo que esteja em `5400`;
- assumir que dev server não está rodando;
- escolher porta dinâmica silenciosamente;
- compartilhar banco mutável com o ambiente de desenvolvimento comum.

Isso permite manter `pnpm dev` aberto em `5400` enquanto a suite executa em ambiente próprio.

## 7. Verificação de conflito

Os scripts oficiais verificam a disponibilidade das portas web contratadas antes de subir o Next.js.

Se houver conflito, a mensagem informa:

- host/porta em conflito;
- que o LingoPilot não auto-incrementa portas;
- que o processo conflitante deve ser encerrado antes de tentar novamente.

Evitar o padrão comum de frameworks:

```text
Port 5400 is in use, trying 5401...
```

Esse comportamento é proibido para comandos oficiais do projeto, porque pode quebrar callbacks de auth, E2E, CORS/origin e documentação.

## 8. Novos serviços futuros

Speaking storage, filas, cache, mail catcher, observability local ou qualquer outro serviço futuro **não recebe uma porta antecipadamente**.

Ao introduzir um serviço novo:

1. confirmar que ele é necessário;
2. verificar portas já reservadas no ambiente;
3. escolher uma porta de host sem colisão;
4. atualizar este documento no mesmo PR;
5. atualizar `.env.example`, compose/config e testes aplicáveis;
6. registrar impacto em OAuth/CORS/CSP/callbacks quando relevante.

Não reservar intervalos inteiros sem necessidade.

## 9. Relação com issues de Foundation

- **#7:** implementa o web shell em `5400`, o servidor isolado em `5401` e o fail-fast de conflito de porta.
- **#9:** transforma configuração de ambiente em contrato validado e tipado conforme as capacidades forem introduzidas.
- **#10:** cria PostgreSQL/Drizzle/migrations e publica o banco local em `5435`.
- **#16:** implementa Playwright, isolamento de servidor/banco E2E e suporte determinístico de testes.

## 10. Regra para agentes de IA

Antes de criar ou alterar qualquer serviço local, container, dev server, test server ou callback URL, o agente deve consultar este arquivo.

Um agente **não pode** resolver colisão de porta escolhendo outra porta silenciosamente. Alterar o contrato de portas é uma mudança de configuração do projeto e precisa ser explícita, documentada e revisável em PR.
