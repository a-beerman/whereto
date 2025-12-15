import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan, Participant, Vote, VoteCast } from './entities';
import { PlanRepository } from './repositories/plan.repository';
import { ParticipantRepository } from './repositories/participant.repository';
import { VoteRepository } from './repositories/vote.repository';
import { VoteCastRepository } from './repositories/vote-cast.repository';
import { PlansService } from './services/plans.service';
import { ShortlistService } from './services/shortlist.service';
import { PlansController } from './controllers/plans.controller';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, Participant, Vote, VoteCast]),
    CatalogModule, // For VenueRepository
  ],
  controllers: [PlansController],
  providers: [
    PlanRepository,
    ParticipantRepository,
    VoteRepository,
    VoteCastRepository,
    PlansService,
    ShortlistService,
  ],
  exports: [PlansService, ShortlistService],
})
export class PlansModule {}
