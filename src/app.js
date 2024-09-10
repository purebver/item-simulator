import express from 'express';
import UsersRouter from './routes/users.router.js';
import ErrorHandlingMiddleware from './middlewares/error-handling.middleware.js';
import cookieParser from 'cookie-parser';
import LogMiddleware from './middlewares/log.middleware.js';
import CharacterRouter from './routes/character.router.js';
import ItemRouter from './routes/item.router.js';
import StoreRouter from './routes/store.router.js';
import InventoryRouter from './routes/inventory.router.js';
import EquipmentRouter from './routes/equipment.router.js';
import ScarecrowRouter from './routes/scarecrow.router.js';

const app = express();
const PORT = 3000;

app.use(LogMiddleware);
app.use(express.json());
app.use(cookieParser());

app.use('/api', [
  UsersRouter,
  CharacterRouter,
  ItemRouter,
  StoreRouter,
  InventoryRouter,
  EquipmentRouter,
  ScarecrowRouter,
]);
app.use(ErrorHandlingMiddleware);

app.listen(PORT, () => {
  console.log(PORT, '포트로 서버 오픈');
});
