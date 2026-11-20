<?php
require_once __DIR__ . '/includes/conexao.php';
require_once __DIR__ . '/includes/autenticacao.php';

$erro = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['identificador'] ?? '');
    $senha = $_POST['senha'] ?? '';
    if ($email === '' || $senha === '') {
        $erro = 'Preencha todos os campos.';
    } else {
        $sql = "SELECT * FROM usuarios
                WHERE email = :email OR numero = :numero";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':email' => $email,
            ':numero' => $email
        ]);
        $usuario = $stmt->fetch();
        if ($usuario && password_verify($senha, $usuario['senha'])) {
            session_regenerate_id(true);
            $_SESSION['usuario_id'] = $usuario['id'];
            $_SESSION['usuario_apelido'] = $usuario['apelido'];
            $_SESSION['usuario_email'] = $usuario['email'];
            header("Location: /inicio.php");
            exit;
        } else {
            $erro = 'E-mail, telefone ou senha incorretos.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Discord Mock</title>
    <link rel="stylesheet" href="../style/auth.css">
    <link rel="stylesheet" href="../style/tipografia.css">
</head>
<body class="pagina-auth">

    <!-- card principal de login -->
    <main class="auth-card">
        <header class="auth-header">
            <h1>Bem Vindo de Volta!</h1>
            <p>Estamos felizes em te ver novamente.</p>
        </header>

        <section aria-label="Formulário de login">
            <?php include __DIR__ . '/includes/formLogin.php'; ?>
        </section>

        <footer class="auth-footer">
            Não possui uma conta? 
            <a href="register.php" class="auth-link">Registrar</a>
        </footer>
    </main>


    <footer class="aviso-academico">
        <p>Clone do Discord desenvolvido para fins educacionais. Sem vínculo com a empresa original. Todos os dados são ficticios.</p>
    </footer>

    <script src="../js/auth.js"></script>
</body>
</html>