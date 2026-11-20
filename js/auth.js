document.addEventListener("DOMContentLoaded", () => {

    const formLogin = document.getElementById("form-login");
    const formRegister = document.getElementById("form-register");
    const inputTelefone = document.getElementById("reg-telefone");

    function mostrarErro(input, spanErro, mensagem) {
        input.classList.add("input-invalido");
        spanErro.textContent = mensagem;
        spanErro.classList.add("ativo");
    }

    function limparErro(input, spanErro) {
        input.classList.remove("input-invalido");
        spanErro.textContent = "";
        spanErro.classList.remove("ativo");
    }

    // MÁSCARA DE TELEFONE

    if (inputTelefone) {

        inputTelefone.addEventListener("input", (evento) => {

            let valor = evento.target.value.replace(/\D/g, "");

            if (valor.length > 11) {
                valor = valor.slice(0, 11);
            }

            if (valor.length > 6) {

                evento.target.value =
                    `(${valor.slice(0, 2)}) ${valor.slice(2, 7)}-${valor.slice(7)}`;

            } else if (valor.length > 2) {

                evento.target.value =
                    `(${valor.slice(0, 2)}) ${valor.slice(2)}`;

            } else if (valor.length > 0) {

                evento.target.value = `(${valor}`;

            }

        });

    }

    // 1. FORMULÁRIO DE LOGIN

    if (formLogin) {

        const inputIdentificador = document.getElementById("login-identificador");
        const inputSenha = document.getElementById("login-senha");

        const erroIdentificador = document.getElementById("erro-identificador");
        const erroSenha = document.getElementById("erro-senha");

        inputIdentificador.addEventListener("input", () => {
            limparErro(inputIdentificador, erroIdentificador);
        });

        inputSenha.addEventListener("input", () => {
            limparErro(inputSenha, erroSenha);
        });

        formLogin.addEventListener("submit", (evento) => {

            let valido = true;

            const valorId = inputIdentificador.value.trim();
            const valorSenha = inputSenha.value;

            if (!valorId) {

                mostrarErro(
                    inputIdentificador,
                    erroIdentificador,
                    "Informe seu e-mail, usuário ou número de telefone."
                );

                valido = false;

            }

            if (!valorSenha) {

                mostrarErro(
                    inputSenha,
                    erroSenha,
                    "Informe sua senha."
                );

                valido = false;

            }

            // Se houver erros, impede o envio.
            // Caso contrário, permite que o PHP processe o login.

            if (!valido) {
                evento.preventDefault();
            }

        });

    }

    // 2. FORMULÁRIO DE CADASTRO
    if (formRegister) {

        const inputUsername = document.getElementById("reg-username");
        const inputEmail = document.getElementById("reg-email");
        const inputSenha = document.getElementById("reg-senha");

        const erroUsername = document.getElementById("erro-username");
        const erroEmail = document.getElementById("erro-email");
        const erroTelefone = document.getElementById("erro-telefone");
        const erroSenha = document.getElementById("erro-senha");

        inputUsername.addEventListener("input", () => {
            limparErro(inputUsername, erroUsername);
        });

        inputEmail.addEventListener("input", () => {
            limparErro(inputEmail, erroEmail);
        });

        inputTelefone.addEventListener("input", () => {
            limparErro(inputTelefone, erroTelefone);
        });

        inputSenha.addEventListener("input", () => {
            limparErro(inputSenha, erroSenha);
        });

        formRegister.addEventListener("submit", (evento) => {

            let valido = true;

            // Validação do nome de usuário
            if (inputUsername.value.trim().length < 3) {

                mostrarErro(
                    inputUsername,
                    erroUsername,
                    "O nome de usuário deve ter no mínimo 3 caracteres."
                );

                valido = false;

            }

            // Validação do e-mail
            const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!regexEmail.test(inputEmail.value.trim())) {

                mostrarErro(
                    inputEmail,
                    erroEmail,
                    "Insira um endereço de e-mail válido."
                );

                valido = false;

            }

            // Validação do telefone
            const digitosTelefone = inputTelefone.value.replace(/\D/g, "");

            if (digitosTelefone.length < 10 || digitosTelefone.length > 11) {

                mostrarErro(
                    inputTelefone,
                    erroTelefone,
                    "Informe um telefone válido com DDD."
                );

                valido = false;

            }

            // Validação da senha
            if (inputSenha.value.length < 6) {

                mostrarErro(
                    inputSenha,
                    erroSenha,
                    "A senha deve ter no mínimo 6 caracteres."
                );

                valido = false;

            }

            // Se houver erros, impede o envio.
            // Se estiver tudo correto, permite que o PHP processe o cadastro.

            if (!valido) {
                evento.preventDefault();
            }

        });

    }

});