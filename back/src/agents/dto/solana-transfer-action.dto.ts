import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SolanaTransferActionDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, {
    message: 'recipient debe ser una public key valida de Solana',
  })
  recipient!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,9})?$/, {
    message: 'amountSol debe ser un decimal positivo con hasta 9 decimales',
  })
  amountSol!: string;
}
