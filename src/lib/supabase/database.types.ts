export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          archived: boolean;
          created_at: string;
          id: string;
          initial_balance: number;
          name: string;
          type: Database["public"]["Enums"]["account_type"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          archived?: boolean;
          created_at?: string;
          id?: string;
          initial_balance?: number;
          name: string;
          type: Database["public"]["Enums"]["account_type"];
          user_id?: string;
        };
        Update: {
          archived?: boolean;
          created_at?: string;
          id?: string;
          initial_balance?: number;
          name?: string;
          type?: Database["public"]["Enums"]["account_type"];
          user_id?: string;
        };
        Relationships: [];
      };
      asset_trades: {
        Row: {
          asset_id: string;
          created_at: string;
          date: string;
          fees: number;
          id: string;
          price: number;
          quantity: number;
          type: Database["public"]["Enums"]["trade_type"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          asset_id: string;
          created_at?: string;
          date: string;
          fees?: number;
          id?: string;
          price: number;
          quantity: number;
          type: Database["public"]["Enums"]["trade_type"];
          user_id?: string;
        };
        Update: {
          asset_id?: string;
          created_at?: string;
          date?: string;
          fees?: number;
          id?: string;
          price?: number;
          quantity?: number;
          type?: Database["public"]["Enums"]["trade_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "asset_trades_asset_id_user_id_fkey";
            columns: ["asset_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      assets: {
        Row: {
          class: Database["public"]["Enums"]["asset_class"];
          created_at: string;
          currency: string;
          id: string;
          name: string;
          quote_id: string;
          quote_source: string;
          ticker: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          class: Database["public"]["Enums"]["asset_class"];
          created_at?: string;
          currency: string;
          id?: string;
          name: string;
          quote_id: string;
          quote_source: string;
          ticker: string;
          user_id?: string;
        };
        Update: {
          class?: Database["public"]["Enums"]["asset_class"];
          created_at?: string;
          currency?: string;
          id?: string;
          name?: string;
          quote_id?: string;
          quote_source?: string;
          ticker?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      budgets: {
        Row: {
          amount: number;
          category_id: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          category_id: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Update: {
          amount?: number;
          category_id?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_user_id_fkey";
            columns: ["category_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["category_kind"];
          name: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          kind: Database["public"]["Enums"]["category_kind"];
          name: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["category_kind"];
          name?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      fixed_income: {
        Row: {
          created_at: string;
          id: string;
          index: Database["public"]["Enums"]["fixed_income_index"];
          kind: Database["public"]["Enums"]["fixed_income_kind"];
          maturity_date: string | null;
          name: string;
          principal: number;
          rate: number;
          start_date: string;
          tax_exempt: boolean;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          index: Database["public"]["Enums"]["fixed_income_index"];
          kind: Database["public"]["Enums"]["fixed_income_kind"];
          maturity_date?: string | null;
          name: string;
          principal: number;
          rate: number;
          start_date: string;
          tax_exempt?: boolean;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          index?: Database["public"]["Enums"]["fixed_income_index"];
          kind?: Database["public"]["Enums"]["fixed_income_kind"];
          maturity_date?: string | null;
          name?: string;
          principal?: number;
          rate?: number;
          start_date?: string;
          tax_exempt?: boolean;
          user_id?: string;
        };
        Relationships: [];
      };
      index_rates: {
        Row: {
          date: string;
          series: string;
          value: number;
        };
        ComputedFields: never;
        Insert: {
          date: string;
          series: string;
          value: number;
        };
        Update: {
          date?: string;
          series?: string;
          value?: number;
        };
        Relationships: [];
      };
      index_sync: {
        Row: {
          series: string;
          synced_at: string;
          synced_from: string;
        };
        ComputedFields: never;
        Insert: {
          series: string;
          synced_at?: string;
          synced_from: string;
        };
        Update: {
          series?: string;
          synced_at?: string;
          synced_from?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          id: string;
          is_demo: boolean;
          name: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id: string;
          is_demo?: boolean;
          name?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_demo?: boolean;
          name?: string | null;
        };
        Relationships: [];
      };
      quotes: {
        Row: {
          change_percent: number | null;
          currency: string;
          fetched_at: string;
          logo_url: string | null;
          market_time: string | null;
          name: string | null;
          price: number;
          quote_id: string;
          source: string;
        };
        ComputedFields: never;
        Insert: {
          change_percent?: number | null;
          currency: string;
          fetched_at?: string;
          logo_url?: string | null;
          market_time?: string | null;
          name?: string | null;
          price: number;
          quote_id: string;
          source: string;
        };
        Update: {
          change_percent?: number | null;
          currency?: string;
          fetched_at?: string;
          logo_url?: string | null;
          market_time?: string | null;
          name?: string | null;
          price?: number;
          quote_id?: string;
          source?: string;
        };
        Relationships: [];
      };
      recurring_rules: {
        Row: {
          account_id: string;
          active: boolean;
          amount: number;
          category_id: string | null;
          created_at: string;
          day_of_month: number;
          description: string;
          end_date: string | null;
          generated_until: string | null;
          id: string;
          start_date: string;
          type: Database["public"]["Enums"]["transaction_type"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          active?: boolean;
          amount: number;
          category_id?: string | null;
          created_at?: string;
          day_of_month: number;
          description: string;
          end_date?: string | null;
          generated_until?: string | null;
          id?: string;
          start_date: string;
          type: Database["public"]["Enums"]["transaction_type"];
          user_id?: string;
        };
        Update: {
          account_id?: string;
          active?: boolean;
          amount?: number;
          category_id?: string | null;
          created_at?: string;
          day_of_month?: number;
          description?: string;
          end_date?: string | null;
          generated_until?: string | null;
          id?: string;
          start_date?: string;
          type?: Database["public"]["Enums"]["transaction_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recurring_rules_account_id_user_id_fkey";
            columns: ["account_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "account_balances";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "recurring_rules_account_id_user_id_fkey";
            columns: ["account_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "recurring_rules_category_id_user_id_fkey";
            columns: ["category_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      transactions: {
        Row: {
          account_id: string;
          amount: number;
          category_id: string | null;
          created_at: string;
          date: string;
          description: string;
          external_id: string | null;
          id: string;
          import_batch_id: string | null;
          notes: string | null;
          recurring_rule_id: string | null;
          transfer_account_id: string | null;
          type: Database["public"]["Enums"]["transaction_type"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          amount: number;
          category_id?: string | null;
          created_at?: string;
          date: string;
          description: string;
          external_id?: string | null;
          id?: string;
          import_batch_id?: string | null;
          notes?: string | null;
          recurring_rule_id?: string | null;
          transfer_account_id?: string | null;
          type: Database["public"]["Enums"]["transaction_type"];
          user_id?: string;
        };
        Update: {
          account_id?: string;
          amount?: number;
          category_id?: string | null;
          created_at?: string;
          date?: string;
          description?: string;
          external_id?: string | null;
          id?: string;
          import_batch_id?: string | null;
          notes?: string | null;
          recurring_rule_id?: string | null;
          transfer_account_id?: string | null;
          type?: Database["public"]["Enums"]["transaction_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_user_id_fkey";
            columns: ["account_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "account_balances";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "transactions_account_id_user_id_fkey";
            columns: ["account_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "transactions_category_id_user_id_fkey";
            columns: ["category_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "transactions_recurring_rule_id_user_id_fkey";
            columns: ["recurring_rule_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "recurring_rules";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "transactions_transfer_account_id_user_id_fkey";
            columns: ["transfer_account_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "account_balances";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "transactions_transfer_account_id_user_id_fkey";
            columns: ["transfer_account_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
    };
    Views: {
      account_balances: {
        Row: {
          archived: boolean | null;
          balance: number | null;
          created_at: string | null;
          id: string | null;
          initial_balance: number | null;
          name: string | null;
          transaction_count: number | null;
          type: Database["public"]["Enums"]["account_type"] | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      category_usage: {
        Row: {
          category_id: string | null;
          transaction_count: number | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
    };
    Functions: {
      budget_progress: {
        Args: { p_from: string; p_to: string };
        Returns: {
          amount: number;
          budget_id: string;
          category_id: string;
          category_name: string;
          spent: number;
        }[];
      };
      category_history: {
        Args: Record<PropertyKey, never>;
        Returns: {
          category_id: string;
          description: string;
          kind: Database["public"]["Enums"]["category_kind"];
          transaction_count: number;
        }[];
      };
      expense_category_totals: {
        Args: { p_from: string; p_to: string };
        Returns: {
          category_id: string;
          category_name: string;
          total: number;
          transaction_count: number;
        }[];
      };
      generate_my_recurring: { Args: { p_rule_id?: string }; Returns: number };
      monthly_totals: {
        Args: { p_from: string; p_to: string };
        Returns: {
          expenses: number;
          income: number;
          month: string;
        }[];
      };
    };
    Enums: {
      account_type: "checking" | "savings" | "wallet" | "credit_card";
      asset_class: "stock_br" | "fii" | "etf" | "stock_us" | "crypto";
      category_kind: "income" | "expense";
      fixed_income_index: "cdi" | "selic" | "pre" | "ipca";
      fixed_income_kind:
        | "cdb"
        | "lci_lca"
        | "tesouro_selic"
        | "tesouro_prefixado"
        | "tesouro_ipca"
        | "debenture"
        | "other";
      trade_type: "buy" | "sell";
      transaction_type: "income" | "expense" | "transfer";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      account_type: ["checking", "savings", "wallet", "credit_card"],
      asset_class: ["stock_br", "fii", "etf", "stock_us", "crypto"],
      category_kind: ["income", "expense"],
      fixed_income_index: ["cdi", "selic", "pre", "ipca"],
      fixed_income_kind: [
        "cdb",
        "lci_lca",
        "tesouro_selic",
        "tesouro_prefixado",
        "tesouro_ipca",
        "debenture",
        "other",
      ],
      trade_type: ["buy", "sell"],
      transaction_type: ["income", "expense", "transfer"],
    },
  },
} as const;
