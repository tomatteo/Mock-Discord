<?php
require_once __DIR__ . '/includes/conexao.php';
require_once __DIR__ . '/includes/autenticacao.php';
verificarLogin();

$stmt = $pdo->prepare('SELECT apelido, email, numero, foto_perfil FROM usuarios WHERE id = :usuario');
$stmt->execute([':usuario' => (int) $_SESSION['usuario_id']]);
$usuarioPerfil = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$usuarioPerfil) {
    http_response_code(404);
    exit('Usuário não encontrado.');
}

if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$inicialUsuario = mb_strtoupper(mb_substr($usuarioPerfil['apelido'], 0, 1, 'UTF-8'), 'UTF-8');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configurações do Usuário - Discord Mock</title>
    <link rel="stylesheet" href="../style/configuracoes.css">
    <link rel="stylesheet" href="../style/notificacoes.css?v=<?= filemtime(dirname(__DIR__) . '/assets/style/notificacoes.css') ?>">
    <link rel="stylesheet" href="../style/chamadas.css?v=<?= filemtime(dirname(__DIR__) . '/assets/style/chamadas.css') ?>">
    <link rel="stylesheet" href="../style/tipografia.css">
</head>
<body class="pagina-config" data-usuario-id="<?= (int) $_SESSION['usuario_id'] ?>" data-foto-perfil="<?= htmlspecialchars($usuarioPerfil['foto_perfil'] ?? '', ENT_QUOTES, 'UTF-8') ?>" data-csrf-token="<?= htmlspecialchars($_SESSION['csrf_token'], ENT_QUOTES, 'UTF-8') ?>">

    <!-- Overlay / Modal principal de Configurações -->
    <div id="layout-config" class="config-layout">
        
        <!-- Barra Lateral de Navegação (Menu de Opções) -->
        <aside class="config-sidebar" aria-label="Menu de configurações">
            <header class="usuario-resumo">
                <div class="avatar-usuario" id="avatar-inicial" aria-hidden="true"><?= htmlspecialchars($inicialUsuario, ENT_QUOTES, 'UTF-8') ?></div>
                <img id="img-avatar-sidebar" class="avatar-img-pequeno" src="" alt="Avatar do usuário logado" hidden>
                <span class="nome-usuario" id="nome-usuario-sidebar"><?= htmlspecialchars($usuarioPerfil['apelido'], ENT_QUOTES, 'UTF-8') ?></span>
                <a href="inicio.php" class="btn-fechar-mobile-lista" aria-label="Fechar configurações">✕</a>
            </header>

            <nav class="config-nav">
                <button type="button" class="aba-nav" data-aba="conta">
                    <span>Conta</span>
                </button>
                <button type="button" class="aba-nav ativo" data-aba="voz">
                    <span>Voz e Áudio</span>
                </button>
                <button type="button" class="aba-nav" data-aba="sobre">
                    <span>Sobre Nós</span>
                </button>
            </nav>

            <div class="sidebar-acoes-extra">
                <form action="sair.php" method="post">
                    <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token'], ENT_QUOTES, 'UTF-8') ?>">
                    <button type="submit" id="btn-sair-conta" class="btn-sair">Sair da Conta</button>
                </form>
            </div>
        </aside>

        <!-- Área de Conteúdo da Aba Selecionada -->
        <main class="config-conteudo">
            
            <!-- Cabeçalho Mobile com botão Voltar (visível apenas <= 768px) -->
            <header class="cabecalho-mobile">
                <button type="button" id="btn-voltar-mobile" class="btn-voltar" aria-label="Voltar para opções">
                    ←
                </button>
                <h2 id="titulo-mobile-subtela">Voz</h2>
            </header>

            <!-- Botão Fechar Desktop (X no canto superior direito) -->
            <a href="inicio.php" class="btn-fechar-desktop" title="Fechar Configurações" aria-label="Fechar configurações">
                ✕
            </a>

            <!-- ============================================================
                 ABA 1: CONTA
                 ============================================================ -->
            <section id="painel-conta" class="painel-aba" hidden>
                <h1>Minha Conta</h1>

                <article class="card-perfil">
                    <div class="perfil-topo">
                        <div class="avatar-container">
                            <div class="avatar-grande" id="avatar-perfil"><?= htmlspecialchars($inicialUsuario, ENT_QUOTES, 'UTF-8') ?></div>
                            <img id="img-avatar-perfil" class="avatar-img-grande" src="" alt="Foto de perfil do usuário" hidden>
                        </div>
                        <div class="perfil-info-acoes">
                            <h2 id="perfil-username"><?= htmlspecialchars($usuarioPerfil['apelido'], ENT_QUOTES, 'UTF-8') ?></h2>
                            <p class="texto-suave">Status: Online</p>
                            <div class="botoes-foto">
                                <label for="input-foto-perfil" class="btn-primario btn-pequeno">Alterar Foto</label>
                                <input type="file" id="input-foto-perfil" accept="image/jpeg,image/png,image/webp" hidden>
                                <button type="button" id="btn-remover-foto" class="btn-secundario btn-pequeno" hidden>Remover</button>
                            </div>
                            <p id="status-foto-perfil" class="texto-status-mic" role="status" aria-live="polite"></p>
                        </div>
                    </div>

                    <div class="lista-dados-conta">
                        <div class="dado-item">
                            <span class="dado-label">Nome de Usuário</span>
                            <span class="dado-valor" id="valor-username"><?= htmlspecialchars($usuarioPerfil['apelido'], ENT_QUOTES, 'UTF-8') ?></span>
                        </div>
                        <div class="dado-item">
                            <span class="dado-label">E-mail</span>
                            <span class="dado-valor" id="valor-email"><?= htmlspecialchars($usuarioPerfil['email'], ENT_QUOTES, 'UTF-8') ?></span>
                        </div>
                        <div class="dado-item">
                            <span class="dado-label">Telefone</span>
                            <span class="dado-valor" id="valor-telefone"><?= htmlspecialchars($usuarioPerfil['numero'], ENT_QUOTES, 'UTF-8') ?></span>
                        </div>
                    </div>
                </article>
            </section>

            <!-- ============================================================
                 ABA 2: VOZ E ÁUDIO (Padrão aberto, fiel ao wireframe)
                 ============================================================ -->
            <section id="painel-voz" class="painel-aba ativo">
                <h1>Voz</h1>

                <div class="grid-voz">
                    <!-- Coluna Microfone -->
                    <div class="campo-voz">
                        <label for="select-microfone">Microfone</label>
                        <div class="select-wrapper">
                            <span class="select-icone" aria-hidden="true">🎙️</span>
                            <select id="select-microfone" name="microfone">
                                <option value="padrao">Padrão do Windows</option>
                                <option value="headset">Fone de ouvido (Headset)</option>
                                <option value="externo">Microfone Condensador USB</option>
                            </select>
                        </div>
                    </div>

                    <!-- Coluna Alto-falante -->
                    <div class="campo-voz">
                        <label for="select-altofalante">Alto-falante</label>
                        <div class="select-wrapper">
                            <span class="select-icone" aria-hidden="true">🎧</span>
                            <select id="select-altofalante" name="altofalante">
                                <option value="padrao">Padrão do Windows</option>
                                <option value="headset">Headset Gamer Stereo</option>
                                <option value="monitor">Saída de Áudio Monitor</option>
                            </select>
                        </div>
                    </div>

                    <!-- Slider Volume do Microfone -->
                    <div class="campo-voz">
                        <div class="label-com-valor">
                            <label for="volume-microfone">Volume do Microfone</label>
                            <span id="texto-vol-mic" class="valor-slider">80%</span>
                        </div>
                        <input type="range" id="volume-microfone" min="0" max="100" value="80" class="slider-discord">
                    </div>

                    <!-- Slider Volume do Alto-falante -->
                    <div class="campo-voz">
                        <div class="label-com-valor">
                            <label for="volume-altofalante">Volume do Alto-falante</label>
                            <span id="texto-vol-falante" class="valor-slider">85%</span>
                        </div>
                        <input type="range" id="volume-altofalante" min="0" max="100" value="85" class="slider-discord">
                    </div>
                </div>

                <!-- Teste de Microfone + Medidor de Barras -->
                <div class="teste-mic-container">
                    <button type="button" id="btn-teste-mic" class="btn-primario">
                        Teste de microfone
                    </button>
                    <div id="medidor-barras" class="medidor-barras" role="progressbar" aria-label="Nível de captação do microfone" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                        <!-- Barras geradas dinamicamente via JS -->
                    </div>
                </div>
                <p id="status-teste-mic" class="texto-status-mic"></p>
            </section>

            <!-- ============================================================
                 ABA 3: SOBRE NÓS (Com tabela e aviso acadêmico do edital)
                 ============================================================ -->
            <section id="painel-sobre" class="painel-aba" hidden>
                <h1>Sobre Nós</h1>

                <article class="sobre-texto">
                    <p>
                        Este projeto é um clone funcional da interface do <strong>Discord</strong> desenvolvido exclusivamente para fins educacionais na disciplina de <strong>Desenvolvimento Web I</strong> (IFC — Campus Concórdia).
                    </p>
                    <p>
                        Não possui qualquer vínculo com a Discord Inc. Todos os usuários, servidores, canais e mensagens apresentados são inteiramente fictícios.
                    </p>
                </article>

                <div class="tabela-wrapper">
                    <h2>Equipe e Módulos do Projeto</h2>
                    <table class="tabela-equipe">
                        <thead>
                            <tr>
                                <th>Integrante</th>
                                <th>Módulo Responsável</th>
                                <th>Tecnologias</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Filipe Nunes</td>
                                <td>Login, Registro e Configurações de Voz</td>
                                <td>HTML5, CSS3, JS (localStorage)</td>
                            </tr>
                            <tr>
                                <td>Matteo Thomé</td>
                                <td>Servidores, Canais de Texto e Mensagens</td>
                                <td>HTML5, CSS3, JS</td>
                            </tr>
                            <tr>
                                <td>João Pedro Veloso</td>
                                <td>Lista de Amigos e Mensagens Diretas (DM)</td>
                                <td>HTML5, CSS3, JS</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <footer class="rodape-config">
                <p>Clone educacional do Discord — IFC Campus Concórdia. Sem vínculo comercial; dados fictícios.</p>
            </footer>
        </main>
    </div>

    <script src="/socket.io/socket.io.js" onerror="console.error('Servidor em tempo real indisponível.')"></script>
    <script src="../js/sons.js?v=<?= filemtime(dirname(__DIR__) . '/assets/js/sons.js') ?>"></script>
    <script src="../js/chamadas.js?v=<?= filemtime(dirname(__DIR__) . '/assets/js/chamadas.js') ?>"></script>
    <script src="../js/notificacoes.js?v=<?= filemtime(dirname(__DIR__) . '/assets/js/notificacoes.js') ?>"></script>
    <script src="../js/configuracoes.js"></script>
</body>
</html>