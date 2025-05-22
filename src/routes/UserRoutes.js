"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const UserController_1 = require("../controllers/UserController");
const router = express_1.default.Router();
const userController = new UserController_1.UserController();
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = userController.login(username, password);
    if (user) {
        res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
    }
    else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});
exports.default = router;
