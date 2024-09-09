import express from 'express';
import UsersRouter from './routes/users.router.js';
import ErrorHandlingMiddleware from './middlewares/error-handling.middleware.js';
import cookieParser from 'cookie-parser';
import LogMiddleware from './middlewares/log.middleware.js';
import CharacterRouter from './routes/character.router.js';
import ItemRouter from './routes/item.router.js';
// import dotenv from 'dotenv';
// import expressSession from 'express-session';
// import expressMySQLSeeion from 'express-mysql-session';

// dotenv.config();

const app = express();
const PORT = 3000;

// const MySQLStorage = expressMySQLSeeion(expressSession);
// const sessionStorage = new MySQLStorage({
//   user: process.env.DATABASE_USERNAME,
//   password: process.env.DATABASE_PASSWORD,
//   host: process.env.DATABASE_HOST,
//   port: process.env.DATABASE_PORT,
//   database: process.env.DATABASE_NAME,
//   expiration: 1000 * 60 * 60 * 24, //1일
//   createDatabaseTable: true,
// });

app.use(LogMiddleware);
app.use(express.json());
app.use(cookieParser());

// app.use(
//   expressSession({
//     secret: process.env.SECRET_KEY,
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//       maxAge: 1000 * 60 * 60 * 24,
//     },
//     store: sessionStorage,
//   })
// );

app.use('/api', [UsersRouter, CharacterRouter, ItemRouter]);
app.use(ErrorHandlingMiddleware);

app.listen(PORT, () => {
  console.log(PORT, '포트로 서버 오픈');
});
