export interface Activity {
  time: string;
  name: string;
  type: '景点' | '餐饮' | '交通' | '住宿' | '购物' | '其他';
  description?: string;
  cost: number;
  location?: string;
}

export interface DayPlan {
  day: number;
  theme?: string;
  activities: Activity[];
  dailyCost: number;
}

export interface Itinerary {
  destination: string;
  totalDays: number;
  totalBudget: number;
  estimatedCost: number;
  travelers?: number;
  summary?: string;
  days: DayPlan[];
  tips?: string[];
}

export interface ItineraryRecord {
  id: string;
  shareToken: string | null;
  deviceId: string;
  destination: string;
  totalDays: number;
  content: Itinerary;
  createdAt: string;
  updatedAt: string;
}

export interface ItinerarySummary {
  id: string;
  destination: string;
  totalDays: number;
  createdAt: string;
}

export interface SaveResponse {
  id: string;
  shareToken: string | null;
}

export interface ShareResponse {
  shareLink: string;
  shareToken: string;
}
