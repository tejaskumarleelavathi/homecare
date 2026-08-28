export interface Home {
  home_id: number;
  street: string;
  city: string;
  state: string;
  zip_code: string;
  emails: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface HomeInput {
  street: string;
  city: string;
  state: string;
  zip_code: string;
  emails: string;
  notes: string;
}
