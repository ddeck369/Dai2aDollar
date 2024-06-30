import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { ethers, BigNumberish } from 'ethers';
import { Subscription } from 'rxjs';
import { EthersService } from '../ethers.service';
import { faRefresh, faSpinner } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
})
export class WelcomeComponent implements OnInit, OnDestroy {
  faRefresh = faRefresh;
  faSpinner = faSpinner;
  isAboutShown: boolean = false;

  nineMMD2ADUrl: string = "https://dex.9mm.pro/swap?inputCurrency=0x6B175474E89094C44Da98b954EedeAC495271d0F&outputCurrency=0xB601A3af87fceF38b158C4864F20CA898390ac00&chain=pulsechain&exactField=output&exactAmount=";
  ninePLS_DAIUrl: string = "https://dex.9mm.pro/swap?inputCurrency=PLS&outputCurrency=0x6B175474E89094C44Da98b954EedeAC495271d0F&chain=pulsechain";

  networkName: string = '';
  networkID: BigInt = 0n; //or BigInt(0);
  blockNumber: number = 0;

  balance: BigNumberish = 0;
  pDaiBalance: BigNumberish = 0;
  tokenBalance: BigNumberish = 0;
  tokenGrossBalance: BigNumberish = 0;
  // fetchingBalance: boolean = false;
  // fetchingDaiBalance: boolean = false;
  fetchingtokenBalance: boolean = false;
  fetchingtokenGrossBalance: boolean = false;

  lastHighBalance: BigNumberish = 0;
  address: string = '';
  timeStamp: BigNumberish = 0;
  lastHighTimeStamp: BigNumberish = 0;
  minimumRequiredDeposit: BigNumberish = 0;
  timeStampWhenDepositRequired: BigNumberish = 0;

  timeTillDepositRequired: string = ''

  inBurn: boolean = false;
  isBurnStateDetermined: boolean = true;
  hasPenaltyPeriodError: boolean = false;

  private pageVisible: boolean = true;
  private isWaiting: boolean = false;
  private mustUpdate: boolean = false;

  private currentAccount: Subscription;
  private currentChain: Subscription;
  private currentBlock: Subscription;
  // private tokenTransfer: Subscription;

  private checkIntervalId!: NodeJS.Timeout;

  constructor(private ethersService: EthersService, private _ngZone: NgZone) {
    // --- Account Update Subscription ---
    this.currentAccount = this.ethersService.accountChange.subscribe((res) => {
      if (this.ethersService.debug) { console.log('Updated Account'); }

      //this.FetchAccountData();  //This doesn't update UI so run in ngZone or use a 'setInterval'/_isAccountChanged in ngOnInit
      this._ngZone.run(() => {
        this.isWaiting = false;
        if (this.ethersService.address == 'disconnected') {
          this.FetchAccountData();
        }
        else {
          this.CheckForChanges();
        }
      });
    });

    // --- Chain Update Subscription ---
    this.currentChain = this.ethersService.chainChange.subscribe((res) => {
      if (this.ethersService.debug) { console.log('Updated Chain'); }

      this._ngZone.run(() => {
        this.isWaiting = false;
        this.CheckForChanges();
      });
    });

    // --- Block Change Subscription ---
    this.currentBlock = this.ethersService.blockChange.subscribe((res) => {
      // if (this.ethersService.debug) { console.log('Updated Block'); }

      this._ngZone.run(() => {
        if (this.checkIntervalId) clearInterval(this.checkIntervalId); // Reset interval - i.e. Check every 22 seconds only if no blocks are received.
        this.checkIntervalId = setInterval(async () => { console.log('Extra check'); this.CheckForChanges() }, 22000);
        this.CheckForChanges();
      });
    });

    // // --- Token Transfer Subscription ---
    // this.tokenTransfer = this.ethersService.tokenTransfer.subscribe((res) => {
    //   this._ngZone.run(() => {
    //     this.CheckForChanges();
    //   });
    // });
  }

  ngOnInit(): void {
    this.mustUpdate == true;

    this.FetchAccountData();

    this.isWaiting = false;
    this.checkIntervalId = setInterval(async () => { this.CheckForChanges() }, 22000);  // Check every 22 seconds.

    setInterval(() => { this.isWaiting = false; }, 21600000);  // Every 6 hours
    //setInterval(() => { this.forceReload(); }, 21600000);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.pageVisible = false;
        if (this.ethersService.debug) { console.log('hidden'); }
      } else {
        this.pageVisible = true;
        if (this.ethersService.debug) { console.log('visible'); }
      }
    });

  }

  public SetDebugOn() {
    this.ethersService.debug = true;
    // Use: Inspect app-welcome
    // Use in console / Store as global variable:
    // const c = ng.getComponent(temp0)
    // c.SetDebugOn()
  }

  ngOnDestroy(): void {
    this.currentAccount?.unsubscribe();
    this.currentChain?.unsubscribe();
    this.currentBlock?.unsubscribe();
    // this.tokenTransfer?.unsubscribe();
  }

  async CheckForChanges() {
    if (this.pageVisible && !this.isWaiting) {
      this.isWaiting = true;
      this.ethersService.GetAccountsList().then((accounts) => {
        if (accounts && accounts.length > 0) {
          this.ethersService.GetEthersObjects().then(() => {

            if ((this.address != this.ethersService.address) || (this.networkID != this.ethersService.networkID)) {
              this.mustUpdate = true;
            }

            if (this.blockNumber != this.ethersService.blockNumber || this.mustUpdate ) {
              this.blockNumber = this.ethersService.blockNumber;
              this.FetchAccountData();
              this.mustUpdate = false;
            }
            else {
              this.isWaiting = false;
            }
          });
        }
        else {
          this.isWaiting = false;
        }
      },
      (error) => {
        this.isWaiting = false;
        if (this.ethersService.debug) { console.log("CheckForChanges.GetAccountsList >", error); }
      });
    }
  }

  FetchAccountData() {

    if (this.mustUpdate) {
      this.tokenBalance = -1n;
      this.tokenGrossBalance = -1n;
      this.pDaiBalance = -1n;
      this.balance = -1n;
      this.timeStamp = -1n;
      this.minimumRequiredDeposit = -1n;
      this.timeStampWhenDepositRequired = -1n;
      this.lastHighBalance = -1n;
      this.lastHighTimeStamp = -1n;
      this.hasPenaltyPeriodError = false;
      this.SetTimeTillDepositRequired();
      this.CheckBurnState();
    }

    this.fetchingtokenBalance = true;
    this.fetchingtokenGrossBalance = true;

    //console.log('Fetching');

    this.ethersService.GetAccountsList().then((accounts) => {
      //console.log(accounts);
      if (accounts && accounts.length > 0) {

        if (this.ethersService.debug) { console.log('Fetching...'); }

        this.ethersService.GetEthersObjects().then(
          (results) => {
            this.address = this.ethersService.address;
            if (this.address === '') {
              this.ethersService.GetAddress().then((results) => {
                this.address = results;
              });
            }

            this.networkName = this.ethersService.networkName;
            this.networkID = this.ethersService.networkID;
            if (this.networkName === '' || this.networkID === 0n) {
              this.ethersService.GetNetwork().then((results) => {
                this.networkName = results.name;
                this.networkID = results.chainId;
              });
            }

            this.ethersService.GetBlockTimestampUsingGlobals().then(
              (results) => {
                this.timeStamp = results ?? 0n;
                this.SetTimeTillDepositRequired();
              },
              (error) => {
                if (this.mustUpdate) {
                  this.timeStamp = -1n;
                }
                this.SetTimeTillDepositRequired();
                if (this.ethersService.debug) { console.log("GetBlockTimestampUsingGlobals >", error); }
              }
            );

            this.ethersService.GetPLSBalanceUsingGlobals().then(
              (results) => {
                this.balance = results;
              },
              (error) => {
                if (this.mustUpdate) {
                  this.balance = -1n;
                }
                if (this.ethersService.debug) { console.log("GetPLSBalanceUsingGlobals >", error); }
              }
            );

            this.ethersService.GetDAIBalanceUsingGlobals().then(
              (results) => {
                if (this.pDaiBalance != -1n && this.pDaiBalance != results) {
                  this.mustUpdate = true;
                }
                this.pDaiBalance = results;
              },
              (error) => {
                if (this.mustUpdate) {
                  this.pDaiBalance = -1n;
                }
                if (this.ethersService.debug) { console.log("GetDAIBalanceUsingGlobals >", error); }
              }
            );

            this.ethersService.GetAvailableBalanceUsingGlobals().then(
              (results) => {
                if (this.tokenBalance != -1n && this.tokenBalance != results) {
                  this.mustUpdate = true;
                }
                this.tokenBalance = results;
                this.fetchingtokenBalance = false;
                this.CheckBurnState();
                this.isWaiting = false;
              },
              (error) => {
                if (this.mustUpdate) {
                  this.tokenBalance = -1n;
                  this.CheckBurnState();
                }
                this.fetchingtokenBalance = false;
                if (this.ethersService.debug) { console.log("GetAvailableBalanceUsingGlobals >", error); }
                this.isWaiting = false;
              }
            );

            this.ethersService.GetGrossBalanceUsingGlobals().then(
              (results) => {
                if (this.tokenGrossBalance != -1n && this.tokenGrossBalance != results) {
                  this.mustUpdate = true;
                }
                this.tokenGrossBalance = results;
                this.fetchingtokenGrossBalance = false;
                this.CheckBurnState();
                this.isWaiting = false;
              },
              (error) => {
                if (this.mustUpdate) {
                  this.tokenGrossBalance = -1n;
                  this.CheckBurnState();
                }
                this.fetchingtokenGrossBalance = false;
                if (this.ethersService.debug) { console.log("GetGrossBalanceUsingGlobals >", error); }
                this.isWaiting = false;
              }
            );

            this.ethersService.GetMinimumRequiredDepositUsingGlobals().then(
              (results) => {
                if (this.minimumRequiredDeposit != -1n && this.minimumRequiredDeposit != results) {
                  this.mustUpdate = true;
                }
                this.minimumRequiredDeposit = results;
                this.hasPenaltyPeriodError = false;
                this.CheckBurnState();
                this.isWaiting = false;
              },
              (error) => {
                if (this.ethersService.debug) { console.log("GetMinimumRequiredDepositUsingGlobals >", error); }

                if (error.message.toString().includes('In penalty period. Any deposit or withdrawal amount will reset.')) {
                  this.hasPenaltyPeriodError = true;
                  this.minimumRequiredDeposit = 0n;
                  this.CheckBurnState();
                }
                else {
                  this.hasPenaltyPeriodError = false;
                  if (this.mustUpdate) {
                    this.minimumRequiredDeposit = -1n;
                    this.CheckBurnState();
                  }
                }
                this.isWaiting = false;
              }
            );

            this.ethersService.GetTimeStampWhenDepositRequiredUsingGlobals().then(
              (results) => {
                if (this.timeStampWhenDepositRequired != -1n && this.timeStampWhenDepositRequired != results) {
                  this.mustUpdate = true;
                }
                this.timeStampWhenDepositRequired = results;
                this.SetTimeTillDepositRequired();
                this.isWaiting = false;
              },
              (error) => {
                if (this.ethersService.debug) { console.log("GetTimeStampWhenDepositRequiredUsingGlobals >", error); }

                if (this.mustUpdate) {
                  this.timeStampWhenDepositRequired = -1n;
                  this.SetTimeTillDepositRequired();
                }
                this.isWaiting = false;
              }
            );

            this.ethersService.GetStatsUsingGlobals().then(
              (results) => {
                if (this.lastHighBalance != -1n && this.lastHighBalance != results.lastHighBalance) {
                  this.mustUpdate = true;
                }
                if (this.ethersService.debug) { console.log('LHB:', results); }
                this.lastHighBalance = results.lastHighBalance;
                this.lastHighTimeStamp = results.lastBalanceIncreaseTimeStamp;
                this.CheckBurnState();
                this.isWaiting = false;
              },
              (error) => {
                if (this.ethersService.debug) { console.log("GetStatsUsingGlobals >", error); }
                if (this.mustUpdate) {
                  this.lastHighBalance = -1n;
                  this.lastHighTimeStamp = -1n;
                  this.CheckBurnState();
                }
                this.isWaiting = false;
              }
            );
          },
          (error) => {
            this.fetchingtokenBalance = false;
            this.fetchingtokenGrossBalance = false;

            this.isWaiting = false;

            if (this.ethersService.debug) { console.log("GetEthersObjects >", error); }
          }
        );
      } else {
        this.address = '';
        this.balance = 0n;
        this.pDaiBalance = 0n;
        this.tokenBalance = 0n;
        this.tokenGrossBalance = 0n;
        this.minimumRequiredDeposit = 0n;

        this.hasPenaltyPeriodError = false;
        this.timeStampWhenDepositRequired = 0n;
        this.timeStamp = 0n;
        this.lastHighBalance = 0n;
        this.lastHighTimeStamp = 0n;
        this.CheckBurnState();
        this.SetTimeTillDepositRequired();

        this.fetchingtokenBalance = false;
        this.fetchingtokenGrossBalance = false;

        this.isWaiting = false;

        if (this.ethersService.debug) { console.log("No Accounts Found"); }
      }
    },
    (error) => {
      this.fetchingtokenBalance = false;
      this.fetchingtokenGrossBalance = false;

      this.isWaiting = false;

      if (this.ethersService.debug) { console.log("GetAccountsList >", error); }
    });
  }

  InBurnState(): boolean {
    // Do various checks to cater for when some info may be missing...
    return (this.tokenGrossBalance != this.tokenBalance
      && !this.fetchingtokenGrossBalance
      && !this.fetchingtokenBalance
      && this.tokenGrossBalance != -1n
      && this.tokenBalance != -1n)                 // Balance <> GrossBalance means burning is in progress
  || this.hasPenaltyPeriodError                   // Having a Penalty Period error means burning is in progress
  || (this.lastHighTimeStamp != 0n
      && this.lastHighTimeStamp != -1n
      && this.timeStamp != 0n
      && this.timeStamp != -1n
      && BigInt(this.timeStamp) - BigInt(this.lastHighTimeStamp) > 129600n); // Having a day and half old last high time means burning is in progress
  }

  CheckBurnState() {
    // Do various checks to cater for when some info may be missing...
    this.inBurn = this.InBurnState();
    this.isBurnStateDetermined =  (!this.fetchingtokenGrossBalance && !this.fetchingtokenBalance && this.tokenGrossBalance != -1n && this.tokenBalance != -1n)
                                || (this.minimumRequiredDeposit != -1n || this.hasPenaltyPeriodError)
                                || (this.lastHighTimeStamp != 0n && this.lastHighTimeStamp != -1n && this.timeStamp != 0n && this.timeStamp != -1n);

    if (this.inBurn) {
      if (this.ethersService.debug) { console.log(BigInt(this.timeStamp), BigInt(this.lastHighTimeStamp), this.tokenGrossBalance, this.tokenBalance, this.hasPenaltyPeriodError, this.lastHighBalance); }
    }
  }

  SendAddressWarning(): boolean {
    return (this.address != ''
            && this.tokenGrossBalance == 0n
            && this.lastHighBalance != 0n
            && this.lastHighBalance != -1n
            && this.InBurnState());  //TODO: Calculate % to be burnt and store details for display
  }

  GetNetwork(): string {
    return (Number(this.networkID) == 369) ? 'PULSECHAIN' : ((Number(this.networkID) == 1) ? 'ETHEREUM' : this.networkName.toUpperCase()) + ' (DaiToA$ not available)';
  }

  GetAddress(): string {
    return this.address;
  }

  GetPLSBalance(): string {
    return this.ethersService.FormatEther(this.balance);
  }

  GetDAIBalance(): string {
    return this.ethersService.FormatEther(this.pDaiBalance);
  }

  GetAvailableBalance(): string {
    return this.ethersService.FormatEther(this.tokenBalance);
  }

  GetGrossBalance(): string {
    return this.ethersService.FormatEther(this.tokenGrossBalance);
  }

  GetMinimumRequiredDeposit(): string {
    if (this.InBurnState()) {
      return 'In penalty period. Any deposit or withdrawal amount will reset.';
    }
    if (this.minimumRequiredDeposit == -1n) {
      return '';
    }
    return Number(this.ethersService.FormatEther(this.minimumRequiredDeposit)).toFixed(3) + ' DaiToA$';
  }

  SetTimeTillDepositRequired() {
    if (this.timeStampWhenDepositRequired == 0n || this.timeStamp == 0n || this.timeStampWhenDepositRequired == -1n || this.timeStamp == -1n) {
      this.timeTillDepositRequired = '';
    }
    else if ((this.tokenBalance == 0n && this.tokenGrossBalance != 0n && this.tokenGrossBalance != -1n) || this.lastHighBalance == 0n) {
      this.timeTillDepositRequired = '-';
    }
    else {
      this.timeTillDepositRequired = (Number((BigInt(this.timeStampWhenDepositRequired) - BigInt(this.timeStamp))) / 3600).toFixed(3);
    }

    if (this.ethersService.debug) { console.log("SetTimeTillDepositRequired: ", this.timeStampWhenDepositRequired, this.timeStamp, this.timeTillDepositRequired); }
  }

  TimeTillDepositRequired(): string {
    if (this.timeStampWhenDepositRequired == 0n || this.timeStamp == 0n || this.timeStampWhenDepositRequired == -1n || this.timeStamp == -1n) {
      return '';
    }
    else if ((this.tokenBalance == 0n && this.tokenGrossBalance != 0n && this.tokenGrossBalance != -1n) || this.lastHighBalance == 0n) {
      return '-';
    }
    else {
      return (Number((BigInt(this.timeStampWhenDepositRequired) - BigInt(this.timeStamp))) / 3600).toFixed(3);
    }

  }

  GetExemptAddresses(): void {
    this.ethersService.GetExemptAddresses().then(
      (results) => {
        console.log(results);
      },
      (error) => {
        console.log(error);
      }
    );
  }

  BuyD2AD(){
    if (this.minimumRequiredDeposit != -1n) {
      window.open(this.nineMMD2ADUrl + (Number(this.ethersService.FormatEther(this.minimumRequiredDeposit)) * 1.00001).toFixed(12), "_blank");
    }
  }
  BuypDAI(){
    window.open(this.ninePLS_DAIUrl, "_blank");
  }

  Connect(): void {
    this.ethersService.Connect().then(
      (results) => {
        if (this.ethersService.debug) { console.log('hello'); }
        if (this.ethersService.debug) { console.log(results); }
        this.FetchAccountData();
      },
      (error) => {
        if (this.ethersService.debug) { console.log('goodbye'); }
        if (this.ethersService.debug) { console.log(error); }
      }
    );
  }

  forceReload() {
    // const form = document.createElement('form');
    // form.method = "POST";
    // form.action = location.href;
    // document.body.appendChild(form);
    // form.submit();
    window.location.reload();
  }
}
