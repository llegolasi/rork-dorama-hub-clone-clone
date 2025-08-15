# Configuração do Storage no Supabase

## Passos para configurar o bucket de fotos de perfil:

### 1. Executar o SQL
Execute o arquivo `storage-setup.sql` no SQL Editor do Supabase Dashboard.

### 2. Configurar a URL do projeto
No arquivo `storage-setup.sql`, substitua `your-project-id` pela ID real do seu projeto Supabase na função `get_profile_picture_url`.

### 3. Estrutura de pastas
As fotos de perfil serão organizadas da seguinte forma:
```
profile-pictures/
├── user-id-1/
│   └── profile.jpg
├── user-id-2/
│   └── profile.jpg
└── ...
```

### 4. Políticas de segurança
- **Leitura**: Qualquer pessoa pode ver as fotos de perfil (público)
- **Upload**: Apenas usuários autenticados podem fazer upload de suas próprias fotos
- **Atualização**: Apenas o dono pode atualizar sua foto
- **Exclusão**: Apenas o dono pode deletar sua foto

### 5. Limitações
- Tamanho máximo: 5MB por arquivo
- Formatos aceitos: JPEG, PNG, WebP, GIF
- Limpeza automática: Fotos antigas são removidas quando uma nova é enviada

### 6. Como usar no código
```typescript
// Upload de foto
const { data, error } = await supabase.storage
  .from('profile-pictures')
  .upload(`${userId}/profile.jpg`, file, {
    cacheControl: '3600',
    upsert: true
  });

// Obter URL pública
const { data } = supabase.storage
  .from('profile-pictures')
  .getPublicUrl(`${userId}/profile.jpg`);
```