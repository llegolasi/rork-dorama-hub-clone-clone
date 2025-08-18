import { z } from 'zod';
import { publicProcedure, protectedProcedure, type Context } from '../../../create-context';

// Configuração da API do TMDb
const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  console.error('TMDB_API_KEY não configurada! Verifique as variáveis de ambiente.');
}

// Schemas de validação
const dramaSearchSchema = z.object({
  query: z.string().min(1),
  page: z.number().optional().default(1),
});

const dramaByIdSchema = z.object({
  id: z.number(),
  forceRefresh: z.boolean().optional().default(false),
});

const popularDramasSchema = z.object({
  page: z.number().optional().default(1),
});

// Função auxiliar para buscar do TMDb
async function fetchFromTMDb(endpoint: string) {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  if (!url.searchParams.has('language')) {
    url.searchParams.set('language', 'pt-BR');
  }

  let headers: Record<string, string> | undefined;
  if (TMDB_API_KEY && TMDB_API_KEY.startsWith('eyJ')) {
    headers = { Authorization: `Bearer ${TMDB_API_KEY}` };
  } else if (TMDB_API_KEY) {
    if (!url.searchParams.has('api_key')) {
      url.searchParams.set('api_key', TMDB_API_KEY);
    }
  }

  const response = await fetch(url.toString(), { headers });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`TMDb API error: ${response.status} ${text}`);
  }

  return response.json();
}

// Função para verificar se série existe no cache
async function getSerieFromCache(supabase: any, tmdbId: number) {
  const { data, error } = await supabase
    .from('series')
    .select(`
      *,
      temporadas:temporadas(*),
      elenco:elenco(*),
      videos:videos(*),
      imagens:imagens(*)
    `)
    .eq('tmdb_id', tmdbId)
    .single();
    
  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    throw error;
  }
    
  return data;
}

// Função para verificar se série precisa ser atualizada
async function serieNeedsUpdate(supabase: any, tmdbId: number, maxAgeDays = 7) {
  try {
    const { data, error } = await supabase.rpc('serie_needs_update', {
      p_tmdb_id: tmdbId,
      p_max_age_days: maxAgeDays
    });
    
    if (error) {
      console.error('Erro ao verificar se série precisa atualizar:', error);
      return true; // Em caso de erro, assumir que precisa atualizar
    }
    
    return data;
  } catch (error) {
    console.error('Função serie_needs_update não existe, assumindo que precisa atualizar:', error);
    return true;
  }
}

// Função para salvar série no cache
async function upsertSerieCache(supabase: any, serieData: any) {
  try {
    const { data, error } = await supabase.rpc('upsert_serie_cache', {
      p_tmdb_id: serieData.id,
      p_nome: serieData.name || serieData.original_name,
      p_nome_original: serieData.original_name,
      p_descricao: serieData.overview,
      p_cover: serieData.poster_path,
      p_backcover: serieData.backdrop_path,
      p_ano: serieData.first_air_date ? new Date(serieData.first_air_date).getFullYear() : null,
      p_avaliacao: serieData.vote_average,
      p_status: serieData.status,
      p_generos: serieData.genre_ids || (serieData.genres?.map((g: any) => g.id)) || [],
      p_paises: serieData.origin_country || [],
      p_popularidade: serieData.popularity,
      p_votos: serieData.vote_count,
      p_primeira_exibicao: serieData.first_air_date || null,
      p_ultima_exibicao: serieData.last_air_date || null,
      p_runtime_episodio: serieData.episode_run_time?.[0] || null,
      p_linguagem_original: serieData.original_language,
      p_homepage: serieData.homepage,
      p_tagline: serieData.tagline
    });

    if (error) {
      console.error('Erro ao chamar RPC upsert_serie_cache, tentando fallback...', error);
      throw error; // Pula para o bloco catch para usar o fallback
    }

    if (typeof data === 'number') {
      return data;
    }

    // Tentar obter o ID direto da tabela caso o RPC não retorne número
    const { data: maybeRow, error: fetchErr } = await supabase
      .from('series')
      .select('id')
      .eq('tmdb_id', serieData.id)
      .maybeSingle();

    if (fetchErr) {
      console.error('Falha ao buscar série após RPC:', fetchErr);
      throw fetchErr;
    }

    if (maybeRow?.id && typeof maybeRow.id === 'number') {
      return maybeRow.id;
    }

    throw new Error('RPC upsert_serie_cache não retornou um ID válido e não foi possível localizar a série.');
  } catch {
    console.log('Usando fallback de upsert direto para a tabela series.');
    const { data, error: insertError } = await supabase
      .from('series')
      .upsert({
        tmdb_id: serieData.id,
        nome: serieData.name || serieData.original_name,
        nome_original: serieData.original_name,
        descricao: serieData.overview,
        cover: serieData.poster_path,
        backcover: serieData.backdrop_path,
        ano: serieData.first_air_date ? new Date(serieData.first_air_date).getFullYear() : null,
        avaliacao: serieData.vote_average,
        status: serieData.status,
        generos: serieData.genre_ids || (serieData.genres?.map((g: any) => g.id)) || [],
        paises: serieData.origin_country || [],
        popularidade: serieData.popularity,
        votos: serieData.vote_count,
        primeira_exibicao: serieData.first_air_date || null,
        ultima_exibicao: serieData.last_air_date || null,
        runtime_episodio: serieData.episode_run_time?.[0] || null,
        linguagem_original: serieData.original_language,
        homepage: serieData.homepage,
        tagline: serieData.tagline,
        last_update: new Date().toISOString()
      }, {
        onConflict: 'tmdb_id'
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Erro no fallback de inserção direta:', insertError);
      throw insertError;
    }

    if (data?.id) return data.id;

    // Última tentativa: buscar o ID
    const { data: fetched, error: fetchAfterUpsertErr } = await supabase
      .from('series')
      .select('id')
      .eq('tmdb_id', serieData.id)
      .maybeSingle();

    if (fetchAfterUpsertErr) {
      console.error('Erro ao buscar série após upsert direto:', fetchAfterUpsertErr);
      throw fetchAfterUpsertErr;
    }

    return fetched?.id;
  }
}

// Função para salvar elenco no cache
async function upsertCastCache(supabase: any, serieId: number, tmdbId: number, castData: any) {
  if (!castData?.cast?.length) return;
  if (typeof serieId !== 'number' || Number.isNaN(serieId)) {
    console.warn('upsertCastCache: serieId inválido, abortando. tmdbId:', tmdbId, 'serieId:', serieId);
    return;
  }
  await supabase
    .from('elenco')
    .delete()
    .eq('serie_id', serieId);
  const castToInsert = castData.cast.slice(0, 20).map((person: any, index: number) => ({
    serie_id: serieId,
    tmdb_person_id: person.id,
    nome: person.name,
    personagem: person.character,
    foto: person.profile_path,
    ordem: index,
    tipo: 'cast'
  }));
  if (castToInsert.length > 0) {
    const { error } = await supabase
      .from('elenco')
      .insert(castToInsert);
    if (error) {
      console.error('Erro ao salvar elenco:', error);
    }
  }
}

// Função para salvar vídeos no cache
async function upsertVideosCache(supabase: any, serieId: number, tmdbId: number, videosData: any) {
  if (!videosData?.results?.length) return;
  if (typeof serieId !== 'number' || Number.isNaN(serieId)) {
    console.warn('upsertVideosCache: serieId inválido, abortando. tmdbId:', tmdbId, 'serieId:', serieId);
    return;
  }
  await supabase
    .from('videos')
    .delete()
    .eq('serie_id', serieId);
  const videosToInsert = videosData.results
    .filter((video: any) => ['Trailer', 'Teaser'].includes(video.type))
    .slice(0, 10)
    .map((video: any) => ({
      serie_id: serieId,
      tmdb_video_id: video.id,
      key: video.key,
      site: video.site,
      tipo: video.type,
      nome: video.name,
      tamanho: video.size,
      oficial: video.official,
      publicado_em: video.published_at
    }));
  if (videosToInsert.length > 0) {
    const { error } = await supabase
      .from('videos')
      .insert(videosToInsert);
    if (error) {
      console.error('Erro ao salvar vídeos:', error);
    }
  }
}

// Função principal para obter série com cache
async function getSerieWithCache(supabase: any, tmdbId: number, forceRefresh = false) {
  let serie = null;
  
  if (!forceRefresh) {
    // Tentar buscar do cache primeiro
    serie = await getSerieFromCache(supabase, tmdbId);
    
    // Se existe no cache, verificar se precisa atualizar
    if (serie && !await serieNeedsUpdate(supabase, tmdbId)) {
      return serie;
    }
  }
  
  try {
    // Buscar dados básicos do TMDb
    const tmdbData = await fetchFromTMDb(`/tv/${tmdbId}`);
    
    // Salvar série no cache
    let serieId = await upsertSerieCache(supabase, tmdbData);

    if (typeof serieId !== 'number' || Number.isNaN(serieId)) {
      const { data: fetchedRow, error: fetchIdErr } = await supabase
        .from('series')
        .select('id')
        .eq('tmdb_id', tmdbId)
        .maybeSingle();
      if (fetchIdErr) {
        console.error('Erro ao localizar ID da série após upsert:', fetchIdErr);
      }
      if (fetchedRow?.id) {
        serieId = fetchedRow.id as number;
      }
    }

    // Buscar dados adicionais em paralelo
    const [castData, videosData] = await Promise.allSettled([
      fetchFromTMDb(`/tv/${tmdbId}/credits`),
      fetchFromTMDb(`/tv/${tmdbId}/videos`)
    ]);
    
    // Salvar dados adicionais se disponíveis
    if (castData.status === 'fulfilled') {
      await upsertCastCache(supabase, serieId, tmdbId, castData.value);
    }
    
    if (videosData.status === 'fulfilled') {
      await upsertVideosCache(supabase, serieId, tmdbId, videosData.value);
    }
    
    // Buscar dados atualizados do cache
    serie = await getSerieFromCache(supabase, tmdbId);
    
    return serie;
    
  } catch (error) {
    console.error('Erro ao buscar série do TMDb:', error);
    
    // Se falhou ao buscar do TMDb, retornar do cache se existir
    if (serie) {
      return serie;
    }
    
    throw new Error('Série não encontrada');
  }
}

// Procedures tRPC
export const getDramaById = publicProcedure
  .input(dramaByIdSchema)
  .query(async ({ input, ctx }: { input: z.infer<typeof dramaByIdSchema>; ctx: Context }) => {
    const { id, forceRefresh } = input;
    
    console.log(`[CACHE] Buscando dorama ID: ${id}, forceRefresh: ${forceRefresh}`);
    
    try {
      // Usar o sistema de cache primeiro
      const serie = await getSerieWithCache(ctx.supabase, id, forceRefresh);
      
      if (!serie) {
        throw new Error('Dorama não encontrado no cache. Tentando fallback.');
      }
      
      // Transformar dados do banco para o formato da API
      return {
        id: serie.tmdb_id,
        name: serie.nome,
        original_name: serie.nome_original,
        overview: serie.descricao,
        poster_path: serie.cover,
        backdrop_path: serie.backcover,
        first_air_date: serie.primeira_exibicao,
        last_air_date: serie.ultima_exibicao,
        vote_average: serie.avaliacao,
        vote_count: serie.votos,
        popularity: serie.popularidade,
        genre_ids: serie.generos,
        origin_country: serie.paises,
        number_of_episodes: serie.total_episodios,
        number_of_seasons: serie.total_temporadas,
        status: serie.status,
        episode_run_time: serie.runtime_episodio ? [serie.runtime_episodio] : [],
        original_language: serie.linguagem_original,
        homepage: serie.homepage,
        tagline: serie.tagline,
        cast: (serie.elenco && Array.isArray(serie.elenco)) ? serie.elenco.map((actor: any) => ({
          id: actor.tmdb_person_id,
          name: actor.nome,
          character: actor.personagem,
          profile_path: actor.foto,
          order: actor.ordem
        })) : [],
        videos: {
          results: (Array.isArray(serie?.videos) ? serie.videos : []).map((video: any) => ({
            id: video?.tmdb_video_id,
            key: video?.key,
            site: video?.site,
            type: video?.tipo,
            name: video?.nome,
            size: video?.tamanho,
            official: video?.oficial,
            published_at: video?.publicado_em
          }))
        },
        images: {
          backdrops: (Array.isArray(serie?.imagens) ? serie.imagens : []).filter((img: any) => img?.tipo === 'backdrop'),
          posters: (Array.isArray(serie?.imagens) ? serie.imagens : []).filter((img: any) => img?.tipo === 'poster'),
          logos: (Array.isArray(serie?.imagens) ? serie.imagens : []).filter((img: any) => img?.tipo === 'logo')
        },
        seasons: (Array.isArray(serie?.temporadas) ? serie.temporadas : []).map((season: any) => ({
          id: season?.tmdb_season_id || season?.id,
          season_number: season?.numero,
          name: season?.nome,
          overview: season?.descricao,
          poster_path: season?.capa,
          air_date: season?.data_exibicao,
          episode_count: season?.total_episodios
        }))
      };
    } catch (error) {
      console.error('[CACHE] Erro no sistema de cache, usando fallback para TMDb:', error);
      
      // Fallback para TMDb em caso de erro
      try {
        const tmdbData = await fetchFromTMDb(`/tv/${id}`);
        const [castData, videosData] = await Promise.allSettled([
          fetchFromTMDb(`/tv/${id}/credits`),
          fetchFromTMDb(`/tv/${id}/videos`)
        ]);
        
        return {
          id: tmdbData.id,
          name: tmdbData.name,
          original_name: tmdbData.original_name,
          overview: tmdbData.overview,
          poster_path: tmdbData.poster_path,
          backdrop_path: tmdbData.backdrop_path,
          first_air_date: tmdbData.first_air_date,
          last_air_date: tmdbData.last_air_date,
          vote_average: tmdbData.vote_average,
          vote_count: tmdbData.vote_count,
          popularity: tmdbData.popularity,
          genre_ids: tmdbData.genres?.map((g: any) => g.id) || [],
          origin_country: tmdbData.origin_country || [],
          number_of_episodes: tmdbData.number_of_episodes,
          number_of_seasons: tmdbData.number_of_seasons,
          status: tmdbData.status,
          episode_run_time: tmdbData.episode_run_time || [],
          original_language: tmdbData.original_language,
          homepage: tmdbData.homepage,
          tagline: tmdbData.tagline,
          cast: castData.status === 'fulfilled' ? castData.value?.cast?.slice(0, 20).map((actor: any) => ({
            id: actor.id,
            name: actor.name,
            character: actor.character,
            profile_path: actor.profile_path,
            order: actor.order
          })) || [] : [],
          videos: {
            results: videosData.status === 'fulfilled' ? videosData.value?.results?.filter((video: any) => ['Trailer', 'Teaser'].includes(video.type)).slice(0, 10) || [] : []
          },
          images: { backdrops: [], posters: [], logos: [] },
          seasons: tmdbData.seasons || []
        };
      } catch (fallbackError) {
        console.error('[CACHE] Fallback para TMDb também falhou:', fallbackError);
        throw new Error('Erro ao carregar dorama');
      }
    }
  });

export const searchDramas = publicProcedure
  .input(dramaSearchSchema)
  .query(async ({ input }: { input: z.infer<typeof dramaSearchSchema> }) => {
    const { query, page } = input;
    
    try {
      // Buscar do TMDb (busca sempre é em tempo real)
      const data = await fetchFromTMDb(`/search/tv?query=${encodeURIComponent(query)}&page=${page}`);
      
      return {
        page: data.page,
        results: data.results.map((drama: any) => ({
          id: drama.id,
          name: drama.name,
          original_name: drama.original_name,
          overview: drama.overview,
          poster_path: drama.poster_path,
          backdrop_path: drama.backdrop_path,
          first_air_date: drama.first_air_date,
          vote_average: drama.vote_average,
          vote_count: drama.vote_count,
          popularity: drama.popularity,
          genre_ids: drama.genre_ids,
          origin_country: drama.origin_country
        })),
        total_pages: data.total_pages,
        total_results: data.total_results
      };
      
    } catch (error) {
      console.error('Erro ao buscar doramas:', error);
      throw new Error('Erro ao buscar doramas');
    }
  });

export const getPopularDramas = publicProcedure
  .input(popularDramasSchema)
  .query(async ({ input, ctx }: { input: z.infer<typeof popularDramasSchema>; ctx: Context }) => {
    const { page } = input;
    
    try {
      // Primeiro, tentar buscar do cache (séries populares que já estão salvas)
      const { data: cachedSeries } = await ctx.supabase
        .from('series')
        .select('*')
        .order('popularidade', { ascending: false })
        .range((page - 1) * 20, page * 20 - 1);
      
      // Se temos dados no cache, retornar
      if (cachedSeries && cachedSeries.length > 0) {
        return {
          page,
          results: cachedSeries.map((serie: any) => ({
            id: serie.tmdb_id,
            name: serie.nome,
            original_name: serie.nome_original,
            overview: serie.descricao,
            poster_path: serie.cover,
            backdrop_path: serie.backcover,
            first_air_date: serie.primeira_exibicao,
            vote_average: serie.avaliacao,
            vote_count: serie.votos,
            popularity: serie.popularidade,
            genre_ids: serie.generos,
            origin_country: serie.paises
          })),
          total_pages: Math.ceil(cachedSeries.length / 20),
          total_results: cachedSeries.length
        };
      }
      
      // Se não tem no cache, buscar do TMDb
      const data = await fetchFromTMDb(`/tv/popular?page=${page}`);
      
      // Salvar no cache em background (não bloquear resposta)
      Promise.all(
        data.results.slice(0, 10).map(async (drama: any) => {
          try {
            await upsertSerieCache(ctx.supabase, drama);
          } catch (error) {
            console.error(`Erro ao salvar série ${drama.id} no cache:`, error);
          }
        })
      ).catch(console.error);
      
      return {
        page: data.page,
        results: data.results.map((drama: any) => ({
          id: drama.id,
          name: drama.name,
          original_name: drama.original_name,
          overview: drama.overview,
          poster_path: drama.poster_path,
          backdrop_path: drama.backdrop_path,
          first_air_date: drama.first_air_date,
          vote_average: drama.vote_average,
          vote_count: drama.vote_count,
          popularity: drama.popularity,
          genre_ids: drama.genre_ids,
          origin_country: drama.origin_country
        })),
        total_pages: data.total_pages,
        total_results: data.total_results
      };
      
    } catch (error) {
      console.error('Erro ao buscar doramas populares:', error);
      throw new Error('Erro ao carregar doramas populares');
    }
  });

export const getTrendingDramas = publicProcedure
  .query(async ({ ctx }: { ctx: Context }) => {
    try {
      // Buscar trending do TMDb
      const data = await fetchFromTMDb('/trending/tv/week');
      
      // Salvar no cache em background
      Promise.all(
        data.results.slice(0, 10).map(async (drama: any) => {
          try {
            await upsertSerieCache(ctx.supabase, drama);
          } catch (error) {
            console.error(`Erro ao salvar série trending ${drama.id} no cache:`, error);
          }
        })
      ).catch(console.error);
      
      return {
        results: data.results.map((drama: any) => ({
          id: drama.id,
          name: drama.name,
          original_name: drama.original_name,
          overview: drama.overview,
          poster_path: drama.poster_path,
          backdrop_path: drama.backdrop_path,
          first_air_date: drama.first_air_date,
          vote_average: drama.vote_average,
          vote_count: drama.vote_count,
          popularity: drama.popularity,
          genre_ids: drama.genre_ids,
          origin_country: drama.origin_country
        }))
      };
      
    } catch (error) {
      console.error('Erro ao buscar doramas em alta:', error);
      throw new Error('Erro ao carregar doramas em alta');
    }
  });

// Procedure para sincronização manual (apenas para admins)
export const syncSeriesCache = protectedProcedure
  .mutation(async ({ ctx }: { ctx: Context & { user: NonNullable<Context['user']> } }) => {
    try {
      // Buscar séries que precisam ser atualizadas
      const { data: outdatedSeries } = await ctx.supabase.rpc('get_series_to_update', {
        p_max_age_days: 7,
        p_limit: 50
      });
      
      let updated = 0;
      
      for (const serie of outdatedSeries || []) {
        try {
          const tmdbData = await fetchFromTMDb(`/tv/${serie.tmdb_id}`);
          await upsertSerieCache(ctx.supabase, tmdbData);
          updated++;
        } catch (error) {
          console.error(`Erro ao atualizar série ${serie.tmdb_id}:`, error);
        }
      }
      
      return {
        message: `${updated} séries atualizadas com sucesso`,
        updated
      };
      
    } catch (error) {
      console.error('Erro na sincronização:', error);
      throw new Error('Erro ao sincronizar cache');
    }
  });

// Procedure para limpeza do cache (apenas para admins)
export const cleanupCache = protectedProcedure
  .mutation(async ({ ctx }: { ctx: Context & { user: NonNullable<Context['user']> } }) => {
    try {
      const { data: deletedCount } = await ctx.supabase.rpc('cleanup_old_cache_data', {
        p_max_age_days: 90
      });
      
      return {
        message: `${deletedCount} registros antigos removidos`,
        deleted: deletedCount
      };
      
    } catch (error) {
      console.error('Erro na limpeza:', error);
      throw new Error('Erro ao limpar cache');
    }
  });