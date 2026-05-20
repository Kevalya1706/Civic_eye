import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContractorRow {
  id: string;
  name: string;
  company_name: string | null;
  lead_engineer_name: string | null;
  engineer_id: string | null;
  emergency_contact: string | null;
  department: string;
  ward: string;
  phone: string | null;
  email: string | null;
}

export const CONTRACTOR_FALLBACK = {
  company_name: "Apex Infrastructure Pvt. Ltd.",
  lead_engineer_name: "Rahul Sharma",
  engineer_id: "MNC-8842",
  emergency_contact: "+91 9823X XXXXX",
};

export function useContractor(contractorId: string | null | undefined) {
  return useQuery({
    queryKey: ["contractor", contractorId],
    queryFn: async () => {
      if (!contractorId) return null;
      const { data, error } = await supabase
        .from("contractors")
        .select("*")
        .eq("id", contractorId)
        .maybeSingle();
      if (error) throw error;
      return data as ContractorRow | null;
    },
    enabled: !!contractorId,
    staleTime: 5 * 60 * 1000,
  });
}
