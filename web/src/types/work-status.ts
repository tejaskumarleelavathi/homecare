export interface WorkStatus {
  work_status_id: number;
  status_name: string;
  status_description: string;
  created_at: string;
  updated_at: string;
}

export interface WorkStatusInput {
  status_name: string;
  status_description: string;
}
