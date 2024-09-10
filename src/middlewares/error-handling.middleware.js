export default function (err, req, res, next) {
  console.log(err);
  //prisma에서 create 시 유니크값이 존재할경우
  if (err.code === 'P2002') {
    return res
      .status(409)
      .json({ message: '이미 존재하는 아이디(이름) 입니다.' });
  }

  //주로 prisma에서 검색한 대상이 undefined일 경우 발생
  if (err.code === undefined) {
    return res.status(404).json({
      message: '선택한 대상을 찾을 수 없습니다.',
    });
  }

  //주로 undefined로 prisma에서 검색하면 발생
  if (err.code === 'P2025') {
    return res.status(404).json({ message: '선택한 대상을 찾을 수 없습니다.' });
  }

  //그 외 에러에 대한 응답
  return res.status(500).json({
    message: '서버 내부에서 에러가 발생했습니다.',
  });
}
