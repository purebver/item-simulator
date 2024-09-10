import express from 'express';
import { prisma } from '../utils/prisma/index.js';

const router = express.Router();

router.post('/scarecrow/:characterId', async (req, res, next) => {
  try {
    const { characterId } = req.params;
    const character = await prisma.characters.findFirst({
      where: { characterId: +characterId },
    });
    const inventory = await prisma.inventory.findFirst({
      where: { characterId: character.characterId },
    });
    const result = await prisma.$transaction(async (tx) => {
      await tx.inventory.update({
        data: { money: inventory.money + 100 },
        where: { characterId: character.characterId },
      });
    });
    return res.status(201).json({
      message: `당신은 허수아비를 공격했고 까마귀가 고마워하며 반짝이는 것 들을 들고왔다 money: +100`,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
