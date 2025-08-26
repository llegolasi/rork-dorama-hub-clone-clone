export interface Actor {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
}

export interface ActorDetails extends Actor {
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  gender: number;
  also_known_as: string[];
}

export interface ActorCredits {
  cast: ActorCredit[];
}

export interface ActorCredit {
  id: number;
  name: string;
  original_name: string;
  character: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  episode_count: number;
  popularity?: number;
  origin_country?: string[];
}