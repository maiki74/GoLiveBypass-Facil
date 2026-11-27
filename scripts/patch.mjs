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
    // Uma nova abertura pode tentar de novo. Somente o processo relançado pelo plugin bloqueia o ciclo.
    const controller = join(target, "vpn-controller.ts");
    const relaunchFlag = "--glb-facil-vpn-relaunch";
    const relaunched = `process.argv.includes("${relaunchFlag}")`;
    replace(controller, "app.relaunch();", `app.relaunch({ args: [...process.argv.slice(1).filter(arg => arg !== "${relaunchFlag}"), "${relaunchFlag}"] }); // GLB-FACIL-RELAUNCH`, "GLB-FACIL-RELAUNCH");
    replace(controller,
        "const relaunchWasNotConfirmed = owner?.restarting === true;",
        `const relaunchWasNotConfirmed = owner?.restarting === true && ${relaunched}; // GLB-FACIL-WINDOWS-RECOVERY`,
        "GLB-FACIL-WINDOWS-RECOVERY"
    );
    replace(controller,
        `    // Ativação automática do boot (processo principal e renderer). Não é a ativação do usuário:
    // só adota um túnel já ativo e NUNCA relança o Discord nem limpa a suspensão de autostart.
    //
    // Por que não subir o túnel aqui: sem o relaunch o Discord ficaria fora do filtro por
    // aplicativo e o usuário acharia que estava protegido sem estar (o README promete o
    // reinício na ativação). E por que não relançar: repetir o relaunch a cada boot transforma
    // um relaunch não confirmado em ciclo infinito -- cada processo novo relançava o Discord,
    // nascia outro, e a VPN ficava parando/começando a cada ~30s (relato: o Discord não
    // fechava nem reabria, só saía pelo gerenciador de tarefas). O caminho explícito continua
    // em \`enable()\`, chamado pelo botão do painel.`,
        "    // GLB-FACIL-BOOT-COMMENT: no Windows, adota o túnel existente ou inicia a VPN com um relaunch controlado.",
        "GLB-FACIL-BOOT-COMMENT"
    );
    replace(controller,
        "return this.serial(() => this.adoptActiveTunnelAtBoot());",
        "return this.serial(() => isWindows() ? this.startInternal(true, true) : this.adoptActiveTunnelAtBoot()); // GLB-FACIL-WINDOWS-BOOT",
        "GLB-FACIL-WINDOWS-BOOT"
    );
    replace(controller,
        "private async startInternal(relaunch: boolean):",
        "private async startInternal(relaunch: boolean, automatic = false): /* GLB-FACIL-START-MODE */",
        "GLB-FACIL-START-MODE"
    );
    replace(controller,
        "if (relaunch && !this.restarting) {\n                if (!await this.requestRelaunch())",
        "if (relaunch && !automatic && !this.restarting) { // GLB-FACIL-ADOPT\n                if (!await this.requestRelaunch())",
        "GLB-FACIL-ADOPT"
    );
    replace(controller,
        "const managedConflict = relaunch && existing.active && !existing.owned",
        `// GLB-FACIL-BOOT-GUARD: uma falha no relaunch não impede a próxima abertura manual.
        if (automatic && !existing.active && ${relaunched}) {
            const error = "O Discord reiniciou, mas o túnel não ficou ativo. A próxima abertura pode tentar de novo.";
            this.options.log("warn", error);
            return { success: false, suppressed: true, state: this.state, error };
        }
        const managedConflict = relaunch && !automatic && existing.active && !existing.owned`,
        "GLB-FACIL-BOOT-GUARD"
    );
    replace(controller,
        "if (attempt === 0 && managedAgain) {",
        "if (!automatic && attempt === 0 && managedAgain) { // GLB-FACIL-MANAGED-RETRY",
        "GLB-FACIL-MANAGED-RETRY"
    );
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
