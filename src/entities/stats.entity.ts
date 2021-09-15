import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Stats {
    @PrimaryColumn()
    group: string;

    @PrimaryColumn()
    key: string;

    @Column()
    value: string;
}
