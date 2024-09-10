import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

//상점 아이템 정보 조회
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

//아래는 아이템을 각 부위별로 볼 수 있게 정리해놓은 주소
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

//상점 아이템 구매, 토큰 인증 필요
router.post(
  '/store/purchase/:characterId',
  authMiddleware,
  async (req, res, next) => {
    try {
      //주소에서 캐릭터id받아오기
      const { characterId } = req.params;

      //바디에서 구입할 아이템과 수량 받아오기
      const { itemId, quantity } = req.body;

      //인증받은 토큰의 userId와 캐릭터의 userId비교
      const character = await prisma.characters.findFirst({
        where: { characterId: +characterId },
      });
      if (character.userId !== req.user.userId) {
        return res
          .status(403)
          .json({ message: '유효한 액세스토큰이 아닙니다.' });
      }

      //아이템id가 유효한지 체크
      const item = await prisma.items.findFirst({
        where: { itemId: itemId },
      });
      if (!item) {
        res.status(404).json({ message: '아이템이 존재하지 않습니다.' });
      }

      //캐릭터id로 인벤토리 특정
      const inventory = await prisma.inventory.findFirst({
        where: { characterId: character.characterId },
      });

      //인벤토리 슬롯중에 구입할 아이템이 이미 있을경우를 산정
      let inventorySlot = await prisma.inventorySlot.findFirst({
        where: {
          inventoryId: inventory.inventoryId,
          itemId: itemId,
        },
      });

      //인벤토리 슬롯이 undefinded면 빈공간을 찾아 조회
      if (!inventorySlot) {
        inventorySlot = await prisma.inventorySlot.findFirst({
          where: {
            inventoryId: inventory.inventoryId,
            itemId: null,
          },
        });
      }

      //그럼에도 불구하고 슬롯을 못찾으면 남은 공간이 없다고 판단, 에러응답
      if (!inventorySlot) {
        return res.status(400).json({ message: '인벤토리가 터지려합니다...' });
      }

      //money가 부족할경우 에러응답
      if (inventory.money < item.price * quantity) {
        return res.status(400).json({ message: '돈이 부족합니다!' });
      }

      //트랜잭션
      const result = await prisma.$transaction(
        async (tx) => {
          //인벤토리의 money 업데이트
          const money_update = await tx.inventory.update({
            data: {
              money: inventory.money - item.price * quantity,
            },
            where: { inventoryId: inventory.inventoryId },
          });

          //슬롯에 아이템 추가
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
        //ReadCommitted을 설정
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        }
      );

      //응답으로 구입한 아이템과 수량을 내보냄
      return res.status(201).json({
        message: `item ${item.name}이(가) ${quantity}개 구입되었습니다.`,
      });
    } catch (err) {
      next(err);
    }
  }
);

//아이템 팔기, 토큰 인증 필요
router.post(
  '/store/sell/:characterId',
  authMiddleware,
  async (req, res, next) => {
    try {
      //주소에서 받아오기
      const { characterId } = req.params;

      //바디에서 받아오기
      const { itemId, quantity } = req.body;

      //주소에서 받아온 캐릭터id로 캐릭터 특정
      const character = await prisma.characters.findFirst({
        where: { characterId: +characterId },
      });

      //토큰의 userid와 캐릭터의 유효성 체크
      if (character.userId !== req.user.userId) {
        return res
          .status(403)
          .json({ message: '유효한 액세스토큰이 아닙니다.' });
      }

      //바디에서 받아온 데이터로 아이템 특정
      const item = await prisma.items.findFirst({
        where: { itemId: itemId },
      });

      //유효하지 않은 아이템일경우 에러응답
      if (!item) {
        res.status(404).json({ message: '아이템이 존재하지 않습니다.' });
      }

      //인벤토리 특정
      const inventory = await prisma.inventory.findFirst({
        where: { characterId: character.characterId },
      });

      //인벤토리 슬롯 특정
      const inventorySlot = await prisma.inventorySlot.findFirst({
        where: {
          inventoryId: inventory.inventoryId,
          itemId: itemId,
        },
      });

      //슬롯중에 해당하는 아이템을 가진 슬롯이 없을경우 에러응답
      if (!inventorySlot) {
        return res
          .status(400)
          .json({ message: '인벤토리에 없는 아이템 입니다.' });
      }

      //아이템은 있지만 판매수량이 가진수량보다 많을경우 에러응답
      if (inventorySlot.quantity < quantity) {
        return res
          .status(400)
          .json({ message: '가지고 있는 개수보다 많이 팔 수 없습니다!' });
      }

      //아이템 판매가격 60%
      const amount = Math.round(item.price * 0.6 * quantity);

      //트랜잭션
      const result = await prisma.$transaction(
        async (tx) => {
          //인벤토리의 money 업데이트
          const money_update = await tx.inventory.update({
            data: {
              money: inventory.money + amount,
            },
            where: { inventoryId: inventory.inventoryId },
          });

          //판매된 아이템 수량 -1 수량이 0이 될 경우 null부여
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
        //ReadCommitted을 설정
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        }
      );

      //완료 후 판매한 아이템과 수량 그리고 받은 money를 응답하여 내보냄
      return res.status(201).json({
        message: `item ${item.name}을(를) ${quantity}개 판매하여 돈${amount}을 받았습니다`,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
