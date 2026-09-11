# Guia de Compilação do APK Nativo - DriveWise

Este guia contém as instruções passo a passo para gerar o arquivo **APK instalável no Android** com suporte a:
1. **Permissão de Sobreposição de Tela (`SYSTEM_ALERT_WINDOW`)**: Copiloto flutuando por cima da Uber e 99.
2. **Serviço de Acessibilidade (`AccessibilityService`)**: Leitura automática em tempo real dos valores de corridas da Uber e 99.
3. **Notificações em primeiro plano (`FOREGROUND_SERVICE`)**.

---

## 🚀 Passo 1: Inicializar o projeto Android

No terminal do seu computador (com Node.js e Android Studio instalados), na pasta do projeto:

```bash
# 1. Instalar as dependências
npm install

# 2. Gerar o build da aplicação web
npm run build

# 3. Adicionar a plataforma Android (cria a pasta android/)
npx cap add android

# 4. Sincronizar o código com o Android
npx cap sync
```

---

## 🛠️ Passo 2: Copiar os Serviços Nativos

Na pasta criada `android/app/src/main/java/com/drivewise/copiloto/`:

1. Copie o arquivo `DriveWiseAccessibilityService.kt`
2. Copie o arquivo `FloatingOverlayService.kt`
3. Copie o arquivo `DriveWiseNativePlugin.kt`

*(Estes 3 arquivos já estão prontos nesta pasta `native-android-guide/`)*.

---

## 📱 Passo 3: Abrir no Android Studio e Gerar o APK

```bash
npx cap open android
```

No Android Studio:
1. Aguarde o Gradle sincronizar os arquivos.
2. No menu superior, clique em:
   👉 **Build > Build Bundle(s) / APK(s) > Build APK(s)**
3. O Android Studio gerará o arquivo **`app-debug.apk`** (localizado em `android/app/build/outputs/apk/debug/app-debug.apk`).
4. Envie esse arquivo `.apk` para o seu celular via WhatsApp ou cabo USB e instale!

---

## 🔒 Permissões que o Android solicitará:

Quando você abrir o APK nativo no celular:
- **"Aparecer sobre outros apps"**: Concede a permissão para a bolha do DriveWise flutuar sobre a tela da Uber.
- **"Acessibilidade > DriveWise Copiloto"**: Concede a permissão para ler o texto da corrida quando a Uber tocar.
