import { Entity, Column, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PlayerOnServer } from './playerOnServer.entity';

@Entity()
export class Server {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    region: string;

    @Column()
    gamemode: string;

    @Column()
    address: string;

    @Column()
    port: number;

    @OneToMany(() => PlayerOnServer, playerOnServer => playerOnServer.server)
    playerOnServer: PlayerOnServer[];
}
