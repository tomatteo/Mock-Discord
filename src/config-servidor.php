<?php
require_once __DIR__ . '/includes/conexao.php';
require_once __DIR__ . '/includes/autenticacao.php';
verificarLogin();

<<<<<<< HEAD
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
=======
$usuarioLogadoId = (int) ($_SESSION['usuario_id'] ?? 0);
if ($usuarioLogadoId <= 0) {
    header('Location: ../index.php');
    exit;
}

// ID do servidor via query string (?servidor=1)
$servidorId = filter_input(INPUT_GET, 'servidor', FILTER_VALIDATE_INT);
if (!$servidorId || $servidorId <= 0) {
    $stmtPrimeiro = $pdo->query("SELECT id FROM servidores ORDER BY id ASC LIMIT 1");
    $servidorId = (int) ($stmtPrimeiro->fetchColumn() ?: 0);
}

if ($servidorId <= 0) {
    exit("Nenhum servidor encontrado no banco de dados.");
}

$erros = [];
$sucessoPerfil = "";
$erroExclusao = "";

// Busca dados atuais do servidor
$stmtServidor = $pdo->prepare("SELECT * FROM servidores WHERE id = :id LIMIT 1");
$stmtServidor->execute([":id" => $servidorId]);
$servidor = $stmtServidor->fetch(PDO::FETCH_ASSOC);

if (!$servidor) {
    exit("Servidor não encontrado.");
}

// Verifica cargo/permissão do usuário logado no servidor
$stmtPerm = $pdo->prepare("
    SELECT sc.adm, sc.moderador, sc.membro, sc.nome AS cargo_nome
    FROM servidores_usuario su
    INNER JOIN servidor_cargos sc ON sc.id = su.id_cargo AND sc.id_servidor = su.id_servidor
    WHERE su.id_servidor = :servidor_id AND su.id_usuario = :usuario_id
    LIMIT 1
");
$stmtPerm->execute([
    ":servidor_id" => $servidorId,
    ":usuario_id"  => $usuarioLogadoId,
]);
$vinculoUsuario = $stmtPerm->fetch(PDO::FETCH_ASSOC);

$ehDono = ((int) $servidor["id_dono"] === $usuarioLogadoId);
$ehMembro = $ehDono || !empty($vinculoUsuario);
$ehAdm = $ehDono || (!empty($vinculoUsuario) && (bool) $vinculoUsuario["adm"]);
$ehMod = $ehAdm || (!empty($vinculoUsuario) && (bool) $vinculoUsuario["moderador"]);

if (!$ehMembro) {
    http_response_code(403);
    exit("Você não faz parte deste servidor.");
}

// Processa requisições POST (Salvar perfil ou Excluir servidor)
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $acao = $_POST["acao"] ?? "salvar_perfil";

    if ($acao === "salvar_perfil") {
        if (!$ehAdm && !$ehMod) {
            $erros[] = "Seu cargo não tem permissão para alterar o perfil do servidor.";
        }

        $novoNome = trim((string) ($_POST["nome"] ?? ""));
        $corEnviada = trim((string) ($_POST["cor"] ?? ""));
        if ($corEnviada !== "" && preg_match('/^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/', $corEnviada)) {
            $novaCor = strtoupper($corEnviada);
        } elseif (!empty($servidor["cor"]) && preg_match('/^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/', (string) $servidor["cor"])) {
            $novaCor = strtoupper((string) $servidor["cor"]);
        } else {
            $novaCor = "#D3383B";
        }

        $removerIcone = isset($_POST["remover_icone"]) && $_POST["remover_icone"] === "1";

        if (mb_strlen($novoNome) < 2) {
            $erros[] = "O nome do servidor deve ter pelo menos 2 caracteres.";
        } elseif (mb_strlen($novoNome) > 25) {
            $erros[] = "O nome do servidor pode ter no máximo 25 caracteres.";
        }

        // icone é NOT NULL no banco, então mantém o atual ou usa string vazia se removido
        $novoIcone = (string) ($servidor["icone"] ?? "");

        if ($removerIcone) {
            $novoIcone = "";
        } elseif (isset($_FILES["icone"]) && $_FILES["icone"]["error"] !== UPLOAD_ERR_NO_FILE) {
            if ($_FILES["icone"]["error"] !== UPLOAD_ERR_OK) {
                $erros[] = "Falha no upload do arquivo de ícone.";
            } else {
                $tamanhoMax = 2 * 1024 * 1024; // 2 MB
                if ($_FILES["icone"]["size"] > $tamanhoMax) {
                    $erros[] = "O ícone deve ter no máximo 2 MB.";
                }

                $finfo = new finfo(FILEINFO_MIME_TYPE);
                $mime = $finfo->file($_FILES["icone"]["tmp_name"]);
                $extensoesPermitidas = [
                    "image/jpeg" => "jpg",
                    "image/png"  => "png",
                    "image/webp" => "webp",
                    "image/gif"  => "gif",
                ];

                if (!isset($extensoesPermitidas[$mime])) {
                    $erros[] = "Formato de imagem não suportado (use JPG, PNG, WEBP ou GIF).";
                } elseif (empty($erros)) {
                    $pastaUpload = __DIR__ . "/../uploads/servidores";
                    if (!is_dir($pastaUpload)) {
                        mkdir($pastaUpload, 0775, true);
                    }
                    $nomeArquivo = "srv_" . $servidorId . "_" . bin2hex(random_bytes(8)) . "." . $extensoesPermitidas[$mime];
                    $destinoFisico = $pastaUpload . "/" . $nomeArquivo;

                    if (move_uploaded_file($_FILES["icone"]["tmp_name"], $destinoFisico)) {
                        $novoIcone = "../uploads/servidores/" . $nomeArquivo;
                    } else {
                        $erros[] = "Não foi possível salvar o arquivo no servidor.";
                    }
                }
            }
        }

        if (empty($erros)) {
            $stmtUpdate = $pdo->prepare("
                UPDATE servidores
                SET nome = :nome, cor = :cor, icone = :icone
                WHERE id = :id
            ");
            $stmtUpdate->execute([
                ":nome"  => $novoNome,
                ":cor"   => $novaCor,
                ":icone" => $novoIcone,
                ":id"    => $servidorId,
            ]);

            header("Location: config-servidor.php?servidor=" . $servidorId . "&salvo=1");
            exit;
        }
    } elseif ($acao === "excluir_servidor") {
        if (!$ehDono && !$ehAdm) {
            $erroExclusao = "Apenas o dono ou administrador pode excluir o servidor.";
        } else {
            try {
                $pdo->beginTransaction();

                $stmtDelMsg = $pdo->prepare("
                    DELETE cm FROM canal_mensagens cm
                    INNER JOIN canais c ON c.id = cm.id_canal
                    WHERE c.id_servidor = :id
                ");
                $stmtDelMsg->execute([":id" => $servidorId]);

                $pdo->prepare("DELETE FROM canais WHERE id_servidor = :id")->execute([":id" => $servidorId]);
                $pdo->prepare("DELETE FROM servidores_usuario WHERE id_servidor = :id")->execute([":id" => $servidorId]);
                $pdo->prepare("DELETE FROM servidor_cargos WHERE id_servidor = :id")->execute([":id" => $servidorId]);
                $pdo->prepare("DELETE FROM servidor_banimentos WHERE id_servidor = :id")->execute([":id" => $servidorId]);
                $pdo->prepare("DELETE FROM servidor_convites WHERE id_servidor = :id")->execute([":id" => $servidorId]);
                $pdo->prepare("DELETE FROM servidores WHERE id = :id")->execute([":id" => $servidorId]);

                $pdo->commit();
                header("Location: inicio.php");
                exit;
            } catch (Throwable $th) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                $erroExclusao = "Erro ao excluir o servidor: " . $th->getMessage();
            }
        }
    }
}

if (isset($_GET["salvo"]) && $_GET["salvo"] === "1") {
    $sucessoPerfil = "Alterações salvas com sucesso.";
}

// Recarrega dados do servidor caso haja erros de validação no POST
$stmtServidorAtual = $pdo->prepare("SELECT * FROM servidores WHERE id = :id LIMIT 1");
$stmtServidorAtual->execute([":id" => $servidorId]);
$servidor = $stmtServidorAtual->fetch(PDO::FETCH_ASSOC) ?: $servidor;

// Consulta membros, cargos e permissões
$stmtMembros = $pdo->prepare("
    SELECT
        u.id,
        u.apelido,
        u.data_cadastro AS membro_desde,
        sc.nome AS cargo_nome,
        sc.adm,
        sc.moderador,
        sc.membro,
        (u.id = s.id_dono) AS is_dono
    FROM servidores_usuario su
    INNER JOIN usuarios u ON u.id = su.id_usuario
    INNER JOIN servidores s ON s.id = su.id_servidor
    LEFT JOIN servidor_cargos sc ON sc.id = su.id_cargo AND sc.id_servidor = su.id_servidor
    WHERE su.id_servidor = :servidor_id
    ORDER BY (u.id = s.id_dono) DESC, sc.adm DESC, sc.moderador DESC, u.apelido ASC
");
$stmtMembros->execute([":servidor_id" => $servidorId]);
$membros = $stmtMembros->fetchAll(PDO::FETCH_ASSOC);

// Consulta banimentos ativos/registrados
$stmtBanimentos = $pdo->prepare("
    SELECT
        sb.id,
        sb.motivo,
        sb.data_banimento,
        sb.data_limite,
        u.apelido AS usuario_banido,
        adm.apelido AS aplicado_por
    FROM servidor_banimentos sb
    INNER JOIN usuarios u ON u.id = sb.id_usuario
    INNER JOIN usuarios adm ON adm.id = sb.id_adm
    WHERE sb.id_servidor = :servidor_id
    ORDER BY sb.data_banimento DESC
");
$stmtBanimentos->execute([":servidor_id" => $servidorId]);
$banimentos = $stmtBanimentos->fetchAll(PDO::FETCH_ASSOC);

// Consulta convites vinculados ao servidor
$stmtConvites = $pdo->prepare("
    SELECT
        scv.id,
        scv.descricao,
        scv.data_cadastro,
        sol.apelido AS solicitante,
        req.apelido AS solicitado
    FROM servidor_convites scv
    INNER JOIN usuarios sol ON sol.id = scv.id_usuario_solicitante
    INNER JOIN usuarios req ON req.id = scv.id_usuario_solicitado
    WHERE scv.id_servidor = :servidor_id
    ORDER BY scv.data_cadastro DESC
");
$stmtConvites->execute([":servidor_id" => $servidorId]);
$convites = $stmtConvites->fetchAll(PDO::FETCH_ASSOC);

$coresFaixa = [
    "#8B8C5B" => "Verde oliva",
    "#E600FF" => "Magenta",
    "#D3383B" => "Vermelho",
    "#C97A16" => "Laranja",
    "#F7F700" => "Amarelo",
    "#8A56C2" => "Roxo",
    "#2B72C4" => "Azul",
    "#14C4A8" => "Turquesa",
    "#2E7D1E" => "Verde escuro",
    "#1A1A1A" => "Preto",
];

$corAtual = strtoupper($servidor["cor"] ?: "#D3383B");
$nomeAtual = $servidor["nome"];
$iconeAtual = $servidor["icone"];
$totalMembros = count($membros);
$dataCriacaoFmt = date("M. \\d\\e Y", strtotime($servidor["data_cadastro"]));

function formatarPermissoes(array $m): string {
    if (!empty($m["is_dono"])) {
        return "Dono (Controle total)";
    }
    $perms = [];
    if (!empty($m["adm"])) $perms[] = "Administrador";
    if (!empty($m["moderador"])) $perms[] = "Moderador";
    if (!empty($m["membro"])) $perms[] = "Membro";
    return $perms ? implode(", ", $perms) : "Sem permissões";
}
>>>>>>> origin/main
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
<<<<<<< HEAD
    <title>Configurações do Servidor - Mock Discord</title>
=======
    <title>Configurações do Servidor - <?= htmlspecialchars($nomeAtual) ?></title>
>>>>>>> origin/main
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="../style/config-servidor.css">
    <link rel="stylesheet" href="../style/tipografia.css">
</head>
<body>

<div class="layout-configuracoes" id="layout-configuracoes">
    <!-- cabeçalho mobile (aparece abaixo de 768px) -->
    <header class="cabecalho-mobile">
<<<<<<< HEAD
        <a href="<?= htmlspecialchars($urlServidor, ENT_QUOTES, 'UTF-8') ?>" class="fechar-mobile" id="link-voltar-servidor-mobile" aria-label="Voltar para o servidor">
=======
        <a href="servidor.php?servidor=<?= (int) $servidorId ?>" class="fechar-mobile" id="link-voltar-servidor-mobile" aria-label="Voltar para o servidor">
>>>>>>> origin/main
            <i class="bi bi-x-lg"></i>
        </a>
        <h1>Config. do servidor</h1>
    </header>

<<<<<<< HEAD
    <!--barra lteral equerda (desktop) / menu principal (mobile) -->
=======
    <!-- barra lateral esquerda (desktop) / menu principal (mobile) -->
>>>>>>> origin/main
    <aside class="barra-lateral-config" aria-label="Menu de configurações do servidor">
        <div class="container-menu-lateral">
            <!-- resumo visual exclusivo do Mobile -->
            <div class="resumo-servidor-mobile">
                <div class="icone-mobile" id="icone-preview-mobile">
<<<<<<< HEAD
                    <?php if ($iconeServidor !== ''): ?>
                        <img src="<?= $iconeSeguro ?>" alt="Ícone do servidor">
=======
                    <?php if ($iconeAtual): ?>
                        <img src="<?= htmlspecialchars($iconeAtual) ?>" alt="Ícone do servidor">
>>>>>>> origin/main
                    <?php else: ?>
                        <i class="bi bi-images"></i>
                    <?php endif; ?>
                </div>
<<<<<<< HEAD
                <strong id="nome-servidor-mobile"><?= $nomeSeguro ?></strong>
            </div>

            <span class="titulo-grupo-lateral" id="nome-servidor-lateral"><?= $nomeSeguro ?></span>
=======
                <strong id="nome-servidor-mobile"><?= htmlspecialchars($nomeAtual) ?></strong>
            </div>

            <span class="titulo-grupo-lateral" id="nome-servidor-lateral"><?= htmlspecialchars($nomeAtual) ?></span>
>>>>>>> origin/main
            <span class="rotulo-grupo-mobile">Configurações</span>

            <nav class="navegacao-config">
                <button type="button" class="aba-nav ativa" data-aba="perfil">Perfil do servidor</button>
                <button type="button" class="aba-nav" data-aba="cargos">Cargos</button>
                <button type="button" class="aba-nav" data-aba="membros">Membros</button>
                <button type="button" class="aba-nav" data-aba="convites">Convites</button>
                <button type="button" class="aba-nav" data-aba="banimentos">Banimentos</button>
<<<<<<< HEAD
                <button type="button" class="aba-nav perigo" id="btn-excluir-servidor">Excluir servidor</button>
=======
                <button type="button" class="aba-nav perigo" id="btn-excluir-servidor" <?= (!$ehDono && !$ehAdm) ? 'disabled title="Somente dono ou administrador pode excluir"' : '' ?>>Excluir servidor</button>
>>>>>>> origin/main
            </nav>
        </div>
    </aside>

<<<<<<< HEAD
    <!-- area principal da direita -->
=======
    <!-- área principal da direita -->
>>>>>>> origin/main
    <main class="conteudo-config">
        <div class="topo-fechar">
            <button type="button" class="btn-voltar-mobile" id="btn-voltar-mobile">
                <i class="bi bi-arrow-left"></i> Voltar
            </button>
<<<<<<< HEAD
            <a href="<?= htmlspecialchars($urlServidor, ENT_QUOTES, 'UTF-8') ?>" class="botao-esc" id="link-voltar-servidor" title="Voltar para o servidor">
=======
            <a href="servidor.php?servidor=<?= (int) $servidorId ?>" class="botao-esc" id="link-voltar-servidor" title="Voltar para o servidor">
>>>>>>> origin/main
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

<<<<<<< HEAD
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
=======
                    <?php if (!empty($erros)): ?>
                        <div class="mensagem-erro" role="alert">
                            <?php foreach ($erros as $erro): ?>
                                <div><?= htmlspecialchars($erro) ?></div>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>

                    <form id="form-perfil-servidor" class="formulario-perfil" method="POST" enctype="multipart/form-data" novalidate>
                        <input type="hidden" name="acao" value="salvar_perfil">
                        <input type="hidden" name="cor" id="input-cor-faixa" value="<?= htmlspecialchars($corAtual) ?>">
                        <input type="hidden" name="remover_icone" id="input-remover-icone" value="0">

                        <div class="grupo-campo">
                            <label for="input-nome-servidor">Nome</label>
                            <input
                                type="text"
                                id="input-nome-servidor"
                                name="nome"
                                value="<?= htmlspecialchars($nomeAtual) ?>"
                                placeholder="Nome do servidor"
                                maxlength="25"
                                required
                            >
>>>>>>> origin/main
                            <span class="mensagem-erro" id="erro-nome-servidor"></span>
                        </div>

                        <div class="grupo-campo">
                            <label>Ícone</label>
                            <div class="acoes-icone">
                                <label for="input-icone-servidor" class="btn-roxo">
                                    Altere o ícone do servidor
                                </label>
<<<<<<< HEAD
                                <input type="file" id="input-icone-servidor" name="icone" accept="image/jpeg,image/png,image/webp" hidden>
                                <button type="button" class="btn-cinza-perigo" id="btn-remover-icone">
=======
                                <input type="file" id="input-icone-servidor" name="icone" accept="image/png,image/jpeg,image/webp,image/gif" hidden onchange="document.getElementById('input-remover-icone').value = '0'">
                                <button type="button" class="btn-cinza-perigo" id="btn-remover-icone" onclick="document.getElementById('input-remover-icone').value = '1'">
>>>>>>> origin/main
                                    Remover o ícone
                                </button>
                            </div>
                        </div>

                        <div class="grupo-campo">
                            <label>Faixa</label>
                            <div class="grade-faixas" id="grade-faixas" role="radiogroup" aria-label="Cor da faixa do servidor">
<<<<<<< HEAD
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
=======
                                <?php foreach ($coresFaixa as $hex => $rotuloCor): ?>
                                    <?php $ativa = (strtoupper($hex) === $corAtual) ? " ativo" : ""; ?>
                                    <button
                                        type="button"
                                        class="bloco-cor<?= $ativa ?>"
                                        data-cor="<?= htmlspecialchars($hex) ?>"
                                        style="background-color: <?= htmlspecialchars($hex) ?>;"
                                        aria-label="<?= htmlspecialchars($rotuloCor) ?>"
                                        onclick="document.getElementById('input-cor-faixa').value = this.dataset.cor"
                                    ></button>
                                <?php endforeach; ?>
>>>>>>> origin/main
                            </div>
                        </div>

                        <div class="barra-salvar">
                            <button type="submit" class="btn-salvar">Salvar alterações</button>
<<<<<<< HEAD
                            <span class="mensagem-sucesso" id="msg-sucesso-perfil" role="status"></span>
=======
                            <span class="mensagem-sucesso" id="msg-sucesso-perfil" role="status">
                                <?= htmlspecialchars($sucessoPerfil) ?>
                            </span>
>>>>>>> origin/main
                        </div>
                    </form>
                </div>

                <!-- coluna da direita: preview do card -->
                <aside class="card-preview" aria-label="Pré-visualização do servidor">
<<<<<<< HEAD
                    <div class="banner-preview" id="banner-preview" style="background-color: <?= htmlspecialchars($corServidor, ENT_QUOTES, 'UTF-8') ?>;"></div>
                    <div class="corpo-preview">
                        <div class="icone-preview" id="icone-preview">
                            <?php if ($iconeServidor !== ''): ?>
                                <img src="<?= $iconeSeguro ?>" alt="Ícone do servidor">
=======
                    <div class="banner-preview" id="banner-preview" style="background-color: <?= htmlspecialchars($corAtual) ?>;"></div>
                    <div class="corpo-preview">
                        <div class="icone-preview" id="icone-preview">
                            <?php if ($iconeAtual): ?>
                                <img src="<?= htmlspecialchars($iconeAtual) ?>" alt="Ícone do servidor">
>>>>>>> origin/main
                            <?php else: ?>
                                <i class="bi bi-images"></i>
                            <?php endif; ?>
                        </div>
<<<<<<< HEAD
                        <h2 id="nome-preview"><?= $nomeSeguro ?></h2>
                        <div class="status-preview">
                            <span><i class="ponto-membros"></i> <?= count($membrosServidor) ?> membros</span>
                        </div>
                        <small class="data-preview">Criado em <?= htmlspecialchars($dataCriacao, ENT_QUOTES, 'UTF-8') ?></small>
=======
                        <h2 id="nome-preview"><?= htmlspecialchars($nomeAtual) ?></h2>
                        <div class="status-preview">
                            <span><i class="ponto-membros"></i> <?= (int) $totalMembros ?> <?= $totalMembros === 1 ? "membro" : "membros" ?></span>
                        </div>
                        <small class="data-preview">Desde <?= htmlspecialchars($dataCriacaoFmt) ?></small>
>>>>>>> origin/main
                    </div>
                </aside>
            </div>
        </section>

        <!-- Cargos -->
        <section class="painel-aba" id="aba-cargos">
            <h1>Cargos</h1>
<<<<<<< HEAD
            <p class="subtitulo">Cargos atribuídos aos membros deste servidor.</p>
=======
            <p class="subtitulo">Administradores e moderadores gerenciam o servidor. Membros podem conversar e entrar em chamadas.</p>
>>>>>>> origin/main
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
<<<<<<< HEAD
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
=======
                    <?php if (empty($membros)): ?>
                        <tr>
                            <td colspan="3">Nenhum membro encontrado neste servidor.</td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($membros as $m): ?>
                            <tr>
                                <td><?= htmlspecialchars($m["apelido"]) ?></td>
                                <td><?= htmlspecialchars($m["cargo_nome"] ?: (!empty($m["is_dono"]) ? "Dono" : "Membro")) ?></td>
                                <td><?= htmlspecialchars(formatarPermissoes($m)) ?></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
>>>>>>> origin/main
                </tbody>
            </table>
        </section>

        <!-- Membros -->
        <section class="painel-aba" id="aba-membros">
            <h1>Membros</h1>
<<<<<<< HEAD
            <p class="subtitulo" id="resumo-membros-servidor"><?= count($membrosServidor) ?> membros neste servidor.</p>
            <ul class="lista-simples" id="lista-membros-servidor">
                <?php foreach ($membrosServidor as $membro): ?>
                    <li><?= htmlspecialchars($membro['apelido'], ENT_QUOTES, 'UTF-8') ?> #<?= (int) $membro['id'] ?></li>
                <?php endforeach; ?>
=======
            <p class="subtitulo" id="resumo-membros-servidor">
                <?= (int) $totalMembros ?> <?= $totalMembros === 1 ? "participante neste servidor." : "participantes neste servidor." ?>
            </p>
            <ul class="lista-simples" id="lista-membros-servidor">
                <?php if (empty($membros)): ?>
                    <li>Nenhum membro cadastrado.</li>
                <?php else: ?>
                    <?php foreach ($membros as $m): ?>
                        <li>
                            <strong><?= htmlspecialchars($m["apelido"]) ?></strong>
                            — <?= htmlspecialchars($m["cargo_nome"] ?: "Membro") ?>
                        </li>
                    <?php endforeach; ?>
                <?php endif; ?>
>>>>>>> origin/main
            </ul>
        </section>

        <!-- Convites -->
        <section class="painel-aba" id="aba-convites">
            <h1>Convites</h1>
<<<<<<< HEAD
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
=======
            <p class="subtitulo">Link de convite e solicitações registradas para este servidor.</p>
            <div class="caixa-convite">
                <code><?= htmlspecialchars("https://mock-discord.local/convite/servidor-" . (int) $servidorId) ?></code>
                <button type="button" class="btn-roxo" id="btn-copiar-convite">Copiar</button>
            </div>

            <?php if (!empty($convites)): ?>
                <ul class="lista-simples">
                    <?php foreach ($convites as $cv): ?>
                        <li>
                            <strong><?= htmlspecialchars($cv["solicitante"]) ?></strong> convidou
                            <strong><?= htmlspecialchars($cv["solicitado"]) ?></strong>
                            <?php if (!empty($cv["descricao"])): ?>
                                — <?= htmlspecialchars($cv["descricao"]) ?>
                            <?php endif; ?>
                        </li>
                    <?php endforeach; ?>
                </ul>
>>>>>>> origin/main
            <?php endif; ?>
        </section>

        <!-- Banimentos -->
        <section class="painel-aba" id="aba-banimentos">
            <h1>Banimentos</h1>
<<<<<<< HEAD
            <h1>Banimentos</h1>
            <?php if ($banimentosServidor): ?>
                <ul class="lista-simples">
                    <?php foreach ($banimentosServidor as $banimento): ?>
                        <li>
                            <?= htmlspecialchars($banimento['apelido'], ENT_QUOTES, 'UTF-8') ?>
                            <?php if ($banimento['motivo']): ?>
                                — <?= htmlspecialchars($banimento['motivo'], ENT_QUOTES, 'UTF-8') ?>
=======
            <?php if (empty($banimentos)): ?>
                <p class="subtitulo">Nenhum usuário banido neste servidor.</p>
            <?php else: ?>
                <p class="subtitulo"><?= count($banimentos) ?> usuário(s) banido(s) neste servidor.</p>
                <ul class="lista-simples">
                    <?php foreach ($banimentos as $ban): ?>
                        <li>
                            <strong><?= htmlspecialchars($ban["usuario_banido"]) ?></strong>
                            banido por <strong><?= htmlspecialchars($ban["aplicado_por"]) ?></strong>
                            <?php if (!empty($ban["motivo"])): ?>
                                — Motivo: <?= htmlspecialchars($ban["motivo"]) ?>
>>>>>>> origin/main
                            <?php endif; ?>
                        </li>
                    <?php endforeach; ?>
                </ul>
<<<<<<< HEAD
            <?php else: ?>
                <p class="subtitulo">Nenhum usuário banido neste servidor.</p>
=======
>>>>>>> origin/main
            <?php endif; ?>
        </section>

        <footer class="rodape-academico">
<<<<<<< HEAD
            Clone simplificado do Discord para trabalho acadêmico (IFC Campus Concórdia). Dados fictícios.
=======
            Clone simplificado do Discord para trabalho acadêmico (IFC Campus Concórdia).
>>>>>>> origin/main
        </footer>
    </main>
</div>

<dialog id="dialogo-excluir-servidor" class="dialogo-excluir-servidor" aria-labelledby="titulo-excluir-servidor">
    <h2 id="titulo-excluir-servidor">Excluir servidor?</h2>
    <p>Esta ação removerá o servidor, seus canais e o histórico de mensagens. Não será possível desfazê-la.</p>
<<<<<<< HEAD
    <strong id="nome-servidor-exclusao"><?= $nomeSeguro ?></strong>
    <span id="erro-excluir-servidor" class="erro-excluir-servidor" role="alert"></span>
    <div class="acoes-excluir-servidor">
        <button type="button" id="cancelar-exclusao-servidor">Cancelar</button>
        <button type="button" id="confirmar-exclusao-servidor">Excluir servidor</button>
    </div>
=======
    <strong id="nome-servidor-exclusao"><?= htmlspecialchars($nomeAtual) ?></strong>
    <span id="erro-excluir-servidor" class="erro-excluir-servidor" role="alert"><?= htmlspecialchars($erroExclusao) ?></span>
    <form method="POST" id="form-excluir-servidor">
        <input type="hidden" name="acao" value="excluir_servidor">
        <div class="acoes-excluir-servidor">
            <button type="button" id="cancelar-exclusao-servidor">Cancelar</button>
            <button type="submit" id="confirmar-exclusao-servidor">Excluir servidor</button>
        </div>
    </form>
>>>>>>> origin/main
</dialog>

<script src="../js/permissoes-servidor.js"></script>
<script src="../js/config-servidor.js"></script>
</body>
</html>