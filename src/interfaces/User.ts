export interface IUser {
    id: number;
    username: string;
    password: string;
    role: 'employee' | 'admin';
}
