# Configuração do Google OAuth no Supabase

Este guia explica como configurar a autenticação com Google no seu projeto Supabase.

## 1. Configurar Google Cloud Console

### Passo 1: Criar um projeto no Google Cloud Console
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Anote o **Project ID**

### Passo 2: Habilitar Google+ API
1. No menu lateral, vá para **APIs & Services** > **Library**
2. Procure por "Google+ API" e clique nela
3. Clique em **Enable**

### Passo 3: Criar credenciais OAuth 2.0
1. Vá para **APIs & Services** > **Credentials**
2. Clique em **Create Credentials** > **OAuth 2.0 Client IDs**
3. Configure o **OAuth consent screen** se solicitado:
   - User Type: **External**
   - App name: **Dorama Hub**
   - User support email: seu email
   - Developer contact information: seu email
4. Crie as credenciais:
   - Application type: **Web application**
   - Name: **Dorama Hub Web Client**
   - Authorized redirect URIs: `https://[SEU_PROJETO_SUPABASE].supabase.co/auth/v1/callback`

### Passo 4: Obter Client ID e Client Secret
1. Após criar, você receberá:
   - **Client ID** (algo como: `123456789-abc123.apps.googleusercontent.com`)
   - **Client Secret** (algo como: `GOCSPX-abc123def456`)
2. **Guarde essas informações com segurança**

## 2. Configurar Supabase

### Passo 1: Acessar configurações de autenticação
1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá para **Authentication** > **Providers**
3. Encontre **Google** na lista de provedores

### Passo 2: Configurar Google Provider
1. Ative o toggle **Enable sign in with Google**
2. Preencha os campos:
   - **Client ID**: Cole o Client ID do Google Cloud Console
   - **Client Secret**: Cole o Client Secret do Google Cloud Console
3. Clique em **Save**

### Passo 3: Configurar URLs de redirecionamento
1. Vá para **Authentication** > **URL Configuration**
2. Adicione as seguintes URLs em **Redirect URLs**:
   ```
   exp://localhost:8081/--/auth/callback
   http://localhost:8081/--/auth/callback
   https://localhost:8081/--/auth/callback
   ```
3. Para produção, adicione também:
   ```
   exp://[SEU_EXPO_SLUG]/--/auth/callback
   ```

## 3. Configurar o App

### Passo 1: Variáveis de ambiente
Certifique-se de que seu arquivo `.env` contém:
```env
EXPO_PUBLIC_SUPABASE_URL=https://[SEU_PROJETO].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[SUA_CHAVE_ANONIMA]
EXPO_PUBLIC_REDIRECT_URL=exp://localhost:8081/--/auth/callback
```

### Passo 2: Configurar app.json (se necessário)
Para builds de produção, adicione ao `app.json`:
```json
{
  "expo": {
    "scheme": "dorama-hub",
    "web": {
      "bundler": "metro"
    }
  }
}
```

## 4. Testando a Integração

### Desenvolvimento
1. Execute `npx expo start`
2. Abra o app no simulador ou dispositivo
3. Tente fazer login com Google
4. Verifique se o redirecionamento funciona corretamente

### Produção
1. Atualize as URLs de redirecionamento no Google Cloud Console
2. Atualize as URLs de redirecionamento no Supabase
3. Use o scheme correto do app em produção

## 5. Troubleshooting

### Erro: "redirect_uri_mismatch"
- Verifique se as URLs de redirecionamento estão corretas no Google Cloud Console
- Certifique-se de que a URL no Supabase corresponde exatamente

### Erro: "invalid_client"
- Verifique se o Client ID e Client Secret estão corretos no Supabase
- Certifique-se de que a Google+ API está habilitada

### Erro: "access_denied"
- Verifique se o OAuth consent screen está configurado corretamente
- Certifique-se de que o usuário tem permissão para acessar o app

## 6. Segurança

### Boas práticas:
1. **Nunca** exponha o Client Secret no código do app
2. Use diferentes credenciais para desenvolvimento e produção
3. Monitore o uso da API no Google Cloud Console
4. Configure adequadamente o OAuth consent screen
5. Limite os escopos solicitados ao mínimo necessário

### Escopos utilizados:
- `openid`: Identificação básica do usuário
- `email`: Acesso ao email do usuário
- `profile`: Acesso ao perfil básico do usuário

## 7. Recursos Adicionais

- [Documentação do Supabase Auth](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Expo AuthSession Documentation](https://docs.expo.dev/versions/latest/sdk/auth-session/)