export type PersonCategory =
  | 'Música'
  | 'Cinema'
  | 'TV'
  | 'Streaming'
  | 'Esportes'
  | 'Moda'
  | 'Beleza'
  | 'Creator'
  | 'Influenciador'
  | 'Cultura'
  | 'Política'
  | 'Direitos Humanos'
  | 'Negócios'
  | 'Outro';

export type Priority = 'Alta' | 'Média' | 'Baixa';

export interface Person {
  id: string;
  name: string;
  aliases: string[];
  category: PersonCategory;
  country: string | null;
  priority: Priority;
  topics: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
  last_news_at?: string | null;
}

export type Classification = 'HOT' | 'WATCH' | 'DISCARD';
export type NewsStatus = 'Nova' | 'Lida' | 'Salva' | 'Descartada';

export interface NewsItem {
  id: string;
  person_id: string;
  person_name?: string;
  title: string;
  summary: string;
  source_name: string;
  source_url: string;
  sources: { name: string; url: string }[] | null;
  published_at: string | null;
  found_at: string;
  category: PersonCategory | string;
  relevance_score: number;
  classification: Classification;
  status: NewsStatus;
  why_it_matters: string;
  recommended_format: string[];
  is_duplicate: boolean;
  duplicate_of: string | null;
  is_alert: boolean;
  alert_reason: string | null;
  created_at: string;
}

export interface RadarRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'success' | 'error' | 'partial';
  people_checked: number;
  news_found: number;
  hot_count: number;
  watch_count: number;
  error_message: string | null;
}

export interface DailyDigest {
  run: RadarRun | null;
  topThree: NewsItem[];
  hot: NewsItem[];
  watch: NewsItem[];
  alerts: NewsItem[];
}
