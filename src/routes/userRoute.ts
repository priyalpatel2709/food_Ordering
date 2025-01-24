import { Router } from "express";
import {getAllUsers} from "../controllers/userControllers" ;

const router = Router()

router.get('/',getAllUsers)

export default router;