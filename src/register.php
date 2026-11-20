<?php
require_once __DIR__ . '/includes/conexao.php';
require_once __DIR__ . '/includes/autenticacao.php';

$erro = '';

if($_SERVER['REQUEST_METHOD'] === 'POST'){
    $apelido = trim($_POST['username'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $num_telefone = trim($_POST['telefone'] ?? '');
    $senha = $_POST['senha'];

    if($apelido === '' || $email === '' || $senha === ''){
        $erro = 'Preencha todos os campos.';
    }else if(!filter_var($email, FILTER_VALIDATE_EMAIL)){
        $erro = 'Digite um email valido.';
    }else if(strlen($senha) < 6){
        $erro = 'A senha precisa ter ao menos 6 caracteres.';
    }else{
        $senhaCript = password_hash($senha, PASSWORD_DEFAULT);
        try{
            $sql = 'insert into usuarios (apelido, email, numero, senha) values (:apelido, :email, :num_telefone, :senha)';
            $stmt = $pdo->prepare($sql);

            $stmt->execute([
                ':apelido' => $apelido,
                ':email' => $email,
                ':num_telefone' => $num_telefone,
                ':senha' => $senhaCript
            ]);

            header('Location: /index.php');
            exit;
        }catch (PDOException $e){
            if ($e->getCode() === '23000') {
                $erro = 'Este e-mail já está cadastrado.';
            } else {
                $erro = 'Não foi possível realizar o cadastro.';
            }
        }
    }
}
?>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registrar - Discord Mock</title>
    <link rel="stylesheet" href="../style/auth.css">
    <link rel="stylesheet" href="../style/tipografia.css">
</head>
<body class="pagina-auth">

    <!-- Card Principal de Registro -->
    <main class="auth-card">
        <header class="auth-header">
            <h1>Registre-se no Discord</h1>
        </header>

        <section aria-label="Formulário de cadastro">
            <?php include __DIR__ . '/includes/formCadastroUsuario.php'; ?>
        </section>
    </main>

    <!-- Aviso educacional obrigatório do edital -->
    <footer class="aviso-academico">
        <p>Clone do Discord desenvolvido para fins educacionais. Sem vínculo com a empresa original. Todos os dados são ficticios.</p>
    </footer>

    <script src="../js/auth.js"></script>
</body>
</html>