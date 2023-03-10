import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { Server, Socket } from 'socket.io';
import { TypingDto } from './dto/typing.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MessagesGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly messagesService: MessagesService) {}

  @SubscribeMessage('createMessage')
  async create(@MessageBody() createMessageDto: CreateMessageDto) {
    const message = {
      name: createMessageDto.name,
      text: createMessageDto.text,
      room: createMessageDto.room,
      clientId: createMessageDto.clientId,
    };

    await this.messagesService.create(createMessageDto);
    this.server.to(createMessageDto.room).emit('createMessage', message);
  }

  @SubscribeMessage('findAllMessages')
  findAll(@MessageBody('room') room: string) {
    return this.messagesService.findAll(room);
  }

  @SubscribeMessage('join')
  join(@MessageBody('name') name: string, @ConnectedSocket() client: Socket) {
    return this.messagesService.identify(name, client.id);
  }

  @SubscribeMessage('joinRoom')
  joinRoom(
    @MessageBody('room') room: string,
    @MessageBody('clientName') clientName: string,
    @MessageBody('clientEmail') clientEmail: string,
    @MessageBody('clientId') clientId: string,
    @ConnectedSocket() client: Socket,
  ) {
    return this.messagesService.handleJoinRoom(
      client,
      room,
      clientName,
      clientEmail,
      clientId,
    );
  }

  @SubscribeMessage('leaveRoom')
  leaveRoom(
    @MessageBody('room') room: string,
    @MessageBody('clientName') clientName: string,
    @MessageBody('clientEmail') clientEmail: string,
    @MessageBody('clientId') clientId: string,
    @ConnectedSocket() client: Socket,
  ) {
    return this.messagesService.handleLeaveRoom(
      client,
      room,
      clientName,
      clientEmail,
      clientId,
    );
  }

  @SubscribeMessage('typing')
  async typing(
    @MessageBody() typingDto: TypingDto,
    @ConnectedSocket() client: Socket,
  ) {
    client.broadcast.emit('typing', {
      name: typingDto.name,
      isTyping: typingDto.isTyping,
    });
  }
}
