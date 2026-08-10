import {
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CheckoutCustomerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phone!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  addressLine1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @IsString()
  @MinLength(4)
  @MaxLength(10)
  postalCode!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city!: string;
}

export class CheckoutLineItemDto {
  @IsString()
  productId!: string;

  @IsString()
  productSlug!: string;

  @IsString()
  sizeId!: string;

  @IsString()
  @MaxLength(100)
  sizeLabel!: string;

  @IsInt()
  @Min(1)
  qty!: number;

  @IsString()
  @MaxLength(200)
  designFileName!: string;
}

export class CreateOrderDto {
  @ValidateNested()
  @Type(() => CheckoutCustomerDto)
  customer!: CheckoutCustomerDto;

  @IsIn(['vipps', 'card'])
  paymentMethod!: 'vipps' | 'card';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutLineItemDto)
  items!: CheckoutLineItemDto[];
}
