import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(1)
  username!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class HiddenDto {
  @IsBoolean()
  hidden!: boolean;
}

export class SizeOptionDto {
  @IsString()
  id!: string;

  @IsString()
  label!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsNumber()
  priceDelta?: number;
}

export class CustomSizeDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  minWidthCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minHeightCm?: number;

  @IsNumber()
  @Min(0)
  maxWidthCm!: number;

  @IsNumber()
  @Min(0)
  maxHeightCm!: number;

  @IsNumber()
  @Min(0)
  basePrice!: number;
}

export class DeliveryInfoDto {
  @IsString()
  label!: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsNumber()
  fee!: number | null;
}

export class UpsertProductDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1)
  slug!: string;

  @IsIn(['trykk', 'skilt', 'storformat', 'messe'])
  category!: 'trykk' | 'skilt' | 'storformat' | 'messe';

  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  description!: string;

  @IsString()
  imageUrl!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SizeOptionDto)
  sizes!: SizeOptionDto[];

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @ValidateNested()
  @Type(() => CustomSizeDto)
  customSize?: CustomSizeDto | null;

  @ValidateNested()
  @Type(() => DeliveryInfoDto)
  delivery!: DeliveryInfoDto;

  @IsString()
  leadTime!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minQuantity?: number | null;

  @IsOptional()
  @IsBoolean()
  hidden?: boolean;
}

export class UpsertArticleDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1)
  slug!: string;

  @IsString()
  titleNb!: string;

  @IsString()
  titleEn!: string;

  @IsString()
  excerptNb!: string;

  @IsString()
  excerptEn!: string;

  @IsString()
  bodyNb!: string;

  @IsString()
  bodyEn!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  hidden?: boolean;
}

export class DeliverySettingsDto {
  @IsString()
  defaultLabel!: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsNumber()
  defaultFee!: number | null;
}
