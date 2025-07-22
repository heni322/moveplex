import { SetMetadata } from '@nestjs/common';
import { UserType } from 'src/database/entities/user.entity';

export const Roles = (...roles: UserType[]) => SetMetadata('roles', roles);