import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { Router } from '@angular/router';
import { AboutComponent } from './about/about.component';
import { FooterNavBarComponent } from './footer-nav-bar/footer-nav-bar.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  @ViewChildren(FooterNavBarComponent, { read: ElementRef })
  footerBar!: QueryList<any>;
  @ViewChildren(AboutComponent, { read: ElementRef })
  about!: QueryList<any>;

  constructor(private router: Router) {}

  ngOnInit(): void {}

  @HostListener('document:click', ['$event']) toggleOpen(event: Event) {
    // If clicked outside content, may have clicked nav bar. Return if so.
    let goHome: boolean = true;
    this.footerBar.forEach((element) => {
      if ((<ElementRef>element).nativeElement.contains(event.target)) {
        goHome = false;
        return;
      }
    });
    if (
      (<HTMLElement>event.target).localName !== 'app-about' &&
      !((<HTMLElement>event.target).parentElement?.localName === 'app-about') &&
      (<HTMLElement>event.target).id !== 'shell'
    ) {
      goHome = false;
    }

    if (goHome) {
      this.NavigateHome();
    }
  }

  NavigateHome() {
    this.router.navigate(['']);
  }
}
