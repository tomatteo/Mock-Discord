<form id="form-login" class="auth-form" method="POST" novalidate>            
    <div class="campo-grupo">
        <label for="login-identificador">
            E-mail, usuário ou número de telefone <span class="asterisco-obrigatorio">*</span>
        </label>
        <input 
            type="text" 
            id="login-identificador" 
            name="identificador" 
            required
            autocomplete="username"
        >
        <span id="erro-identificador" class="mensagem-erro" role="alert"></span>
    </div>

    <div class="campo-grupo">
        <label for="login-senha">
            Senha <span class="asterisco-obrigatorio">*</span>
        </label>
        <input 
            type="password" 
            id="login-senha" 
            name="senha" 
            required
            minlength="6"
            autocomplete="current-password"
        >
        <span id="erro-senha" class="mensagem-erro" role="alert"></span>
    </div>

    <button type="submit" class="btn-primario">
        Entrar
    </button>
</form>