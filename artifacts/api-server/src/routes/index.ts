import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import transcribeRouter from "./transcribe";
import communityAccessRouter from "./communityAccess";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminRouter);
router.use(transcribeRouter);
router.use(communityAccessRouter);

export default router;
