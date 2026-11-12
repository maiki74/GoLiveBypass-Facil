# GoLiveBypass Fácil

Instala o **Equicord + plugin GoLiveBypass 2.0.16** no Discord (Windows) com **um clique**, e desinstala com outro.

## Instalar
1. Clique em **Code → Download ZIP** aqui em cima e extraia.
2. Dê dois cliques em **`Instalar.bat`** e espere (alguns minutos na primeira vez).
3. O Discord abre sozinho. No assistente do GoLiveBypass, faça o login da conta **ProtonVPN** (grátis serve).

Pronto. A VPN liga sozinha toda vez que o Discord abre — não precisa apertar "Ativar agora".

## Desinstalar
Dê dois cliques em **`Desinstalar.bat`**. Ele:
- devolve o Discord como estava (sem mod, ou com o Equicord/Vencord que você já tinha);
- desliga a VPN e remove o WireSock (pede permissão de administrador uma vez);
- apaga tudo do GoLiveBypass (inclusive o login Proton salvo).

## O Discord atualizou e o mod sumiu?
Rode o `Instalar.bat` de novo (a segunda vez é bem mais rápida).

## O que muda em relação ao plugin original
Dois ajustes pequenos, aplicados por `scripts/patch.mjs` (marcados com `GLB-FACIL`):
1. **Liga a VPN sozinho ao abrir o Discord** (com uma trava de 3 min contra loop de reinício).
2. **Não desliga a VPN ao fechar o Discord** (Windows). Assim, ao abrir de novo, ele já usa a VPN sem reiniciar.
   Só na primeira abertura depois de ligar o PC o Discord reinicia uma vez sozinho.
   A VPN só afeta o Discord. Para desligar: painel do plugin → **Restaurar rede**, ou `Desinstalar.bat`.

A atualização automática do plugin fica **desligada**, porque ela trocaria os arquivos e apagaria esses ajustes.

## Onde fica cada coisa
- Equicord + ferramentas (node, pnpm, git portátil): `%LOCALAPPDATA%\GoLiveBypassEquicord`
- Dados da VPN/login Proton: `%LOCALAPPDATA%\GoLiveBypass`

Tudo baixado é de fonte oficial e com versão fixa: Equicord (commit `5779462`), GoLiveBypass v2.0.16, Node 24.22.1, pnpm 12.18.0, MinGit 2.56.1. Os zips têm SHA-256 conferido.

## Créditos e licença
- [GoLiveBypass](https://github.com/bezumiya/GoLiveBypass) por bezumiya — GPL-3.0
- [Equicord](https://github.com/Equicord/Equicord) — GPL-3.0

Este repositório é só um instalador e também é GPL-3.0. Usar mods de cliente vai contra os Termos do Discord; use por sua conta.
