export interface CustomCollection {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  is_visible: boolean;
  display_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  drama_count?: number;
}

export interface CustomCollectionDrama {
  id: string;
  collection_id: string;
  drama_id: number;
  drama_title: string;
  drama_poster_url: string | null;
  drama_year: number | null;
  display_order: number;
  added_at: string;
}

export interface HomepageCollection {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  display_order: number;
  drama_count: number;
  created_at: string;
}

export interface CollectionDrama {
  drama_id: number;
  drama_title: string;
  drama_poster_url: string | null;
  drama_year: number | null;
  display_order: number;
  added_at: string;
}