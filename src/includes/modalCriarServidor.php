<div class="overlay-modal-servidor" id="overlay-modal-servidor"
     role="dialog" aria-modal="true" aria-labelledby="titulo-modal-servidor">

    <div class="modal-criar-servidor">

        <button type="button" class="btn-fechar-modal-servidor" id="btn-fechar-modal-servidor" aria-label="Fechar modal">
            <i class="bi bi-x-lg"></i>
        </button>

        <div class="cabecalho-modal-servidor">
            <h2 id="titulo-modal-servidor">Personalize o seu servidor</h2>
            <p>Deixe seu novo servidor com a sua cara dando um nome e um ícone a ele. Se quiser, é possível mudar depois.</p>
        </div>
        <form id="form-criar-servidor" action="includes/criarServidor.php" method="POST" enctype="multipart/form-data" novalidate>
            <div class="area-upload-icone">
                <label for="input-icone-novo-servidor" class="circulo-upload-servidor" id="circulo-upload-servidor" title="Enviar ícone do servidor">
                    <i class="bi bi-camera-fill"></i>
                    <span>Enviar</span>
                    <div class="badge-mais-upload"><i class="bi bi-plus"></i></div>
                </label>
                <input type="file" id="input-icone-novo-servidor" accept="image/*" name="arquivoServidor" hidden>
            </div>
            <div class="campo-nome-novo-servidor">
                <label for="input-nome-novo-servidor">
                    Nome do servidor <span class="asterisco-obrigatorio">*</span>
                </label>
                <input type="text" id="input-nome-novo-servidor" name="nomeServidor" maxlength="25" required>
                <span class="erro-modal-servidor" id="erro-modal-servidor" role="alert"></span>
            </div>

            <p class="texto-diretrizes-servidor">
                Ao criar um servidor, você concorda com as <a href="#diretrizes" id="link-diretrizes-servidor">diretrizes da comunidade</a> do Discord.
            </p>

            <div class="rodape-modal-servidor">
                <button type="button" class="btn-voltar-modal-servidor" id="btn-voltar-modal-servidor">Voltar</button>

                <button type="submit" class="btn-confirmar-criar-servidor">Criar</button>
            </div>

        </form>
    </div>
</div>