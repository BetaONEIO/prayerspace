import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import transcribeRouter from "./transcribe";
import communityAccessRouter from "./communityAccess";
import accountRouter from "./account";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminRouter);
router.use(transcribeRouter);
router.use(communityAccessRouter);
router.use(accountRouter);

export default router;
