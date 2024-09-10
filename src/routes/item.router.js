import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';

const router = express.Router();

router.post('/item/create', async (req, res, next) => {
  try {
    const { name, information, itemType, rarity, baseState, price } = req.body;

    const result = await prisma.$transaction(
      async (tx) => {
        const item = await tx.items.create({
          data: {
            name,
            information,
            itemType,
            rarity,
            baseState,
            price,
          },
        });
        return item;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );
    return res.status(201).json({
      result,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/item/renewal/:itemId', async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const updatedData = req.body;

    delete updatedData.price;

    const item = await prisma.items.findFirst({
      where: { itemId: +itemId },
    });
    await prisma.$transaction(async (tx) => {
      await tx.items.update({
        data: { ...updatedData },
        where: { itemId: +itemId },
      });
    });

    const renewal_data = {};
    for (let key in updatedData) {
      if (item[key] !== updatedData[key]) {
        renewal_data[`old${key}`] = item[key];
        renewal_data[`new${key}`] = updatedData[key];
      }
    }

    return res.status(200).json({
      renewal_data,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/item', async (req, res, next) => {
  const items = await prisma.items.findMany({
    select: {
      itemId: true,
      name: true,
      price: true,
    },
    orderBy: {
      itemId: 'asc',
    },
  });
  return res.status(200).json({ items });
});

router.get('/item/:itemId', async (req, res, next) => {
  const { itemId } = req.params;
  const item = await prisma.items.findFirst({
    where: { itemId: +itemId },
    select: {
      itemId: true,
      name: true,
      information: true,
      baseState: true,
      price: true,
    },
  });
  if (!item) {
    return res.status(404).json({ message: '선택한 대상을 찾을 수 없습니다.' });
  }
  return res.status(200).json({ item });
});

export default router;
