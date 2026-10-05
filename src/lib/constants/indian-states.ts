// Pure client-safe list of Indian States & Union Territories with baseline shipping zones and suggested rates
export interface IndianStatePreset {
  state: string;
  defaultFee: number;
  defaultDays: string;
  zone: string;
}

export const ALL_INDIAN_STATES: IndianStatePreset[] = [
  { state: "Maharashtra", defaultFee: 50, defaultDays: "1-2 Days", zone: "West / Local Hub" },
  { state: "Gujarat", defaultFee: 60, defaultDays: "1-2 Days", zone: "West" },
  { state: "Goa", defaultFee: 65, defaultDays: "1-2 Days", zone: "West" },
  { state: "Madhya Pradesh", defaultFee: 70, defaultDays: "2-3 Days", zone: "Central" },
  { state: "Chhattisgarh", defaultFee: 75, defaultDays: "2-3 Days", zone: "Central" },
  { state: "Delhi", defaultFee: 70, defaultDays: "2-3 Days", zone: "North" },
  { state: "Haryana", defaultFee: 70, defaultDays: "2-3 Days", zone: "North" },
  { state: "Punjab", defaultFee: 75, defaultDays: "2-4 Days", zone: "North" },
  { state: "Rajasthan", defaultFee: 70, defaultDays: "2-3 Days", zone: "North" },
  { state: "Uttar Pradesh", defaultFee: 75, defaultDays: "2-4 Days", zone: "North" },
  { state: "Uttarakhand", defaultFee: 85, defaultDays: "3-4 Days", zone: "North" },
  { state: "Himachal Pradesh", defaultFee: 95, defaultDays: "3-5 Days", zone: "North" },
  { state: "Jammu & Kashmir", defaultFee: 120, defaultDays: "4-6 Days", zone: "North" },
  { state: "Karnataka", defaultFee: 75, defaultDays: "2-3 Days", zone: "South" },
  { state: "Telangana", defaultFee: 75, defaultDays: "2-3 Days", zone: "South" },
  { state: "Andhra Pradesh", defaultFee: 80, defaultDays: "2-4 Days", zone: "South" },
  { state: "Tamil Nadu", defaultFee: 80, defaultDays: "2-4 Days", zone: "South" },
  { state: "Kerala", defaultFee: 85, defaultDays: "2-4 Days", zone: "South" },
  { state: "West Bengal", defaultFee: 85, defaultDays: "3-4 Days", zone: "East" },
  { state: "Bihar", defaultFee: 85, defaultDays: "3-4 Days", zone: "East" },
  { state: "Jharkhand", defaultFee: 85, defaultDays: "3-4 Days", zone: "East" },
  { state: "Odisha", defaultFee: 85, defaultDays: "3-4 Days", zone: "East" },
  { state: "Assam", defaultFee: 110, defaultDays: "3-5 Days", zone: "North East" },
  { state: "Sikkim", defaultFee: 110, defaultDays: "4-5 Days", zone: "North East" },
  { state: "Meghalaya", defaultFee: 120, defaultDays: "4-6 Days", zone: "North East" },
  { state: "Arunachal Pradesh", defaultFee: 125, defaultDays: "4-6 Days", zone: "North East" },
  { state: "Manipur", defaultFee: 125, defaultDays: "4-6 Days", zone: "North East" },
  { state: "Mizoram", defaultFee: 125, defaultDays: "4-6 Days", zone: "North East" },
  { state: "Nagaland", defaultFee: 125, defaultDays: "4-6 Days", zone: "North East" },
  { state: "Tripura", defaultFee: 125, defaultDays: "4-6 Days", zone: "North East" },
  { state: "Chandigarh", defaultFee: 70, defaultDays: "2-3 Days", zone: "Union Territory" },
  { state: "Puducherry", defaultFee: 80, defaultDays: "2-4 Days", zone: "Union Territory" },
  { state: "Ladakh", defaultFee: 130, defaultDays: "5-7 Days", zone: "Union Territory" },
  { state: "Andaman & Nicobar Islands", defaultFee: 150, defaultDays: "5-7 Days", zone: "Islands" },
];
