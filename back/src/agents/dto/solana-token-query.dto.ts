import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SolanaTokenQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  token!: string;
}
