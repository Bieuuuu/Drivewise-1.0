# Guia Oficial: Como Compilar e Hospedar o APK do DriveWise

O DriveWise foi desenvolvido especificamente para motoristas de aplicativo (Uber, 99, InDrive). Para que a **bolha flutuante** funcione sobre os outros apps e leia os dados em tempo real, o app precisa de permissões nativas do Android (**`SYSTEM_ALERT_WINDOW`** e **`FOREGROUND_SERVICE`**), que só existem em um APK nativo instalado no celular.

---

## 1. Onde e Como Hospedar o APK para Download

Você tem 3 opções diretas para disponibilizar o APK para você e outros motoristas baixarem:

### Opção A: Hospedar Direto Neste Mesmo App (Mais Rápido e Sem Custo)
1. Pegue o seu arquivo `drivewise.apk` compilado.
2. Coloque-o dentro da pasta **`/public`** do projeto com o nome **`drivewise.apk`** (caminho: `/public/drivewise.apk`).
3. Pronto! O arquivo será servido automaticamente na URL do seu app:
   `https://seu-app.run.app/drivewise.apk`
4. Todos os botões "Baixar APK" da landing page já apontam para esse arquivo por padrão.

### Opção B: Hospedar no Google Drive (Gratuito e Simples)
1. Faça upload do seu arquivo `.apk` no seu **Google Drive**.
2. Clique com o botão direito no arquivo > **Compartilhar** > mude o acesso para **"Qualquer pessoa com o link"**.
3. Copie o link (ex: `https://drive.google.com/file/d/1A2B3C.../view?usp=sharing`).
4. Abra a landing page do DriveWise, clique em **Baixar APK** > **Alterar link de download / Onde hospedar** e cole o link do Google Drive.
5. O DriveWise converte o link do Google Drive automaticamente em **link de download direto** e salva para que qualquer visitante baixe o arquivo com 1 clique!

### Opção C: Hospedar no GitHub Releases, Firebase Storage ou MediaFire
1. Faça o upload do `.apk` no seu serviço preferido.
2. Cole a URL no modal da landing page em **"Alterar link de download / Onde hospedar"** e clique em **Salvar Link**.

---

## 2. Como Gerar o Arquivo `.apk`

O código nativo do Android já foi inicializado na pasta `/android` com todas as permissões necessárias configuradas no `AndroidManifest.xml`:
- `android.permission.SYSTEM_ALERT_WINDOW` (Sobreposição de tela para a bolha flutuante)
- `android.permission.FOREGROUND_SERVICE` (Serviço em segundo plano)
- `android.permission.ACCESS_FINE_LOCATION` (GPS de alta precisão)

### Método 1: Compilação Automática no GitHub Actions (Sem precisar de Android Studio)
Já deixamos configurado o workflow em **`/.github/workflows/build-apk.yml`**.
1. No menu superior do Google AI Studio, clique em **Settings > Export to GitHub** ou envie o código para o seu repositório no GitHub.
2. No seu repositório do GitHub, vá até a aba **Actions**.
3. Selecione **Build Android APK** e clique em **Run workflow**.
4. O GitHub irá compilar o APK gratuitamente nos servidores do GitHub e disponibilizar o arquivo `app-debug.apk` pronto para download na seção de artefatos ou releases.

### Método 2: Compilação Local com Android Studio
1. Baixe o código do projeto (via **Settings > Export to ZIP** ou clone do GitHub).
2. No seu computador, execute no terminal:
   ```bash
   npm install
   npm run cap:build
   npm run cap:open
   ```
3. O **Android Studio** abrirá o projeto `/android`.
4. No menu superior do Android Studio, clique em:
   **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
5. Quando terminar, clique no aviso azul **"locate"** para pegar o arquivo `app-debug.apk` gerado.
6. Renomeie para `drivewise.apk` e hospede usando uma das opções da Seção 1!
