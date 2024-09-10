import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

//캐릭터의 인벤토리 조회, 토큰 인증 필요
router.get(
  '/inventory/:characterId',
  authMiddleware,
  async (req, res, next) => {
    try {
      //토큰의 userId와 주소로 받아온 캐릭터의 userId비교
      const userId = req.user.userId;
      const { characterId } = req.params;
      const character = await prisma.characters.findFirst({
        where: { characterId: +characterId },
      });

      //userId비교 시 다를경우 에러응답
      if (userId !== character.userId) {
        return res
          .status(403)
          .json({ message: '유효한 액세스토큰이 아닙니다.' });
      }

      //캐릭터id로 인벤토리id 조회
      const inventory = await prisma.inventory.findFirst({
        where: { characterId: +characterId },
      });

      //인벤토리id로 슬롯 조회
      const inventorySlot = await prisma.inventorySlot.findMany({
        select: {
          slotNumber: true,
          itemId: true,
          quantity: true,
        },
        where: { inventoryId: inventory.inventoryId },
      });

      //인벤토리슬롯 값을 응답으로 내보냄
      return res.status(200).json({ inventorySlot, money: inventory.money });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
