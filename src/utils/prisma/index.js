import { PrismaClient } from '@prisma/client';

//prisma 작동 시 콘솔에 찍힐 로그를 설정
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  errorFormat: 'pretty',
});
