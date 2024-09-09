import express from 'express';
import { prisma } from '../utils/prisma/index.js';

const router = express.Router();

router.post('/scarecrow/:characterId', async (req, res, next) => {
  const { characterId } = req.params;
  const character = await prisma.characters.findFirst({
    where: { characterId: +characterId },
  });
  if (!character) {
    return res.status(404).json({ message: '캐릭터가 존재하지 않습니다.' });
  }
  const inventory = await prisma.inventory.findFirst({
    where: { characterId: +characterId },
  });
  const result = await prisma.$transaction(async (tx) => {
    await tx.inventory.update({
      data: { money: inventory.money + 100 },
      where: { characterId: +characterId },
    });
  });
  return res.status(201).json({
    message: `당신은 허수아비를 공격했고 까마귀가 고마워하며 반짝이는 것 들을 들고왔다 money: +100`,
  });
});

export default router;
