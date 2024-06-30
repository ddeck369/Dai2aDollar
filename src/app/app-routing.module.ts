import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AboutComponent } from './about/about.component';
import { AppComponent } from './app.component';
import { WelcomeComponent } from './welcome/welcome.component';
// import { CommonModule } from '@angular/common';

const routes: Routes = [
  { path: '', component: WelcomeComponent },
  { path: 'about', component: AboutComponent },
  // { path: '', component: HomeComponent },
  // {
  //   path: 'users',
  //   component: UsersComponent,
  //   children: [{ path: ':id/:name', component: UserComponent }],
  // },
  // {
  //   path: 'not-found',
  //   component: ErrorPageComponent,
  //   data: { message: 'Page not found!' },
  // },
  // { path: '**', redirectTo: '/not-found' },
];

@NgModule({
  declarations: [],
  // imports: [ CommonModule ]
  imports: [RouterModule.forRoot(routes)],
  //imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
