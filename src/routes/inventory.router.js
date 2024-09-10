import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get(
  '/inventory/:characterId',
  authMiddleware,
  async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const { characterId } = req.params;
      const character = await prisma.characters.findFirst({
        where: { characterId: +characterId },
      });
      if (userId !== character.userId) {
        return res
          .status(403)
          .json({ message: '유효한 액세스토큰이 아닙니다.' });
      }
      const inventory = await prisma.inventory.findFirst({
        where: { characterId: +characterId },
      });
      const inventorySlot = await prisma.inventorySlot.findMany({
        select: {
          slotNumber: true,
          itemId: true,
          quantity: true,
        },
        where: { inventoryId: inventory.inventoryId },
      });
      return res.status(200).json({ inventorySlot, money: inventory.money });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
