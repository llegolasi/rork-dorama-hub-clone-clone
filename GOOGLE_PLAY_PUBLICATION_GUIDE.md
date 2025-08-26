# Guia Completo: Publicação do App na Google Play Store

## Pré-requisitos

- VS Code instalado
- Extensão GitHub para VS Code
- Conta no GitHub
- Conta na Vercel
- Conta no Expo
- Conta no Google Play Console (taxa de $25 USD)
- Node.js 18+ instalado
- Bun instalado

## Parte 1: Configuração do Projeto Local

### 1.1 Clonar o Projeto

1. Abra o VS Code
2. Pressione `Ctrl+Shift+P` (Windows/Linux) ou `Cmd+Shift+P` (Mac)
3. Digite "Git: Clone" e selecione
4. Cole a URL do seu repositório GitHub
5. Escolha uma pasta local para clonar
6. Abra o projeto clonado no VS Code

### 1.2 Instalar Dependências

```bash
# No terminal do VS Code
bun install
```

### 1.3 Configurar Variáveis de Ambiente

1. Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

2. Edite o arquivo `.env` com suas configurações:
```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=sua_url_do_supabase
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase

# Vercel (será configurado depois)
EXPO_PUBLIC_API_URL=https://seu-app.vercel.app
```

## Parte 2: Deploy do Backend na Vercel

### 2.1 Preparar o Projeto para Vercel

1. Instale a CLI da Vercel:
```bash
npm i -g vercel
```

2. Faça login na Vercel:
```bash
vercel login
```

3. Configure o projeto:
```bash
vercel
```

Siga as instruções:
- Set up and deploy? `Y`
- Which scope? Selecione sua conta
- Link to existing project? `N`
- Project name? `seu-app-name`
- In which directory? `./` (raiz do projeto)
- Want to override settings? `Y`
- Output Directory? `.next` (deixe padrão)
- Build Command? `bun run build` ou deixe padrão
- Development Command? `bun run dev` ou deixe padrão

### 2.2 Configurar Variáveis de Ambiente na Vercel

1. Acesse o dashboard da Vercel
2. Vá para seu projeto
3. Clique em "Settings" → "Environment Variables"
4. Adicione as seguintes variáveis:

```
SUPABASE_URL=sua_url_do_supabase
SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_do_supabase
```

### 2.3 Deploy

```bash
vercel --prod
```

Anote a URL gerada (ex: `https://seu-app.vercel.app`)

### 2.4 Atualizar .env Local

Atualize seu arquivo `.env` local:
```env
EXPO_PUBLIC_API_URL=https://seu-app.vercel.app
```

## Parte 3: Configuração do Expo para Produção

### 3.1 Instalar EAS CLI

```bash
npm install -g eas-cli
```

### 3.2 Login no Expo

```bash
eas login
```

### 3.3 Configurar o Projeto Expo

```bash
eas init
```

### 3.4 Configurar app.json

Edite o arquivo `app.json`:

```json
{
  "expo": {
    "name": "Seu App Name",
    "slug": "seu-app-slug",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "seu-app-scheme",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.seudominio.seuapp"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.seudominio.seuapp",
      "versionCode": 1
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-camera",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera",
          "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone",
          "recordAudioAndroid": true
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "router": {
        "origin": false
      },
      "eas": {
        "projectId": "seu-project-id-sera-gerado"
      }
    }
  }
}
```

### 3.5 Criar eas.json

Crie o arquivo `eas.json` na raiz do projeto:

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

## Parte 4: Preparação para Google Play Store

### 4.1 Criar Conta no Google Play Console

1. Acesse [Google Play Console](https://play.google.com/console)
2. Pague a taxa de registro de $25 USD
3. Complete o perfil do desenvolvedor

### 4.2 Criar Novo App no Console

1. Clique em "Criar app"
2. Preencha:
   - Nome do app
   - Idioma padrão: Português (Brasil)
   - Tipo de app: App
   - Gratuito ou pago: Gratuito (ou pago)
3. Aceite as políticas
4. Clique em "Criar app"

### 4.3 Configurar Service Account (Google Cloud)

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione existente
3. Ative a "Google Play Android Developer API"
4. Vá para "IAM & Admin" → "Service Accounts"
5. Clique em "Create Service Account"
6. Preencha:
   - Nome: "EAS Build Service Account"
   - Descrição: "Para builds automáticos"
7. Clique em "Create and Continue"
8. Pule as permissões opcionais
9. Clique em "Done"

### 4.4 Gerar Chave da Service Account

1. Clique na service account criada
2. Vá para "Keys" → "Add Key" → "Create new key"
3. Selecione "JSON"
4. Baixe o arquivo JSON
5. Renomeie para `google-service-account.json`
6. Coloque na raiz do seu projeto
7. **IMPORTANTE**: Adicione ao `.gitignore`:

```gitignore
# Google Service Account
google-service-account.json
```

### 4.5 Configurar Permissões no Play Console

1. No Google Play Console, vá para "Setup" → "API access"
2. Clique em "Link a Google Cloud project"
3. Selecione seu projeto do Google Cloud
4. Na seção "Service accounts", encontre sua service account
5. Clique em "Grant access"
6. Selecione as permissões:
   - "Release manager"
   - "Release to testing tracks"

## Parte 5: Build e Publicação

### 5.1 Primeiro Build de Produção

```bash
eas build --platform android --profile production
```

Este processo pode levar 10-20 minutos.

### 5.2 Configurar App no Play Console

Enquanto o build roda, configure seu app:

#### 5.2.1 Informações do App

1. Vá para "App content" no Play Console
2. Preencha todas as seções obrigatórias:
   - Privacy Policy (URL da política de privacidade)
   - App category
   - Content ratings
   - Target audience
   - News apps (se aplicável)

#### 5.2.2 Store Listing

1. Vá para "Store presence" → "Main store listing"
2. Preencha:
   - Descrição curta (até 80 caracteres)
   - Descrição completa (até 4000 caracteres)
   - Screenshots (pelo menos 2 por tipo de dispositivo)
   - Ícone do app (512x512 PNG)
   - Imagem de destaque (1024x500 JPG/PNG)

### 5.3 Upload do APK/AAB

1. Quando o build terminar, baixe o arquivo `.aab`
2. No Play Console, vá para "Release" → "Testing" → "Internal testing"
3. Clique em "Create new release"
4. Upload o arquivo `.aab`
5. Preencha as "Release notes"
6. Clique em "Save" e depois "Review release"
7. Clique em "Start rollout to Internal testing"

### 5.4 Teste Interno

1. Adicione testadores na seção "Testers"
2. Compartilhe o link de teste
3. Teste completamente o app
4. Corrija bugs se necessário

### 5.5 Publicação para Produção

1. Após testes aprovados, vá para "Production"
2. Clique em "Create new release"
3. Upload o mesmo arquivo `.aab` (ou faça novo build se houve mudanças)
4. Preencha release notes
5. Clique em "Save" → "Review release" → "Start rollout to Production"

## Parte 6: Automação com GitHub Actions (Opcional)

### 6.1 Criar Workflow

Crie `.github/workflows/build-and-deploy.yml`:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build Android
        run: eas build --platform android --profile production --non-interactive
        if: github.ref == 'refs/heads/main'

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### 6.2 Configurar Secrets no GitHub

1. Vá para seu repositório no GitHub
2. Settings → Secrets and variables → Actions
3. Adicione:
   - `EXPO_TOKEN`: Token do Expo (gere em expo.dev)
   - `VERCEL_TOKEN`: Token da Vercel
   - `VERCEL_ORG_ID`: ID da organização Vercel
   - `VERCEL_PROJECT_ID`: ID do projeto Vercel

## Parte 7: Atualizações Futuras

### 7.1 Atualizar Versão

1. Edite `app.json`:
```json
{
  "expo": {
    "version": "1.0.1",
    "android": {
      "versionCode": 2
    }
  }
}
```

### 7.2 Novo Build

```bash
eas build --platform android --profile production
```

### 7.3 Upload Nova Versão

1. Baixe o novo `.aab`
2. No Play Console, crie nova release
3. Upload o arquivo
4. Publique

## Comandos Úteis

```bash
# Ver builds
eas build:list

# Ver status do build
eas build:view [BUILD_ID]

# Build local (para teste)
eas build --platform android --profile preview --local

# Limpar cache
eas build --platform android --profile production --clear-cache

# Ver logs detalhados
eas build --platform android --profile production --verbose
```

## Troubleshooting

### Erro de Permissões
- Verifique se a service account tem as permissões corretas
- Confirme se o arquivo JSON está no local correto

### Build Falha
- Verifique os logs com `eas build:view [BUILD_ID]`
- Confirme se todas as dependências estão instaladas
- Verifique se não há erros de TypeScript

### App Rejeitado
- Leia cuidadosamente o feedback do Google
- Corrija os problemas apontados
- Reenvie uma nova versão

### Problemas de API
- Confirme se a URL da Vercel está correta no `.env`
- Teste as APIs localmente primeiro
- Verifique os logs da Vercel

## Checklist Final

- [ ] Projeto clonado e dependências instaladas
- [ ] Backend deployado na Vercel
- [ ] Variáveis de ambiente configuradas
- [ ] Conta no Google Play Console criada
- [ ] Service Account configurada
- [ ] app.json e eas.json configurados
- [ ] Primeiro build realizado com sucesso
- [ ] App testado internamente
- [ ] Store listing preenchida
- [ ] App publicado na Play Store
- [ ] Automação configurada (opcional)

## Recursos Adicionais

- [Documentação Expo EAS](https://docs.expo.dev/eas/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
- [Vercel Documentation](https://vercel.com/docs)
- [React Native Performance](https://reactnative.dev/docs/performance)

---

**Nota**: Este processo pode levar algumas horas na primeira vez. Seja paciente e siga cada passo cuidadosamente. Em caso de dúvidas, consulte a documentação oficial ou procure ajuda na comunidade.