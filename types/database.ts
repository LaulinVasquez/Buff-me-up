export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      gym_profiles: {
        Row: { avatar_url: string | null; created_at: string; full_name: string | null; id: string; updated_at: string };
        Insert: { avatar_url?: string | null; created_at?: string; full_name?: string | null; id: string; updated_at?: string };
        Update: { avatar_url?: string | null; created_at?: string; full_name?: string | null; id?: string; updated_at?: string };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
