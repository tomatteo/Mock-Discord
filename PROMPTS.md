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

### Prompt — Busca em Tempo Real e Renderização Segura de Mensagens no Chat
- **Ferramenta utilizada:** Google Gemini
- **Arquivos envolvidos:** `js/inicio.js`, `js/dm.js`, `style/dm.css`
- **Prompt utilizado:** *"Como implementar uma busca em tempo real para filtrar a lista de amigos, as conversas na barra lateral e o histórico de mensagens dentro do chat conforme o usuário digita, além de garantir que o envio de mensagens role automaticamente para o final sem quebrar o HTML caso alguém digite tags?"*
- **Como a resposta foi aproveitada e ajustada:** Adicionamos ouvintes do evento `input` nos campos de busca de `inicio.js` e `dm.js` para filtrar os elementos do DOM instantaneamente usando `.toLowerCase().includes()`. Para a exibição de novas mensagens, substituímos o uso de `innerHTML` pela criação programática de elementos (`document.createElement`) com `.textContent`, evitando falhas de injeção de código (XSS), e combinamos `margin-top: auto` no CSS com `scrollTop = scrollHeight` no JavaScript para manter as mensagens sempre ancoradas na base do chat.


### Prompt — Validação de Formulários no Cliente sem `alert()` e Máscara de Telefone
- **Ferramenta utilizada:** Google Gemini
- **Arquivos envolvidos:** `js/auth.js`, `index.html`, `register.html`
- **Prompt utilizado:** *"Como validar campos de e-mail, senha e telefone em JavaScript puro exibindo as mensagens de erro diretamente abaixo de cada input no HTML, além de formatar o telefone automaticamente enquanto o usuário digita?"*
- **Como a resposta foi aproveitada e ajustada:** Aproveitamos a lógica de manipulação do DOM com `addEventListener` e a expressão regular de formatação `(XX) XXXXX-XXXX` para exibir os avisos de validação diretamente nos elementos `<span>` abaixo de cada campo, sem utilizar `alert()`. Em seguida, adaptamos o script por conta própria para integrar a verificação de contas fictícias pré-definidas e o armazenamento dos novos cadastros no `localStorage`.

### Prompt — Alternância entre Menu Lateral e Subtela no Modo Mobile
- **Ferramenta utilizada:** Google Gemini
- **Arquivos envolvidos:** `style/configuracoes.css`, `js/configuracoes.js`
- **Prompt utilizado:** *"Como fazer para que, em telas menores que 768px, a tela de configurações mostre primeiro a lista de opções e só exiba o conteúdo da aba quando o usuário clicar nela, com um botão de voltar no topo?"*
- **Como a resposta foi aproveitada e ajustada:** Utilizamos a ideia de alternar a classe `.subtela-aberta` no container principal via verificação `window.innerWidth <= 768` e associar um evento de clique ao botão de voltar no cabeçalho mobile. Todo o layout das abas (Conta, Voz e Áudio, Sobre Nós), os sliders de volume e a tabela da equipe foram estruturados e ajustados pelo grupo no HTML e CSS.

### Prompt — Simulação e Captação de Nível de Áudio para Teste de Microfone
- **Ferramenta utilizada:** Google Gemini
- **Arquivos envolvidos:** `js/configuracoes.js`, `src/configuracoes.html`
- **Prompt utilizado:** *"Como criar um medidor visual em barras para testar o microfone no navegador usando JavaScript, com uma simulação automática caso o usuário não permita acesso ao áudio?"*
- **Como a resposta foi aproveitada e ajustada:** Adaptamos o trecho sugerido com `AudioContext` e `setInterval` para criar e preencher dinamicamente as 32 barras de nível conforme o valor do slider de volume do microfone definido pelo usuário, integrando o funcionamento ao restante da aba de Voz e Áudio e salvando as preferências no `localStorage`.