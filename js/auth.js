document.addEventListener("DOMContentLoaded", () => {
    const formLogin = document.getElementById("form-login");
    const formRegister = document.getElementById("form-register");
    const inputTelefone = document.getElementById("reg-telefone");

    // Contas
    const contasPredefinidas = [
        {
            username: "Filipe",
            email: "filipe@discord.mock",
            telefone: "(49) 99999-0001",
            senha: "123456"
        },
        {
            username: "Matteo",
            email: "matteo@discord.mock",
            telefone: "(49) 99999-0002",
            senha: "123456"
        },
        {
            username: "Joao",
            email: "joao@discord.mock",
            telefone: "(49) 99999-0003",
            senha: "123456"
        }
    ];

    if (inputTelefone) {
        inputTelefone.addEventListener("input", (evento) => {
            let valor = evento.target.value.replace(/\D/g, "");
            if (valor.length > 11) valor = valor.slice(0, 11);

            if (valor.length > 6) {
                evento.target.value = `(${valor.slice(0, 2)}) ${valor.slice(2, 7)}-${valor.slice(7)}`;
            } else if (valor.length > 2) {
                evento.target.value = `(${valor.slice(0, 2)}) ${valor.slice(2)}`;
            } else if (valor.length > 0) {
                evento.target.value = `(${valor}`;
            }
        });
    }

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

    // 1. Formulário de Login 
    if (formLogin) {
        const inputIdentificador = document.getElementById("login-identificador");
        const inputSenha = document.getElementById("login-senha");
        const erroIdentificador = document.getElementById("erro-identificador");
        const erroSenha = document.getElementById("erro-senha");

        inputIdentificador.addEventListener("input", () => limparErro(inputIdentificador, erroIdentificador));
        inputSenha.addEventListener("input", () => limparErro(inputSenha, erroSenha));

        formLogin.addEventListener("submit", (evento) => {
            evento.preventDefault();
            let valido = true;

            const valorId = inputIdentificador.value.trim();
            const valorSenha = inputSenha.value;

            if (!valorId) {
                mostrarErro(inputIdentificador, erroIdentificador, "Informe seu e-mail, usuário ou número de telefone.");
                valido = false;
            }

            if (!valorSenha) {
                mostrarErro(inputSenha, erroSenha, "Informe sua senha.");
                valido = false;
            }

            if (!valido) return;

            //junta as contas definidas com eventuais contas cadastradas pelo usuário no navegador
            const contasSalvas = JSON.parse(localStorage.getItem("contasCadastradas") || "[]");
            const todasAsContas = [...contasPredefinidas, ...contasSalvas];

            const digitosDigitados = valorId.replace(/\D/g, "");

            const usuarioEncontrado = todasAsContas.find((conta) => {
                const emailBate = conta.email.toLowerCase() === valorId.toLowerCase();
                const nomeBate = conta.username.toLowerCase() === valorId.toLowerCase();
                const telefoneBate = digitosDigitados.length >= 10 && conta.telefone.replace(/\D/g, "") === digitosDigitados;
                return (emailBate || nomeBate || telefoneBate) && conta.senha === valorSenha;
            });

            if (usuarioEncontrado) {
                const usuarioLogado = {
                    username: usuarioEncontrado.username,
                    email: usuarioEncontrado.email,
                    telefone: usuarioEncontrado.telefone
                };
                localStorage.setItem("mock_discord_usuario", JSON.stringify(usuarioLogado));
                localStorage.setItem("usuarioLogado", JSON.stringify(usuarioLogado));
                window.location.href = "inicio.html";
            } else {
                mostrarErro(inputIdentificador, erroIdentificador, "E-mail, usuário, telefone ou senha inválidos.");
                mostrarErro(inputSenha, erroSenha, "Verifique suas credenciais ou crie uma conta.");
            }
        });
    }

    // Registro
    if (formRegister) {
        const inputUsername = document.getElementById("reg-username");
        const inputEmail = document.getElementById("reg-email");
        const inputSenha = document.getElementById("reg-senha");

        const erroUsername = document.getElementById("erro-username");
        const erroEmail = document.getElementById("erro-email");
        const erroTelefone = document.getElementById("erro-telefone");
        const erroSenha = document.getElementById("erro-senha");

        inputUsername.addEventListener("input", () => limparErro(inputUsername, erroUsername));
        inputEmail.addEventListener("input", () => limparErro(inputEmail, erroEmail));
        inputTelefone.addEventListener("input", () => limparErro(inputTelefone, erroTelefone));
        inputSenha.addEventListener("input", () => limparErro(inputSenha, erroSenha));

        formRegister.addEventListener("submit", (evento) => {
            evento.preventDefault();
            let valido = true;

            if (inputUsername.value.trim().length < 3) {
                mostrarErro(inputUsername, erroUsername, "O nome de usuário deve ter no mínimo 3 caracteres.");
                valido = false;
            }

            const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!regexEmail.test(inputEmail.value.trim())) {
                mostrarErro(inputEmail, erroEmail, "Insira um endereço de e-mail válido.");
                valido = false;
            }

            const digitosTelefone = inputTelefone.value.replace(/\D/g, "");
            if (digitosTelefone.length < 10 || digitosTelefone.length > 11) {
                mostrarErro(inputTelefone, erroTelefone, "Informe um telefone válido com DDD.");
                valido = false;
            }

            if (inputSenha.value.length < 6) {
                mostrarErro(inputSenha, erroSenha, "A senha deve ter no mínimo 6 caracteres.");
                valido = false;
            }

            if (valido) {
                const contasSalvas = JSON.parse(localStorage.getItem("contasCadastradas") || "[]");
                contasSalvas.push({
                    username: inputUsername.value.trim(),
                    email: inputEmail.value.trim(),
                    telefone: inputTelefone.value.trim(),
                    senha: inputSenha.value
                });
                localStorage.setItem("contasCadastradas", JSON.stringify(contasSalvas));

                // Volta para o login para entrar com a conta criada.
                window.location.href = "index.html";
            }
        });
    }
});