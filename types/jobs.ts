export interface JobRecord {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  rotationPointer?: number;
  createdAt?: string;
}

export interface JobFormPayload {
  name: string;
  icon: string;
  description: string;
}
