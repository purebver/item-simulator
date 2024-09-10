import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/equipment/:characterId', async (req, res, next) => {
  try {
    const { characterId } = req.params;
    const character = await prisma.characters.findFirst({
      where: { characterId: +characterId },
    });
    const equipment = await prisma.equipment.findFirst({
      where: { characterId: character.characterId },
      select: {
        arms: true,
        body: true,
        head: true,
        shoes: true,
        weapon: true,
      },
    });
    const arr = [];
    for (let key in equipment) {
      if (equipment[key] !== null) {
        arr.push(key);
      }
    }
    const result = {};
    for (let i = 0; i < arr.length; i++) {
      const item = await prisma.items.findFirst({
        where: { itemId: equipment[arr[i]] },
        select: {
          itemId: true,
          name: true,
          rarity: true,
          baseState: true,
        },
      });
      result[arr[i]] = item;
    }
    return res.status(200).json({ result });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/equipment/:characterId',
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
      const { slotNumber } = req.body;

      const inventory = await prisma.inventory.findFirst({
        where: { characterId: +characterId },
      });
      const inventorySlot = await prisma.inventorySlot.findFirst({
        where: {
          inventoryId: inventory.inventoryId,
          slotNumber,
        },
      });
      const item = await prisma.items.findFirst({
        where: { itemId: inventorySlot.itemId },
      });
      const equipment = await prisma.equipment.findFirst({
        where: { characterId: +characterId, [item.itemType]: null },
      });

      if (!equipment) {
        return res
          .status(400)
          .json({ message: '이미 그 부위에 장비를 장착하고 있습니다.' });
      }

      const result = await prisma.$transaction(
        async (tx) => {
          const slot_update = await tx.inventorySlot.update({
            data: {
              itemId:
                inventorySlot.quantity - 1 === 0 ? null : inventorySlot.itemId,
              quantity:
                inventorySlot.quantity - 1 === 0
                  ? null
                  : inventorySlot.quantity - 1,
            },
            where: {
              inventoryId: inventory.inventoryId,
              inventorySlotId: inventorySlot.inventorySlotId,
              slotNumber: inventorySlot.slotNumber,
            },
          });
          const equipment_update = await tx.equipment.update({
            data: {
              [item.itemType]: item.itemId,
            },
            where: { characterId: +characterId },
          });
          const character_update = await tx.characters.update({
            data: {
              state: {
                power: character.state.power + item.baseState.power,
                health: character.state.health + item.baseState.health,
              },
            },
            where: { characterId: +characterId },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        }
      );
      return res
        .status(200)
        .json({ message: `${item.name}을(를) 장착 하였습니다.` });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/equipment/unequip/:characterId',
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
      const key = Object.keys(req.body)[0];

      const equipment = await prisma.equipment.findFirst({
        where: {
          characterId: +characterId,
          [key]: { not: null },
        },
      });

      if (!equipment) {
        return res
          .status(400)
          .json({ message: '이미 그 부위에 아무것도 착용 하고있지 않습니다.' });
      }

      const item = await prisma.items.findFirst({
        where: { itemId: equipment[key] },
      });

      const inventory = await prisma.inventory.findFirst({
        where: { characterId: +characterId },
      });

      let inventorySlot = await prisma.inventorySlot.findFirst({
        where: {
          inventoryId: inventory.inventoryId,
          itemId: item.itemId,
        },
      });
      if (!inventorySlot) {
        inventorySlot = await prisma.inventorySlot.findFirst({
          where: {
            inventoryId: inventory.inventoryId,
            itemId: null,
          },
        });
      }

      const result = await prisma.$transaction(
        async (tx) => {
          const slot_update = await tx.inventorySlot.update({
            data: {
              itemId: item.itemId,
              quantity:
                inventorySlot.quantity === null
                  ? 1
                  : inventorySlot.quantity + 1,
            },
            where: {
              inventoryId: inventory.inventoryId,
              inventorySlotId: inventorySlot.inventorySlotId,
              slotNumber: inventorySlot.slotNumber,
            },
          });
          const equipment_update = await tx.equipment.update({
            data: {
              [key]: null,
            },
            where: { characterId: +characterId },
          });
          const character_update = await tx.characters.update({
            data: {
              state: {
                power: character.state.power - item.baseState.power,
                health: character.state.health - item.baseState.health,
              },
            },
            where: { characterId: +characterId },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        }
      );
      return res
        .status(200)
        .json({ message: `${item.name}을(를) 해제 하였습니다.` });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
