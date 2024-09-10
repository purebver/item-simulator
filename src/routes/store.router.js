import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/store', async (req, res, next) => {
  const items = await prisma.items.findMany({
    select: {
      itemId: true,
      name: true,
      itemType: true,
      rarity: true,
      price: true,
    },
    orderBy: {
      itemId: 'asc',
    },
  });
  return res.status(200).json({ items });
});

router.get('/store/head', async (req, res, next) => {
  const items = await prisma.items.findMany({
    where: { itemType: 'head' },
    select: {
      itemId: true,
      name: true,
      information: true,
      itemType: true,
      rarity: true,
      baseState: true,
      price: true,
    },
    orderBy: {
      itemId: 'asc',
    },
  });
  return res.status(200).json({ items });
});

router.get('/store/arms', async (req, res, next) => {
  const items = await prisma.items.findMany({
    where: { itemType: 'arms' },
    select: {
      itemId: true,
      name: true,
      information: true,
      itemType: true,
      rarity: true,
      baseState: true,
      price: true,
    },
    orderBy: {
      itemId: 'asc',
    },
  });
  return res.status(200).json({ items });
});

router.get('/store/body', async (req, res, next) => {
  const items = await prisma.items.findMany({
    where: { itemType: 'body' },
    select: {
      itemId: true,
      name: true,
      information: true,
      itemType: true,
      rarity: true,
      baseState: true,
      price: true,
    },
    orderBy: {
      itemId: 'asc',
    },
  });
  return res.status(200).json({ items });
});

router.get('/store/shoes', async (req, res, next) => {
  const items = await prisma.items.findMany({
    where: { itemType: 'shoes' },
    select: {
      itemId: true,
      name: true,
      information: true,
      itemType: true,
      rarity: true,
      baseState: true,
      price: true,
    },
    orderBy: {
      itemId: 'asc',
    },
  });
  return res.status(200).json({ items });
});

router.get('/store/weapon', async (req, res, next) => {
  const items = await prisma.items.findMany({
    where: { itemType: 'weapon' },
    select: {
      itemId: true,
      name: true,
      information: true,
      itemType: true,
      rarity: true,
      baseState: true,
      price: true,
    },
    orderBy: {
      itemId: 'asc',
    },
  });
  return res.status(200).json({ items });
});

router.post(
  '/store/purchase/:characterId',
  authMiddleware,
  async (req, res, next) => {
    try {
      const { characterId } = req.params;
      const { itemId, quantity } = req.body;

      const character = await prisma.characters.findFirst({
        where: { characterId: +characterId },
      });
      if (character.userId !== req.user.userId) {
        return res
          .status(403)
          .json({ message: '유효한 액세스토큰이 아닙니다.' });
      }

      const item = await prisma.items.findFirst({
        where: { itemId: itemId },
      });
      if (!item) {
        res.status(404).json({ message: '아이템이 존재하지 않습니다.' });
      }
      const inventory = await prisma.inventory.findFirst({
        where: { characterId: character.characterId },
      });
      let inventorySlot = await prisma.inventorySlot.findFirst({
        where: {
          inventoryId: inventory.inventoryId,
          itemId: itemId,
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
      if (!inventorySlot) {
        return res.status(400).json({ message: '인벤토리가 터지려합니다...' });
      }

      if (inventory.money < item.price * quantity) {
        return res.status(400).json({ message: '돈이 부족합니다!' });
      }

      const result = await prisma.$transaction(
        async (tx) => {
          const money_update = await tx.inventory.update({
            data: {
              money: inventory.money - item.price * quantity,
            },
            where: { inventoryId: inventory.inventoryId },
          });
          const slot_update = await tx.inventorySlot.update({
            data: {
              itemId: itemId,
              quantity: inventorySlot.quantity + quantity,
            },
            where: {
              inventorySlotId: inventorySlot.inventorySlotId,
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        }
      );

      return res.status(201).json({
        message: `item ${item.name}이(가) ${quantity}개 구입되었습니다.`,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/store/sell/:characterId',
  authMiddleware,
  async (req, res, next) => {
    try {
      const { characterId } = req.params;
      const { itemId, quantity } = req.body;

      const character = await prisma.characters.findFirst({
        where: { characterId: +characterId },
      });
      if (character.userId !== req.user.userId) {
        return res
          .status(403)
          .json({ message: '유효한 액세스토큰이 아닙니다.' });
      }

      const item = await prisma.items.findFirst({
        where: { itemId: itemId },
      });
      if (!item) {
        res.status(404).json({ message: '아이템이 존재하지 않습니다.' });
      }
      const inventory = await prisma.inventory.findFirst({
        where: { characterId: character.characterId },
      });
      const inventorySlot = await prisma.inventorySlot.findFirst({
        where: {
          inventoryId: inventory.inventoryId,
          itemId: itemId,
        },
      });
      if (!inventorySlot) {
        return res
          .status(400)
          .json({ message: '인벤토리에 없는 아이템 입니다.' });
      }
      if (inventorySlot.quantity < quantity) {
        return res
          .status(400)
          .json({ message: '가지고 있는 개수보다 많이 팔 수 없습니다!' });
      }

      const amount = Math.round(item.price * 0.6 * quantity);

      const result = await prisma.$transaction(
        async (tx) => {
          const money_update = await tx.inventory.update({
            data: {
              money: inventory.money + amount,
            },
            where: { inventoryId: inventory.inventoryId },
          });
          const slot_update = await tx.inventorySlot.update({
            data: {
              itemId: inventorySlot.quantity - quantity === 0 ? null : itemId,
              quantity:
                inventorySlot.quantity - quantity === 0
                  ? null
                  : inventorySlot.quantity - quantity,
            },
            where: {
              inventorySlotId: inventorySlot.inventorySlotId,
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        }
      );

      return res.status(201).json({
        message: `item ${item.name}을(를) ${quantity}개 판매하여 돈${amount}을 받았습니다`,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
