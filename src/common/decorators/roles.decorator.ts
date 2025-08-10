import { SetMetadata } from '@nestjs/common';
import { UserType } from '../enums/user-types.enum';

export const Roles = (...roles: UserType[]) => SetMetadata('roles', roles);
