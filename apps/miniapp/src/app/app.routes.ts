import { Route } from '@angular/router';
import { PlanCreateComponent } from './components/plan-create/plan-create.component';
import { VotingComponent } from './components/voting/voting.component';
import { ResultComponent } from './components/result/result.component';
import { VenueSearchComponent } from './components/venue-search/venue-search.component';
import { VenueDetailComponent } from './components/venue-detail/venue-detail.component';

export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: 'create',
    pathMatch: 'full',
  },
  {
    path: 'create',
    component: PlanCreateComponent,
    title: 'Создать план',
  },
  {
    path: 'voting/:id',
    component: VotingComponent,
    title: 'Голосование',
  },
  {
    path: 'result/:id',
    component: ResultComponent,
    title: 'Результаты',
  },
  {
    path: 'search',
    component: VenueSearchComponent,
    title: 'Поиск заведений',
  },
  {
    path: 'venues',
    redirectTo: 'search',
    pathMatch: 'full',
  },
  {
    path: 'venues/:id',
    component: VenueDetailComponent,
    title: 'Детали заведения',
  },
];
