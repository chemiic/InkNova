import { Equals, IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ContactDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsBoolean()
  @Equals(true)
  privacyConsent!: true;
}
