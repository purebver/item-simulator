import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma/index.js';
import dotenv from 'dotenv';

dotenv.config();

//토큰 검사 미들웨어
export default async function (req, res, next) {
  try {
    //토큰이 있는지 확인
    const { authorization } = req.headers;
    if (!authorization) throw new Error('토큰이 존재하지 않습니다');

    //토큰 타입 검사
    const [tokenType, token] = authorization.split(' ');
    if (tokenType !== 'Bearer') throw new Error('토큰 타입이 다릅니다');

    //토큰과 시크릿키로 userId추출
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
    const userId = decodedToken.userId;

    //유저 아이디 검색 후 유저가 데이터에 없을경우 에러처리
    const user = await prisma.users.findFirst({
      where: { userId: +userId },
    });
    if (!user) throw new Error('토큰 사용자가 존재하지 않습니다');

    //req에 user데이터를 할당후 next로 보냄
    req.user = user;
    next();
  } catch (error) {
    //에러 종류에 따른 분류
    if (error.name === 'TokenExpiredError')
      return res.status(401).json({ message: '토큰이 만료되었습니다' });
    if (error.name === 'JsonWebTokenError')
      return res.status(401).json({ message: '토큰이 조작되었습니다' });

    return res.status(400).json({ message: error.message });
  }
}
