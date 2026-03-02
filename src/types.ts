export interface Product {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  notes: string;
  photo_front: string | null;
  photo_back: string | null;
  created_at: string;
}

export interface AppConfig {
  driveLink?: string;
  locked?: boolean;
}
