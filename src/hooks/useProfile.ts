import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "./useSupabaseAuth";
import { useEffect } from "react";

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  email: string | null;
  total_reported: number;
  total_verified: number;
  civic_points: number;
  trust_score: number;
  badge: string;
}

export function useProfile() {
  const { userId } = useSupabaseAuth();

  const query = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!userId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("profile-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${userId}` }, () => {
        query.refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return query;
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("civic_points", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Profile[];
    },
  });
}
