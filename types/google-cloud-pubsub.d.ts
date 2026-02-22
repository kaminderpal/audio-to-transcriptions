declare module "@google-cloud/pubsub" {
  type Credentials = {
    client_email: string;
    private_key: string;
  };

  type PubSubOptions = {
    projectId?: string;
    credentials?: Credentials;
  };

  type PublishMessageRequest = {
    data: Buffer;
    attributes?: Record<string, string>;
  };

  class Topic {
    publishMessage(request: PublishMessageRequest): Promise<string>;
  }

  export class PubSub {
    constructor(options?: PubSubOptions);
    topic(name: string): Topic;
  }
}
