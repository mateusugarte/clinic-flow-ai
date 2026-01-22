export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_configs: {
        Row: {
          addresses: Json | null
          agent_name: string | null
          allow_upsell: boolean | null
          Aut1: number | null
          Aut2: number | null
          Aut3: number | null
          clinic_name: string | null
          connected_phone: string | null
          delay_policy: string | null
          human_handoff_criteria: string | null
          id: string
          instance_name: string | null
          negative_constraints: string | null
          opening_hours: string | null
          owner_name: string | null
          support_phone: string | null
          updated_at: string | null
          user_id: string
          whatsapp_connected: boolean | null
        }
        Insert: {
          addresses?: Json | null
          agent_name?: string | null
          allow_upsell?: boolean | null
          Aut1?: number | null
          Aut2?: number | null
          Aut3?: number | null
          clinic_name?: string | null
          connected_phone?: string | null
          delay_policy?: string | null
          human_handoff_criteria?: string | null
          id?: string
          instance_name?: string | null
          negative_constraints?: string | null
          opening_hours?: string | null
          owner_name?: string | null
          support_phone?: string | null
          updated_at?: string | null
          user_id: string
          whatsapp_connected?: boolean | null
        }
        Update: {
          addresses?: Json | null
          agent_name?: string | null
          allow_upsell?: boolean | null
          Aut1?: number | null
          Aut2?: number | null
          Aut3?: number | null
          clinic_name?: string | null
          connected_phone?: string | null
          delay_policy?: string | null
          human_handoff_criteria?: string | null
          id?: string
          instance_name?: string | null
          negative_constraints?: string | null
          opening_hours?: string | null
          owner_name?: string | null
          support_phone?: string | null
          updated_at?: string | null
          user_id?: string
          whatsapp_connected?: boolean | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          confirmacaoEnviada: boolean | null
          created_at: string | null
          duracao: number | null
          id: string
          lead_id: string
          no_show_risk: boolean | null
          notes: string | null
          patientName: string | null
          phoneNumber: number | null
          price: number | null
          professional_id: string
          professionalName: string | null
          scheduled_at: string
          service_id: string
          serviceName: string | null
          status: Database["public"]["Enums"]["appointment_status"] | null
          user_id: string
        }
        Insert: {
          confirmacaoEnviada?: boolean | null
          created_at?: string | null
          duracao?: number | null
          id?: string
          lead_id: string
          no_show_risk?: boolean | null
          notes?: string | null
          patientName?: string | null
          phoneNumber?: number | null
          price?: number | null
          professional_id: string
          professionalName?: string | null
          scheduled_at: string
          service_id: string
          serviceName?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
          user_id: string
        }
        Update: {
          confirmacaoEnviada?: boolean | null
          created_at?: string | null
          duracao?: number | null
          id?: string
          lead_id?: string
          no_show_risk?: boolean | null
          notes?: string | null
          patientName?: string | null
          phoneNumber?: number | null
          price?: number | null
          professional_id?: string
          professionalName?: string | null
          scheduled_at?: string
          service_id?: string
          serviceName?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          agendamentoFeito: boolean | null
          created_at: string | null
          email: string | null
          ia: string | null
          id: string
          last_interaction: string | null
          name: string
          notes: string | null
          phone: string
          qualification:
            | Database["public"]["Enums"]["lead_qualification"]
            | null
          tags: string[] | null
          tempo_economizado: number | null
          user_id: string
        }
        Insert: {
          agendamentoFeito?: boolean | null
          created_at?: string | null
          email?: string | null
          ia?: string | null
          id?: string
          last_interaction?: string | null
          name: string
          notes?: string | null
          phone: string
          qualification?:
            | Database["public"]["Enums"]["lead_qualification"]
            | null
          tags?: string[] | null
          tempo_economizado?: number | null
          user_id: string
        }
        Update: {
          agendamentoFeito?: boolean | null
          created_at?: string | null
          email?: string | null
          ia?: string | null
          id?: string
          last_interaction?: string | null
          name?: string
          notes?: string | null
          phone?: string
          qualification?:
            | Database["public"]["Enums"]["lead_qualification"]
            | null
          tags?: string[] | null
          tempo_economizado?: number | null
          user_id?: string
        }
        Relationships: []
      }
      professionals: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          interval_min: number | null
          is_active: boolean
          name: string
          service_ids: string[]
          start_time: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_time?: string
          id?: string
          interval_min?: number | null
          is_active?: boolean
          name: string
          service_ids?: string[]
          start_time?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          interval_min?: number | null
          is_active?: boolean
          name?: string
          service_ids?: string[]
          start_time?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          category: Database["public"]["Enums"]["service_category"] | null
          contraindications: string | null
          created_at: string | null
          description: string | null
          duration: number
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          possible_reactions: string | null
          price: number
          products_used: string | null
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["service_category"] | null
          contraindications?: string | null
          created_at?: string | null
          description?: string | null
          duration: number
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          possible_reactions?: string | null
          price: number
          products_used?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["service_category"] | null
          contraindications?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          possible_reactions?: string | null
          price?: number
          products_used?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      appointment_status:
        | "pendente"
        | "confirmado"
        | "risco"
        | "cancelado"
        | "atendido"
      lead_qualification:
        | "entrou_em_contato"
        | "respondendo_duvidas"
        | "repassando_disponibilidade"
        | "fez_agendamento"
        | "repassado_atendimento"
      service_category: "Preventivo" | "Restaurador" | "Estético" | "Cirúrgico"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status: [
        "pendente",
        "confirmado",
        "risco",
        "cancelado",
        "atendido",
      ],
      lead_qualification: [
        "entrou_em_contato",
        "respondendo_duvidas",
        "repassando_disponibilidade",
        "fez_agendamento",
        "repassado_atendimento",
      ],
      service_category: ["Preventivo", "Restaurador", "Estético", "Cirúrgico"],
    },
  },
} as const
