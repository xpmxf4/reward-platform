import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer, Producer, KafkaMessage } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private isConsumerConnected = false;

  @Inject('KAFKA_OPTIONS')
  private readonly options: { clientId: string };

  constructor() {}

  async onModuleInit() {
    this.kafka = new Kafka({
      clientId: this.options.clientId,
      brokers: ['localhost:9092'],
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: `${this.options.clientId}-group` });

    await this.producer.connect();
    console.log('Kafka producer connected');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    if (this.isConsumerConnected) {
      await this.consumer.disconnect();
    }
    console.log('Kafka producer and consumer disconnected');
  }

  async produce(topic: string, message: any) {
    return this.producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
  }

  async consume(topics: string[], callback: (message: KafkaMessage) => Promise<void>) {
    await this.consumer.connect();
    this.isConsumerConnected = true;

    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          await callback(message);
        } catch (error) {
          console.error(`Error processing message: ${error.message}`, error);
        }
      },
    });
  }
}