<?php
require_once __DIR__ . '/conexao.php';
require_once __DIR__ . '/autenticacao.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');

function responderFotoPerfil(int $status, array $dados): never
{
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

if (!isset($_SESSION['usuario_id'])) {
    responderFotoPerfil(401, ['erro' => 'Sua sessão expirou. Entre novamente para alterar a foto.']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    responderFotoPerfil(405, ['erro' => 'Método não permitido.']);
}

$token = $_POST['csrf_token'] ?? '';
if (!is_string($token) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $token)) {
    responderFotoPerfil(403, ['erro' => 'Sua sessão expirou. Atualize a página e tente novamente.']);
}

$usuarioId = (int) $_SESSION['usuario_id'];
$acao = $_POST['acao'] ?? '';
$stmt = $pdo->prepare('SELECT foto_perfil FROM usuarios WHERE id = :usuario');
$stmt->execute([':usuario' => $usuarioId]);
$fotoAtual = $stmt->fetchColumn();
if ($fotoAtual === false) {
    responderFotoPerfil(404, ['erro' => 'Usuário não encontrado.']);
}

$diretorioBase = getenv('SERVER_ICONS_DIR') ?: '/var/www/assets/img';
$diretorioAvatares = $diretorioBase . '/avatars';
if (!is_dir($diretorioAvatares) && !mkdir($diretorioAvatares, 0755, true) && !is_dir($diretorioAvatares)) {
    responderFotoPerfil(500, ['erro' => 'Não foi possível preparar o armazenamento da foto.']);
}

if ($acao === 'remover') {
    $stmt = $pdo->prepare('UPDATE usuarios SET foto_perfil = NULL WHERE id = :usuario');
    $stmt->execute([':usuario' => $usuarioId]);
    $_SESSION['usuario_foto_perfil'] = null;
    if (is_string($fotoAtual) && str_starts_with($fotoAtual, '/img/avatars/')) {
        $nomeArquivo = basename($fotoAtual);
        if (preg_match('/\A' . $usuarioId . '-[a-f0-9]{12}\.(?:jpg|png|webp)\z/', $nomeArquivo)) {
            $caminhoAntigo = $diretorioAvatares . '/' . $nomeArquivo;
            if (is_file($caminhoAntigo) && !unlink($caminhoAntigo)) {
                responderFotoPerfil(500, ['erro' => 'A foto foi removida do perfil, mas o arquivo antigo não pôde ser apagado.']);
            }
        }
    }
    responderFotoPerfil(200, ['url' => null]);
}

if ($acao !== 'salvar') {
    responderFotoPerfil(400, ['erro' => 'Ação inválida.']);
}

$arquivo = $_FILES['foto'] ?? null;
if (is_array($arquivo) && ($arquivo['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_INI_SIZE) {
    responderFotoPerfil(413, ['erro' => 'A imagem deve ter no máximo 5 MB.']);
}
if (!is_array($arquivo) || ($arquivo['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    responderFotoPerfil(400, ['erro' => 'Selecione uma imagem válida para enviar.']);
}
if (($arquivo['size'] ?? 0) > 5 * 1024 * 1024) {
    responderFotoPerfil(413, ['erro' => 'A imagem deve ter no máximo 5 MB.']);
}

$tipo = (new finfo(FILEINFO_MIME_TYPE))->file($arquivo['tmp_name']);
$extensoes = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp'
];
$dimensoes = @getimagesize($arquivo['tmp_name']);
if (
    !isset($extensoes[$tipo])
    || $dimensoes === false
    || $dimensoes[0] > 4096
    || $dimensoes[1] > 4096
) {
    responderFotoPerfil(415, ['erro' => 'Use uma imagem JPEG, PNG ou WebP válida.']);
}

$extensao = $extensoes[$tipo];
$nomeArquivo = $usuarioId . '-' . bin2hex(random_bytes(6)) . '.' . $extensao;
$caminhoNovo = $diretorioAvatares . '/' . $nomeArquivo;
$caminhoTemporario = $diretorioAvatares . '/.' . $usuarioId . '-' . bin2hex(random_bytes(8)) . '.tmp';
if (!move_uploaded_file($arquivo['tmp_name'], $caminhoTemporario)) {
    responderFotoPerfil(500, ['erro' => 'Não foi possível gravar a imagem enviada.']);
}

if (!rename($caminhoTemporario, $caminhoNovo)) {
    unlink($caminhoTemporario);
    responderFotoPerfil(500, ['erro' => 'Não foi possível concluir o salvamento da imagem.']);
}

$urlFoto = '/img/avatars/' . $nomeArquivo;
try {
    $stmt = $pdo->prepare('UPDATE usuarios SET foto_perfil = :foto WHERE id = :usuario');
    $stmt->execute([':foto' => $urlFoto, ':usuario' => $usuarioId]);
} catch (Throwable $erro) {
    unlink($caminhoNovo);
    throw $erro;
}

if (is_string($fotoAtual) && str_starts_with($fotoAtual, '/img/avatars/')) {
    $nomeAntigo = basename($fotoAtual);
    if (
        preg_match('/\A' . $usuarioId . '-[a-f0-9]{12}\.(?:jpg|png|webp)\z/', $nomeAntigo)
        && $nomeAntigo !== $nomeArquivo
    ) {
        $caminhoAntigo = $diretorioAvatares . '/' . $nomeAntigo;
        if (is_file($caminhoAntigo) && !unlink($caminhoAntigo)) {
            responderFotoPerfil(500, ['erro' => 'A foto foi salva, mas a imagem anterior não pôde ser apagada.']);
        }
    }
}

$_SESSION['usuario_foto_perfil'] = $urlFoto;
$urlComVersao = $urlFoto . '?v=' . filemtime($caminhoNovo);
responderFotoPerfil(200, ['url' => $urlComVersao]);
