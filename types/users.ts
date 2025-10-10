export type UserRole = "ADMIN" | "USER";

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}
