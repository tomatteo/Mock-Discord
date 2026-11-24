# Mock Discord — Interface Web Responsiva

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Online-23A559?style=for-the-badge&logo=github)](https://tomatteo.github.io/Mock-Discord/)

Reprodução funcional e responsiva da interface web do **Discord**, desenvolvida como projeto acadêmico para a disciplina de Desenvolvimento Web no **Instituto Federal Catarinense (IFC) — Campus Concórdia**.

O objetivo do projeto é aplicar conceitos de estruturação semântica com HTML5, estilização modular e responsiva com CSS3 (Flexbox, Grid e Media Queries) e manipulação dinâmica do DOM com JavaScript puro (Vanilla JS), simulando o fluxo real de navegação, troca de canais, conversas privadas e persistência de dados no navegador sem dependência de back-end.

---

## Acesso ao Projeto

* **Aplicação Online (GitHub Pages):** https://tomatteo.github.io/Mock-Discord/
* **Repositório no GitHub:** https://github.com/tomatteo/Mock-Discord

---

## Integrantes

* **Matteo Thomé**
* **Filipe Nunes**
* **João Pedro Veloso**

---

## Instruções de Uso e Credenciais de Teste

1. Acesse a aplicação publicada em **[https://tomatteo.github.io/Mock-Discord/](https://tomatteo.github.io/Mock-Discord/)** (ou abra o arquivo `index.html` da raiz em um servidor local).
2. A aplicação inicia automaticamente na tela de **Login** (`src/index.html`).
3. Para entrar diretamente com a conta pré-configurada de testes, utilize as credenciais abaixo:
   * **E-mail:** `filipe@discord.mock`
   * **Senha:** `123456`
4. Caso prefira, também é possível registrar uma nova conta na tela de **Cadastro** (`src/cadastro.html`) ou acessar com qualquer outro e-mail e senha válidos.
5. **Persistência:** Mensagens privadas, contas, amizades e fotos de perfil ficam no MySQL. Preferências de interface e alguns dados locais continuam no `localStorage` do navegador.

---

## Funcionalidades Implementadas

* **Amigos e membros de servidores (`src/includes/amigos.php`, `src/includes/membrosServidor.php`):**
  * Solicitações por nome, ID ou `nome#ID`, com validação contra auto-adicionamento, contas inexistentes, duplicatas e amizades existentes.
  * Lista de amigos e solicitações recebidas, com ações para aceitar ou recusar.
  * Adição de amigos ao servidor aberto, sinalização de membros existentes e atualização dos membros por Socket.IO.
* **Atualizações em tempo real (`backend/server.js`):**
  * Socket.IO usa a sessão PHP existente e verifica no backend as permissões de amizade e de acesso ao servidor antes de publicar atualizações.
* **Autenticação e Sessão (`index.html`, `src/index.html`, `src/cadastro.html`):**
  * Validação de formulários com mensagens de erro exibidas diretamente na interface (sem uso de `alert()`, `prompt()` ou `confirm()`).
  * Exibição dinâmica do nome do usuário autenticado no painel inferior de todas as telas e suporte a *logout* nas configurações.
* **Página Inicial e Amigos (`src/inicio.html`):**
  * Filtragem dinâmica entre amigos **Disponíveis** (online), **Todos** e formulário para **Adicionar amigo**.
  * Busca em tempo real na lista de amigos e nas conversas diretas.
  * Barra lateral **"Ativo agora"**, exibindo exclusivamente amigos adicionados que estão online e em chamada de voz em servidores em comum.
* **Conversas Privadas / DM (`src/dm.php`):**
  * Lista de conversas gerada pelas amizades da conta autenticada e acesso validado para cada contato.
  * Histórico e envio de mensagens persistidos no MySQL e atualizados automaticamente sem recarregar a página.
  * Chamadas privadas de voz com sinalização Socket.IO, aceite/recusa e áudio WebRTC.
  * Fotos de perfil persistidas por usuário e exibidas nas conversas e na lista de amigos.
* **Servidores e Canais (`src/servidor.html`):**
  * Alternância entre canais de texto com históricos de mensagens independentes persistidos no `localStorage`.
  * Indicador visual lateral do servidor ativo e painel fixo do usuário sobreposto à base das barras laterais.
* **Criação de Servidores (`js/criar-servidor.js`):**
  * Modal reutilizável acionado pelo botão `+` na barra lateral, com upload e pré-visualização circular de ícone via `FileReader`, geração automática de iniciais e inserção dinâmica na lista de servidores.
* **Configurações do Servidor e do Usuário (`src/config-servidor.php`, `src/configuracoes.html`):**
  * Edição persistente de nome, ícone e cor do servidor selecionado, com pré-visualização em tempo real e acesso restrito ao dono e administradores.
* **Design Responsivo (Desktop e Mobile):**
  * Adaptação automática para telas estreitas (`<= 768px`) com navegação em subtelas e botões de retorno dedicados.

### Executar os serviços com Docker Compose

Execute `docker compose up --build` na pasta `Mock-Discord/`. O Compose inicia PHP, MySQL e Socket.IO; na primeira inicialização, o banco executa `database/discord.sql`. O SQL de inicialização só é aplicado quando o volume MySQL é criado pela primeira vez.

Se o volume MySQL já existia antes da atualização, aplique uma vez a migração de foto de perfil: `docker compose exec -T db mysql -uroot -proot discord < database/migrations/001-foto-perfil.sql`. O envio de fotos aceita JPEG, PNG e WebP de até 5 MB. Para receber uma chamada, o amigo precisa estar conectado e com essa conversa aberta. Chamadas precisam de HTTPS (o túnel Cloudflare atende esse requisito) ou `localhost`; redes que bloqueiam conexões diretas entre navegadores podem exigir um servidor TURN.

Na página inicial, use **Adicionar amigo** e informe o apelido, o ID numérico ou `apelido#ID`; os IDs aparecem junto aos nomes para resolver apelidos repetidos. As solicitações recebidas ficam na aba **Solicitações**. Em um servidor, use o botão **Convidar pessoas** para adicionar diretamente um amigo que ainda não seja membro.

---

## Estrutura do Projeto

```text
Mock-Discord/
├── index.html                  # Ponto de entrada (redireciona para o login)
├── README.md                   # Documentação geral do projeto
├── PROMPTS.md                  # Registro dos prompts utilizados no desenvolvimento
├── src/
│   ├── index.html              # Tela de Login
│   ├── cadastro.html           # Tela de Cadastro
│   ├── inicio.html             # Página Inicial (Amigos e Ativo Agora)
│   ├── dm.html                 # Tela de Mensagens Diretas (DM)
│   ├── servidor.html           # Tela Principal de Servidor e Canais
│   ├── config-servidor.php     # Configurações persistentes do Servidor
│   └── configuracoes.html      # Configurações do Usuário e Logout
├── style/
│   ├── style.css               # Estilos da tela de servidor e canais
│   ├── inicio.css              # Estilos da página inicial
│   ├── dm.css                  # Estilos da conversa privada
│   ├── config-servidor.css     # Estilos das configurações do servidor
│   ├── configuracoes.css       # Estilos das configurações do usuário
│   └── modal-servidor.css      # Estilos do modal de criação de servidor
└── js/
    ├── canais.js               # Lógica de troca de canais e mensagens do servidor
    ├── inicio.js               # Lógica de filtros de amigos e barra "Ativo agora"
    ├── dm.js                   # Lógica das mensagens diretas e busca no chat
    ├── config-servidor.js      # Lógica de preview e edição do servidor
    └── criar-servidor.js       # Injeção dinâmica do modal de novo servidor