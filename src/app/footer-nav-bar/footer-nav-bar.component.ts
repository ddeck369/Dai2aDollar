import { Component, HostListener, OnInit } from '@angular/core';

@Component({
  selector: 'app-footer-nav-bar',
  templateUrl: './footer-nav-bar.component.html',
  styleUrls: ['./footer-nav-bar.component.css'],
})
export class FooterNavBarComponent implements OnInit {
  isFooterShown: boolean = false;

  @HostListener('document:click', ['$event']) toggleOpen(event: Event) {
    if (
      (<HTMLButtonElement>event.target).id !== 'button-footer' &&
      (<HTMLButtonElement>event.target).id !== 'icon-footer' &&
      (<HTMLButtonElement>event.target).id !== 'footer-toggle-button' &&
      (<HTMLButtonElement>event.target).id !== 'about-footer-button' &&
      (<HTMLButtonElement>event.target).id !== 'about-footer-body' &&
      (<HTMLButtonElement>event.target).id !== 'about-footer'
    ) {
      this.isFooterShown = false;
    }
  }

  constructor() {}

  ngOnInit(): void {}
}
