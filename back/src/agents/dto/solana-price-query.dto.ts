import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class SolanaPriceQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  token!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{3,10}$/i, {
    message: 'vsCurrency debe ser un codigo de moneda valido, por ejemplo usd',
  })
  vsCurrency = 'usd';
}
