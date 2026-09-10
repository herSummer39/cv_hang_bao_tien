export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          plan: "free" | "pro";
          cv_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          plan?: "free" | "pro";
          cv_count?: number;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
          plan?: "free" | "pro";
        };
      };
      cv_sessions: {
        Row: {
          id: string;
          user_id: string;
          cv_filename: string;
          cv_file_path: string | null;
          cv_file_size: number | null;
          jd_text: string;
          jd_title: string | null;
          score: number | null;
          breakdown: Json | null;
          gap_analysis: string[] | null;
          suggestions: Json | null;
          raw_cv_text: string | null;
          parsed_cv: Json | null;
          status: "pending" | "processing" | "done" | "error";
          error_msg: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          cv_filename: string;
          cv_file_path?: string | null;
          cv_file_size?: number | null;
          jd_text: string;
          jd_title?: string | null;
          status?: "pending" | "processing" | "done" | "error";
        };
        Update: {
          score?: number | null;
          breakdown?: Json | null;
          gap_analysis?: string[] | null;
          suggestions?: Json | null;
          raw_cv_text?: string | null;
          parsed_cv?: Json | null;
          status?: "pending" | "processing" | "done" | "error";
          error_msg?: string | null;
        };
      };
      interview_sessions: {
        Row: {
          id: string;
          user_id: string;
          cv_session_id: string | null;
          questions: Json;
          total_score: number | null;
          summary: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          cv_session_id?: string | null;
          questions: Json;
          total_score?: number | null;
          summary?: string | null;
        };
        Update: {
          questions?: Json;
          total_score?: number | null;
          summary?: string | null;
        };
      };
    };
  };
}
