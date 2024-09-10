import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

//캐릭터 생성, 토큰 검사 필요
router.post('/character/create', authMiddleware, async (req, res, next) => {
  try {
    //생성할 캐릭터의 이름을 바디로 받아옴 캐릭터id는 자동할당
    const { name } = req.body;
    const userId = req.user.userId;

    //트랜잭션으로 오류 발생시 롤백기능
    const character_create = await prisma.$transaction(
      async (tx) => {
        // 캐릭터 생성
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

        //캐릭터 생성에 따른 인벤토리 생성
        const inventory = await tx.inventory.create({
          data: {
            characterId: character.characterId,
            money: 10000,
          },
        });

        //캐릭터 생성에 따른 장비칸 생성
        const equipment = await tx.equipment.create({
          data: {
            characterId: character.characterId,
          },
        });

        /*인벤토리 d에 따른 슬롯 생성
        for문을 비동기적 처리를 하고 그작업 전체를 동기 처리를 하는 Promise.all을 사용*/
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
      //ReadCommitted을 설정으로 위 트랜잭션이 실행 중에는 커밋된 데이터만 읽어오게함.
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    //완료 후 응답으로 사용할 캐릭터 id전달
    return res.status(201).json({
      message: `ID:${character_create.characterId} name:${name} 캐릭터 생성이 완료되었습니다`,
    });
  } catch (err) {
    next(err);
  }
});

//캐릭터 삭제, 토큰 검사 필요
router.delete(
  '/character/delete/:characterId',
  authMiddleware,
  async (req, res, next) => {
    try {
      //캐릭터id를 받아 삭제대상 캐릭터 조회
      const { characterId } = req.params;
      const del_Id = await prisma.characters.findFirst({
        where: { characterId: +characterId },
      });

      //토큰의 userId와 삭제대상 캐릭터의 userId를 비교하여 다를경우 에러응답
      if (del_Id.userId !== req.user.userId) {
        return res.status(403).json({ message: '유효한 토큰이 아닙니다.' });
      }

      //트랜잭션
      const character_delete = await prisma.$transaction(
        async (tx) => {
          //캐릭터 삭제
          const character = await tx.characters.delete({
            where: { characterId: +characterId },
          });
        },
        //ReadCommitted을 설정으로 위 트랜잭션이 실행 중에는 커밋된 데이터만 읽어오게함.
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        }
      );
      //완료 후 응답메시지
      return res.status(200).json({ message: '캐릭터가 삭제되었습니다.' });
    } catch (err) {
      next(err);
    }
  }
);

//캐릭터 조회, 토큰이 있을경우 검사 후 추가 정보 제공
router.get(
  '/character/check/:characterId',
  async (req, res, next) => {
    try {
      //토큰이 있는지 확인하기 위해 헤더 검색
      const { authorization } = req.headers;

      //캐릭터id 받아옴
      const { characterId } = req.params;

      //캐릭터id로 데이터 검색
      const character = await prisma.characters.findFirst({
        where: { characterId: +characterId },
        select: {
          characterId: true,
          name: true,
          state: true,
          userId: true,
        },
      });

      //토큰이 없을경우 검색한 데이터만 제공
      if (!authorization) {
        return res.status(200).json({ data: character });
      }

      //캐릭터 정보를 요청 정보에 저장
      req.character = character;

      //토큰 검사 미들웨어 실행, 검사 후 next로 다음 핸들러로 보냄
      authMiddleware(req, res, next);
    } catch (err) {
      next(err);
    }
  },
  async (req, res, next) => {
    try {
      //토큰검사 후 받은 req.user와 위 핸들러에서 받은 req.character의 userId비교 다를 시 에러응답
      if (req.user.userId !== req.character.userId) {
        return res.status(403).json({ message: '유효한 토큰이 아닙니다.' });
      }

      //캐릭터id에 일치하는 인벤토리의 money를검색
      const inventory = await prisma.inventory.findFirst({
        where: { characterId: req.character.characterId },
        select: {
          money: true,
        },
      });

      //캐릭터 정보에 money정보를 포함시켜 응답
      return res.status(200).json({
        data: {
          ...req.character,
          money: inventory.money,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
