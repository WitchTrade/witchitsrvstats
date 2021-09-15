import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { PlayerOnServer } from './playerOnServer.entity';

@Entity()
export class Player {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    name: string;

    @OneToMany(() => PlayerOnServer, playerOnServer => playerOnServer.player)
    playerOnServer: PlayerOnServer[];
}
