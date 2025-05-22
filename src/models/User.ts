import { IUser } from '../interfaces/User';

export class User implements IUser {
    id: number;
    username: string;
    password: string;
    role: 'employee' | 'admin';

    constructor(id: number, username: string, password: string, role: 'employee' | 'admin') {
        this.id = id;
        this.username = username;
        this.password = password;
        this.role = role;
    }

    login(password: string): boolean {
        return this.password === password;
    }
}

export class Employee extends User {
    constructor(id: number, username: string, password: string) {
        super(id, username, password, 'employee');
    }

    // Employee specific methods can be added here
}

export class Admin extends User {
    constructor(id: number, username: string, password: string) {
        super(id, username, password, 'admin');
    }

    // Admin specific methods can be added here
}
