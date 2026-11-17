### Prompt — Responsividade da Tela de Configurações do Servidor
- **Ferramenta utilizada:** Google Gemini
- **Parte do trabalho:** Parte 2 — Front-end (CSS3 e JavaScript)[cite: 12]
- **Prompt completo:** "Baseado nesse site, como eu faria para fazer a responsividade para quando a tela ter certa proporção o site fique no modo mobile?"
- **Como a resposta foi aproveitada/modificada:** Utilizamos a explicação sobre CSS Media Queries (`@media (max-width: 768px)`) e o controle de classe via JavaScript (`window.innerWidth <= 768` com `.subtela-aberta`) para adaptar `style/config-servidor.css` e `js/config-servidor.js`, garantindo que telas largas exibam o layout de duas colunas do desktop e telas estreitas exibam o menu mobile com navegação em subtelas.

### Prompt — Persistência de Dados no Front-end sem Banco de Dados
- **Ferramenta utilizada:** Google Gemini
- **Arquivos envolvidos:** `js/canais.js`, `js/dm.js`, `js/criar-servidor.js`, `js/config-servidor.js`
- **Prompt utilizado:** *"Como faço para salvar por enquanto os dados do site (como o usuário logado, os servidores criados e as mensagens enviadas) sem precisar usar um banco de dados agora?"*
- **Como a resposta foi aproveitada e ajustada:** Implementamos a API `localStorage` do navegador combinada com `JSON.stringify()` e `JSON.parse()` para persistir localmente o usuário autenticado (`mock_discord_usuario`), os servidores personalizados (`mock_discord_servidores`), a personalização de perfil do servidor (`mock_discord_server_config`) e o histórico separado de mensagens por canal e DM, garantindo que as interações sobrevivam ao recarregamento da página sem depender de servidor back-end nesta etapa.

### Prompt — Linkagem Completa das Páginas, Fluxo de Login e Persistência
- **Ferramenta utilizada:** GitHub Copilot (VS Code)
- **Arquivos envolvidos:** `index.html`, `src/index.html`, `src/cadastro.html`, `src/inicio.html`, `src/dm.html`, `src/servidor.html`, `src/config-servidor.html`, `src/configuracoes.html`, `js/inicio.js`, `js/dm.js`, `js/canais.js`, `js/config-servidor.js`
- **Prompt utilizado:** *"Analise os arquivos do projeto e faça toda a linkagem entre as páginas: quando o usuário abrir o site, deve começar na página de login; ao validar e entrar, deve ir para a página inicial (`inicio.html`). Conecte o ícone do Discord para voltar ao início, faça o clique nos servidores abrir `servidor.html` e o clique nos amigos abrir a conversa privada (`dm.html`) já carregando o amigo selecionado. No servidor, permita clicar nos canais de texto para carregar mensagens separadas por canal e salvas no `localStorage`, além de conectar as configurações do servidor e o logout, sem usar `alert()`, `prompt()` ou `confirm()`."*
- **Como a resposta foi aproveitada e ajustada:** A IA conectou o fluxo completo de navegação partindo do `index.html` da raiz para a tela de login, salvando a sessão do usuário no `localStorage` para exibir seu nome no painel inferior de todas as telas e permitindo encerrar a sessão nas configurações. Também implementou a passagem de parâmetros via `URLSearchParams` (para abrir a DM do amigo ou o servidor clicado) e a separação do histórico de mensagens por canal de texto no `localStorage`. Após a geração, revisamos os caminhos relativos de scripts e estilos e testamos todos os redirecionamentos diretamente pelo Console do navegador.

### Prompt — Padronização da Responsividade Mobile em Todas as Telas
- **Ferramenta utilizada:** GitHub Copilot (VS Code)
- **Arquivos envolvidos:** `style/config-servidor.css`, `js/config-servidor.js`, `style/inicio.css`, `style/dm.css`, `style/style.css`, `style/configuracoes.css`, `js/inicio.js`, `js/dm.js`, `js/canais.js`
- **Prompt utilizado:** *"Analise como a responsividade e a ativação do modo mobile foram implementadas na tela de configurações do servidor (`config-servidor.css` e `config-servidor.js`, usando o breakpoint de `768px` e o controle de visualização via `window.innerWidth <= 768`) e aplique o mesmo padrão nas demais telas do projeto (`inicio`, `dm`, `servidor` e `configuracoes`), garantindo que janelas médias ou divididas no desktop mantenham o layout completo e o modo mobile seja ativado apenas quando a tela ficar estreita."*
- **Como a resposta foi aproveitada e ajustada:** O Copilot replicou o mesmo breakpoint (`@media (max-width: 768px)`) e as verificações de largura de tela no JavaScript (`window.innerWidth <= 768`) em todos os estilos e scripts restantes do sistema. Isso unificou o comportamento responsivo do projeto, evitando que o layout mobile fosse ativado prematuramente em monitores com janela dividida e padronizando a alternância entre listas laterais e áreas de conteúdo em telas pequenas.

