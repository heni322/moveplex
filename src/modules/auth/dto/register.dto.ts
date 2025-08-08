import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsPhoneNumber, IsDateString } from 'class-validator';
import { UserType } from 'src/common/enums/user-types.enum';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(UserType)
  role: UserType;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsPhoneNumber()
  phone: string;

  // Driver specific fields
  @IsOptional()
  @IsString()
  license_number?: string;
  
  @IsOptional()
  @IsDateString()
  license_expiry?: Date;

  // Rider specific fields
  @IsOptional()
  @IsString()
  payment_method?: string;
}