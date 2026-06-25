const token = localStorage.getItem("token_cafe");
const cargoUsuario = localStorage.getItem("cargo_cafe");
const nomeUsuario = localStorage.getItem("username_cafe");

if (!token) {
    window.location.href = "login.html"; 
}

const API_URL = "https://coffeestock-backend.vercel.app";
let cafesCache = {}; 
const ITENS_POR_PAGINA = 10;
let skipAtual = 0; 

const formPedido = document.getElementById('formPedido');
const tipoCafe = document.getElementById('tipoCafe');
const campoMoagem = document.getElementById('campoMoagem');
const tipoEnvio = document.getElementById('tipoEnvio');
const labelEndereco = document.getElementById('labelEndereco');
const inputEndereco = document.getElementById('inputEndereco');
const listaPedidos = document.getElementById('listaPedidos');
const selectProdutoPedido = document.getElementById('tipoProduto');
const selectModificarCafe = document.getElementById('selectModificarCafe');

// =========================================================================
// CORREÇÃO DA INICIALIZAÇÃO: Garante a ordem de carregamento sequencial
// =========================================================================
window.addEventListener('DOMContentLoaded', async () => {
    if (nomeUsuario && cargoUsuario) {
        document.getElementById('usuarioLogadoBadge').textContent = `${nomeUsuario.toUpperCase()} (${cargoUsuario.toUpperCase()})`;
        if (cargoUsuario === 'admin') {
            document.getElementById('btnMenuAdmin').classList.remove('hidden');
        }
    }
    // Executa a carga inicial automática assim que a página abre
    await atualizarDadosSistema();
});

// =========================================================================
// FUNÇÃO GLOBAL DE ATUALIZAÇÃO (Vinculada explicitamente ao escopo window)
// =========================================================================
window.atualizarDadosSistema = async function() {
    // Localiza o botão na tela para dar um feedback visual de carregamento
    const btn = document.querySelector("button[onclick='atualizarDadosSistema()']");
    const textoOriginal = btn ? btn.innerHTML : "🔄 Atualizar";
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = "⏳ Sincronizando...";
    }

    try {
        // Puxa os dados novos do Supabase através da Vercel
        const carregouEstoque = await carregarEstoque();
        if (carregouEstoque) {
            await carregarPedidos();
        }
    } catch (err) {
        console.error("Erro na sincronização manual:", err);
    } finally {
        // Restaura o botão ao estado original
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = textoOriginal;
        }
    }
}

// FUNÇÃO AUXILIAR: Cria e exibe o popup (Toast Notification) na tela de forma dinâmica
function exibirPopupSucesso(mensagem) {
    // Cria o elemento de container se não existir
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = "fixed bottom-6 left-6 z-50 flex flex-col gap-2 pointer-events-none";
        document.body.appendChild(container);
    }

    // Cria o card do popup estilizado com Tailwind
    const toast = document.createElement('div');
    toast.className = "bg-emerald-600 text-white font-semibold text-sm px-5 py-3.5 rounded-lg shadow-2xl flex items-center gap-3 transition-all duration-300 transform translate-y-4 opacity-0 pointer-events-auto border border-emerald-500";
    toast.innerHTML = `
        <span>🎉</span>
        <div>${mensagem}</div>
    `;

    container.appendChild(toast);

    // Efeito de entrada (Fade-in + Slide-up)
    setTimeout(() => {
        toast.classList.remove('translate-y-4', 'opacity-0');
    }, 10);

    // Efeito de saída (Fade-out) após 4 segundos
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function fazerLogout() {
    localStorage.clear();
    window.location.href = "login.html";
}

// Buscar dados do Estoque
async function carregarEstoque() {
    try {
        const res = await fetch(`${API_URL}/estoque`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) return false;
        const estoque = await res.json();
        
        cafesCache = {};
        selectProdutoPedido.innerHTML = '';
        selectModificarCafe.innerHTML = '';
        
        const containerQuadros = document.getElementById('quadrosEstoque');
        containerQuadros.innerHTML = '';
        
        const cores = ['border-amber-700', 'border-yellow-600', 'border-orange-800', 'border-amber-900', 'border-stone-600'];

        estoque.forEach((item, index) => {
            cafesCache[item.id] = item;
            const cor = cores[index % cores.length];

            containerQuadros.innerHTML += `
                <div class="bg-white p-3 rounded-lg shadow-sm border-t-4 ${cor} flex flex-col justify-between transition hover:shadow-md">
                    <div>
                        <h3 class="text-gray-400 text-[10px] font-bold uppercase truncate" title="${item.nome}">${item.nome}</h3>
                        <p class="text-xl font-black text-gray-800 mt-0.5"><span>${item.quantidade_kg.toFixed(2)}</span> kg</p>
                    </div>
                    <div class="mt-2 pt-1.5 border-t border-gray-100 text-[9px] text-gray-500 space-y-0.5 font-medium">
                        <div class="flex justify-between"><span>250g:</span> <b class="text-gray-700">R$ ${item.preco_250g.toFixed(2)}</b></div>
                        <div class="flex justify-between"><span>500g:</span> <b class="text-gray-700">R$ ${item.preco_500g.toFixed(2)}</b></div>
                        <div class="flex justify-between"><span>1kg:</span> <b class="text-gray-700">R$ ${item.preco_1kg.toFixed(2)}</b></div>
                    </div>
                </div>`;

            selectProdutoPedido.add(new Option(item.nome, item.id));
            selectModificarCafe.add(new Option(item.nome, item.id));
        });
        return true;
    } catch (err) {
        console.error("Erro ao carregar estoque:", err);
        return false;
    }
}

// Carrega pedidos injetando os cards de forma estável no contêiner
async function carregarPedidos() {
    try {
        const res = await fetch(`${API_URL}/pedidos?skip=${skipAtual}&limit=${ITENS_POR_PAGINA}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const dados = await res.json();
        
        const pedidos = dados.pedidos;
        const total = dados.total;

        const idsNovosPedidos = pedidos.map(p => `pedido-row-${p.id}`);

        Array.from(listaPedidos.children).forEach(linha => {
            if (!idsNovosPedidos.includes(linha.id)) {
                linha.remove();
            }
        });

        pedidos.forEach(p => renderizarLinhaPedido(p));

        document.getElementById('pagNavInicio').textContent = total === 0 ? 0 : skipAtual + 1;
        document.getElementById('pagNavFim').textContent = Math.min(skipAtual + ITENS_POR_PAGINA, total);
        document.getElementById('pagNavTotal').textContent = total;

        document.getElementById('btnAnterior').disabled = (skipAtual === 0);
        document.getElementById('btnProximo').disabled = (skipAtual + ITENS_POR_PAGINA >= total);

    } catch (err) {
        console.error("Erro ao buscar pedidos:", err);
    }
}

function mudarPagina(direcao) {
    if (direcao === 1) skipAtual += ITENS_POR_PAGINA;
    else if (direcao === -1 && skipAtual >= ITENS_POR_PAGINA) skipAtual -= ITENS_POR_PAGINA;
    carregarPedidos();
}

// Novo Usuário via Admin
document.getElementById('formCadastroUsuario').addEventListener('submit', async function(e) {
    e.preventDefault();
    const payload = {
        username: document.getElementById('novoUsername').value.trim(),
        senha: document.getElementById('novaSenha').value,
        cargo: document.getElementById('novoCargo').value
    };

    try {
        const res = await fetch(`${API_URL}/usuarios/cadastrar`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const dados = await res.json();
        if(!res.ok) return alert(dados.detail || "Erro ao cadastrar funcionário");

        alert(dados.detail);
        document.getElementById('formCadastroUsuario').reset();
        toggleModal('modalCadastrarUsuario');
    } catch(err) {
        alert("Erro ao conectar com a API na nuvem.");
    }
});

// Preenche dados para modificação do estoque
function preencherDadosParaEditar() {
    const acao = document.getElementById('acaoEstoque').value;
    if (acao === 'modificar') {
        const cafeId = selectModificarCafe.value;
        const cafe = cafesCache[cafeId];
        if(cafe) {
            document.getElementById('nomeNovoCafe').value = cafe.nome;
            document.getElementById('qtdEstoque').value = cafe.quantidade_kg;
            document.getElementById('preco250g').value = cafe.preco_250g;
            document.getElementById('preco500g').value = cafe.preco_500g;
            document.getElementById('preco1kg').value = cafe.preco_1kg;
        }
    } else {
        document.getElementById('nomeNovoCafe').value = "";
        document.getElementById('qtdEstoque').value = "";
        document.getElementById('preco250g').value = "";
        document.getElementById('preco500g').value = "";
        document.getElementById('preco1kg').value = "";
    }
}

function toggleModal(id) {
    document.getElementById(id).classList.toggle('hidden');
    if(id === 'modalEstoque') {
        atualizarSelectModificar().then(() => preencherDadosParaEditar());
    }
}

async function atualizarSelectModificar() {
    selectModificarCafe.innerHTML = '';
    for (const id in cafesCache) {
        selectModificarCafe.appendChild(new Option(cafesCache[id].nome, id));
    }
}

function alternarCamposEstoque() {
    const acao = document.getElementById('acaoEstoque').value;
    document.getElementById('divSelecionarCafe').classList.toggle('hidden', acao === 'novo');
    if (acao === 'modificar') {
        document.getElementById('labelNomeCafe').textContent = "Editar Nome do Café";
        document.getElementById('labelQtdEstoque').textContent = "Nova Quantidade Total (kg)";
        preencherDadosParaEditar();
    } else {
        document.getElementById('labelNomeCafe').textContent = "Nome do Novo Café";
        document.getElementById('labelQtdEstoque').textContent = "Estoque Inicial (kg)";
        document.getElementById('formEstoque').reset();
        document.getElementById('acaoEstoque').value = "novo";
        document.getElementById('divSelecionarCafe').classList.add('hidden');
    }
}

tipoCafe.addEventListener('change', function() {
    campoMoagem.classList.toggle('hidden', this.value !== 'moido');
});

tipoEnvio.addEventListener('change', function() {
    if (this.value === 'entrega') {
        labelEndereco.textContent = "Endereço de Entrega";
        inputEndereco.placeholder = "Rua, Número, Bairro";
    } else {
        labelEndereco.textContent = "Local de Retirada / Observation";
        inputEndereco.placeholder = "Ex: Loja Central, Balcão 2, etc. (Opcional)";
    }
});

// Criar Pedido
formPedido.addEventListener('submit', async function(e) {
    e.preventDefault();

    const nomeClienteInput = document.getElementById('cliente').value;

    const corpoPedido = {
        cliente: nomeClienteInput,
        cafe_id: parseInt(selectProdutoPedido.value),
        tamanho_pacote: document.getElementById('tamanhoPacote').value,
        quantidade: parseInt(document.getElementById('quantidade').value),
        tipo_cafe: tipoCafe.value,
        tipo_moagem: tipoCafe.value === 'moido' ? document.getElementById('tipoMoagem').value : null,
        tipo_envio: tipoEnvio.value,
        endereco: inputEndereco.value.trim() !== "" ? inputEndereco.value : null,
        pago: document.getElementById('pedidoPago').checked
    };

    try {
        const res = await fetch(`${API_URL}/pedidos`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(corpoPedido)
        });

        const dados = await res.json();
        if (!res.ok) return alert(dados.detail || "Erro inesperado");

        formPedido.reset();
        campoMoagem.classList.add('hidden');
        
        // MODIFICADO: Dispara o popup customizado na tela em vez de usar alert travando o script
        exibirPopupSucesso(`Pedido de <b>${nomeClienteInput}</b> adicionado com sucesso!`);

        await carregarEstoque(); 
        skipAtual = 0; 
        await carregarPedidos();
    } catch (err) {
        alert("Não foi possível conectar com o servidor.");
    }
});

// Gerenciar Estoque e Preços
document.getElementById('formEstoque').addEventListener('submit', async function(e) {
    e.preventDefault();
    const acao = document.getElementById('acaoEstoque').value;
    const qtd = parseFloat(document.getElementById('qtdEstoque').value);
    const nome = document.getElementById('nomeNovoCafe').value.trim();
    const p250 = parseFloat(document.getElementById('preco250g').value);
    const p500 = parseFloat(document.getElementById('preco500g').value);
    const p1k = parseFloat(document.getElementById('preco1kg').value);

    if(!nome) return alert("O nome do café não pode ficar vazio.");

    const payload = {
        quantidade_kg: qtd,
        nome: nome,
        preco_250g: p250,
        preco_500g: p500,
        preco_1kg: p1k
    };

    try {
        if (acao === 'modificar') {
            const cafeId = selectModificarCafe.value;
            const res = await fetch(`${API_URL}/estoque/${cafeId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if(!res.ok) return alert((await res.json()).detail);
        } else {
            const res = await fetch(`${API_URL}/estoque`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if(!res.ok) return alert((await res.json()).detail);
        }
        document.getElementById('formEstoque').reset();
        alternarCamposEstoque();
        toggleModal('modalEstoque');
        await carregarEstoque();
        carregarPedidos();
    } catch (err) {
        alert("Erro ao sincronizar estoque.");
    }
});

// Atualizar Status
async function atualizarStatusAPI(e, id, novoStatus) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    try {
        const res = await fetch(`${API_URL}/pedidos/${id}/status`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: novoStatus })
        });
        if(res.ok) {
            await carregarEstoque();
            await carregarPedidos();
        } else {
            const dados = await res.json();
            alert(dados.detail || "Erro ao atualizar status");
        }
    } catch (err) {
        console.error(err);
        alert("Erro de conexão com o servidor.");
    }
}

// Alternar Pagamento Clicável
async function alternarPagamentoAPI(e, id, estadoAtual) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    try {
        const novoEstado = !estadoAtual; 
        const res = await fetch(`${API_URL}/pedidos/${id}/pagamento`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ pago: novoEstado })
        });
        if (res.ok) {
            await carregarPedidos();
        } else {
            alert("Erro ao atualizar pagamento.");
        }
    } catch (err) {
        console.error(err);
    }
}

// Excluir Usuário Existente
async function excluirUsuarioAPI() {
    const usernameAlvo = document.getElementById('usernameDeletar').value.trim();
    if (!usernameAlvo) return alert("Por favor, digite o nome de usuário que deseja remover.");

    const confirmar = confirm(`Tem certeza que deseja remover permanentemente o usuário "${usernameAlvo}"?`);
    if (!confirmar) return;

    try {
        const res = await fetch(`${API_URL}/usuarios/${usernameAlvo}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const dados = await res.json();
        if (!res.ok) return alert(dados.detail || "Erro ao tentar remover usuário.");

        alert(dados.detail);
        document.getElementById('usernameDeletar').value = "";
        toggleModal('modalCadastrarUsuario');
    } catch (err) {
        alert("Não foi possível conectar com o servidor.");
    }
}

// Excluir Pedido Completo
async function excluirPedidoAPI() {
    const idBuscado = document.getElementById('idPedidoStatus').value;
    if (!idBuscado) return alert("Por favor, digite o ID do pedido.");

    const confirmar = confirm(`Tem certeza que deseja excluir permanentemente o pedido #${idBuscado}?`);
    if (!confirmar) return;

    try {
        const res = await fetch(`${API_URL}/pedidos/${idBuscado}`, {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) return alert((await res.json()).detail || "Erro ao tentar excluir.");

        toggleModal('modalStatus');
        document.getElementById('formAlterarStatus').reset();
        await carregarEstoque();
        await carregarPedidos();
        alert(`Pedido #${idBuscado} excluído com sucesso!`);
    } catch (err) {
        alert("Não foi possível conectar com o servidor.");
    }
}

function renderizarLinhaPedido(p) {
    const idLinha = `pedido-row-${p.id}`;
    let linhaElemento = document.getElementById(idLinha);
    const existeNoDom = !!linhaElemento;

    if (!linhaElemento) {
        linhaElemento = document.createElement('div');
        linhaElemento.id = idLinha;
        linhaElemento.className = "p-4 flex flex-col gap-2 md:grid md:grid-cols-12 md:items-center hover:bg-gray-50 transition-colors border-b border-gray-100";
    }

    const cafeObj = cafesCache[p.cafe_id];
    const nomeCafe = cafeObj ? cafeObj.nome : "Café Removido";
    const moagemStr = p.tipo_cafe === 'moido' ? `Moído (${p.tipo_moagem})` : 'Grão';
    const enderecoStr = p.endereco ? p.endereco : (p.tipo_envio === 'retirada' ? 'Retira na Loja' : 'N/I');
    const dataFormatada = p.data_pedido ? new Date(p.data_pedido).toLocaleDateString('pt-BR') : 'N/A';
    const valorTotalFormatado = p.valor_total ? `R$ ${p.valor_total.toFixed(2)}` : 'R$ 0,00';

    const corStatus = p.status === 'entregue' ? 'bg-green-100 text-green-800 border-green-300' : (p.status === 'separado' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-yellow-100 text-yellow-800 border-yellow-300');
    
    const btnPagamento = p.pago 
        ? `<button onclick="alternarPagamentoAPI(event, ${p.id}, ${p.pago})" class="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded cursor-pointer transition-transform duration-75 active:scale-95 whitespace-nowrap" title="Mudar para Pendente">🟢 Pago</button>`
        : `<button onclick="alternarPagamentoAPI(event, ${p.id}, ${p.pago})" class="inline-flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded cursor-pointer transition-transform duration-75 active:scale-95 whitespace-nowrap" title="Mudar para Pago">⚪ Pendente</button>`;

    let acaoBotao = `<span class="text-xs text-gray-400 font-medium whitespace-nowrap">Concluído</span>`;
    if (p.status === 'aguardando') {
        acaoBotao = `<button onclick="atualizarStatusAPI(event, ${p.id}, 'separado')" class="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold py-1 px-2.5 rounded transition w-full md:w-auto text-center whitespace-nowrap">Separar</button>`;
    } else if (p.status === 'separado') {
        acaoBotao = `<button onclick="atualizarStatusAPI(event, ${p.id}, 'entregue')" class="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-semibold py-1 px-2.5 rounded transition w-full md:w-auto text-center whitespace-nowrap">Entregar</button>`;
    }

    linhaElemento.innerHTML = `
        <div class="col-span-1 flex justify-between items-center md:flex-col md:items-start">
            <span class="text-gray-400 text-xs md:text-sm font-medium">${dataFormatada}</span>
            <span class="font-bold text-amber-800 text-xs md:text-sm">#${p.id}</span>
        </div>

        <div class="col-span-2 font-semibold text-gray-800 text-sm md:text-base truncate">
            <span class="text-xs text-gray-400 font-normal md:hidden block">Cliente:</span>
            ${p.cliente}
        </div>

        <div class="col-span-2 text-xs md:text-sm truncate">
            <span class="text-xs text-gray-400 font-normal md:hidden block">Produto:</span>
            <span class="text-amber-900 font-semibold">${nomeCafe}</span> 
            <span class="text-gray-500 font-bold">(${p.tamanho_pacote} x${p.quantidade})</span>
        </div>
        
        <div class="col-span-1 text-xs text-gray-600">
            <span class="text-xs text-gray-400 font-normal md:hidden block">Moagem:</span>
            ${moagemStr}
        </div>

        <div class="col-span-2 text-xs">
            <span class="text-xs text-gray-400 font-normal md:hidden block">Logística:</span>
            <span class="font-bold ${p.tipo_envio === 'entrega' ? 'text-amber-800' : 'text-blue-800'}">${p.tipo_envio.toUpperCase()}</span>
            <p class="text-gray-500 truncate max-w-[140px] text-[11px] md:text-xs" title="${enderecoStr}">${enderecoStr}</p>
        </div>

        <div class="col-span-1 font-bold text-gray-900 text-sm md:text-base whitespace-nowrap">
            <span class="text-xs text-gray-400 font-normal md:hidden block">Subtotal:</span>
            ${valorTotalFormatado}
        </div>

        <div class="col-span-1 flex items-center justify-between md:justify-start border-t border-dashed pt-2 mt-1 md:border-0 md:pt-0 md:mt-0">
            <span class="text-xs text-gray-400 font-normal md:hidden">Pagamento:</span>
            ${btnPagamento}
        </div>

        <div class="col-span-2 flex items-center justify-between md:justify-end gap-2">
            <span class="text-xs text-gray-400 font-normal md:hidden">Operação:</span>
            <div class="flex items-center gap-1.5 w-full md:w-auto justify-end">
                <span class="px-2 py-0.5 text-[10px] font-bold rounded-full border ${corStatus} capitalize whitespace-nowrap">${p.status}</span>
                ${acaoBotao}
            </div>
        </div>
    `;

    if (!existeNoDom) {
        listaPedidos.appendChild(linhaElemento);
    }
}

document.getElementById('formAlterarStatus').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('idPedidoStatus').value;
    const status = document.getElementById('novoStatusSelecionado').value;
    atualizarStatusAPI(e, id, status);
    toggleModal('modalStatus');
    document.getElementById('formAlterarStatus').reset();
});