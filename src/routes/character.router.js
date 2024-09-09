import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/character/create', authMiddleware, async (req, res, next) => {
  try {
    const { name } = req.body;
    const userId = req.user.userId;

    const character_create = await prisma.$transaction(
      async (tx) => {
        const character = await tx.characters.create({
          data: {
            userId: userId,
            name,
            state: {
              health: 500,
              power: 100,
            },
          },
        });
        const inventory = await tx.inventory.create({
          data: {
            characterId: character.characterId,
            money: 10000,
          },
        });

        const equipment = await tx.equipment.create({
          data: {
            characterId: character.characterId,
          },
        });

        const promise_for = [];

        for (let i = 0; i < inventory.maxSlots; i++) {
          promise_for.push(
            tx.inventorySlot.create({
              data: {
                inventoryId: inventory.inventoryId,
                slotNumber: i + 1,
              },
            })
          );
        }
        await Promise.all(promise_for);

        return character;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    return res.status(201).json({
      message: `ID:${character_create.characterId} name:${name} 캐릭터 생성이 완료되었습니다`,
    });
  } catch (err) {
    next(err);
  }
});

router.delete(
  '/character/delete/:characterId',
  authMiddleware,
  async (req, res, next) => {
    try {
      const { characterId } = req.params;
      const del_Id = await prisma.characters.findFirst({
        where: { characterId: +characterId },
      });

      if (!del_Id) {
        return res.status(404).json({ message: '캐릭터가 존재하지 않습니다.' });
      }

      if (del_Id.userId !== req.user.userId) {
        return res.status(403).json({ message: '유효한 토큰이 아닙니다.' });
      }

      const character_delete = await prisma.$transaction(async (tx) => {
        const character = await tx.characters.delete({
          where: { characterId: +characterId },
        });
      });
      return res.status(200).json({ message: '캐릭터가 삭제되었습니다.' });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/character/check/:characterId',
  async (req, res, next) => {
    const { authorization } = req.headers;
    const { characterId } = req.params;
    const character = await prisma.characters.findFirst({
      where: { characterId: +characterId },
      select: {
        characterId: true,
        name: true,
        state: true,
        userId: true,
      },
    });
    if (!character) {
      return res.status(404).json({ message: '캐릭터가 존재하지 않습니다.' });
    }
    if (!authorization) {
      return res.status(200).json({ data: character });
    }
    req.character = character;
    authMiddleware(req, res, next);
  },
  async (req, res, next) => {
    if (req.user.userId !== req.character.userId) {
      return res.status(403).json({ message: '유효한 토큰이 아닙니다.' });
    }
    const inventory = await prisma.inventory.findFirst({
      where: { characterId: req.character.characterId },
      select: {
        money: true,
      },
    });
    return res.status(200).json({
      data: {
        ...req.character,
        money: inventory.money,
      },
    });
  }
);

export default router;
