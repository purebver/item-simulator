import express from 'express';
import { prisma } from '../utils/prisma/index.js';

import { Prisma } from '@prisma/client';

const router = express.Router();

router.post('/scarecrow/:characterId', async (req, res, next) => {
  try {
    //주소에서 캐릭터id를 받아옴
    const { characterId } = req.params;

    //캐릭터 조회
    const character = await prisma.characters.findFirst({
      where: { characterId: +characterId },
    });

    //캐릭터id로 인벤토리 조회(money가 인벤토리의 필드)
    const inventory = await prisma.inventory.findFirst({
      where: { characterId: character.characterId },
    });

    //트랜잭션
    const result = await prisma.$transaction(
      async (tx) => {
        //money추가
        await tx.inventory.update({
          data: { money: inventory.money + 100 },
          where: { characterId: character.characterId },
        });
      },
      //ReadCommitted을 설정으로 위 트랜잭션이 실행 중에는 커밋된 데이터만 읽어오게함.
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    //money가 얼마나 늘어났는지 응답으로 보냄
    return res.status(201).json({
      message: `당신은 허수아비를 공격했고 까마귀가 고마워하며 반짝이는 것 들을 들고왔다 money: +100`,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
