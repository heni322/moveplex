import { UserType } from '../enums/user-types.enum';

export interface TokenPayload {
  sub: string;
  email: string;
  userType: UserType;
  iat?: number;
  exp?: number;
}
