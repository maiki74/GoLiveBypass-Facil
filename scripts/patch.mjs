// Uso: node patch.mjs plugin <pasta goLiveBypass> | node patch.mjs settings <settings.json>
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "fs";
import { dirname, join } from "path";

const [mode, target] = process.argv.slice(2);

function insert(file, anchor, code, where) {
    const src = readFileSync(file, "utf8");
    if (src.includes("GLB-FACIL")) return; // já aplicado
    const i = src.indexOf(anchor);
    if (i < 0 || src.indexOf(anchor, i + 1) >= 0) throw new Error(`âncora não encontrada (ou repetida) em ${file}`);
    const pos = where === "before" ? src.lastIndexOf("\n", i) + 1 : src.indexOf("\n", i) + 1;
    writeFileSync(file, src.slice(0, pos) + code + src.slice(pos));
}

if (mode === "plugin") {
    // 1) Ao abrir o Discord com o túnel desligado, liga a VPN sozinho (1 relaunch, no máx. 1x a cada 3 min).
    insert(join(target, "vpn-controller.ts"), "if (!inspection.active || !inspection.owned) {", `        // GLB-FACIL: liga o túnel no boot sem o botão "Ativar agora"; a trava evita ciclo de relaunch.
        if (!inspection.active) {
            const marker = path.join(this.dataDir, ".boot-autostart-attempt");
            let last = 0;
            try { last = fs.statSync(marker).mtimeMs; } catch { }
            if (Date.now() - last > 3 * 60_000) {
                try { fs.writeFileSync(marker, String(Date.now())); } catch { }
                this.options.log("info", "boot: túnel inativo; ativando a VPN automaticamente (GLB-FACIL)");
                return this.startInternal(true);
            }
            this.options.log("warn", "boot: ativação automática já tentada há pouco; pulando para evitar ciclo de relaunch");
        }
`, "before");
    // 2) No Windows, mantém o túnel (só do Discord) ligado ao fechar: o próximo boot adota sem relaunch.
    insert(join(target, "native.ts"), "if (controller.isRelaunching() || quitting) return;", `    // GLB-FACIL: túnel continua ligado ao fechar; "Restaurar rede" no painel desliga.
    if (process.platform === "win32") { controller.cancelProtonLogin(); return; }
`, "after");
    console.log("patch aplicado");
} else if (mode === "settings") {
    let data = {};
    if (existsSync(target)) {
        copyFileSync(target, target + ".golive-backup");
        data = JSON.parse(readFileSync(target, "utf8"));
    } else mkdirSync(dirname(target), { recursive: true });
    data.plugins ??= {};
    // autoUpdate desligado: o updater do plugin trocaria os arquivos e apagaria o patch.
    data.plugins.GoLiveBypass = { ...data.plugins.GoLiveBypass, enabled: true, autoUpdate: false };
    writeFileSync(target, JSON.stringify(data, null, 4));
    console.log("plugin ativado nas configurações");
} else {
    throw new Error("uso: patch.mjs plugin <dir> | settings <arquivo>");
}
