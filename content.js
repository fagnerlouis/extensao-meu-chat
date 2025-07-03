'use strict';

(function() {
    // evita ele rodar dentro dele mesmo
    if (window.top !== window.self) {
        return;
    }

    // globais
    let isDragging = false;
    let dragStartX, dragStartY;
    let isViewInitialized = false; // <-- NOVA VARIÁVEL DE CONTROLE

    // elementos

    const widgetContainer = document.createElement('div');
    Object.assign(widgetContainer.style, {
        position: 'fixed',
        right: '2px',
        bottom: '2px',
        zIndex: '9999'
    });

    const chatButton = document.createElement('button');
    chatButton.textContent = '💬';
    Object.assign(chatButton.style, {
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        backgroundColor: '#343a40',
        color: 'white',
        fontSize: '15px',
        border: 'none',
        cursor: 'move',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        display: 'block'
    });

    const chatContainer = document.createElement('div');
    Object.assign(chatContainer.style, {
        position: 'absolute',
        bottom: '75px',
        right: '0px',
        width: '260px',
        height: '320px',
        backgroundColor: '#212529',
        border: '1px solid #555',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        display: 'none',
        overflow: 'hidden',
        fontFamily: 'sans-serif',
        resize: 'both'
    });

    widgetContainer.appendChild(chatContainer);
    widgetContainer.appendChild(chatButton);
    document.body.appendChild(widgetContainer);


    // --- funções de renderização ---

    function renderConfigView() {
        isViewInitialized = false; // <-- SINALIZA QUE A VIEW PRECISA SER RECONSTRUÍDA
        chatContainer.innerHTML = '';
        const padding = '20px';

        const style = document.createElement('style');
        style.textContent = `
            .config-input::placeholder { color: #999 !important; opacity: 1; }
            .config-input { background-color: #3e444a; color: #f8f9fa; }
        `;
        chatContainer.appendChild(style);

        const formTitle = document.createElement('h3');
        formTitle.textContent = 'Configurar Chat';
        Object.assign(formTitle.style, { color: 'white', textAlign: 'center', marginTop: padding, marginBottom: '25px' });

        const inputChannel = document.createElement('input');
        Object.assign(inputChannel, { type: 'text', placeholder: 'Nome do Canal', className: 'config-input' });

        const inputNickname = document.createElement('input');
        Object.assign(inputNickname, { type: 'text', placeholder: 'Seu Nickname', className: 'config-input' });

        chrome.storage.local.get(['channelName', 'nickname'], (result) => {
            inputChannel.value = result.channelName || '';
            inputNickname.value = result.nickname || '';
        });

        const saveButton = document.createElement('button');
        saveButton.textContent = 'Entrar';

        [inputChannel, inputNickname, saveButton].forEach(el => {
            Object.assign(el.style, { display: 'block', width: `calc(100% - ${padding} * 2)`, margin: `0 ${padding} 15px ${padding}`, padding: '10px', borderRadius: '5px', border: '1px solid #555' });
        });
        Object.assign(saveButton.style, { backgroundColor: '#007bff', color: 'white', cursor: 'pointer' });

        saveButton.addEventListener('click', () => {
            if (inputChannel.value.trim() && inputNickname.value.trim()) {
                chrome.storage.local.set({
                    channelName: inputChannel.value.trim(),
                    nickname: inputNickname.value.trim()
                }, () => {
                    renderChatView();
                });
            } else {
                alert('Por favor, preencha ambos os campos.');
            }
        });

        chatContainer.append(formTitle, inputChannel, inputNickname, saveButton);
    }

    function renderChatView() {
        chatContainer.innerHTML = '';

        chrome.storage.local.get(['channelName', 'nickname'], (result) => {
            const { channelName, nickname } = result;

            if (!channelName || !nickname) {
                renderConfigView();
                return;
            }

            const iframe = document.createElement('iframe');
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';

            iframe.srcdoc = `
               <!DOCTYPE html><html><head><style>html,body{height:100%;width:100%;margin:0;padding:0;overflow:hidden;}</style></head><body><div id="tlkio" data-channel="${channelName}" data-nickname="${nickname}" data-theme="theme--night" style="width:100%;height:100%;"></div><script async src="https://tlk.io/embed.js" type="text/javascript"><\/script></body></html>
            `;
            
            iframe.addEventListener('load', () => {
                const overrideCss = `
                    body, #tlkio, #tlkio-container { background-color: #212529 !important; color: #f8f9fa !important; }
                    #tlkio .messages { background-color: #212529 !important; }
                    #tlkio .message-input { background-color: #3e444a !important; color: #f8f9fa !important; border: 1px solid #555 !important; }
                    #tlkio .message-input::placeholder { color: #999 !important; }
                    #tlkio #header { background-color: #343a40 !important; border-bottom: 1px solid #555 !important; }
                    #tlkio #header #channel-name { color: #f8f9fa !important; }
                `;
                const styleElement = iframe.contentDocument.createElement('style');
                styleElement.textContent = overrideCss;
                iframe.contentDocument.head.appendChild(styleElement);
                isViewInitialized = true; // <-- SINALIZA QUE O CHAT FOI CARREGADO COM SUCESSO
            });

            const changeButton = document.createElement('button');
            changeButton.textContent = 'Alterar chat';
            Object.assign(changeButton.style, { position: 'absolute', bottom: '0', left: '0', width: '100%', backgroundColor: '#495057', color: '#f8f9fa', border: 'none', borderTop: '1px solid #555', padding: '4px', fontSize: '11px', cursor: 'pointer', textAlign: 'center' });
            changeButton.addEventListener('click', renderConfigView);

            chatContainer.appendChild(iframe);
            chatContainer.appendChild(changeButton);
        });
    }

    // --- logica e arrasto ---

    chatButton.addEventListener('click', () => {
        if (isDragging) return;

        const isHidden = chatContainer.style.display === 'none';
        chatContainer.style.display = isHidden ? 'block' : 'none';

        // --- LÓGICA ALTERADA ---
        // Só renderiza a view se ela estiver sendo mostrada PELA PRIMEIRA VEZ.
        if (isHidden && !isViewInitialized) {
            chrome.storage.local.get('channelName', (result) => {
                if (result.channelName) {
                    renderChatView();
                } else {
                    renderConfigView();
                }
            });
        }
    });

    chatButton.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDragging = false;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        const rect = widgetContainer.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        function onMouseMove(e) {
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isDragging = true;
            widgetContainer.style.right = 'auto';
            widgetContainer.style.bottom = 'auto';
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;
            const bodyRect = document.body.getBoundingClientRect();
            newX = Math.max(0, Math.min(newX, bodyRect.width - rect.width));
            newY = Math.max(0, Math.min(newY, bodyRect.height - rect.height));
            widgetContainer.style.left = `${newX}px`;
            widgetContainer.style.top = `${newY}px`;
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            setTimeout(() => { isDragging = false; }, 0);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

})();