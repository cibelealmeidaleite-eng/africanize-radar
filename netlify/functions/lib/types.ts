export interface PersonRow {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  country: string | null;
  priority: 'Alta' | 'Média' | 'Baixa';
  topics: string[];
  active: boolean;
  last_news_at?: string | null;
}

export interface RawArticle {
  personId: string;
  personName: string;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string | null;
}

export interface CuratedItem {
  personName: string;
  title: string;
  summary: string;
  is_about_person: boolean;
  is_new: boolean;
  is_relevant: boolean;
  has_journalistic_potential: boolean;
  relevance_to_africanize: boolean;
  is_confirmed: boolean; // true = confirmed fact, false = rumor
  is_duplicate: boolean;
  classification: 'HOT' | 'WATCH' | 'DISCARD';
  score: number; // 0-10
  why_it_matters: string;
  recommended_format: string[];
  is_alert: boolean;
  alert_reason: string | null;
}
