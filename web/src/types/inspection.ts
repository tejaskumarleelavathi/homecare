export interface InspectionItem {
  work_category_id: number;
  home_id: number;
  category_name: string;
  category_item: string;
  category_description: string;
  date: string;
  work_status_id: number | null;
  work_photo_pah_1: string | null;
  work_photo_pah_2: string | null;
  work_photo_pah_3: string | null;
  is_original_schedule: number;
  created_at: string;
  updated_at: string;
}

export interface InspectionDayView {
  date: string;
  today: string;
  items: InspectionItem[];
  isFuture: boolean;
  isPast: boolean;
  isToday: boolean;
  isOriginalProtected: boolean;
  canEditItems: boolean;
  canDeleteDay: boolean;
  canRescheduleDay: boolean;
  canScheduleNew: boolean;
}

export interface InspectionItemUpdate {
  work_status_id: number | null;
  work_photo_pah_1?: string;
  work_photo_pah_2?: string;
  work_photo_pah_3?: string;
}
