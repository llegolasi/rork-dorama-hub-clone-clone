-- Migration: Replace Twitter feed with custom news articles
-- This migration removes the Twitter-based news system and implements custom articles

-- Drop existing Twitter-based news tables
DROP TABLE IF EXISTS news_interactions CASCADE;
DROP TABLE IF EXISTS featured_news CASCADE;
DROP TABLE IF EXISTS news_feed_views CASCADE;
DROP TABLE IF EXISTS news_feed_config CASCADE;

-- Apply the new custom news articles schema
-- (Run the content of news-articles-schema.sql here)

-- Insert sample article based on the provided JSON
INSERT INTO news_articles (
    status,
    title,
    slug,
    tags,
    cover_image_url,
    html_content,
    plain_text_content,
    author_name,
    published_at,
    is_featured,
    featured_order,
    meta_description
) VALUES (
    'published',
    '"Tudo Sob Controle", K-Drama da Samsung gravado no Brasil, será distribuído pelo Globoplay',
    'tudo-sob-controle-k-drama-samsung-globoplay',
    ARRAY['K-Drama', 'Lançamentos', 'Streaming'],
    'https://momentokdrama.com.br/wp-content/uploads/2025/08/Sharon-Cho-e-Raphael-Chung-bastidor2-serie-Tudo-Sob-Controle-K-Drama-Samsung-TV-Plus-2.jpg',
    'SÃO PAULO, Brasil – 12 de agosto de 2025 – A Samsung anuncia uma parceria com a Globo para o lançamento e distribuição de "Tudo Sob Controle", o primeiro K-Drama original produzido pela marca globalmente. Gravada inteiramente em São Paulo, já está disponível gratuitamente a todos os usuários logados do Globoplay.O projeto marca a estreia da Samsung como produtora de conteúdo audiovisual, unindo a força dos K-Dramas – fenômeno global de audiência – à expertise da marca em inovação e storytelling. Como uma empresa sul-coreana, a Samsung encontra em "Tudo Sob Controle" uma forma autêntica de se conectar com os consumidores latino-americanos, tanto os que já são fãs do gênero ou aqueles que gostam de assistir a boas histórias. Ao mesmo tempo, apresenta seu ecossistema de dispositivos conectados, reforçando como a tecnologia pode simplificar a rotina e potencializar o dia a dia. A parceria com a Globo, para distribuição pelo Globoplay, reforça esta estratégia da marca.<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;border:1px solid var(--line);"><iframe src="https://www.youtube.com/embed/Oo5IkRMcaMM" frameborder="0" allowfullscreen="" style="position:absolute;top:0;left:0;width:100%;height:100%;">&nbsp;"O K-Drama é um formato que une storytelling envolvente com um universo visual muito potente – algo que conversa diretamente com o DNA da Samsung. Com 'Tudo Sob Controle', damos um passo além ao criar um conteúdo original que representa um encontro entre cultura, entretenimento e inovação", afirma Milene Gomes, Diretora de Retail e SmartThings da Samsung para a América Latina.&nbsp;A produção combina o estilo envolvente dos K-Dramas com uma narrativa moderna, divertida e repleta de tecnologia, adaptada ao consumidor latino-americano. "Tudo Sob Controle" acompanha a história de Yun-A (interpretada por Sharon Cho) e Ji-Hoon (interpretado por Raphael Chung), dois jovens executivos convivendo em uma casa inteligente 100% equipada com o ecossistema Samsung. O que deveria ser uma estadia rápida se transforma em uma série de situações inusitadas e encontros inesperados que misturam romance, cultura e tecnologia.&nbsp;<img src="https://ci3.googleusercontent.com/meips/ADKq_NYBKZ7IjhPY7KMtNCwPK17xt0npGOpeUIae0mAs8vk6iV1LCramJD3v-fMeQb9-B7zTqjorY7_QZg6TNUE2UXuYTyzzIbjCB7V_En9bwxhzlvoTe6fU5wKbqEq18qq7k7f8Ek730guWkZz1EnZsR6mPRg3dWnLvnwMTmEq_eDmjf4LSKptXqhwHui3WjfHJEBUxeLAvrVC9okVvvIqhwtAp9docH7LcGusuEQ28G-A0euf1fQdHmJlANucYNFkow5XAYS7bvZXOpHXVxAz9I7Fn4H8=s0-d-e1-ft#https://s2506.imxsnd73.com/5=MmY6MmZmVjY5oTbvNmLslWYtdGQrNWYuFWb1FmOxEjN3MTMwETOzozZlBnauc3bsNGM4gDM2YTN0UmNxADMlZjNlJmZiNmM2UTY2ETN0czNGJTJ0czNGJTJ1ETO3MjRyUiM1YjMxkDM58VL1ETLf9VLwITLfpjM" alt="" style="max-width: 100%; border-radius: 8px;">Os episódios apresentam diversos dispositivos da Samsung em cenas-chave. Entre eles o dobrável Galaxy Z Flip, que desempenha papel importante na vida dos personagens e contribui com soluções criativas para os desafios do enredo. Inclusive, em cada episódio, que também é disponibilizado no canal oficial da Samsung Brasil no YouTube, as pessoas podem interagir e comprar produtos da série.',
    'SÃO PAULO, Brasil – 12 de agosto de 2025 – A Samsung anuncia uma parceria com a Globo para o lançamento e distribuição de "Tudo Sob Controle", o primeiro K-Drama original produzido pela marca globalmente. Gravada inteiramente em São Paulo, já está disponível gratuitamente a todos os usuários logados do Globoplay. O projeto marca a estreia da Samsung como produtora de conteúdo audiovisual, unindo a força dos K-Dramas – fenômeno global de audiência – à expertise da marca em inovação e storytelling. Como uma empresa sul-coreana, a Samsung encontra em "Tudo Sob Controle" uma forma autêntica de se conectar com os consumidores latino-americanos, tanto os que já são fãs do gênero ou aqueles que gostam de assistir a boas histórias. Ao mesmo tempo, apresenta seu ecossistema de dispositivos conectados, reforçando como a tecnologia pode simplificar a rotina e potencializar o dia a dia. A parceria com a Globo, para distribuição pelo Globoplay, reforça esta estratégia da marca. "O K-Drama é um formato que une storytelling envolvente com um universo visual muito potente – algo que conversa diretamente com o DNA da Samsung. Com 'Tudo Sob Controle', damos um passo além ao criar um conteúdo original que representa um encontro entre cultura, entretenimento e inovação", afirma Milene Gomes, Diretora de Retail e SmartThings da Samsung para a América Latina. A produção combina o estilo envolvente dos K-Dramas com uma narrativa moderna, divertida e repleta de tecnologia, adaptada ao consumidor latino-americano. "Tudo Sob Controle" acompanha a história de Yun-A (interpretada por Sharon Cho) e Ji-Hoon (interpretado por Raphael Chung), dois jovens executivos convivendo em uma casa inteligente 100% equipada com o ecossistema Samsung. O que deveria ser uma estadia rápida se transforma em uma série de situações inusitadas e encontros inesperados que misturam romance, cultura e tecnologia. Os episódios apresentam diversos dispositivos da Samsung em cenas-chave. Entre eles o dobrável Galaxy Z Flip, que desempenha papel importante na vida dos personagens e contribui com soluções criativas para os desafios do enredo. Inclusive, em cada episódio, que também é disponibilizado no canal oficial da Samsung Brasil no YouTube, as pessoas podem interagir e comprar produtos da série.',
    'Redação Dorama Hub',
    '2025-08-14T16:22:07.484Z',
    true,
    1,
    'Samsung lança primeiro K-Drama original "Tudo Sob Controle" em parceria com Globoplay. Série gravada em São Paulo já está disponível na plataforma.'
);

-- Create some additional sample articles for testing
INSERT INTO news_articles (
    status,
    title,
    slug,
    tags,
    cover_image_url,
    html_content,
    plain_text_content,
    author_name,
    published_at,
    is_featured,
    featured_order,
    meta_description
) VALUES 
(
    'published',
    'Netflix anuncia nova temporada de "Kingdom" para 2025',
    'netflix-kingdom-nova-temporada-2025',
    ARRAY['K-Drama', 'Lançamentos', 'Netflix'],
    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=400&fit=crop',
    '<p>A Netflix confirmou oficialmente que a aguardada nova temporada de "Kingdom" chegará em 2025. A série de zumbis ambientada na Coreia do período Joseon conquistou fãs ao redor do mundo.</p><p>O diretor Kim Seong-hun retorna para dirigir os novos episódios, prometendo ainda mais ação e suspense. O elenco original também está confirmado para retornar.</p>',
    'A Netflix confirmou oficialmente que a aguardada nova temporada de "Kingdom" chegará em 2025. A série de zumbis ambientada na Coreia do período Joseon conquistou fãs ao redor do mundo. O diretor Kim Seong-hun retorna para dirigir os novos episódios, prometendo ainda mais ação e suspense. O elenco original também está confirmado para retornar.',
    'Redação Dorama Hub',
    NOW() - INTERVAL '2 days',
    true,
    2,
    'Netflix confirma nova temporada de Kingdom para 2025 com diretor e elenco originais retornando.'
),
(
    'published',
    'Song Hye-kyo confirma participação em novo drama romântico',
    'song-hye-kyo-novo-drama-romantico',
    ARRAY['Atores', 'K-Drama', 'Lançamentos'],
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=400&fit=crop',
    '<p>A atriz Song Hye-kyo, conhecida por "Descendants of the Sun" e "The Glory", confirmou sua participação em um novo drama romântico que estreará no segundo semestre de 2025.</p><p>O drama ainda não teve seu título revelado, mas promete ser uma produção de alto orçamento com locações internacionais.</p>',
    'A atriz Song Hye-kyo, conhecida por "Descendants of the Sun" e "The Glory", confirmou sua participação em um novo drama romântico que estreará no segundo semestre de 2025. O drama ainda não teve seu título revelado, mas promete ser uma produção de alto orçamento com locações internacionais.',
    'Redação Dorama Hub',
    NOW() - INTERVAL '1 day',
    false,
    0,
    'Song Hye-kyo confirma novo drama romântico para 2025 com produção de alto orçamento.'
);

-- Update the news setup guide
UPDATE news_articles SET 
    tags = ARRAY(
        SELECT name FROM article_tags 
        WHERE name = ANY(tags)
    )
WHERE id IN (
    SELECT id FROM news_articles 
    WHERE tags IS NOT NULL
);