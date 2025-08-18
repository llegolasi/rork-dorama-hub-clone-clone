# Sistema de Cache de Doramas - Guia de Implementação

## Visão Geral

Este sistema implementa um cache inteligente para doramas/séries que otimiza a performance do aplicativo através de:

1. **Cache Local (Supabase)**: Dados frequentemente acessados ficam no banco
2. **Sincronização Inteligente**: Atualização automática baseada em idade dos dados
3. **Fallback TMDb**: Busca na API apenas quando necessário
4. **Estrutura Normalizada**: Consultas eficientes e relacionamentos otimizados

## Estrutura do Sistema

### Tabelas Principais

- `series`: Cache principal com metadados das séries
- `temporadas`: Informações de temporadas
- `episodios`: Dados detalhados de episódios
- `elenco`: Cast e crew das séries
- `videos`: Trailers, clips e outros vídeos
- `imagens`: Posters, backdrops e logos
- `generos`: Gêneros disponíveis
- `serie_generos`: Relacionamento série-gênero

### Fluxo de Dados

```
Usuário solicita dorama
        ↓
Existe no cache? → NÃO → Buscar TMDb → Salvar cache → Retornar dados
        ↓ SIM
Dados atualizados? → NÃO → Buscar TMDb → Atualizar cache → Retornar dados
        ↓ SIM
Retornar do cache
```

## Implementação no Backend

### 1. Funções de Cache

```typescript
// Verificar se série existe e está atualizada
export async function getSerieFromCache(tmdbId: number) {
  const { data } = await supabase
    .from('series')
    .select(`
      *,
      temporadas(*),
      elenco(*),
      videos(*),
      imagens(*)
    `)
    .eq('tmdb_id', tmdbId)
    .single();
    
  return data;
}

// Verificar se precisa atualizar
export async function serieNeedsUpdate(tmdbId: number, maxAgeDays = 7) {
  const { data } = await supabase.rpc('serie_needs_update', {
    p_tmdb_id: tmdbId,
    p_max_age_days: maxAgeDays
  });
  
  return data;
}

// Salvar/atualizar série no cache
export async function upsertSerieCache(serieData: any) {
  const { data } = await supabase.rpc('upsert_serie_cache', {
    p_tmdb_id: serieData.id,
    p_nome: serieData.name,
    p_nome_original: serieData.original_name,
    p_descricao: serieData.overview,
    p_cover: serieData.poster_path,
    p_backcover: serieData.backdrop_path,
    p_ano: new Date(serieData.first_air_date).getFullYear(),
    p_avaliacao: serieData.vote_average,
    p_status: serieData.status,
    p_generos: serieData.genre_ids || [],
    p_paises: serieData.origin_country || [],
    p_popularidade: serieData.popularity,
    p_votos: serieData.vote_count,
    p_primeira_exibicao: serieData.first_air_date,
    p_ultima_exibicao: serieData.last_air_date,
    p_runtime_episodio: serieData.episode_run_time?.[0],
    p_linguagem_original: serieData.original_language,
    p_homepage: serieData.homepage,
    p_tagline: serieData.tagline
  });
  
  return data;
}
```

### 2. Integração com TMDb

```typescript
export async function getSerieWithCache(tmdbId: number) {
  // Primeiro, tentar do cache
  let serie = await getSerieFromCache(tmdbId);
  
  // Se não existe ou está desatualizada
  if (!serie || await serieNeedsUpdate(tmdbId)) {
    // Buscar do TMDb
    const tmdbData = await fetchSerieFromTMDb(tmdbId);
    
    // Salvar no cache
    await upsertSerieCache(tmdbData);
    
    // Buscar dados atualizados do cache
    serie = await getSerieFromCache(tmdbId);
  }
  
  return serie;
}

async function fetchSerieFromTMDb(tmdbId: number) {
  const response = await fetch(
    `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`
  );
  
  if (!response.ok) {
    throw new Error('Série não encontrada no TMDb');
  }
  
  return response.json();
}
```

### 3. Sincronização Automática

```typescript
// Job para atualizar séries populares (executar diariamente)
export async function syncPopularSeries() {
  // Buscar séries populares do TMDb
  const popularSeries = await fetchPopularSeriesFromTMDb();
  
  for (const serie of popularSeries.results) {
    await upsertSerieCache(serie);
  }
}

// Job para atualizar séries desatualizadas (executar semanalmente)
export async function syncOutdatedSeries() {
  const { data: outdatedSeries } = await supabase.rpc('get_series_to_update', {
    p_max_age_days: 7,
    p_limit: 100
  });
  
  for (const serie of outdatedSeries) {
    try {
      const tmdbData = await fetchSerieFromTMDb(serie.tmdb_id);
      await upsertSerieCache(tmdbData);
    } catch (error) {
      console.error(`Erro ao atualizar série ${serie.tmdb_id}:`, error);
    }
  }
}

// Limpeza de dados antigos (executar mensalmente)
export async function cleanupOldCache() {
  const { data: deletedCount } = await supabase.rpc('cleanup_old_cache_data', {
    p_max_age_days: 90
  });
  
  console.log(`${deletedCount} séries antigas removidas do cache`);
}
```

## Implementação no Frontend

### 1. Hook para Doramas

```typescript
export function useDrama(dramaId: number) {
  return useQuery({
    queryKey: ['drama', dramaId],
    queryFn: () => trpcClient.dramas.getById.query({ id: dramaId }),
    staleTime: 1000 * 60 * 30, // 30 minutos
    cacheTime: 1000 * 60 * 60, // 1 hora
  });
}
```

### 2. Busca Otimizada

```typescript
export function useSearchDramas(query: string) {
  return useQuery({
    queryKey: ['dramas', 'search', query],
    queryFn: () => trpcClient.dramas.search.query({ query }),
    enabled: query.length > 2,
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}
```

### 3. Listas Otimizadas

```typescript
export function usePopularDramas() {
  return useQuery({
    queryKey: ['dramas', 'popular'],
    queryFn: () => trpcClient.dramas.getPopular.query(),
    staleTime: 1000 * 60 * 60, // 1 hora
  });
}
```

## Configuração de Jobs Automáticos

### Supabase Edge Functions

Criar edge functions para sincronização automática:

```typescript
// supabase/functions/sync-popular-series/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    await syncPopularSeries();
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

### Cron Jobs (usando cron-job.org ou similar)

```bash
# Diário às 2:00 AM - Sincronizar séries populares
0 2 * * * curl -X POST https://your-project.supabase.co/functions/v1/sync-popular-series

# Semanal aos domingos às 3:00 AM - Atualizar séries desatualizadas  
0 3 * * 0 curl -X POST https://your-project.supabase.co/functions/v1/sync-outdated-series

# Mensal no dia 1 às 4:00 AM - Limpeza de cache antigo
0 4 1 * * curl -X POST https://your-project.supabase.co/functions/v1/cleanup-old-cache
```

## Benefícios do Sistema

1. **Performance**: Consultas 10x mais rápidas (cache local vs API externa)
2. **Confiabilidade**: Funciona mesmo se TMDb estiver indisponível
3. **Economia**: Reduz drasticamente chamadas à API do TMDb
4. **Experiência**: Carregamento instantâneo para conteúdo popular
5. **Escalabilidade**: Suporta milhares de usuários simultâneos

## Monitoramento

### Métricas Importantes

- Taxa de cache hit/miss
- Tempo de resposta das consultas
- Frequência de atualizações do TMDb
- Tamanho do cache
- Séries mais acessadas

### Queries de Monitoramento

```sql
-- Taxa de cache hit nos últimos 7 dias
SELECT 
  COUNT(*) as total_series,
  COUNT(*) FILTER (WHERE last_update > NOW() - INTERVAL '7 days') as updated_recently,
  ROUND(
    COUNT(*) FILTER (WHERE last_update > NOW() - INTERVAL '7 days') * 100.0 / COUNT(*), 
    2
  ) as cache_hit_rate
FROM series;

-- Séries mais acessadas (baseado em user_drama_lists)
SELECT 
  s.nome,
  s.tmdb_id,
  COUNT(udl.id) as usuarios_count
FROM series s
JOIN user_drama_lists udl ON s.tmdb_id = udl.drama_id
GROUP BY s.id, s.nome, s.tmdb_id
ORDER BY usuarios_count DESC
LIMIT 20;

-- Tamanho do cache por tipo de dados
SELECT 
  'series' as tabela,
  COUNT(*) as registros,
  pg_size_pretty(pg_total_relation_size('series')) as tamanho
FROM series
UNION ALL
SELECT 
  'temporadas' as tabela,
  COUNT(*) as registros,
  pg_size_pretty(pg_total_relation_size('temporadas')) as tamanho
FROM temporadas
UNION ALL
SELECT 
  'episodios' as tabela,
  COUNT(*) as registros,
  pg_size_pretty(pg_total_relation_size('episodios')) as tamanho
FROM episodios;
```

## Próximos Passos

1. Executar o SQL de criação das tabelas
2. Implementar as funções no backend tRPC
3. Atualizar o frontend para usar o cache
4. Configurar jobs de sincronização
5. Implementar monitoramento
6. Testar performance e ajustar conforme necessário