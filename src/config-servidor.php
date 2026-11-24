<?php
require_once __DIR__ . '/includes/conexao.php';
require_once __DIR__ . '/includes/autenticacao.php';
verificarLogin();

$idServidor = filter_input(INPUT_GET, 'servidor', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
if (!$idServidor) {
    header('Location: inicio.php');
    exit;
}

$stmt = $pdo->prepare(
    'SELECT s.id, s.id_dono, s.nome, s.icone, s.cor, s.data_cadastro,
            EXISTS(
                SELECT 1
                FROM servidores_usuario su_admin
                INNER JOIN servidor_cargos sc ON sc.id = su_admin.id_cargo
                    AND sc.id_servidor = su_admin.id_servidor
                WHERE su_admin.id_servidor = s.id
                    AND su_admin.id_usuario = :usuario_admin
                    AND sc.adm = TRUE
            ) AS usuario_administrador
     FROM servidores s
     INNER JOIN servidores_usuario su ON su.id_servidor = s.id
     WHERE s.id = :servidor AND su.id_usuario = :usuario_membro'
);
$stmt->execute([
    ':usuario_admin' => (int) $_SESSION['usuario_id'],
    ':servidor' => $idServidor,
    ':usuario_membro' => (int) $_SESSION['usuario_id']
]);
$servidor = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$servidor) {
    header('Location: inicio.php');
    exit;
}

$podeGerenciar = (int) $servidor['id_dono'] === (int) $_SESSION['usuario_id']
    || (bool) $servidor['usuario_administrador'];
if (!$podeGerenciar) {
    http_response_code(403);
    exit('Somente o dono ou um administrador pode acessar as configurações do servidor.');
}

if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

$coresDisponiveis = [
    '#8B8C5B', '#E600FF', '#D3383B', '#C97A16', '#F7F700',
    '#8A56C2', '#2B72C4', '#14C4A8', '#2E7D1E', '#1A1A1A'
];
$corServidor = strtoupper((string) $servidor['cor']);
if (!in_array($corServidor, $coresDisponiveis, true)) {
    $corServidor = '#2B72C4';
}
$iconeServidor = trim((string) $servidor['icone']);
$erroPerfil = '';
$perfilSalvo = isset($_GET['salvo']) && $_GET['salvo'] === '1';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_POST['csrf_token'] ?? '';
    if (!is_string($token) || !hash_equals($_SESSION['csrf_token'], $token)) {
        http_response_code(403);
        exit('Sua sessão expirou. Atualize a página e tente novamente.');
    }

    $nomeServidor = is_string($_POST['nome'] ?? null) ? trim($_POST['nome']) : '';
    $corSolicitada = is_string($_POST['cor'] ?? null) ? strtoupper(trim($_POST['cor'])) : '';
    $removerIcone = ($_POST['removerIcone'] ?? '') === '1';
    $arquivo = $_FILES['icone'] ?? null;
    $arquivoMovido = null;
    $novoIcone = $iconeServidor;

    if (!preg_match('/\A.{2,25}\z/us', $nomeServidor)) {
        $erroPerfil = 'O nome do servidor deve ter entre 2 e 25 caracteres.';
    } elseif (!in_array($corSolicitada, $coresDisponiveis, true)) {
        $erroPerfil = 'Selecione uma cor válida para o servidor.';
    } elseif ($arquivo && $arquivo['error'] !== UPLOAD_ERR_NO_FILE) {
        if ($arquivo['error'] !== UPLOAD_ERR_OK) {
            $erroPerfil = 'Não foi possível enviar o ícone do servidor.';
        } elseif ($arquivo['size'] > 5 * 1024 * 1024) {
            $erroPerfil = 'O ícone do servidor não pode exceder 5 MB.';
        } else {
            $tiposPermitidos = [
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/webp' => 'webp'
            ];
            $tipoMime = (new finfo(FILEINFO_MIME_TYPE))->file($arquivo['tmp_name']);
            if (!isset($tiposPermitidos[$tipoMime])) {
                $erroPerfil = 'O ícone deve estar no formato JPG, PNG ou WEBP.';
            } else {
                $diretorioImagens = getenv('SERVER_ICONS_DIR') ?: __DIR__ . '/img';
                if (!is_dir($diretorioImagens)
                    && !mkdir($diretorioImagens, 0775, true)
                    && !is_dir($diretorioImagens)
                ) {
                    throw new RuntimeException('Não foi possível preparar o diretório de ícones.');
                }

                $nomeArquivo = bin2hex(random_bytes(16)) . '.' . $tiposPermitidos[$tipoMime];
                $arquivoMovido = $diretorioImagens . '/' . $nomeArquivo;
                if (!move_uploaded_file($arquivo['tmp_name'], $arquivoMovido)) {
                    throw new RuntimeException('Não foi possível salvar o ícone do servidor.');
                }
                $novoIcone = 'img/' . $nomeArquivo;
            }
        }
    } elseif ($removerIcone) {
        $novoIcone = '';
    }

    if ($erroPerfil === '') {
        try {
            $stmt = $pdo->prepare(
                'UPDATE servidores
                 SET nome = :nome, icone = :icone, cor = :cor
                 WHERE id = :servidor'
            );
            $stmt->execute([
                ':nome' => $nomeServidor,
                ':icone' => $novoIcone,
                ':cor' => $corSolicitada,
                ':servidor' => $idServidor
            ]);
        } catch (Throwable $erro) {
            if ($arquivoMovido !== null && is_file($arquivoMovido)) {
                unlink($arquivoMovido);
            }
            throw $erro;
        }

        if ($novoIcone !== $iconeServidor
            && preg_match('/\Aimg\/[a-f0-9]{32}\.(?:jpg|png|webp)\z/', $iconeServidor)
        ) {
            $caminhoAntigo = (getenv('SERVER_ICONS_DIR') ?: __DIR__ . '/img')
                . '/' . basename($iconeServidor);
            if (is_file($caminhoAntigo) && !unlink($caminhoAntigo)) {
                error_log('Não foi possível remover o ícone antigo do servidor ' . $idServidor . '.');
            }
        }

        header('Location: config-servidor.php?servidor=' . $idServidor . '&salvo=1');
        exit;
    }

    $servidor['nome'] = $nomeServidor;
    $servidor['cor'] = $corSolicitada;
    $servidor['icone'] = $novoIcone;
    $corServidor = $corSolicitada;
    $iconeServidor = $novoIcone;
}

$stmt = $pdo->prepare(
    'SELECT u.id, u.apelido, sc.nome AS cargo, sc.adm, sc.moderador, sc.membro
     FROM servidores_usuario su
     INNER JOIN usuarios u ON u.id = su.id_usuario
     INNER JOIN servidor_cargos sc ON sc.id = su.id_cargo
         AND sc.id_servidor = su.id_servidor
     WHERE su.id_servidor = :servidor
     ORDER BY sc.adm DESC, sc.moderador DESC, u.apelido, u.id'
);
$stmt->execute([':servidor' => $idServidor]);
$membrosServidor = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stmt = $pdo->prepare(
    'SELECT u_solicitado.apelido AS solicitado, u_solicitante.apelido AS solicitante, sc.nome AS servidor
     FROM servidor_convites cv
     INNER JOIN usuarios u_solicitado ON u_solicitado.id = cv.id_usuario_solicitado
     INNER JOIN usuarios u_solicitante ON u_solicitante.id = cv.id_usuario_solicitante
     INNER JOIN servidores sc ON sc.id = cv.id_servidor
     WHERE cv.id_servidor = :servidor
     ORDER BY cv.data_cadastro DESC, cv.id DESC'
);
$stmt->execute([':servidor' => $idServidor]);
$convitesServidor = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stmt = $pdo->prepare(
    'SELECT u.apelido, sb.motivo, sb.data_banimento, sb.data_limite
     FROM servidor_banimentos sb
     INNER JOIN usuarios u ON u.id = sb.id_usuario
     WHERE sb.id_servidor = :servidor
       AND (sb.data_limite IS NULL OR sb.data_limite > NOW())
     ORDER BY sb.data_banimento DESC'
);
$stmt->execute([':servidor' => $idServidor]);
$banimentosServidor = $stmt->fetchAll(PDO::FETCH_ASSOC);

$urlServidor = 'servidor.php?servidor=' . $idServidor;
$nomeSeguro = htmlspecialchars($servidor['nome'], ENT_QUOTES, 'UTF-8');
$iconeSeguro = htmlspecialchars($iconeServidor, ENT_QUOTES, 'UTF-8');
$dataCriacao = (new DateTimeImmutable($servidor['data_cadastro']))->format('d/m/Y');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configurações do Servidor - Mock Discord</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="../style/config-servidor.css">
    <link rel="stylesheet" href="../style/tipografia.css">
</head>
<body>

<div class="layout-configuracoes" id="layout-configuracoes">
    <!-- cabeçalho mobile (aparece abaixo de 768px) -->
    <header class="cabecalho-mobile">
        <a href="<?= htmlspecialchars($urlServidor, ENT_QUOTES, 'UTF-8') ?>" class="fechar-mobile" id="link-voltar-servidor-mobile" aria-label="Voltar para o servidor">
            <i class="bi bi-x-lg"></i>
        </a>
        <h1>Config. do servidor</h1>
    </header>

    <!--barra lteral equerda (desktop) / menu principal (mobile) -->
    <aside class="barra-lateral-config" aria-label="Menu de configurações do servidor">
        <div class="container-menu-lateral">
            <!-- resumo visual exclusivo do Mobile -->
            <div class="resumo-servidor-mobile">
                <div class="icone-mobile" id="icone-preview-mobile">
                    <?php if ($iconeServidor !== ''): ?>
                        <img src="<?= $iconeSeguro ?>" alt="Ícone do servidor">
                    <?php else: ?>
                        <i class="bi bi-images"></i>
                    <?php endif; ?>
                </div>
                <strong id="nome-servidor-mobile"><?= $nomeSeguro ?></strong>
            </div>

            <span class="titulo-grupo-lateral" id="nome-servidor-lateral"><?= $nomeSeguro ?></span>
            <span class="rotulo-grupo-mobile">Configurações</span>

            <nav class="navegacao-config">
                <button type="button" class="aba-nav ativa" data-aba="perfil">Perfil do servidor</button>
                <button type="button" class="aba-nav" data-aba="cargos">Cargos</button>
                <button type="button" class="aba-nav" data-aba="membros">Membros</button>
                <button type="button" class="aba-nav" data-aba="convites">Convites</button>
                <button type="button" class="aba-nav" data-aba="banimentos">Banimentos</button>
                <button type="button" class="aba-nav perigo" id="btn-excluir-servidor">Excluir servidor</button>
            </nav>
        </div>
    </aside>

    <!-- area principal da direita -->
    <main class="conteudo-config">
        <div class="topo-fechar">
            <button type="button" class="btn-voltar-mobile" id="btn-voltar-mobile">
                <i class="bi bi-arrow-left"></i> Voltar
            </button>
            <a href="<?= htmlspecialchars($urlServidor, ENT_QUOTES, 'UTF-8') ?>" class="botao-esc" id="link-voltar-servidor" title="Voltar para o servidor">
                <span class="circulo-esc"><i class="bi bi-x-lg"></i></span>
                <span class="texto-esc">ESC</span>
            </a>
        </div>

        <!-- perfil do servidor -->
        <section class="painel-aba ativo" id="aba-perfil">
            <div class="grid-perfil">
                <!-- Coluna Esquerda: Formulário -->
                <div class="coluna-formulario">
                    <h1>Perfil do servidor</h1>
                    <p class="subtitulo">Personalize seu servidor</p>

                    <form id="form-perfil-servidor" class="formulario-perfil" method="POST" enctype="multipart/form-data" action="config-servidor.php?servidor=<?= (int) $idServidor ?>" novalidate>
                        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token'], ENT_QUOTES, 'UTF-8') ?>">
                        <input type="hidden" name="cor" id="input-cor-servidor" value="<?= htmlspecialchars($corServidor, ENT_QUOTES, 'UTF-8') ?>">
                        <input type="hidden" name="removerIcone" id="remover-icone-servidor" value="0">
                        <?php if ($erroPerfil !== ''): ?>
                            <p class="mensagem-erro ativo" role="alert"><?= htmlspecialchars($erroPerfil, ENT_QUOTES, 'UTF-8') ?></p>
                        <?php elseif ($perfilSalvo): ?>
                            <p class="mensagem-sucesso" role="status">Alterações salvas.</p>
                        <?php endif; ?>
                        <div class="grupo-campo">
                            <label for="input-nome-servidor">Nome</label>
                            <input type="text" id="input-nome-servidor" name="nome" value="<?= $nomeSeguro ?>" placeholder="Nome do servidor" maxlength="25" required>
                            <span class="mensagem-erro" id="erro-nome-servidor"></span>
                        </div>

                        <div class="grupo-campo">
                            <label>Ícone</label>
                            <div class="acoes-icone">
                                <label for="input-icone-servidor" class="btn-roxo">
                                    Altere o ícone do servidor
                                </label>
                                <input type="file" id="input-icone-servidor" name="icone" accept="image/jpeg,image/png,image/webp" hidden>
                                <button type="button" class="btn-cinza-perigo" id="btn-remover-icone">
                                    Remover o ícone
                                </button>
                            </div>
                        </div>

                        <div class="grupo-campo">
                            <label>Faixa</label>
                            <div class="grade-faixas" id="grade-faixas" role="radiogroup" aria-label="Cor da faixa do servidor">
                                <button type="button" class="bloco-cor<?= $corServidor === '#8B8C5B' ? ' ativo' : '' ?>" data-cor="#8B8C5B" style="background-color: #8B8C5B;" aria-label="Verde oliva" aria-pressed="<?= $corServidor === '#8B8C5B' ? 'true' : 'false' ?>"></button>
                                <button type="button" class="bloco-cor<?= $corServidor === '#E600FF' ? ' ativo' : '' ?>" data-cor="#E600FF" style="background-color: #E600FF;" aria-label="Magenta" aria-pressed="<?= $corServidor === '#E600FF' ? 'true' : 'false' ?>"></button>
                                <button type="button" class="bloco-cor<?= $corServidor === '#D3383B' ? ' ativo' : '' ?>" data-cor="#D3383B" style="background-color: #D3383B;" aria-label="Vermelho" aria-pressed="<?= $corServidor === '#D3383B' ? 'true' : 'false' ?>"></button>
                                <button type="button" class="bloco-cor<?= $corServidor === '#C97A16' ? ' ativo' : '' ?>" data-cor="#C97A16" style="background-color: #C97A16;" aria-label="Laranja" aria-pressed="<?= $corServidor === '#C97A16' ? 'true' : 'false' ?>"></button>
                                <button type="button" class="bloco-cor<?= $corServidor === '#F7F700' ? ' ativo' : '' ?>" data-cor="#F7F700" style="background-color: #F7F700;" aria-label="Amarelo" aria-pressed="<?= $corServidor === '#F7F700' ? 'true' : 'false' ?>"></button>
                                <button type="button" class="bloco-cor<?= $corServidor === '#8A56C2' ? ' ativo' : '' ?>" data-cor="#8A56C2" style="background-color: #8A56C2;" aria-label="Roxo" aria-pressed="<?= $corServidor === '#8A56C2' ? 'true' : 'false' ?>"></button>
                                <button type="button" class="bloco-cor<?= $corServidor === '#2B72C4' ? ' ativo' : '' ?>" data-cor="#2B72C4" style="background-color: #2B72C4;" aria-label="Azul" aria-pressed="<?= $corServidor === '#2B72C4' ? 'true' : 'false' ?>"></button>
                                <button type="button" class="bloco-cor<?= $corServidor === '#14C4A8' ? ' ativo' : '' ?>" data-cor="#14C4A8" style="background-color: #14C4A8;" aria-label="Turquesa" aria-pressed="<?= $corServidor === '#14C4A8' ? 'true' : 'false' ?>"></button>
                                <button type="button" class="bloco-cor<?= $corServidor === '#2E7D1E' ? ' ativo' : '' ?>" data-cor="#2E7D1E" style="background-color: #2E7D1E;" aria-label="Verde escuro" aria-pressed="<?= $corServidor === '#2E7D1E' ? 'true' : 'false' ?>"></button>
                                <button type="button" class="bloco-cor<?= $corServidor === '#1A1A1A' ? ' ativo' : '' ?>" data-cor="#1A1A1A" style="background-color: #1A1A1A;" aria-label="Preto" aria-pressed="<?= $corServidor === '#1A1A1A' ? 'true' : 'false' ?>"></button>
                            </div>
                        </div>

                        <div class="barra-salvar">
                            <button type="submit" class="btn-salvar">Salvar alterações</button>
                            <span class="mensagem-sucesso" id="msg-sucesso-perfil" role="status"></span>
                        </div>
                    </form>
                </div>

                <!-- coluna da direita: preview do card -->
                <aside class="card-preview" aria-label="Pré-visualização do servidor">
                    <div class="banner-preview" id="banner-preview" style="background-color: <?= htmlspecialchars($corServidor, ENT_QUOTES, 'UTF-8') ?>;"></div>
                    <div class="corpo-preview">
                        <div class="icone-preview" id="icone-preview">
                            <?php if ($iconeServidor !== ''): ?>
                                <img src="<?= $iconeSeguro ?>" alt="Ícone do servidor">
                            <?php else: ?>
                                <i class="bi bi-images"></i>
                            <?php endif; ?>
                        </div>
                        <h2 id="nome-preview"><?= $nomeSeguro ?></h2>
                        <div class="status-preview">
                            <span><i class="ponto-membros"></i> <?= count($membrosServidor) ?> membros</span>
                        </div>
                        <small class="data-preview">Criado em <?= htmlspecialchars($dataCriacao, ENT_QUOTES, 'UTF-8') ?></small>
                    </div>
                </aside>
            </div>
        </section>

        <!-- Cargos -->
        <section class="painel-aba" id="aba-cargos">
            <h1>Cargos</h1>
            <p class="subtitulo">Cargos atribuídos aos membros deste servidor.</p>
            <p id="aviso-gerenciar-cargos" class="mensagem-cargos" role="status"></p>
            <table class="tabela-dados">
                <thead>
                    <tr>
                        <th>Membro</th>
                        <th>Cargo</th>
                        <th>Permissões</th>
                    </tr>
                </thead>
                <tbody id="lista-cargos-membros">
                    <?php foreach ($membrosServidor as $membro): ?>
                        <?php
                        $permissoes = [];
                        if ($membro['adm']) $permissoes[] = 'Administrador';
                        if ($membro['moderador']) $permissoes[] = 'Moderador';
                        if ($membro['membro']) $permissoes[] = 'Membro';
                        ?>
                        <tr>
                            <td><?= htmlspecialchars($membro['apelido'], ENT_QUOTES, 'UTF-8') ?> #<?= (int) $membro['id'] ?></td>
                            <td><?= htmlspecialchars($membro['cargo'], ENT_QUOTES, 'UTF-8') ?></td>
                            <td><?= htmlspecialchars(implode(', ', $permissoes), ENT_QUOTES, 'UTF-8') ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </section>

        <!-- Membros -->
        <section class="painel-aba" id="aba-membros">
            <h1>Membros</h1>
            <p class="subtitulo" id="resumo-membros-servidor"><?= count($membrosServidor) ?> membros neste servidor.</p>
            <ul class="lista-simples" id="lista-membros-servidor">
                <?php foreach ($membrosServidor as $membro): ?>
                    <li><?= htmlspecialchars($membro['apelido'], ENT_QUOTES, 'UTF-8') ?> #<?= (int) $membro['id'] ?></li>
                <?php endforeach; ?>
            </ul>
        </section>

        <!-- Convites -->
        <section class="painel-aba" id="aba-convites">
            <h1>Convites</h1>
            <p class="subtitulo">Convites diretos enviados para este servidor.</p>
            <?php if ($convitesServidor): ?>
                <ul class="lista-simples">
                    <?php foreach ($convitesServidor as $convite): ?>
                        <li>
                            <?= htmlspecialchars($convite['solicitado'], ENT_QUOTES, 'UTF-8') ?>
                            — enviado por <?= htmlspecialchars($convite['solicitante'], ENT_QUOTES, 'UTF-8') ?>
                        </li>
                    <?php endforeach; ?>
                </ul>
            <?php else: ?>
                <p>Nenhum convite registrado para este servidor.</p>
            <?php endif; ?>
        </section>

        <!-- Banimentos -->
        <section class="painel-aba" id="aba-banimentos">
            <h1>Banimentos</h1>
            <?php if ($banimentosServidor): ?>
                <ul class="lista-simples">
                    <?php foreach ($banimentosServidor as $banimento): ?>
                        <li>
                            <?= htmlspecialchars($banimento['apelido'], ENT_QUOTES, 'UTF-8') ?>
                            <?php if ($banimento['motivo']): ?>
                                — <?= htmlspecialchars($banimento['motivo'], ENT_QUOTES, 'UTF-8') ?>
                            <?php endif; ?>
                        </li>
                    <?php endforeach; ?>
                </ul>
            <?php else: ?>
                <p class="subtitulo">Nenhum usuário banido neste servidor.</p>
            <?php endif; ?>
        </section>

        <footer class="rodape-academico">
            Clone simplificado do Discord para trabalho acadêmico (IFC Campus Concórdia). Dados fictícios.
        </footer>
    </main>
</div>

<dialog id="dialogo-excluir-servidor" class="dialogo-excluir-servidor" aria-labelledby="titulo-excluir-servidor">
    <h2 id="titulo-excluir-servidor">Excluir servidor?</h2>
    <p>Esta ação removerá o servidor, seus canais e o histórico de mensagens. Não será possível desfazê-la.</p>
    <strong id="nome-servidor-exclusao"><?= $nomeSeguro ?></strong>
    <span id="erro-excluir-servidor" class="erro-excluir-servidor" role="alert"></span>
    <div class="acoes-excluir-servidor">
        <button type="button" id="cancelar-exclusao-servidor">Cancelar</button>
        <button type="button" id="confirmar-exclusao-servidor">Excluir servidor</button>
    </div>
</dialog>

<script src="../js/permissoes-servidor.js"></script>
<script src="../js/config-servidor.js"></script>
</body>
</html>