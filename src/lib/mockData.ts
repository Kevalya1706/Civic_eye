export type TicketCategory = 'Pothole' | 'Pole Fault' | 'Water Leak' | 'Waste Overflow' | 'Drainage Block' | 'Road Damage';
export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Suspicious';
export type Department = 'Road Dept' | 'Electricity' | 'Water & Sewage' | 'Waste Management' | 'Drainage';

export interface Ticket {
  id: string;
  photoUrl: string;
  fixedPhotoUrl?: string;
  category: TicketCategory;
  department: Department;
  lat: number;
  lng: number;
  address: string;
  description: string;
  priorityScore: number;
  status: TicketStatus;
  upvotes: number;
  userId: string;
  userName: string;
  userTrustScore: number;
  createdAt: string;
  resolvedAt?: string;
  nearSchoolOrHospital: boolean;
}

export interface User {
  id: string;
  name: string;
  trustScore: number;
  role: 'Citizen' | 'Admin';
  civicPoints: number;
  ticketsReported: number;
  ticketsVerified: number;
  badge: string;
}

const CATEGORIES_BY_DEPT: Record<Department, TicketCategory[]> = {
  'Road Dept': ['Pothole', 'Road Damage'],
  'Electricity': ['Pole Fault'],
  'Water & Sewage': ['Water Leak'],
  'Waste Management': ['Waste Overflow'],
  'Drainage': ['Drainage Block'],
};

export const DEPARTMENTS: Department[] = ['Road Dept', 'Water & Sewage', 'Electricity', 'Waste Management', 'Drainage'];

export function getDepartmentForCategory(cat: TicketCategory): Department {
  for (const [dept, cats] of Object.entries(CATEGORIES_BY_DEPT)) {
    if ((cats as TicketCategory[]).includes(cat)) return dept as Department;
  }
  return 'Road Dept';
}

export function calculatePriorityScore(ticket: { nearSchoolOrHospital: boolean; upvotes: number; createdAt: string }): number {
  const popDensity = 0.6 + Math.random() * 0.4;
  const risk = 0.3 + Math.random() * 0.7;
  const traffic = 0.4 + Math.random() * 0.6;
  const proximity = ticket.upvotes > 3 ? 0.9 : 0.3 + Math.random() * 0.5;
  const ageHours = (Date.now() - new Date(ticket.createdAt).getTime()) / 3600000;
  const ageFactor = Math.min(ageHours / 168, 1);

  let S = 0.2 * popDensity + 0.4 * risk + 0.2 * traffic + 0.1 * proximity + 0.1 * ageFactor;
  if (ticket.nearSchoolOrHospital) S *= 1.5;
  return Math.min(Math.round(S * 100), 100);
}

export const mockTickets: Ticket[] = [
  {
    id: 'T001', photoUrl: '', category: 'Pothole', department: 'Road Dept',
    lat: 18.5204, lng: 73.8567, address: 'FC Road, Pune',
    description: 'Large pothole causing traffic hazard near Fergusson College gate.',
    priorityScore: 87, status: 'Open', upvotes: 14, userId: 'U001',
    userName: 'Aarav Patel', userTrustScore: 85, createdAt: '2026-04-01T08:30:00Z',
    nearSchoolOrHospital: true,
  },
  {
    id: 'T002', photoUrl: '', category: 'Water Leak', department: 'Water & Sewage',
    lat: 18.5314, lng: 73.8446, address: 'JM Road, Pune',
    description: 'Continuous water leakage from main pipeline, wasting water for 3 days.',
    priorityScore: 72, status: 'In Progress', upvotes: 8, userId: 'U002',
    userName: 'Priya Sharma', userTrustScore: 92, createdAt: '2026-03-30T14:15:00Z',
    nearSchoolOrHospital: false,
  },
  {
    id: 'T003', photoUrl: '', category: 'Pole Fault', department: 'Electricity',
    lat: 18.5073, lng: 73.8077, address: 'Karve Nagar, Pune',
    description: 'Electric pole tilting dangerously. Sparking observed at night.',
    priorityScore: 95, status: 'Open', upvotes: 22, userId: 'U003',
    userName: 'Rohan Deshmukh', userTrustScore: 78, createdAt: '2026-03-29T22:00:00Z',
    nearSchoolOrHospital: true,
  },
  {
    id: 'T004', photoUrl: '', category: 'Waste Overflow', department: 'Waste Management',
    lat: 18.5362, lng: 73.8956, address: 'Kharadi, Pune',
    description: 'Garbage bins overflowing for a week. Stray animals spreading waste.',
    priorityScore: 58, status: 'Open', upvotes: 5, userId: 'U004',
    userName: 'Sneha Kulkarni', userTrustScore: 65, createdAt: '2026-04-02T06:45:00Z',
    nearSchoolOrHospital: false,
  },
  {
    id: 'T005', photoUrl: '', category: 'Drainage Block', department: 'Drainage',
    lat: 18.5089, lng: 73.8259, address: 'Sinhagad Road, Pune',
    description: 'Blocked drainage causing waterlogging during rain. Road is flooded.',
    priorityScore: 68, status: 'Open', upvotes: 11, userId: 'U005',
    userName: 'Vikram Joshi', userTrustScore: 88, createdAt: '2026-04-01T16:30:00Z',
    nearSchoolOrHospital: false,
  },
  {
    id: 'T006', photoUrl: '', category: 'Road Damage', department: 'Road Dept',
    lat: 18.4997, lng: 73.8677, address: 'MG Road, Camp, Pune',
    description: 'Road surface completely broken after recent construction work.',
    priorityScore: 45, status: 'Resolved', upvotes: 3, userId: 'U001',
    userName: 'Aarav Patel', userTrustScore: 85, createdAt: '2026-03-25T10:00:00Z',
    resolvedAt: '2026-03-28T14:00:00Z', nearSchoolOrHospital: false,
  },
];

export const mockUsers: User[] = [
  { id: 'U001', name: 'Aarav Patel', trustScore: 85, role: 'Citizen', civicPoints: 340, ticketsReported: 12, ticketsVerified: 8, badge: 'Trusted Reporter' },
  { id: 'U002', name: 'Priya Sharma', trustScore: 92, role: 'Citizen', civicPoints: 520, ticketsReported: 18, ticketsVerified: 15, badge: 'Civic Champion' },
  { id: 'U003', name: 'Rohan Deshmukh', trustScore: 78, role: 'Citizen', civicPoints: 210, ticketsReported: 7, ticketsVerified: 4, badge: 'Active Reporter' },
  { id: 'U004', name: 'Sneha Kulkarni', trustScore: 65, role: 'Citizen', civicPoints: 120, ticketsReported: 4, ticketsVerified: 2, badge: 'New Contributor' },
  { id: 'U005', name: 'Vikram Joshi', trustScore: 88, role: 'Citizen', civicPoints: 410, ticketsReported: 15, ticketsVerified: 11, badge: 'Trusted Reporter' },
];

export const leaderboard = [...mockUsers].sort((a, b) => b.civicPoints - a.civicPoints);
