import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import authMiddleware from '../middlewares/auth.middleware.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

router.post('/sign-up', async (req, res, next) => {
  try {
    const { name, email, id, password, check } = req.body;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res
        .status(400)
        .json({ message: '이메일 형식이 잘못 되었습니다.' });
    }
    if (!/^[a-z\d]+$/.test(id)) {
      return res
        .status(400)
        .json({ message: '아이디는 소문자와 숫자만 사용 되어야 합니다.' });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: '비밀번호는 6자리 이상이 되어야 합니다.' });
    }
    if (check !== password) {
      return res
        .status(401)
        .json({ message: '비밀번호가 비밀번호확인과 다릅니다' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(
      async (tx) => {
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
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );
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

router.post('/sign-in', async (req, res, next) => {
  const { id, password } = req.body;
  const user = await prisma.users.findFirst({ where: { id } });
  if (!user) {
    return res.status(404).json({ message: '존재하지 않는 아이디 입니다.' });
  }
  if (!(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ message: '비밀번호가 일치하지 않습니다' });
  }

  //req.session.userId = user.userId;

  const token = jwt.sign({ userId: user.userId }, process.env.SECRET_KEY, {
    expiresIn: '1h',
  });

  return res.status(200).json({
    message: '로그인에 성공하였습니다.',
    token: `Bearer ${token}`,
  });
});

export default router;
