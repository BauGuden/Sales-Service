import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { CreateGroupDto } from './dto/create-group.dto'; // Asume que crearás estos DTOs básicos
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
  ) {}

  create(createGroupDto: CreateGroupDto) {
    const group = this.groupRepository.create(createGroupDto);
    return this.groupRepository.save(group);
  }

  findAll() {
    return this.groupRepository.find();
  }

  async findOne(id: number) {
    const group = await this.groupRepository.findOneBy({ id });
    if (!group) throw new NotFoundException(`Group #${id} not found`);
    return group;
  }

  async update(id: number, updateGroupDto: UpdateGroupDto) {
    const group = await this.findOne(id);
    Object.assign(group, updateGroupDto);
    return this.groupRepository.save(group);
  }

  async remove(id: number) {
    const group = await this.findOne(id);
    return this.groupRepository.remove(group);
  }
}