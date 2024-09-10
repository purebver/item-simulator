import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import authMiddleware from '../middlewares/auth.middleware.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

//회원가입
router.post('/sign-up', async (req, res, next) => {
  try {
    //바디에서 필요 데이터를 받아옴
    const { name, email, id, password, check } = req.body;

    //이메일 유효성 검사(정규식)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res
        .status(400)
        .json({ message: '이메일 형식이 잘못 되었습니다.' });
    }

    //아이디 유효성 검사(정규식)
    if (!/^[a-z\d]+$/.test(id)) {
      return res
        .status(400)
        .json({ message: '아이디는 소문자와 숫자만 사용 되어야 합니다.' });
    }

    //비밀번호 유효성 검사
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: '비밀번호는 6자리 이상이 되어야 합니다.' });
    }

    //비밀번호 확인
    if (check !== password) {
      return res
        .status(401)
        .json({ message: '비밀번호가 비밀번호확인과 다릅니다' });
    }

    //비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    //트랜잭션
    const result = await prisma.$transaction(
      async (tx) => {
        //새로운 유저 생성, 비밀번호는 해싱된 데이터로
        const user = await tx.users.create({
          data: {
            name,
            email,
            id,
            password: hashedPassword,
          },
        });
        return user;
      },
      //ReadCommitted 설정
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    //가입된 유저정보에서 비밀번호를 제외하고 응답으로 보냄
    return res.status(201).json({
      data: {
        name,
        email,
        id,
      },
    });
  } catch (err) {
    next(err);
  }
});

//로그인하여 액세스토큰 받기
router.post('/sign-in', async (req, res, next) => {
  //바디에서 id와 password를 받아옴
  const { id, password } = req.body;

  //id 조회
  const user = await prisma.users.findFirst({ where: { id } });

  //유효성 검사
  if (!user) {
    return res.status(404).json({ message: '존재하지 않는 아이디 입니다.' });
  }
  if (!(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ message: '비밀번호가 일치하지 않습니다' });
  }

  //액세스토큰 발급 토큰에 userId와 비밀키 정보가 담겨있음
  const token = jwt.sign({ userId: user.userId }, process.env.SECRET_KEY, {
    expiresIn: '1h',
  });

  //응답으로 바디에 토큰을 내보냄
  return res.status(200).json({
    message: '로그인에 성공하였습니다.',
    token: `Bearer ${token}`,
  });
});

export default router;
