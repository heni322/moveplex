import { User } from "src/database/entities/user.entity";

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: Partial<User>;
}
