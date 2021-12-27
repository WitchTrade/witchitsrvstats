import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Player } from './player.entity';
import { Server } from './server.entity';

@Entity()
export class PlayerOnServerHistory {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Server, server => server.playerOnServer)
    server: Server;

    @ManyToOne(() => Player, player => player.playerOnServer)
    player: Player;

    @Column()
    time: Date;
}
