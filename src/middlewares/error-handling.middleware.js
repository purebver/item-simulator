export default function (err, req, res, next) {
  console.log(err);
  if (err.code === 'P2002') {
    return res
      .status(409)
      .json({ message: '이미 존재하는 아이디(이름) 입니다.' });
  }
  if (err.code === undefined) {
    return res.status(404).json({
      message: '선택한 대상을 찾을 수 없습니다.',
    });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ message: '선택한 대상을 찾을 수 없습니다.' });
  }
  return res.status(500).json({
    message: '서버 내부에서 에러가 발생했습니다.',
  });
}
