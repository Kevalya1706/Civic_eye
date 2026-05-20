import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "./useSupabaseAuth";
import { useEffect } from "react";

export interface TicketRow {
  id: string;
  user_id: string;
  user_name: string;
  photo_url: string | null;
  fixed_photo_url: string | null;
  category: string;
  department: string;
  lat: number;
  lng: number;
  address: string;
  city: string | null;
  neighborhood: string | null;
  full_precise_address: string | null;
  description: string;
  priority_score: number;
  status: string;
  upvotes: number;
  user_trust_score: number;
  precision_tier: string | null;
  image_hash: string | null;
  near_school_or_hospital: boolean;
  created_at: string;
  resolved_at: string | null;
  admin_reviewed_at: string | null;
  crew_dispatched_at: string | null;
  nudge_count: number;
  last_nudged_at: string | null;
  assigned_contractor_id: string | null;
  assigned_at: string | null;
  sla_deadline: string | null;
  social_cost: number | null;
  traffic_density: number | null;
  ward: string | null;
  press_released_at: string | null;
  escalation_level: number | null;
}

export function useMyTickets() {
  const { userId } = useSupabaseAuth();
  const query = useQuery({
    queryKey: ["my-tickets", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TicketRow[];
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("my-tickets")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets", filter: `user_id=eq.${userId}` }, () => {
        query.refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return query;
}

export function useAllTickets() {
  const query = useQuery({
    queryKey: ["all-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("priority_score", { ascending: false });
      if (error) throw error;
      return data as TicketRow[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("all-tickets")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => {
        query.refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return query;
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ticket: {
      user_id: string;
      user_name: string;
      category: string;
      department: string;
      lat: number;
      lng: number;
      address: string;
      city?: string;
      neighborhood?: string;
      full_precise_address?: string;
      description: string;
      priority_score: number;
      precision_tier?: string;
      image_hash?: string;
      near_school_or_hospital?: boolean;
      user_trust_score?: number;
    }) => {
      const { data, error } = await supabase
        .from("tickets")
        .insert(ticket as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["all-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("tickets")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["all-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useUpvoteTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // First get current upvotes
      const { data: ticket } = await supabase.from("tickets").select("upvotes").eq("id", id).single();
      const { error } = await supabase
        .from("tickets")
        .update({ upvotes: (ticket?.upvotes || 0) + 1 } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-tickets"] });
    },
  });
}

export function useNudgeTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: ticket } = await supabase.from("tickets").select("nudge_count").eq("id", id).single();
      const { error } = await supabase
        .from("tickets")
        .update({ nudge_count: (ticket?.nudge_count || 0) + 1, last_nudged_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
    },
  });
}
