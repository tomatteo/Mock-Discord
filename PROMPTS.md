### Prompt — Responsividade da Tela de Configurações do Servidor
- **Ferramenta utilizada:** Google Gemini
- **Parte do trabalho:** Parte 2 — Front-end (CSS3 e JavaScript)[cite: 12]
- **Prompt completo:** "Baseado nesse site, como eu faria para fazer a responsividade para quando a tela ter certa proporção o site fique no modo mobile?"
- **Como a resposta foi aproveitada/modificada:** Utilizamos a explicação sobre CSS Media Queries (`@media (max-width: 768px)`) e o controle de classe via JavaScript (`window.innerWidth <= 768` com `.subtela-aberta`) para adaptar `style/config-servidor.css` e `js/config-servidor.js`, garantindo que telas largas exibam o layout de duas colunas do desktop e telas estreitas exibam o menu mobile com navegação em subtelas.