import type { TicketRow } from "@/hooks/useTickets";

const COST_MAP: Record<string, number> = {
  Pothole: 1500,
  "Pole Fault": 5000,
  "Water Leak": 3000,
  "Waste Overflow": 800,
  "Drainage Block": 2500,
  "Road Damage": 4000,
};

export function getTicketCost(category: string): number {
  return COST_MAP[category] || 1500;
}

export function getTotalRepairedValue(tickets: TicketRow[]): number {
  return tickets
    .filter(t => t.status === "Resolved")
    .reduce((sum, t) => sum + getTicketCost(t.category), 0);
}

export function formatCurrency(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
}
