# DriveWise Copiloto — Documento de Arquitetura, Estado Atual e Especificação da Ideia Original

> **Objetivo deste documento:** Servir como dossiê técnico completo, transparente e detalhado para auditoria por outros modelos de IA e desenvolvedores analisando este repositório no GitHub. Ele descreve **exatamente o que foi solicitado originalmente pelo criador do projeto**, **o histórico dos obstáculos técnicos no Android (Google Play Protect)**, **o que o código faz exatamente hoje (arquivo por arquivo)** e **quais são os gaps técnicos que precisam ser resolvidos**.

---

## 1. A Ideia Original (O Que o App Deveria Ser)

O **DriveWise Copiloto** foi idealizado para ser um **Copiloto Financeiro e Analisador de Corridas em Tempo Real para Motoristas de Aplicativo (Uber, 99, InDrive)** no Android, focado na realidade brasileira (custo real de combustível, depreciação, manutenção preventiva, "KM morto / batendo lata" e segurança por região).

### 1.1. O Fluxo Ideal Esperado pelo Usuário (Experiência "Zero-Toque" sobre Uber / 99)
1. **Calibração Real do Veículo e Metas:**
   - O motorista informa o consumo real do carro (km/L), preço médio do litro de combustível, reserva de manutenção/depreciação por KM (gerando o **Custo Real por KM Rodado**, ex: `R$ 0,75/km`).
   - Define suas **Regras de Decisão (Semáforo)**: ganho líquido mínimo por KM (ex: `R$ 1,80/km`), ganho líquido mínimo por hora (ex: `R$ 35,00/h`), valor bruto mínimo de corrida e nota mínima aceitável de passageiro.
2. **Operação em Segundo Plano (Fora do App DriveWise):**
   - O motorista inicia seu turno e vai trabalhar com os apps da **Uber**, **99** ou **InDrive** abertos na tela principal do celular.
   - O DriveWise permanece sobreposto como uma **Pílula Flutuante discreta e arrastável** (`SYSTEM_ALERT_WINDOW`), sem atrapalhar a navegação no mapa.
3. **Captura e Análise Instantânea quando Toca uma Corrida na Uber/99:**
   - **Expectativa Original:** Assim que um card de oferta de corrida aparece na tela da Uber ou 99 (com tempo de 10 a 15 segundos para aceitar), o DriveWise deve **ler automaticamente os dados da tela**:
     - Valor Bruto da oferta (`R$`)
     - Distância até o passageiro (embarque) + Distância da viagem (`KM total`)
     - Tempo total estimado (`Minutos`)
     - Nota do passageiro (ex: `4.92`)
     - Endereço/Bairro de embarque e destino
   - **Cálculo Real Instantâneo:** Descontar imediatamente o custo de combustível + custo mecânico da distância total (embarque + viagem) para revelar o **Lucro Líquido Real daquela corrida**, o **R$/KM Líquido** e o **R$/Hora Líquida**.
4. **HUD Flutuante de Decisão (Semáforo) + Alerta de Voz:**
   - O overlay sobre a tela da Uber/99 exibe imediatamente a cor do veredito:
     - 🟢 **VERDE (Excelente / Aceitar):** Acima da meta de R$/km líquido e R$/hora.
     - 🟡 **AMARELO (Atenção / Limítrofe):** Próximo da margem mínima; requer avaliação do motorista.
     - 🔴 **VERMELHO (Prejuízo / Recusar):** Abaixo do custo operacional ou abaixo do mínimo configurado.
   - O motorista pode interagir com o overlay **no próprio local (sobre a Uber/99)** sem que o clique simplesmente abra a tela principal do DriveWise.
5. **Fechamento de Ciclo Automático (Corrida -> Turno -> Financeiro do Dia):**
   - Quando o motorista aceita e conclui a corrida, o valor bruto, o custo estimado de combustível e a quilometragem da corrida devem alimentar **automaticamente** o **Turno do Dia**, atualizando:
     - Lucro Líquido de Hoje
     - Progresso da Meta Diária
     - Histórico de Corridas Analisadas/Aceitas/Recusadas
     - KM Produtivo vs. KM Morto ("Batendo Lata" medido pelo GPS da jornada)

---

## 2. Histórico Técnico: Por Que o App Sofreu Desvios nas Versões Anteriores

Para que outra IA entenda o estado atual do repositório, é essencial conhecer a cronologia de problemas técnicos enfrentados no Android:

### Fase 1: Implementação com `AccessibilityService` + `SYSTEM_ALERT_WINDOW`
- Foi implementado o `DriveWiseAccessibilityService.java` (permissão `android.permission.BIND_ACCESSIBILITY_SERVICE`) para percorrer a árvore de `AccessibilityNodeInfo` das janelas da Uber (`com.ubercab.driver`), 99 (`com.taxis99.driver`) e InDrive, extraindo via Regex os valores de `R$`, `km` e `min` automaticamente.
- **O Problema:** Como o APK é gerado via GitHub Actions (`assembleDebug`) e instalado manualmente pelo usuário (sideload via navegador/WhatsApp/Arquivos), o **Google Play Protect no Brasil** bloqueou a instalação com a tela vermelha *"O app foi bloqueado para proteger seu dispositivo — A proteção avançada contra fraudes do Play Protect bloqueia apps de fontes desconhecidas que exigem permissões confidenciais"*.
- **Causa Raiz Oficial do Android no Brasil:** Desde 2024/2025, o programa *Enhanced Fraud Protection* do Google Play Protect no Brasil bloqueia em nível de sistema qualquer APK instalado via *sideload* que declare no `AndroidManifest.xml` qualquer uma destas **4 permissões**:
  1. `android.permission.BIND_ACCESSIBILITY_SERVICE`
  2. `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE`
  3. `android.permission.READ_SMS`
  4. `android.permission.RECEIVE_SMS`

### Fase 2: O Erro da Substituição por Picture-in-Picture (PiP) + Simulação Aleatória (Corrigido no último commit)
- Na tentativa anterior de fazer o APK instalar sem o bloqueio do Play Protect, um commit anterior cometeu dois erros graves de produto:
  1. **Trocou o `WindowManager` (`SYSTEM_ALERT_WINDOW`) por `enterPictureInPictureMode()` (Modo PiP de vídeo do Android):** No Android, uma janela PiP é apenas uma miniatura da `MainActivity` inteira. O sistema operacional Android intercepta todos os toques em uma janela PiP para mostrar apenas um botão de expandir/fechar, impedindo cliques em botões internos e transformando o overlay em uma simples miniatura inútil do app.
  2. **Criou o método `triggerQuickSimulationInHud()` no `MainActivity.java`:** Sempre que o usuário saía do app (`onUserLeaveHint`), o Java disparava uma corrida fictícia aleatória (ex: R$ 28,90 / R$ 11,50 / R$ 21,40) para "mostrar o HUD funcionando", fazendo com que o motorista visse dados completamente falsos fora do app.

### Fase 3: O Estado Atual do Código (Commit Atual)
- **`SYSTEM_ALERT_WINDOW` Restaurado (`FloatingOverlayService.java`):** Como `SYSTEM_ALERT_WINDOW` **não** faz parte das 4 permissões bloqueadas pelo *Enhanced Fraud Protection* do Play Protect, o serviço nativo de sobreposição real via `WindowManager` (`TYPE_APPLICATION_OVERLAY`) foi reativado e reescrito.
- **PiP e Simulações Removidos:** `enterPictureInPictureMode()` e `triggerQuickSimulationInHud()` foram totalmente eliminados do `MainActivity.java` e do `AndroidManifest.xml`.
- **Limitação Atual Remanescente:** Como `BIND_ACCESSIBILITY_SERVICE` continua fora do `AndroidManifest.xml` para evitar o bloqueio de instalação via sideload pelo Play Protect, o app **não está lendo a tela da Uber/99 sozinho neste momento**. Em vez disso, o `FloatingOverlayService.java` oferece uma pílula flutuante real que, ao ser tocada, expande *in-place* sobre a Uber/99 um **HUD com teclado numérico de toque rápido** onde o motorista digita `Valor R$`, `KM` e `Min` e vê o Semáforo + botões de Aceitar/Concluir/Recusar sobre a própria Uber/99.

---

## 3. O Que o App É e Faz no Momento (Inventário Técnico Real)

Abaixo está o mapeamento exato do que existe e funciona hoje no repositório:

### 3.1. Camada Nativa Android (`/android/app/src/main/java/com/drivewise/copiloto/`)

1. **`FloatingOverlayService.java` (Ativo no `AndroidManifest.xml`)**
   - **Tipo:** `Service` em primeiro plano (`foregroundServiceType="specialUse"`) usando `WindowManager` com `WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY`.
   - **Estado Minimizado (Pílula Flutuante):**
     - Exibe uma pílula arrastável (`⚡ DriveWise • Toque p/ calcular corrida`) que fica sobre qualquer aplicativo (Uber, 99, Waze, Launcher).
     - Quando há uma corrida avaliada ou em rota, a pílula muda a cor do indicador luminoso (Verde `#10B981`, Amarelo `#F59E0B`, Vermelho `#F43F5E` ou Azul `#38BDF8` quando em rota) e exibe o resumo (`R$ Líquido • R$/km`).
   - **Estado Expandido (Card HUD Tático *In-Place*):**
     - Ao tocar na pílula, ela alterna a visibilidade (`collapsedPillView.setVisibility(GONE)` / `expandedCardView.setVisibility(VISIBLE)`) **dentro do próprio `WindowManager` sobre a Uber/99**, sem abrir a `MainActivity`.
     - Contém seletor de plataforma (`UBER`, `99`, `INDRIVE`).
     - Contém 3 caixas selecionáveis (`VALOR BRUTO R$`, `DISTÂNCIA KM`, `TEMPO MIN`) e um teclado numérico nativo compacto (`0-9`, `.`, `⌫`, `C`) que permite digitar os números da oferta em 2 segundos sem depender do teclado virtual do Android.
     - Calcula em tempo real (usando `driverCostPerKm` e `driverMinNetPerKm` sincronizados do app React via `SharedPreferences`):
       - `computedCost = currentDistanceKm * driverCostPerKm`
       - `computedNetProfit = currentGross - computedCost`
       - `computedNetPerKm = computedNetProfit / currentDistanceKm`
       - `computedNetPerHour = (computedNetProfit / currentDurationMin) * 60.0`
       - Semáforo: **VERDE — ACEITAR**, **AMARELO — ATENÇÃO** ou **VERMELHO — RECUSAR**.
     - **Botões de Ação Reais no Overlay:**
       - `✕ Recusar`: Registra a corrida como recusada e volta para a pílula.
       - `▶ Aceitar (Em Rota)`: Coloca o overlay em modo "EM ROTA", mostrando na pílula `🚗 EM ROTA • +R$ X,XX líq.` até o motorista terminar a viagem e clicar em `✓ Concluir Corrida (+R$ no Turno)`.
       - `✓ Registrar Corrida Concluída (Direto no Turno)`: Credita imediatamente a corrida como finalizada.
   - **Sincronização com o React (`recordRideAction`):**
     - Salva a corrida em uma fila persistente `pending_rides_queue` no `SharedPreferences("DriveWiseHudPrefs")` (para o caso de a WebView estar em background/suspensa) **e** dispara um `Intent` broadcast (`ACTION_OVERLAY_RIDE_EVENT`) para a `MainActivity` injetar imediatamente no React se a WebView estiver viva.

2. **`MainActivity.java` (Ativo)**
   - Gerencia permissões de localização/notificação e verificação de `Settings.canDrawOverlays(this)`.
   - Quando o motorista minimiza o app (`onUserLeaveHint` / `onStop`), se `Settings.canDrawOverlays(this)` for verdadeiro, inicia automaticamente o `FloatingOverlayService` para que a pílula flutuante apareça sobre a Uber/99.
   - Quando o motorista retorna ao app (`onResume`), drena a fila `pending_rides_queue` do `SharedPreferences` (`flushPendingOverlayRidesToWebView()`) e dispara eventos `window.dispatchEvent(new CustomEvent('drivewise:native-ride-detected', ...))` para que o React contabilize todas as corridas feitas fora do app.

3. **`DriveWiseNativePlugin.java` (Capacitor Plugin Ativo)**
   - Ponte Capacitor `@CapacitorPlugin(name = "DriveWiseNative")` exposta para o TypeScript (`src/services/nativeBridge.ts`).
   - Métodos: `checkPermissions()`, `requestOverlayPermission()`, `requestAccessibilityPermission()`, `startFloatingOverlay()`, `stopFloatingOverlay()`, `expandFloatingOverlay()`, `updateOverlayConfig()`, `triggerTestRideOverlay()`.

4. **`DriveWiseAccessibilityService.java` (Presente no repositório, mas NÃO declarado no `AndroidManifest.xml`)**
   - Contém a lógica de parser de árvore de acessibilidade (`AccessibilityNodeInfo`) para ler ofertas da Uber, 99 e InDrive automaticamente.
   - **Status:** Desativado no `AndroidManifest.xml` exclusivamente por causa do bloqueio de instalação (sideload) do Google Play Protect no Brasil.

---

### 3.2. Camada Frontend React + TypeScript (`/src/`)

1. **Estado Global e Motor Financeiro (`src/context/DriveWiseContext.tsx`)**
   - Autenticação real via **Firebase Authentication** (Login/Cadastro com E-mail e Senha e Google).
   - Persistência em nuvem via **Cloud Firestore** (`users/{uid}`, `workSessions`, `fuelLogs`, `expenses`, `rides`, `copilotSettings`) combinada com cache local resiliente (`safeStorage`).
   - **Sincronização Corrida -> Turno (`creditRideEarningsToToday`):**
     - Quando uma corrida é marcada como `completed` (seja vinda do `FloatingOverlayService` nativo, seja da Calculadora de Corridas interna), o contexto:
       - Se houver um turno ativo (`activeSession`), soma automaticamente `grossValue` na plataforma correspondente (`earnings.uber`, `earnings.ninetyNine`, etc.), soma os `totalDistanceKm` e adiciona `estimatedFuelCost`.
       - Se não houver um turno aberto no momento, cria ou atualiza automaticamente a sessão consolidada do dia (`sessions`) para que os cards **Lucro Líquido de Hoje**, **Bruto**, **Custos**, **Distância** e **Meta Diária** reflitam o ganho imediatamente.

2. **Telas Principais (`src/components/`)**
   - **`HomeDashboard.tsx` (Início):**
     - Exibe o **Lucro Líquido de Hoje** (combinando sessões salvas + turno ativo em tempo real), Bruto, Custos, Distância e Ganho/Hora.
     - Card de status do **Overlay Flutuante sobre Uber / 99** (mostra se a permissão `SYSTEM_ALERT_WINDOW` está ativa e permite iniciar/expandir a janela flutuante ou abrir a Calculadora de Corridas).
     - Card de **Jornada / Turno** e barra de **Meta Diária**.
   - **`copilot/CopilotHubView.tsx` (Aba Copiloto):**
     - Painel de controle da Janela Flutuante Nativa (Ativar Pílula Flutuante, Expandir HUD, Lançar Corrida).
     - Navegação para **Histórico e Performance de Corridas** (`CopilotAnalyticsView.tsx`) e **Regras do Semáforo** (`CopilotSettingsView.tsx`).
     - Exibe a calibração atual do veículo (Consumo km/L, Preço do Combustível, Custo Combustível/km, Manutenção/km e **Custo Total por KM Rodado**).
   - **`copilot/RideSimulatorModal.tsx` (Calculadora & Lançador de Corrida):**
     - Permite calcular a viabilidade de qualquer corrida dentro do app (Valor Bruto, Distância Viagem, Distância Embarque, Tempo, Nota do Passageiro, Destino) e salvá-la como **Corrida Concluída (Soma no Turno)**, **Aceita (Em Rota)** ou **Recusada**.
   - **`JourneyView.tsx` (Aba Jornada / Turno):**
     - Permite iniciar e encerrar turnos de trabalho com cronômetro em tempo real, rastreamento de deslocamento por GPS (`navigator.geolocation.watchPosition` com filtro de ruído Haversine), odômetro inicial/final, divisão de ganhos por plataforma (Uber, 99, InDrive, Particular) e atalhos rápidos para lançar corridas, abastecimentos e despesas.
   - **`ReportsView.tsx` & `HistoryView.tsx` (Relatórios e Histórico):**
     - Gráficos e demonstrativos de Lucro Líquido vs. Faturamento Bruto, custo real por KM, distribuição por plataforma e histórico auditável de sessões, abastecimentos e despesas.
   - **`ProfileView.tsx` & `OnboardingModal.tsx`:**
     - Calibração completa do veículo, metas financeiras e gerenciamento de conta.

---

## 4. Comparativo Direto: O Que o App É Hoje vs. O Que Deveria Ser

| Funcionalidade / Requisito | Como Deveria Ser (Ideia Original) | Como Está Hoje no Repositório | Status / Gap Técnico |
| :--- | :--- | :--- | :--- |
| **Janela Flutuante sobre Uber/99** | Uma pílula flutuante real sobre o app da Uber/99 que expande um card no próprio local sem sair da Uber/99. | **Implementado (`FloatingOverlayService.java`)** via `WindowManager` (`TYPE_APPLICATION_OVERLAY`). A pílula arrastável expande o card HUD *in-place* sobre a Uber/99. | ✅ **Resolvido** no código atual (substituiu o antigo PiP que criava apenas uma miniatura do app). |
| **Ausência de Simulações Falsas** | Exibir apenas dados reais do motorista e das corridas reais. Zero corridas aleatórias inventadas. | **Implementado.** O método `triggerQuickSimulationInHud()` e os botões de simulação falsa foram removidos. | ✅ **Resolvido** no código atual. |
| **Leitura dos Dados da Chamada da Uber/99** | **100% Automática (Zero-Toque):** Ler automaticamente R$, KM, Minutos, Nota e Endereço assim que o card da Uber/99 pula na tela. | **Manual no Overlay (Teclado Rápido):** O motorista toca na pílula e digita R$, KM e Min no teclado numérico do próprio overlay sobre a Uber/99. O `DriveWiseAccessibilityService.java` existe no repositório, mas está desativado no `AndroidManifest.xml`. | ⚠️ **Gap Principal:** `BIND_ACCESSIBILITY_SERVICE` é bloqueado pelo Google Play Protect no Brasil quando o APK é instalado fora da Play Store (sideload). |
| **Cálculo de Lucro Líquido Real e Semáforo** | Descontar combustível + manutenção por KM (incluindo KM de embarque) e exibir Verde/Amarelo/Vermelho + R$/km e R$/h líquidos. | **Implementado** tanto no overlay nativo (`FloatingOverlayService.java`) quanto no React (`copilotCalculations.ts`). | ✅ **Funcional.** |
| **Integração Corrida -> Turno e Painel Diário** | Ao concluir uma corrida no overlay fora do app, somar automaticamente no faturamento, custos e KM do dia. | **Implementado** via fila persistente em `SharedPreferences` + Broadcast `ACTION_OVERLAY_RIDE_EVENT` + `creditRideEarningsToToday()` no `DriveWiseContext.tsx`. | ✅ **Funcional.** |
| **Rastreamento de KM Morto vs. KM em Corrida** | Medir automaticamente por GPS em background todo o KM rodado no turno e separar quantos KM foram com passageiro vs. batendo lata. | Funciona enquanto a WebView/app está ativo via `navigator.geolocation.watchPosition`, mas não há um `LocationService` nativo dedicado em Java medindo GPS com a tela apagada. | 🔧 **Melhoria Recomendada:** Criar ou acoplar `LocationManager`/`FusedLocationProvider` diretamente no `FloatingOverlayService.java` para medir o KM real em segundo plano. |

---

## 5. Guia para a Outra IA Analisar e Evoluir o Repositório

Se você (outro modelo de IA ou engenheiro) está analisando este repositório no GitHub, aqui estão os **3 pontos estratégicos** onde sua análise deve focar:

### Ponto 1: Como Resolver a Leitura Automática da Tela da Uber/99 sem Bloqueio do Play Protect?
O código de leitura automática de tela já existe em:
- `android/app/src/main/java/com/drivewise/copiloto/DriveWiseAccessibilityService.java`
- `android/app/src/main/res/xml/accessibility_service_config.xml`

Porém, declarar `<service android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE">` no `AndroidManifest.xml` em um APK distribuído via download direto (sideload) aciona o bloqueio **"Proteção avançada contra fraudes"** do Google Play Protect no Brasil.
**Alternativas técnicas para avaliar:**
1. **Captura de Tela via `MediaProjection` API + Google ML Kit Text Recognition (OCR On-Device):**
   - A API `MediaProjection` (captura de tela autorizada pelo usuário ao iniciar o turno) **NÃO** usa nenhuma das 4 permissões bloqueadas pelo Play Protect (`READ_SMS`, `RECEIVE_SMS`, `BIND_ACCESSIBILITY_SERVICE`, `BIND_NOTIFICATION_LISTENER_SERVICE`).
   - Quando o motorista toca em um botão flutuante `"📷 Ler Tela"` na pílula (ou quando o som/vibração toca), o `FloatingOverlayService` captura um frame da tela via `VirtualDisplay`/`ImageReader` e passa para o **ML Kit Text Recognition v2 (Offline)** em Java, extraindo `R$`, `km` e `min` em ~150ms sem precisar digitar nada e **sem bloqueio do Play Protect**.
2. **Publicação na Faixa de Teste Interno da Google Play Store (Play Console):**
   - O bloqueio da *Proteção Avançada contra Fraudes* do Play Protect aplica-se **exclusivamente a APKs instalados por sideload (fontes desconhecidas)**. Apps instalados via Google Play Store (mesmo em *Internal Testing Track* para até 100 testadores via link fechado) **podem usar `BIND_ACCESSIBILITY_SERVICE` normalmente** sem serem bloqueados pelo Play Protect.
3. **Duas Variantes de Build (Gradle Product Flavors) no GitHub Actions:**
   - Gerar dois APKs no workflow `.github/workflows/build-apk.yml`:
     - `DriveWise-PlayProtectSafe.apk` (sem `BIND_ACCESSIBILITY_SERVICE`, usando o teclado rápido no overlay ou `MediaProjection` OCR).
     - `DriveWise-FullAuto-Accessibility.apk` (com `BIND_ACCESSIBILITY_SERVICE` ativado, para instalação com Play Protect pausado ou via ADB/Play Store Internal Track).

### Ponto 2: Rastreamento Nativo de GPS no `FloatingOverlayService.java`
- Atualmente, o `FloatingOverlayService.java` já roda como um `ForegroundService` persistente enquanto o motorista trabalha.
- Adicionar um `LocationListener` nativo (`LocationManager.GPS_PROVIDER`) dentro do `FloatingOverlayService.java` permitirá contabilizar com precisão cirúrgica o **KM Total do Turno em segundo plano** (mesmo com o DriveWise fechado ou a tela bloqueada), comparando o KM total do GPS com a soma dos KMs das corridas aceitas para exibir o **KM Morto ("Batendo Lata")** exato.

### Ponto 3: Arquivos-Chave do Repositório para Inspeção
- **Manifesto Android:** `android/app/src/main/AndroidManifest.xml`
- **Serviço de Overlay Nativo (WindowManager):** `android/app/src/main/java/com/drivewise/copiloto/FloatingOverlayService.java`
- **Leitor de Tela (Acessibilidade):** `android/app/src/main/java/com/drivewise/copiloto/DriveWiseAccessibilityService.java`
- **Activity Principal e Ponte de Eventos:** `android/app/src/main/java/com/drivewise/copiloto/MainActivity.java`
- **Plugin Capacitor:** `android/app/src/main/java/com/drivewise/copiloto/DriveWiseNativePlugin.java`
- **Ponte TypeScript:** `src/services/nativeBridge.ts`
- **Contexto Global e Sincronização de Turno:** `src/context/DriveWiseContext.tsx`
- **Fórmulas de Cálculo e Semáforo:** `src/utils/copilotCalculations.ts` e `src/utils/calculations.ts`
- **Workflow de Build do APK:** `.github/workflows/build-apk.yml`
