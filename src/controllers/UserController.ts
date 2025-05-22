import { User, Employee, Admin } from '../models/User';

export class UserController {
    private users: User[] = [];

    constructor() {
        // Sample users for demonstration
        this.users.push(new Employee(1, 'employee1', 'password1'));
        this.users.push(new Admin(2, 'admin1', 'password2'));
    }

    login(username: string, password: string): User | null {
        const user = this.users.find(u => u.username === username);
        if (user && user.login(password)) {
            return user;
        }
        return null;
    }
}
