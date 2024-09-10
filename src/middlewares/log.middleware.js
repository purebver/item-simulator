import winston from 'winston';

//로깅 설정
const logger = winston.createLogger({
  //로그레벨(중요도)을 설정 정보를 얼마나 상세하게 받을지 지정
  level: 'info',

  //로그를 json형태로 출력
  format: winston.format.json(),

  //로그를 콘솔에 출력
  transports: [new winston.transports.Console()],
});

//미들웨어
export default function (req, res, next) {
  //요청이 시작된 시점을 기록
  const start = new Date().getTime();

  //응답이 끝났을 경우(finish)
  res.on('finish', () => {
    //시작된 시점을 이용해서 응답이 완료될 때까지 걸린 시간을 계산
    const duration = new Date().getTime() - start;

    //작성될 로그의 형태
    logger.info(
      `Method: ${req.method}, URL: ${req.url}, Status: ${res.statusCode}, Duration: ${duration}ms`
    );
  });

  next();
}
