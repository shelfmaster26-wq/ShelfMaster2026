import { Router, type IRouter } from "express";
import healthRouter from "./health";
import shelfmasterRouter from "./shelfmaster";

const router: IRouter = Router();

router.use(healthRouter);
router.use(shelfmasterRouter);

export default router;
