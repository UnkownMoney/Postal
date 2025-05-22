"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Admin = exports.Employee = exports.User = void 0;
class User {
    constructor(id, username, password, role) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.role = role;
    }
    login(password) {
        return this.password === password;
    }
}
exports.User = User;
class Employee extends User {
    constructor(id, username, password) {
        super(id, username, password, 'employee');
    }
}
exports.Employee = Employee;
class Admin extends User {
    constructor(id, username, password) {
        super(id, username, password, 'admin');
    }
}
exports.Admin = Admin;
