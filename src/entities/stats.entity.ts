import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Stats {
    @PrimaryColumn()
    statGroup: string;

    @PrimaryColumn()
    statKey: string;

    @Column()
    value: string;
}
