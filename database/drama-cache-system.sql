-- =====================================================
-- SISTEMA DE CACHE DE DORAMAS - SUPABASE + TMDB
-- =====================================================
-- Sistema completo de cache para otimizar performance
-- Sincronização inteligente com TMDb API
-- Estrutura normalizada para consultas eficientes

-- =====================================================
-- CORREÇÃO DA TABELA SERIES (se já existir)
-- =====================================================

-- Dropar tabela series se existir para recriar com estrutura correta
DROP TABLE IF EXISTS public.series CASCADE;

-- =====================================================
-- TABELAS PRINCIPAIS DO CACHE
-- =====================================================

-- Tabela principal de séries (cache do TMDb)
CREATE TABLE IF NOT EXISTS public.series (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- id interno sequencial
    tmdb_id BIGINT UNIQUE NOT NULL, -- id da série no TMDb
    nome TEXT NOT NULL, -- título
    nome_original TEXT, -- título original
    descricao TEXT, -- overview
    cover TEXT, -- poster_path
    backcover TEXT, -- backdrop_path
    ano INTEGER, -- year de lançamento
    avaliacao NUMERIC(3,1), -- vote_average
    total_episodios INTEGER DEFAULT 0, -- somatório calculado
    total_temporadas INTEGER DEFAULT 0, -- qtd seasons
    status TEXT, -- "Returning Series", "Ended", etc.
    onde_assistir JSONB DEFAULT '[]'::jsonb, -- streaming platforms
    generos INTEGER[] DEFAULT '{}', -- genre_ids array
    paises TEXT[] DEFAULT '{}', -- origin_country
    popularidade NUMERIC(8,3), -- popularity
    votos INTEGER DEFAULT 0, -- vote_count
    primeira_exibicao DATE, -- first_air_date
    ultima_exibicao DATE, -- last_air_date
    runtime_episodio INTEGER, -- episode_run_time médio
    linguagem_original TEXT, -- original_language
    homepage TEXT, -- homepage
    tagline TEXT, -- tagline
    keywords JSONB DEFAULT '[]'::jsonb, -- keywords
    networks JSONB DEFAULT '[]'::jsonb, -- networks
    production_companies JSONB DEFAULT '[]'::jsonb, -- production companies
    last_update TIMESTAMPTZ DEFAULT NOW(), -- controle de sincronização
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de temporadas
CREATE TABLE IF NOT EXISTS public.temporadas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    serie_id BIGINT REFERENCES public.series(id) ON DELETE CASCADE NOT NULL,
    tmdb_season_id BIGINT, -- id da temporada no TMDb
    numero INTEGER NOT NULL, -- nº da temporada
    nome TEXT, -- nome da temporada
    descricao TEXT, -- overview
    capa TEXT, -- poster_path
    ano INTEGER, -- ano de lançamento
    total_episodios INTEGER DEFAULT 0, -- qtd episódios
    data_exibicao DATE, -- air_date
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(serie_id, numero)
);

-- Tabela de episódios
CREATE TABLE IF NOT EXISTS public.episodios (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    temporada_id BIGINT REFERENCES public.temporadas(id) ON DELETE CASCADE NOT NULL,
    tmdb_episode_id BIGINT, -- id do episódio no TMDb
    numero INTEGER NOT NULL, -- nº episódio
    nome TEXT, -- título
    descricao TEXT, -- overview
    duracao INTEGER, -- runtime em minutos
    data_exibicao DATE, -- air_date
    still TEXT, -- imagem do episódio
    avaliacao NUMERIC(3,1), -- vote_average
    votos INTEGER DEFAULT 0, -- vote_count
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(temporada_id, numero)
);

-- Tabela de elenco
CREATE TABLE IF NOT EXISTS public.elenco (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    serie_id BIGINT REFERENCES public.series(id) ON DELETE CASCADE NOT NULL,
    tmdb_person_id BIGINT, -- id da pessoa no TMDb
    nome TEXT NOT NULL, -- nome do ator
    personagem TEXT, -- papel
    foto TEXT, -- profile_path
    ordem INTEGER DEFAULT 0, -- ordem de destaque
    tipo TEXT DEFAULT 'cast' CHECK (tipo IN ('cast', 'crew')), -- cast ou crew
    departamento TEXT, -- department (para crew)
    trabalho TEXT, -- job (para crew)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de vídeos (trailers, clips, etc.)
CREATE TABLE IF NOT EXISTS public.videos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    serie_id BIGINT REFERENCES public.series(id) ON DELETE CASCADE NOT NULL,
    tmdb_video_id TEXT, -- id do vídeo no TMDb
    key TEXT NOT NULL, -- id do vídeo no YouTube/Vimeo
    site TEXT NOT NULL DEFAULT 'YouTube', -- "YouTube", "Vimeo"
    tipo TEXT NOT NULL, -- "Trailer", "Clip", "Teaser", etc.
    nome TEXT NOT NULL, -- título do vídeo
    tamanho INTEGER, -- size (720, 1080, etc.)
    oficial BOOLEAN DEFAULT false, -- official
    publicado_em TIMESTAMPTZ, -- published_at
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de imagens (backdrops, posters, logos)
CREATE TABLE IF NOT EXISTS public.imagens (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    serie_id BIGINT REFERENCES public.series(id) ON DELETE CASCADE NOT NULL,
    caminho TEXT NOT NULL, -- file_path
    tipo TEXT NOT NULL CHECK (tipo IN ('backdrop', 'poster', 'logo')), -- tipo da imagem
    largura INTEGER, -- width
    altura INTEGER, -- height
    aspecto NUMERIC(4,2), -- aspect_ratio
    votos INTEGER DEFAULT 0, -- vote_count
    avaliacao NUMERIC(3,1), -- vote_average
    linguagem TEXT, -- iso_639_1
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de gêneros (cache dos gêneros do TMDb)
CREATE TABLE IF NOT EXISTS public.generos (
    id INTEGER PRIMARY KEY, -- id do gênero no TMDb
    nome TEXT NOT NULL, -- nome do gênero
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de relacionamento série-gênero
CREATE TABLE IF NOT EXISTS public.serie_generos (
    serie_id BIGINT REFERENCES public.series(id) ON DELETE CASCADE,
    genero_id INTEGER REFERENCES public.generos(id) ON DELETE CASCADE,
    PRIMARY KEY (serie_id, genero_id)
);

-- Tabela de palavras-chave
CREATE TABLE IF NOT EXISTS public.palavras_chave (
    id INTEGER PRIMARY KEY, -- id da keyword no TMDb
    nome TEXT NOT NULL, -- nome da keyword
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de relacionamento série-palavra-chave
CREATE TABLE IF NOT EXISTS public.serie_palavras_chave (
    serie_id BIGINT REFERENCES public.series(id) ON DELETE CASCADE,
    palavra_chave_id INTEGER REFERENCES public.palavras_chave(id) ON DELETE CASCADE,
    PRIMARY KEY (serie_id, palavra_chave_id)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para séries
CREATE INDEX IF NOT EXISTS idx_series_tmdb_id ON public.series(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_series_nome ON public.series USING gin(to_tsvector('portuguese', nome));
CREATE INDEX IF NOT EXISTS idx_series_ano ON public.series(ano);
CREATE INDEX IF NOT EXISTS idx_series_avaliacao ON public.series(avaliacao DESC);
CREATE INDEX IF NOT EXISTS idx_series_popularidade ON public.series(popularidade DESC);
CREATE INDEX IF NOT EXISTS idx_series_status ON public.series(status);
CREATE INDEX IF NOT EXISTS idx_series_generos ON public.series USING gin(generos);
CREATE INDEX IF NOT EXISTS idx_series_last_update ON public.series(last_update);
CREATE INDEX IF NOT EXISTS idx_series_created_at ON public.series(created_at DESC);

-- Índices para temporadas
CREATE INDEX IF NOT EXISTS idx_temporadas_serie_id ON public.temporadas(serie_id);
CREATE INDEX IF NOT EXISTS idx_temporadas_numero ON public.temporadas(numero);

-- Índices para episódios
CREATE INDEX IF NOT EXISTS idx_episodios_temporada_id ON public.episodios(temporada_id);
CREATE INDEX IF NOT EXISTS idx_episodios_numero ON public.episodios(numero);
CREATE INDEX IF NOT EXISTS idx_episodios_data_exibicao ON public.episodios(data_exibicao);

-- Índices para elenco
CREATE INDEX IF NOT EXISTS idx_elenco_serie_id ON public.elenco(serie_id);
CREATE INDEX IF NOT EXISTS idx_elenco_tmdb_person_id ON public.elenco(tmdb_person_id);
CREATE INDEX IF NOT EXISTS idx_elenco_nome ON public.elenco USING gin(to_tsvector('portuguese', nome));
CREATE INDEX IF NOT EXISTS idx_elenco_ordem ON public.elenco(ordem);

-- Índices para vídeos
CREATE INDEX IF NOT EXISTS idx_videos_serie_id ON public.videos(serie_id);
CREATE INDEX IF NOT EXISTS idx_videos_tipo ON public.videos(tipo);
CREATE INDEX IF NOT EXISTS idx_videos_site ON public.videos(site);

-- Índices para imagens
CREATE INDEX IF NOT EXISTS idx_imagens_serie_id ON public.imagens(serie_id);
CREATE INDEX IF NOT EXISTS idx_imagens_tipo ON public.imagens(tipo);

-- =====================================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================

-- Trigger para atualizar updated_at nas tabelas
CREATE TRIGGER update_series_updated_at 
    BEFORE UPDATE ON public.series
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_temporadas_updated_at 
    BEFORE UPDATE ON public.temporadas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_episodios_updated_at 
    BEFORE UPDATE ON public.episodios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar contadores de temporadas/episódios
CREATE OR REPLACE FUNCTION update_series_counters()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar total de temporadas e episódios na série
    UPDATE public.series 
    SET 
        total_temporadas = (
            SELECT COUNT(*) 
            FROM public.temporadas 
            WHERE serie_id = COALESCE(NEW.serie_id, OLD.serie_id)
        ),
        total_episodios = (
            SELECT COALESCE(SUM(total_episodios), 0)
            FROM public.temporadas 
            WHERE serie_id = COALESCE(NEW.serie_id, OLD.serie_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.serie_id, OLD.serie_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar contadores quando temporadas são modificadas
CREATE TRIGGER update_series_counters_on_season_change
    AFTER INSERT OR UPDATE OR DELETE ON public.temporadas
    FOR EACH ROW EXECUTE FUNCTION update_series_counters();

-- Função para atualizar contador de episódios na temporada
CREATE OR REPLACE FUNCTION update_season_episode_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar total de episódios na temporada
    UPDATE public.temporadas 
    SET 
        total_episodios = (
            SELECT COUNT(*) 
            FROM public.episodios 
            WHERE temporada_id = COALESCE(NEW.temporada_id, OLD.temporada_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.temporada_id, OLD.temporada_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar contador quando episódios são modificados
CREATE TRIGGER update_season_episode_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.episodios
    FOR EACH ROW EXECUTE FUNCTION update_season_episode_count();

-- =====================================================
-- FUNÇÕES DE SINCRONIZAÇÃO COM TMDB
-- =====================================================

-- Função para inserir ou atualizar uma série do cache
CREATE OR REPLACE FUNCTION upsert_serie_cache(
    p_tmdb_id BIGINT,
    p_nome TEXT,
    p_nome_original TEXT DEFAULT NULL,
    p_descricao TEXT DEFAULT NULL,
    p_cover TEXT DEFAULT NULL,
    p_backcover TEXT DEFAULT NULL,
    p_ano INTEGER DEFAULT NULL,
    p_avaliacao NUMERIC DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_generos INTEGER[] DEFAULT '{}',
    p_paises TEXT[] DEFAULT '{}',
    p_popularidade NUMERIC DEFAULT NULL,
    p_votos INTEGER DEFAULT 0,
    p_primeira_exibicao DATE DEFAULT NULL,
    p_ultima_exibicao DATE DEFAULT NULL,
    p_runtime_episodio INTEGER DEFAULT NULL,
    p_linguagem_original TEXT DEFAULT NULL,
    p_homepage TEXT DEFAULT NULL,
    p_tagline TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    serie_id BIGINT;
BEGIN
    INSERT INTO public.series (
        tmdb_id, nome, nome_original, descricao, cover, backcover,
        ano, avaliacao, status, generos, paises, popularidade,
        votos, primeira_exibicao, ultima_exibicao, runtime_episodio,
        linguagem_original, homepage, tagline, last_update
    ) VALUES (
        p_tmdb_id, p_nome, p_nome_original, p_descricao, p_cover, p_backcover,
        p_ano, p_avaliacao, p_status, p_generos, p_paises, p_popularidade,
        p_votos, p_primeira_exibicao, p_ultima_exibicao, p_runtime_episodio,
        p_linguagem_original, p_homepage, p_tagline, NOW()
    )
    ON CONFLICT (tmdb_id) DO UPDATE SET
        nome = EXCLUDED.nome,
        nome_original = EXCLUDED.nome_original,
        descricao = EXCLUDED.descricao,
        cover = EXCLUDED.cover,
        backcover = EXCLUDED.backcover,
        ano = EXCLUDED.ano,
        avaliacao = EXCLUDED.avaliacao,
        status = EXCLUDED.status,
        generos = EXCLUDED.generos,
        paises = EXCLUDED.paises,
        popularidade = EXCLUDED.popularidade,
        votos = EXCLUDED.votos,
        primeira_exibicao = EXCLUDED.primeira_exibicao,
        ultima_exibicao = EXCLUDED.ultima_exibicao,
        runtime_episodio = EXCLUDED.runtime_episodio,
        linguagem_original = EXCLUDED.linguagem_original,
        homepage = EXCLUDED.homepage,
        tagline = EXCLUDED.tagline,
        last_update = NOW(),
        updated_at = NOW()
    RETURNING id INTO serie_id;
    
    RETURN serie_id;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar se uma série precisa ser atualizada
CREATE OR REPLACE FUNCTION serie_needs_update(p_tmdb_id BIGINT, p_max_age_days INTEGER DEFAULT 7)
RETURNS BOOLEAN AS $$
DECLARE
    last_update_date TIMESTAMPTZ;
BEGIN
    SELECT last_update INTO last_update_date
    FROM public.series
    WHERE tmdb_id = p_tmdb_id;
    
    -- Se não existe, precisa ser criada
    IF last_update_date IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Se passou do tempo limite, precisa ser atualizada
    RETURN (last_update_date < NOW() - INTERVAL '1 day' * p_max_age_days);
END;
$$ LANGUAGE plpgsql;

-- Função para obter séries que precisam ser atualizadas
CREATE OR REPLACE FUNCTION get_series_to_update(p_max_age_days INTEGER DEFAULT 7, p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
    tmdb_id BIGINT,
    nome TEXT,
    last_update TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.tmdb_id, s.nome, s.last_update
    FROM public.series s
    WHERE s.last_update < NOW() - INTERVAL '1 day' * p_max_age_days
    ORDER BY s.last_update ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Função para limpar dados antigos (opcional)
CREATE OR REPLACE FUNCTION cleanup_old_cache_data(p_max_age_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Remove séries muito antigas que não estão sendo usadas
    DELETE FROM public.series s
    WHERE s.last_update < NOW() - INTERVAL '1 day' * p_max_age_days
    AND NOT EXISTS (
        SELECT 1 FROM public.user_drama_lists udl 
        WHERE udl.drama_id = s.tmdb_id
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS ÚTEIS PARA CONSULTAS
-- =====================================================

-- View completa de séries com informações relacionadas
CREATE OR REPLACE VIEW public.series_completas AS
SELECT 
    s.*,
    COALESCE(
        json_agg(
            json_build_object(
                'id', g.id,
                'nome', g.nome
            )
        ) FILTER (WHERE g.id IS NOT NULL),
        '[]'::json
    ) as generos_detalhados,
    COALESCE(
        json_agg(
            json_build_object(
                'numero', t.numero,
                'nome', t.nome,
                'total_episodios', t.total_episodios,
                'ano', t.ano
            ) ORDER BY t.numero
        ) FILTER (WHERE t.id IS NOT NULL),
        '[]'::json
    ) as temporadas_info
FROM public.series s
LEFT JOIN public.serie_generos sg ON s.id = sg.serie_id
LEFT JOIN public.generos g ON sg.genero_id = g.id
LEFT JOIN public.temporadas t ON s.id = t.serie_id
GROUP BY s.id;

-- View para elenco principal
CREATE OR REPLACE VIEW public.elenco_principal AS
SELECT 
    e.*,
    s.nome as serie_nome
FROM public.elenco e
JOIN public.series s ON e.serie_id = s.id
WHERE e.tipo = 'cast'
ORDER BY e.serie_id, e.ordem;

-- View para vídeos de trailer
CREATE OR REPLACE VIEW public.trailers AS
SELECT 
    v.*,
    s.nome as serie_nome
FROM public.videos v
JOIN public.series s ON v.serie_id = s.id
WHERE v.tipo IN ('Trailer', 'Teaser')
ORDER BY v.serie_id, v.oficial DESC, v.publicado_em DESC;

-- =====================================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- =====================================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temporadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elenco ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serie_generos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.palavras_chave ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serie_palavras_chave ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura pública (cache é público)
CREATE POLICY "Todos podem ler séries" ON public.series FOR SELECT USING (true);
CREATE POLICY "Todos podem ler temporadas" ON public.temporadas FOR SELECT USING (true);
CREATE POLICY "Todos podem ler episódios" ON public.episodios FOR SELECT USING (true);
CREATE POLICY "Todos podem ler elenco" ON public.elenco FOR SELECT USING (true);
CREATE POLICY "Todos podem ler vídeos" ON public.videos FOR SELECT USING (true);
CREATE POLICY "Todos podem ler imagens" ON public.imagens FOR SELECT USING (true);
CREATE POLICY "Todos podem ler gêneros" ON public.generos FOR SELECT USING (true);
CREATE POLICY "Todos podem ler série-gêneros" ON public.serie_generos FOR SELECT USING (true);
CREATE POLICY "Todos podem ler palavras-chave" ON public.palavras_chave FOR SELECT USING (true);
CREATE POLICY "Todos podem ler série-palavras-chave" ON public.serie_palavras_chave FOR SELECT USING (true);

-- Políticas de escrita apenas para sistema (service_role)
CREATE POLICY "Apenas sistema pode modificar séries" ON public.series FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Apenas sistema pode modificar temporadas" ON public.temporadas FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Apenas sistema pode modificar episódios" ON public.episodios FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Apenas sistema pode modificar elenco" ON public.elenco FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Apenas sistema pode modificar vídeos" ON public.videos FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Apenas sistema pode modificar imagens" ON public.imagens FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Apenas sistema pode modificar gêneros" ON public.generos FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Apenas sistema pode modificar série-gêneros" ON public.serie_generos FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Apenas sistema pode modificar palavras-chave" ON public.palavras_chave FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Apenas sistema pode modificar série-palavras-chave" ON public.serie_palavras_chave FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- DADOS INICIAIS (GÊNEROS DO TMDB)
-- =====================================================

-- Inserir gêneros padrão do TMDb para TV Shows
INSERT INTO public.generos (id, nome) VALUES
(10759, 'Action & Adventure'),
(16, 'Animation'),
(35, 'Comedy'),
(80, 'Crime'),
(99, 'Documentary'),
(18, 'Drama'),
(10751, 'Family'),
(10762, 'Kids'),
(9648, 'Mystery'),
(10763, 'News'),
(10764, 'Reality'),
(10765, 'Sci-Fi & Fantasy'),
(10766, 'Soap'),
(10767, 'Talk'),
(10768, 'War & Politics'),
(37, 'Western')
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE public.series IS 'Cache principal de séries/doramas do TMDb';
COMMENT ON TABLE public.temporadas IS 'Temporadas das séries com informações detalhadas';
COMMENT ON TABLE public.episodios IS 'Episódios individuais com metadados';
COMMENT ON TABLE public.elenco IS 'Elenco e equipe das séries';
COMMENT ON TABLE public.videos IS 'Vídeos relacionados (trailers, clips, etc.)';
COMMENT ON TABLE public.imagens IS 'Imagens das séries (posters, backdrops, logos)';
COMMENT ON TABLE public.generos IS 'Gêneros disponíveis no TMDb';
COMMENT ON TABLE public.serie_generos IS 'Relacionamento N:N entre séries e gêneros';

COMMENT ON COLUMN public.series.tmdb_id IS 'ID único da série no TMDb API';
COMMENT ON COLUMN public.series.last_update IS 'Controle de quando os dados foram atualizados pela última vez';
COMMENT ON COLUMN public.series.onde_assistir IS 'JSON com plataformas de streaming disponíveis';
COMMENT ON COLUMN public.series.generos IS 'Array de IDs de gêneros para consultas rápidas';

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================

/*
COMO USAR ESTE SISTEMA DE CACHE:

1. PRIMEIRA CONSULTA:
   - Verificar se existe no cache: SELECT * FROM series WHERE tmdb_id = ?
   - Se não existe, buscar no TMDb e salvar usando upsert_serie_cache()

2. ATUALIZAÇÕES PERIÓDICAS:
   - Usar get_series_to_update() para encontrar séries desatualizadas
   - Executar sync job diário/semanal para manter dados frescos

3. CONSULTAS OTIMIZADAS:
   - Usar as views (series_completas, elenco_principal, trailers)
   - Aproveitar os índices para buscas por nome, gênero, ano, etc.

4. LIMPEZA:
   - Executar cleanup_old_cache_data() periodicamente
   - Remove séries antigas não utilizadas pelos usuários

5. PERFORMANCE:
   - Todos os dados ficam no Supabase (consultas rápidas)
   - Fallback para TMDb apenas quando necessário
   - Índices otimizados para buscas comuns

EXEMPLO DE USO NO BACKEND:
```typescript
// Verificar se precisa atualizar
const needsUpdate = await supabase.rpc('serie_needs_update', { 
  p_tmdb_id: dramaId 
});

if (needsUpdate) {
  // Buscar no TMDb e salvar
  const tmdbData = await fetchFromTMDb(dramaId);
  await supabase.rpc('upsert_serie_cache', tmdbData);
}

// Consultar dados do cache
const { data } = await supabase
  .from('series_completas')
  .select('*')
  .eq('tmdb_id', dramaId)
  .single();
```
*/