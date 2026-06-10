const token = localStorage.getItem("token_cafe");
const cargoUsuario = localStorage.getItem("cargo_cafe");
const nomeUsuario = localStorage.getItem("username_cafe");

if (!token) {
    window.location.href = "login.html"; 
}

const API_URL = "http://127.0.0.1:8000";
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

// Inicialização Estável
window.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('usuarioLogadoBadge').textContent = `${nomeUsuario.toUpperCase()} (${cargoUsuario.toUpperCase()})`;

    if (cargoUsuario === 'admin') {
        document.getElementById('btnMenuAdmin').classList.remove('hidden');
    }

    await carregarEstoque();
    carregarPedidos();
});

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
                <div class="bg-white p-5 rounded-lg shadow-md border-t-4 ${cor}">
                    <h3 class="text-gray-500 text-sm font-semibold uppercase">${item.nome}</h3>
                    <p class="text-3xl font-bold text-gray-800 mt-1"><span>${item.quantidade_kg.toFixed(2)}</span> kg</p>
                    <div class="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500 space-y-0.5">
                        <span class="block">📦 250g: <b>R$ ${item.preco_250g.toFixed(2)}</b></span>
                        <span class="block">📦 500g: <b>R$ ${item.preco_500g.toFixed(2)}</b></span>
                        <span class="block">📦 1kg: <b>R$ ${item.preco_1kg.toFixed(2)}</b></span>
                    </div>
                </div>`;

            selectProdutoPedido.add(new Option(item.nome, item.id));
            selectModificarCafe.add(new Option(item.nome, item.id));
        });
        return true;
    } catch (err) {
        console.error("Erro ao carregar estoque:", err);
    }
}

// Carrega pedidos injetando as linhas de forma não destrutiva para o layout
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

// Alterna Modais
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
        labelEndereco.textContent = "Local de Retirada / Observação";
        inputEndereco.placeholder = "Ex: Loja Central, Balcão 2, etc. (Opcional)";
    }
});

// Criar Pedido
formPedido.addEventListener('submit', async function(e) {
    e.preventDefault();

    const corpoPedido = {
        cliente: document.getElementById('cliente').value,
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

// Atualizar Status (Atômico sem pulo)
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
            await carregarPedidos();
        } else {
            alert("Erro ao atualizar status");
        }
    } catch (err) {
        console.error(err);
    }
}

// Alternar Pagamento Clicável (Atômico sem pulo)
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
        await carregarPedidos();
        alert(`Pedido #${idBuscado} excluído com sucesso!`);
    } catch (err) {
        alert("Não foi possível conectar com o servidor.");
    }
}

// Função de renderização cirúrgica célula por célula
function renderizarLinhaPedido(p) {
    const idLinha = `pedido-row-${p.id}`;
    let linhaElemento = document.getElementById(idLinha);
    const existeNoDom = !!linhaElemento;

    if (!linhaElemento) {
        linhaElemento = document.createElement('tr');
        linhaElemento.id = idLinha;
        linhaElemento.className = "hover:bg-gray-50 border-b text-xs sm:text-sm transition-colors";
        
        for (let i = 0; i < 11; i++) {
            linhaElemento.appendChild(document.createElement('td'));
        }
    }

    const celulas = linhaElemento.children;
    const cafeObj = cafesCache[p.cafe_id];
    const nomeCafe = cafeObj ? cafeObj.nome : "Café Removido";
    const moagemStr = p.tipo_cafe === 'moido' ? `Moído (${p.tipo_moagem})` : 'Grão';
    const enderecoStr = p.endereco ? p.endereco : (p.tipo_envio === 'retirada' ? 'Retira na Loja' : 'N/I');
    const dataFormatada = p.data_pedido ? new Date(p.data_pedido).toLocaleDateString('pt-BR') : 'N/A';
    const valorTotalFormatado = p.valor_total ? `R$ ${p.valor_total.toFixed(2)}` : 'R$ 0,00';

    celulas[0].className = "p-4 text-gray-500 font-medium";
    celulas[0].textContent = dataFormatada;

    celulas[1].className = "p-4 font-bold text-gray-400";
    celulas[1].textContent = `#${p.id}`;

    celulas[2].className = "p-4 font-medium";
    celulas[2].textContent = p.cliente;

    celulas[3].className = "p-4 text-amber-900 font-semibold";
    celulas[3].textContent = nomeCafe;

    celulas[4].className = "p-4";
    celulas[4].innerHTML = `${p.tamanho_pacote} <span class="text-xs text-gray-400">x${p.quantidade}</span>`;

    celulas[5].className = "p-4 text-xs";
    celulas[5].textContent = moagemStr;

    celulas[6].className = "p-4";
    celulas[6].innerHTML = `
        <span class="block font-medium ${p.tipo_envio === 'entrega' ? 'text-amber-800' : 'text-blue-800'}">${p.tipo_envio.toUpperCase()}</span>
        <span class="text-xs text-gray-500 block max-w-xs truncate">${enderecoStr}</span>`;

    celulas[7].className = "p-4 font-bold text-gray-800";
    celulas[7].textContent = valorTotalFormatado;

    celulas[8].className = "p-4";
    celulas[8].innerHTML = p.pago 
        ? `<button onclick="alternarPagamentoAPI(event, ${p.id}, ${p.pago})" class="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded cursor-pointer transition-transform duration-75 active:scale-95" title="Mudar para Pendente">🟢 Pago</button>`
        : `<button onclick="alternarPagamentoAPI(event, ${p.id}, ${p.pago})" class="inline-flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded cursor-pointer transition-transform duration-75 active:scale-95" title="Mudar para Pago">⚪ Pendente</button>`;

    celulas[9].className = "p-4";
    if (p.status === 'aguardando') {
        celulas[9].innerHTML = `<span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">Aguardando</span>`;
        celulas[10].innerHTML = `<button onclick="atualizarStatusAPI(event, ${p.id}, 'separado')" class="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold py-1 px-2.5 rounded transition">Separar</button>`;
    } else if (p.status === 'separado') {
        celulas[9].innerHTML = `<span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-300">Separado</span>`;
        celulas[10].innerHTML = `<button onclick="atualizarStatusAPI(event, ${p.id}, 'entregue')" class="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-semibold py-1 px-2.5 rounded transition">Entregar</button>`;
    } else {
        celulas[9].innerHTML = `<span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-300">Entregue</span>`;
        celulas[10].innerHTML = `<span class="text-xs text-gray-400 font-medium">Concluído</span>`;
    }
    celulas[10].className = "p-4";

    if (!existeNoDom) {
        listaPedidos.appendChild(linhaElemento);
    }
}

// Form Status por ID
document.getElementById('formAlterarStatus').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('idPedidoStatus').value;
    const status = document.getElementById('novoStatusSelecionado').value;
    atualizarStatusAPI(e, id, status);
    toggleModal('modalStatus');
    document.getElementById('formAlterarStatus').reset();
});