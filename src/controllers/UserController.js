"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const User_1 = require("../models/User");
class UserController {
    constructor() {
        this.users = [];
        // Sample users for demonstration
        this.users.push(new User_1.Employee(1, 'employee1', 'password1'));
        this.users.push(new User_1.Admin(2, 'admin1', 'password2'));
    }
    login(username, password) {
        const user = this.users.find(u => u.username === username);
        if (user && user.login(password)) {
            return user;
        }
        return null;
    }
}
exports.UserController = UserController;
