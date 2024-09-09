export default function (err, req, res, next) {
  if (err.code === 'P2002') {
    return res
      .status(409)
      .json({ message: '이미 존재하는 아이디(이름) 입니다.' });
  }
  console.log(err);
  res.status(500).json({
    message: '서버 내부에서 에러가 발생했습니다.',
  });
}
