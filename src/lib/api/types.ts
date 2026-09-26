export type ApiOffer = {
  id: number;
  kicker: string | null;
  promo_title: string | null;
  model_line: string | null;
  powertrain: string | null;
  badge: string | null;
  group: string | null;
  body: string | null;
  summary: string | null;
  title: string | null;
  detail?: string | null;
  highlights?: string[] | null;
  facts?: { label?: string; value?: string }[] | null;
  is_featured: boolean;
  benefit_rank: number;
  is_liked: boolean;
  image_url: string | null;
  gallery: string[];
  valid_until: string | null;
  car: { id: number; full_name?: string } | null;
};

export type ApiHomeOffer = {
  id: number;
  accent_label: string | null;
  promo_title: string | null;
  valid_note: string | null;
  image_url: string | null;
};

export type ApiHome = {
  refer_banner: { title: string | null; image_url: string | null } | null;
  offers_for_you: ApiHomeOffer[];
};

export type ApiCar = {
  id: number;
  full_name: string;
  model: string;
  variant: string | null;
};

export type ApiCustomer = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  total_points: number;
  member_since: string | null;
};

export type ApiReferral = {
  id: number;
  status: string;
  referred_customer: { name: string; phone: string };
  interested_car: string | null;
  referral_date: string;
  reward: { type: string; value: number; status: string } | null;
};

export type ApiTestDrive = {
  id: number;
  car_id?: number;
  car: string;
  image_url?: string | null;
  location: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
};

export type ApiPoints = {
  total_points: number;
};

export type ApiRewards = {
  total_points: number;
  rewards: { reward_value: number; status: string }[];
};
