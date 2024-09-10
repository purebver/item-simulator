import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

//캐릭터가 장착중인 아이템 검색
router.get('/equipment/:characterId', async (req, res, next) => {
  try {
    //캐릭터id를 받아 검색
    const { characterId } = req.params;
    const character = await prisma.characters.findFirst({
      where: { characterId: +characterId },
    });

    //캐릭터id에 연결됨 장비 검색
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

    //장착중인 부위만 받아옴 key는 부위 null은 착용 안하고 있다는 뜻
    const arr = [];
    for (let key in equipment) {
      if (equipment[key] !== null) {
        arr.push(key);
      }
    }

    //장비칸의 값은 현재 착용중인 아이템id 이므로 이를 이용하여 검색하여 result에 저장 후 응답
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

//캐릭터에게 아이템 장착 시키기, 토큰 인증 필요
router.post(
  '/equipment/:characterId',
  authMiddleware,
  async (req, res, next) => {
    try {
      //장착시킬 캐릭터id를 받아서 검색
      const userId = req.user.userId;
      const { characterId } = req.params;
      const character = await prisma.characters.findFirst({
        where: { characterId: +characterId },
      });

      //토큰이 보낸 userId와 받은 캐릭터의 userId가 다를경우 에러응답
      if (userId !== character.userId) {
        return res
          .status(403)
          .json({ message: '유효한 액세스토큰이 아닙니다.' });
      }

      //body에서 장착시킬 아이템이 있는 인벤토리슬롯을 받아옴
      const { slotNumber } = req.body;

      //캐릭터id와 연결된 인벤토리를 불러옴
      const inventory = await prisma.inventory.findFirst({
        where: { characterId: +characterId },
      });

      //인벤토리와 연결된 슬롯 중 body에서 받아온 슬롯넘버를 이용해 특정
      const inventorySlot = await prisma.inventorySlot.findFirst({
        where: {
          inventoryId: inventory.inventoryId,
          slotNumber,
        },
      });

      //인벤토리 슬롯에 잇는 아이템id를 이용해 아이템 검색
      const item = await prisma.items.findFirst({
        where: { itemId: inventorySlot.itemId },
      });

      //아이템type은 착용 가능한 부위로 현재 장비칸이 착용중인지 아닌지를 검사
      const equipment = await prisma.equipment.findFirst({
        where: { characterId: +characterId, [item.itemType]: null },
      });

      //착용 가능한 부위가 null이 아닐경우 다른 아이템을 장착 중이라는 뜻으로 에러응답
      if (!equipment) {
        return res
          .status(400)
          .json({ message: '이미 그 부위에 장비를 장착하고 있습니다.' });
      }

      //착용 가능한 부위가 null일 경우 착용 가능 하므로 트랜잭션
      const result = await prisma.$transaction(
        async (tx) => {
          //아이템 슬롯에서 장비칸으로 옮겨갔으므로 1을 빼주면서 0이 될 경우 null로 바꿔줌
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
              inventorySlotId: inventorySlot.inventorySlotId,
            },
          });

          //장비칸에 아이템 부위에 맞게 아이템 장착
          const equipment_update = await tx.equipment.update({
            data: {
              [item.itemType]: item.itemId,
            },
            where: { characterId: +characterId },
          });

          //아이템의 능력치에 따른 캐릭터 능력치 변화
          let power =
            item.baseState.power === undefined ? 0 : item.baseState.power;
          let health =
            item.baseState.health === undefined ? 0 : item.baseState.health;
          const character_update = await tx.characters.update({
            data: {
              state: {
                power: character.state.power + power,
                health: character.state.health + health,
              },
            },
            where: { characterId: +characterId },
          });
        },
        //ReadCommitted을 설정으로 위 트랜잭션이 실행 중에는 커밋된 데이터만 읽어오게함.
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        }
      );
      //완료 후 어느 아이템을 장착했는지 응답
      return res
        .status(200)
        .json({ message: `${item.name}을(를) 장착 하였습니다.` });
    } catch (err) {
      next(err);
    }
  }
);

//장비 탈착, 토큰 인증 필요
router.post(
  '/equipment/unequip/:characterId',
  authMiddleware,
  async (req, res, next) => {
    try {
      //토큰의 userId와 주소로 받아온 캐릭터의 userId비교
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

      //탈착할 장비의 부위를 받아옴
      const key = Object.keys(req.body)[0];

      //장비칸을 조회 not null로 장비 중인 것을 조회
      const equipment = await prisma.equipment.findFirst({
        where: {
          characterId: +characterId,
          [key]: { not: null },
        },
      });

      //equipment가 undefinded면 key(부위)는 장착중이지 않다는 뜻. 에러응답
      if (!equipment) {
        return res
          .status(400)
          .json({ message: '이미 그 부위에 아무것도 착용 하고있지 않습니다.' });
      }

      //장비중인 아이템을 조회
      const item = await prisma.items.findFirst({
        where: { itemId: equipment[key] },
      });

      //캐릭터id를 이용해 인벤토리를 조회(인벤토리id값이 필요)
      const inventory = await prisma.inventory.findFirst({
        where: { characterId: +characterId },
      });

      //인벤토리id로 인벤토리 슬롯을 조회(탈착될 아이템이 인벤토리에 있는지 검사)
      let inventorySlot = await prisma.inventorySlot.findFirst({
        where: {
          inventoryId: inventory.inventoryId,
          itemId: item.itemId,
        },
      });

      //탈착될 아이템이 인벤토리에 없을 경우 빈 인벤토리를 할당
      if (!inventorySlot) {
        inventorySlot = await prisma.inventorySlot.findFirst({
          where: {
            inventoryId: inventory.inventoryId,
            itemId: null,
          },
        });
      }

      //빈 인벤토리 마저 없을 경우 에러응답
      if (!inventorySlot) {
        return res.status(404).json({
          message:
            '가방이 꽉 찬거같아! 빈 공간을 찾을 수 없어 그냥 착용하고있어.',
        });
      }

      //트랜잭션
      const result = await prisma.$transaction(
        async (tx) => {
          //아이템 슬롯에 아이템이 있을경우 수량에 +1만 해주고 아닐경우 아이템id를 전달한 뒤 1을 할당
          const slot_update = await tx.inventorySlot.update({
            data: {
              itemId: item.itemId,
              quantity:
                inventorySlot.quantity === null
                  ? 1
                  : inventorySlot.quantity + 1,
            },
            where: {
              inventorySlotId: inventorySlot.inventorySlotId,
            },
          });

          //장비칸은 부위를 null처리 하는걸로 업데이트
          const equipment_update = await tx.equipment.update({
            data: {
              [key]: null,
            },
            where: { characterId: +characterId },
          });

          //장비 탈착에 따른 캐릭터 스탯 조정
          let power =
            item.baseState.power === undefined ? 0 : item.baseState.power;
          let health =
            item.baseState.health === undefined ? 0 : item.baseState.health;
          const character_update = await tx.characters.update({
            data: {
              state: {
                power: character.state.power - power,
                health: character.state.health - health,
              },
            },
            where: { characterId: +characterId },
          });
        },
        //ReadCommitted을 설정으로 위 트랜잭션이 실행 중에는 커밋된 데이터만 읽어오게함.
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        }
      );
      //완료 후 탈착된 아이템명을 응답으로 내보냄
      return res
        .status(200)
        .json({ message: `${item.name}을(를) 해제 하였습니다.` });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
