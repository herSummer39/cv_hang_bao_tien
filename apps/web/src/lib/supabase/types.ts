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
      industries: {
        Row: {
          id: string;
          parent_id: string | null;
          level: "group" | "branch";
          name: string;
          slug: string;
          sort_order: number | null;
          created_at: string;
        };
        Insert: {
          parent_id?: string | null;
          level: "group" | "branch";
          name: string;
          slug: string;
          sort_order?: number | null;
        };
        Update: {
          name?: string;
          slug?: string;
          sort_order?: number | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          plan: "free" | "pro";
          cv_count: number;
          preferred_industry_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          plan?: "free" | "pro";
          cv_count?: number;
          preferred_industry_id?: string | null;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
          plan?: "free" | "pro";
          preferred_industry_id?: string | null;
        };
      };
      analysis_jobs: {
        Row: {
          id: string;
          user_id: string | null;
          cv_text: string | null;
          cv_b64: string | null;
          cv_filename: string | null;
          jd_text: string;
          job_title: string | null;
          industry_id: string | null;
          status: "pending" | "processing" | "done" | "error";
          result: Json | null;
          error_msg: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id?: string | null;
          cv_text?: string | null;
          cv_b64?: string | null;
          cv_filename?: string | null;
          jd_text: string;
          job_title?: string | null;
          industry_id?: string | null;
          status?: "pending" | "processing" | "done" | "error";
        };
        Update: {
          status?: "pending" | "processing" | "done" | "error";
          result?: Json | null;
          error_msg?: string | null;
          industry_id?: string | null;
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
          analysis_job_id: string | null;
          job_title: string | null;
          candidate_name: string | null;
          questions: Json;
          answers: Json;
          status: "in_progress" | "completed" | "abandoned";
          total_score: number | null;
          summary: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          cv_session_id?: string | null;
          analysis_job_id?: string | null;
          job_title?: string | null;
          candidate_name?: string | null;
          questions: Json;
          answers?: Json;
          status?: "in_progress" | "completed" | "abandoned";
          total_score?: number | null;
          summary?: string | null;
          completed_at?: string | null;
        };
        Update: {
          questions?: Json;
          answers?: Json;
          status?: "in_progress" | "completed" | "abandoned";
          total_score?: number | null;
          summary?: string | null;
          completed_at?: string | null;
        };
      };
    };
  };
}
