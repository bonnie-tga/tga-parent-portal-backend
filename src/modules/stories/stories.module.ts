import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Story,
  StorySchema,
} from './schemas/story.schema';
import { StoriesController } from './controllers/stories.controller';
import { StoriesService } from './services/stories.service';
import { Child, ChildSchema } from '../children/schemas/child.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Story.name,
        schema: StorySchema,
      },
      {
        name: Child.name,
        schema: ChildSchema,
      },
    ]),
  ],
  controllers: [StoriesController],
  providers: [StoriesService],
  exports: [StoriesService],
})
export class StoriesModule {}


