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

function replace(file, anchor, replacement, marker) {
    const src = readFileSync(file, "utf8");
    if (src.includes(marker)) return;
    const i = src.indexOf(anchor);
    if (i < 0 || src.indexOf(anchor, i + 1) >= 0) throw new Error(`âncora não encontrada (ou repetida) em ${file}`);
    writeFileSync(file, src.slice(0, i) + replacement + src.slice(i + anchor.length));
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
    // Existing Proton accounts can auto-start even if the setup wizard was skipped.
    replace(
        join(target, "native.ts"),
        "if (pluginEnabled() && pluginSettings().onboardingCompleted === true) {",
        "if (pluginEnabled() && (pluginSettings().onboardingCompleted === true || Boolean(pluginSettings().protonUsername))) { // GLB-FACIL-AUTOSTART-CONFIGURED",
        "GLB-FACIL-AUTOSTART-CONFIGURED"
    );
    replace(
        join(target, "native.ts"),
        "const result = await controller.enableAutomatic();",
        "const result = await runLogOperation(\"vpn-autostart\", () => controller.enableAutomatic()); // GLB-FACIL-AUTOSTART-LOG",
        "GLB-FACIL-AUTOSTART-LOG"
    );
    replace(join(target, "native.ts"), "app.whenReady().then(async () => {", `// GLB-FACIL-CRASH-LOG: observe failures without replacing Electron's handlers.
process.on("uncaughtExceptionMonitor", (error, origin) => {
    const code = (error as NodeJS.ErrnoException).code;
    const frame = error.stack?.match(/(?:patcher|renderer|preload|main)\\.js:\\d+:\\d+/)?.[0];
    log("error", "crash.main", {
        pid: process.pid,
        origin,
        error_code: typeof code === "string" && /^E[A-Z_]{2,31}$/.test(code) ? code : undefined,
        source: frame,
    });
});
app.on("render-process-gone", (_event, _contents, details) => {
    if (details.reason === "clean-exit") return;
    log("error", "crash.renderer", { pid: process.pid, reason: details.reason, exit_code: details.exitCode });
});
app.on("child-process-gone", (_event, details) => {
    if (details.reason === "clean-exit") return;
    log("error", "crash.child", { pid: process.pid, source: details.type, reason: details.reason, exit_code: details.exitCode });
});
app.on("quit", (_event, exitCode) => {
    log("info", "discord.exit", { pid: process.pid, exit_code: exitCode });
});
log("info", "discord.diagnostics.ready", { pid: process.pid });

app.whenReady().then(async () => {`, "GLB-FACIL-CRASH-LOG");
    replace(
        join(target, "index.tsx"),
        `        // A primeira execução precisa deixar o usuário atravessar as três etapas do
        // assistente antes de qualquer ativação que possa relançar o Discord.
        //
        // Este caminho é automático (start do renderer), então usa \`enableAutomatic\`: ele não
        // relança o Discord e respeita a suspensão de autostart. O relaunch ficou reservado
        // para o botão do painel (\`Native.enable\`), porque repeti-lo a cada boot transformava
        // um relaunch não confirmado num ciclo infinito de reinícios do Discord. Bridge antiga
        // sem \`enableAutomatic\` simplesmente não ativa sozinha -- o painel continua ativando.
        if (!onboardingRequired && typeof Native?.enableAutomatic === "function") {
            void Native.enableAutomatic().then(result => {
                if (!isLifecycleCurrent()) return;
                if (result?.success === false && !result.suppressed)
                    showToast(\`GoLiveBypass não conseguiu ativar a VPN: \${result.error || result.message || "veja o log"}\`, "failure");
            }).catch(error => {
                if (isLifecycleCurrent()) recordRendererError("Failed to reach the desktop process", error);
            });
        }
`,
        "        // GLB-FACIL-AUTOSTART-SINGLE-OWNER: o processo principal faz uma única tentativa automática no boot.\n",
        "GLB-FACIL-AUTOSTART-SINGLE-OWNER"
    );
    console.log("patch aplicado");
} else if (mode === "settings") {
    let data = {};
    if (existsSync(target)) {
        copyFileSync(target, target + ".golive-backup");
        data = JSON.parse(readFileSync(target, "utf8"));
    } else mkdirSync(dirname(target), { recursive: true });
    data.plugins ??= {};
    // autoUpdate desligado: o updater do plugin trocaria os arquivos e apagaria o patch.
    const plugin = { ...data.plugins.GoLiveBypass, enabled: true, autoUpdate: false };
    // Existing Proton login means setup is complete; otherwise keep first-run onboarding.
    if (typeof plugin.protonUsername === "string" && plugin.protonUsername.trim()) {
        plugin.onboardingCompleted = true;
        plugin.onboardingSkipped = false;
    }
    data.plugins.GoLiveBypass = plugin;
    writeFileSync(target, JSON.stringify(data, null, 4));
    console.log("plugin ativado nas configurações");
} else {
    throw new Error("uso: patch.mjs plugin <dir> | settings <arquivo>");
}
