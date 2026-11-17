document.addEventListener("DOMContentLoaded", () => {
    const linksConfiguracoes = document.querySelectorAll(".controles-usuario a[href='configuracoes.html']");
    let fundoPopup = null;
    let quadroConfiguracoes = null;
    let elementoFocado = null;

    function fecharPopup() {
        if (!fundoPopup) return;

        fundoPopup.remove();
        document.body.classList.remove("config-popup-aberto");
        document.querySelector(".layout-aplicativo")?.removeAttribute("inert");
        document.querySelector(".layout-aplicativo")?.removeAttribute("aria-hidden");
        fundoPopup = null;
        quadroConfiguracoes = null;
        elementoFocado?.focus();
    }

    function abrirPopup(link) {
        if (fundoPopup) return;

        elementoFocado = link;
        fundoPopup = document.createElement("div");
        fundoPopup.className = "config-popup-fundo";

        const dialogo = document.createElement("section");
        dialogo.className = "config-popup";
        dialogo.setAttribute("role", "dialog");
        dialogo.setAttribute("aria-modal", "true");
        dialogo.setAttribute("aria-label", "Configurações do usuário");

        const botaoFechar = document.createElement("button");
        botaoFechar.className = "config-popup-fechar";
        botaoFechar.type = "button";
        botaoFechar.setAttribute("aria-label", "Fechar configurações");
        botaoFechar.textContent = "×";
        botaoFechar.addEventListener("click", fecharPopup);

        quadroConfiguracoes = document.createElement("iframe");
        quadroConfiguracoes.title = "Configurações do usuário";
        quadroConfiguracoes.src = "configuracoes.html?popup=1";

        dialogo.append(botaoFechar, quadroConfiguracoes);
        fundoPopup.appendChild(dialogo);
        fundoPopup.addEventListener("click", (evento) => {
            if (evento.target === fundoPopup) fecharPopup();
        });

        document.body.appendChild(fundoPopup);
        document.body.classList.add("config-popup-aberto");
        const layoutAplicativo = document.querySelector(".layout-aplicativo");
        if (layoutAplicativo) {
            layoutAplicativo.setAttribute("inert", "");
            layoutAplicativo.setAttribute("aria-hidden", "true");
        }
        botaoFechar.focus();
    }

    linksConfiguracoes.forEach((link) => {
        link.addEventListener("click", (evento) => {
            evento.preventDefault();
            abrirPopup(link);
        });
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") fecharPopup();
    });

    window.addEventListener("message", (evento) => {
        if (!quadroConfiguracoes || evento.source !== quadroConfiguracoes.contentWindow) return;

        if (evento.data === "fechar-configuracoes") {
            fecharPopup();
        } else if (evento.data === "sair-configuracoes") {
            fecharPopup();
            window.location.href = "../index.html";
        }
    });
});
