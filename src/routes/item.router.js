import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';

const router = express.Router();

router.post('/item-create', async (req, res, next) => {
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

export default router;
