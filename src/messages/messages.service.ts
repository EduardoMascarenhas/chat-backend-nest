import { PrismaService } from 'nestjs-prisma';
import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { CreateMessageDto } from './dto/create-message.dto';
import { Message } from './entities/message.entity';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}
  //mudar isso para o banco real depois
  messages: Message[] = [];
  clientToUser = {};

  identify(name: string, clientId: string) {
    this.clientToUser[clientId] = name;
    return Object.values(this.clientToUser);
  }

  getClientName(clientId: string) {
    return this.clientToUser[clientId];
  }

  async create(createMessageDto: CreateMessageDto) {
    const createdMessage = await this.prisma.message.create({
      data: {
        body: createMessageDto.text,
        room: {
          connect: {
            id: createMessageDto.room,
          },
        },
        author: {
          connect: {
            id: createMessageDto.clientId,
          },
        },
      },
    });
  }

  async findAll(room: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        roomId: room,
      },
      include: {
        author: true,
        room: true,
      },
    });

    return messages;
  }

  async handleJoinRoom(
    client: Socket,
    room: string,
    clientName: string,
    clientEmail: string,
    clientId: string,
  ) {
    client.join(room);
    client.emit('joinedRoom', room);
    this.clientToUser[client.id] = clientName;
    const existRoom = await this.prisma.room.findUnique({
      where: {
        id: room,
      },
    });
    if (existRoom) {
      const existUser = await this.prisma.user.findUnique({
        where: {
          id: clientId,
        },
      });
      if (existUser) {
        await this.prisma.room.update({
          where: {
            id: room,
          },
          data: {
            users: {
              connect: {
                id: existUser.id,
              },
            },
          },
        });
        return Object.values(this.clientToUser);
      } else {
        const newUser = await this.prisma.user.create({
          data: {
            id: clientId,
            name: clientName,
            email: clientEmail,
          },
        });
        await this.prisma.room.update({
          where: {
            id: room,
          },
          data: {
            users: {
              connect: {
                id: newUser.id,
              },
            },
          },
        });
        return Object.values(this.clientToUser);
      }
    } else {
      const newRoom = await this.prisma.room.create({
        data: {
          id: room,
        },
      });
      const existUser = await this.prisma.user.findUnique({
        where: {
          id: clientId,
        },
      });
      if (existUser) {
        await this.prisma.room.update({
          where: {
            id: newRoom.id,
          },
          data: {
            users: {
              connect: {
                id: existUser.id,
              },
            },
          },
        });
        return Object.values(this.clientToUser);
      } else {
        const newUser = await this.prisma.user.create({
          data: {
            id: clientId,
            name: clientName,
            email: clientEmail,
          },
        });
        await this.prisma.room.update({
          where: {
            id: newRoom.id,
          },
          data: {
            users: {
              connect: {
                id: newUser.id,
              },
            },
          },
        });
        return Object.values(this.clientToUser);
      }
    }
  }

  handleLeaveRoom(
    client: Socket,
    room: string,
    clientName: string,
    clientEmail: string,
    clientId: string,
  ) {
    client.leave(room);
    console.log(room, client.id, clientName);
    client.emit('leftRoom', room);
    console.log(
      `Deslogado da room: ${room}; UserName: ${clientName}; IdConexao: ${client.id}; clientId: ${clientId}`,
    );
    return null;
  }
}
