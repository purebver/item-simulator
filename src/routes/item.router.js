import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';

const router = express.Router();

//아이템 생성
router.post('/item/create', async (req, res, next) => {
  try {
    //바디에서 받은 아이템정보 저장
    const Data = req.body;

    //트랜잭션
    const result = await prisma.$transaction(
      async (tx) => {
        //위에서 받은 정보로 아이템 생성 itemid는 자동할당
        const item = await tx.items.create({
          data: {
            ...Data,
          },
        });

        //아이템 정보를 result에 반환
        return item;
      },
      //ReadCommitted을 설정으로 위 트랜잭션이 실행 중에는 커밋된 데이터만 읽어오게함.
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );
    //응답으로 만들어진 아이템 정보 보냄
    return res.status(201).json({
      result,
    });
  } catch (err) {
    next(err);
  }
});

//아이템 정보 수정
router.patch('/item/renewal/:itemId', async (req, res, next) => {
  try {
    //아이템id를 주소에서 가져옴
    const { itemId } = req.params;

    //바디에서 데이터를 받아옴
    const updatedData = req.body;

    //가격은 수정 불가능
    delete updatedData.price;

    //가지고온 id로 아이템 조회
    const item = await prisma.items.findFirst({
      where: { itemId: +itemId },
    });

    //트랜잭션
    await prisma.$transaction(
      async (tx) => {
        //아이템 데이터 수정
        await tx.items.update({
          data: { ...updatedData },
          where: { itemId: +itemId },
        });
      },
      //ReadCommitted을 설정으로 위 트랜잭션이 실행 중에는 커밋된 데이터만 읽어오게함.
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    //바뀐 데이터 비교 후 바뀐 데이터 정보를 저장
    const renewal_data = {};
    for (let key in updatedData) {
      if (item[key] !== updatedData[key]) {
        renewal_data[`old${key}`] = item[key];
        renewal_data[`new${key}`] = updatedData[key];
      }
    }

    //바뀐 데이터 정보를 응답으로 보냄
    return res.status(200).json({
      renewal_data,
    });
  } catch (err) {
    next(err);
  }
});

//전체 아이템 조회
router.get('/item', async (req, res, next) => {
  //findMany로 전체 아이템 정보를 할당 순서는 itemId 오름차순
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

  //응답으로 전체 아이템 정보를 내보냄
  return res.status(200).json({ items });
});

//특정 아이템 상세 조회
router.get('/item/:itemId', async (req, res, next) => {
  //주소에서 아이템id를 가져와서 할당
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

  //아이템id가 없는 아이템일경우
  if (!item) {
    return res.status(404).json({ message: '선택한 대상을 찾을 수 없습니다.' });
  }

  //응답으로 아이템 정보를 내보냄
  return res.status(200).json({ item });
});

export default router;
