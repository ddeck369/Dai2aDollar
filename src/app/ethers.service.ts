import { Injectable, OnDestroy, OnInit } from '@angular/core';
import {
  ethers,
  Contract,
  BrowserProvider,
  EventLog,
  BigNumberish,
} from 'ethers';
import { fromEvent, Observable, Subject, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
//import newAbi from '../assets/Full_abi.json';
//import { MetaMaskInpageProvider } from "@metamask/providers";  // enable when can run :npm install @metamask/providers

declare global {
  interface Window{
    //ethereum?:MetaMaskInpageProvider // enable when can run :npm install @metamask/providers
    ethereum: any
  }
}

// import { InjectionToken } from '@angular/core';
// import { getDefaultProvider } from 'ethers';
// import { environment } from 'src/environments/environment';

// export const PROVIDER = new InjectionToken<providers.BaseProvider>('Ethereum Provider', {
//   providedIn: 'root',
//   factory: () => getDefaultProvider(environment.network)
// });

@Injectable({
  providedIn: 'root',
})
export class EthersService implements OnInit, OnDestroy {
  //public accountChange: Observable<boolean>;
  public accountChange = new Subject<boolean>();
  public chainChange = new Subject<boolean>();
  public blockChange = new Subject<boolean>();
  // public tokenTransfer = new Subject<boolean>();

  private provider: ethers.BrowserProvider | undefined;
  private signer: ethers.JsonRpcSigner | undefined;
  private contract: ethers.Contract | undefined;
  private pDaiContract: ethers.Contract | undefined;
  public blockNumber: number = 0;
  public networkID: BigInt = 0n;
  public networkName: string = '';
  public address: string = '';

  public debug: boolean = false;

  private listenerProvider!: BrowserProvider;
  private blockListener!: any;

  constructor() {
    // ================== Events ===================
    // --- Account Change ---
    // this.accountChange = fromEvent(
    //   (window as any).ethereum,
    //   'accountsChanged'
    // ).pipe(
    //   map((res: any) => {
    //     return true;
    //   })
    // );

    console.log('constructing');

    if ((window as any).ethereum) {

      (window as any).ethereum.on('accountsChanged', (accounts: any) => {
        if (accounts && accounts.length == 0) {
          this.address = 'disconnected';
        }
        this.accountChange.next(true);
        if (this.debug) { console.log('Accounts changed:', accounts); }
      });

      // --- Chain Change ---
      (window as any).ethereum.on('chainChanged', (chain: any) => {
        this.chainChange.next(true);
        if (this.debug) { console.log('Network changed:', chain); }

        this.listenerProvider.off("block");
        this.listenerProvider = this.GetProvider();
        this.listenerProvider.on("block", this.blockListener);
      });

      // --- Block change event detection ---
      let timeout: any;
      this.blockListener = async (blockNumber: any) => {

        if (this.debug) { console.log("new block: " + blockNumber.toString()); }

        clearTimeout(timeout);
        timeout = setTimeout(async () => {
          this.blockChange.next(true);
        }
        , 100);
      }
      this.listenerProvider = this.GetProvider();
      this.listenerProvider.on("block", this.blockListener);

      // --- Other events if needed ---
      (window as any).ethereum.on('disconnect', () => {
        if (this.debug) { console.log('Disconnected'); }
      });

      (window as any).ethereum.on('connect', () => {
        if (this.debug) { console.log('Connected'); }

        this.address = '';

        this.listenerProvider.off("block");
        this.listenerProvider = this.GetProvider();
        this.listenerProvider.on("block", this.blockListener);

        this.accountChange.next(true);

        // Use this to convert abi to human readable form...
        // console.log(newAbi);
        // const iface = new ethers.Interface(newAbi);
        // console.log(iface.format(false));
      });
    }

//     (window as any).ethereum.on('message', (msg: any) => {
//       console.log('Message:', msg);
//     });
  }

  ngOnDestroy(): void {}

  ngOnInit(): void {
    setInterval(() => {
      this.listenerProvider.off("block");
      this.listenerProvider = this.GetProvider();
      this.listenerProvider.on("block", this.blockListener);
     }, 14400000);  // Every 4 hours
  }
  //    npm install --save rxjs@6
  //    npm install --save rxjs-compat


  // ==============================================================================================
  // ================================== Standard Chain Functions ==================================
  // ==============================================================================================

  GetProvider(): BrowserProvider {
    // A Web3Provider wraps a standard Web3 provider, which is
    // what MetaMask injects as window.ethereum into each page
    if (this.debug) { console.log('getting prov'); }
    return new ethers.BrowserProvider(window.ethereum)
  }

  async GetAccountsList() {
    if (this.debug) { console.log('getting accounts'); }
    return await this.GetProvider().listAccounts();
  }

  async Connect() {
    // MetaMask requires requesting permission to connect users accounts
    return await this.GetProvider().send('eth_requestAccounts', []);
  }

  async GetNetwork() {
    return await this.GetProvider().getNetwork();
  }

  async GetBlock() {
    return await this.GetProvider().getBlockNumber();
  }
  async GetCurrentTimeStamp() {
    const provider = this.GetProvider();
    const blocknumber: number = await (provider as ethers.BrowserProvider).getBlockNumber();
    return (await (provider as ethers.BrowserProvider).getBlock(blocknumber))?.timestamp;
  }

  async GetBalance() {
    return await this.GetProvider().getBalance(this.GetAddress());
  }
  async GetAddress() {
    const signer = await this.GetProvider().getSigner();
    return await signer.getAddress();
  }

  // async SendTransaction() {
  //   // The MetaMask plugin also allows signing transactions to
  //   // send ether and pay to change state within the blockchain.
  //   // For this, you need the account signer...
  //   const signer = await this.GetProvider().getSigner();

  //   // Send 1 ether to an ens name.
  //   const tx = signer.sendTransaction({
  //     to: 'ricmoo.firefly.eth',
  //     value: ethers.parseEther('1.0'),
  //   });
  // }

  FormatEther(value: ethers.BigNumberish) {
    return ethers.formatEther(value);
  }

  // ===============================================================================================
  // ================================== Custom Contract Functions ==================================
  // ===============================================================================================

  //===================== Contracts ======================

  dai2adAddress = '0xB601A3af87fceF38b158C4864F20CA898390ac00';
  pdaiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

  dai2adAbi = [
    'constructor()',
    'error ECDSAInvalidSignature()',
    'error ECDSAInvalidSignatureLength(uint256 length)',
    'error ECDSAInvalidSignatureS(bytes32 s)',
    'error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)',
    'error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)',
    'error ERC20InvalidApprover(address approver)',
    'error ERC20InvalidReceiver(address receiver)',
    'error ERC20InvalidSender(address sender)',
    'error ERC20InvalidSpender(address spender)',
    'error ERC2612ExpiredSignature(uint256 deadline)',
    'error ERC2612InvalidSigner(address signer, address owner)',
    'error InvalidAccountNonce(address account, uint256 currentNonce)',
    'error InvalidShortString()',
    'error OwnableInvalidOwner(address owner)',
    'error OwnableUnauthorizedAccount(address account)',
    'error StringTooLong(string str)',
    'event Approval(address indexed owner, address indexed spender, uint256 value)',
    'event EIP712DomainChanged()',
    'event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'function DOMAIN_SEPARATOR() view returns (bytes32)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 value) returns (bool)',
    'function balanceOf(address account) view returns (uint256)',
    'function burnRequiredDepositToSkipOneDay()',
    'function decimals() view returns (uint8)',
    'function eip712Domain() view returns (bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)',
    'function getExemptAddresses() view returns ((string addressName, address exemptAddress)[])',
    'function getGrossBalanceOf(address account) view returns (uint256)',
    'function getMinimumRequiredDeposit() view returns (uint256)',
    'function getMinimumRequiredDepositOf(address account) view returns (uint256)',
    'function getStats() view returns ((uint256 lastBalanceIncreaseTimeStamp, uint256 lastHighBalance))',
    'function getStatsOf(address account) view returns ((uint256 lastBalanceIncreaseTimeStamp, uint256 lastHighBalance))',
    'function getTimeStampWhenDepositRequired() view returns (uint256)',
    'function getTimeStampWhenDepositRequiredOf(address account) view returns (uint256)',
    'function name() view returns (string)',
    'function nonces(address owner) view returns (uint256)',
    'function owner() view returns (address)',
    'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)',
    'function renounceOwnership()',
    'function setExemptAddress(string addressName, address exemptAddress)',
    'function symbol() view returns (string)',
    'function totalSupply() view returns (uint256)',
    'function transfer(address to, uint256 value) returns (bool)',
    'function transferFrom(address from, address to, uint256 value) returns (bool)',
    'function transferOwnership(address newOwner)'
   ]

   async GetEthersObjects() {
    if (this.debug) { console.log("in"); }
    this.provider = this.GetProvider();
    await (this.provider as ethers.BrowserProvider).getSigner().then(async (signer) => {
      this.contract = new Contract(this.dai2adAddress, this.dai2adAbi, signer);
      this.pDaiContract = new Contract(this.pdaiAddress, this.dai2adAbi, signer);
      this.address = await signer.getAddress();
    });
    this.blockNumber = await (this.provider as ethers.BrowserProvider).getBlockNumber();

    await this.provider.getNetwork().then((network) => {
      this.networkID = network.chainId;
      this.networkName = network.name;
    });

    if (this.debug) { console.log("out"); }
  }

  async GetBlockTimestampUsingGlobals() {
    return (await (this.provider as ethers.BrowserProvider).getBlock(this.blockNumber))?.timestamp;
  }

  async GetPLSBalanceUsingGlobals() {
    return await (this.provider as ethers.BrowserProvider).getBalance(this.address);
  }

  async GetDAIBalance() {
    await this.GetEthersObjects();
    return await this.GetDAIBalanceUsingGlobals();
  }
  async GetDAIBalanceUsingGlobals() {
    if (this.networkID != 369n) { return 0; }
    return await (this.pDaiContract as ethers.Contract)['balanceOf'](this.address);
  }

  async GetAvailableBalance() {
    await this.GetEthersObjects();
    return await this.GetAvailableBalanceUsingGlobals();
  }
  async GetAvailableBalanceUsingGlobals() {
    if (this.networkID != 369n) { return 0; }
    return await (this.contract as ethers.Contract)['balanceOf'](this.address);
  }

  async GetGrossBalance() {
    await this.GetEthersObjects();
    return await this.GetGrossBalanceUsingGlobals();
  }
  async GetGrossBalanceUsingGlobals() {
    if (this.networkID != 369n) { return 0; }
    return await (this.contract as ethers.Contract)['getGrossBalanceOf'](this.address);
  }

  async GetMinimumRequiredDeposit() {
    await this.GetEthersObjects();
    return await this.GetMinimumRequiredDepositUsingGlobals();
  }
  async GetMinimumRequiredDepositUsingGlobals() {
    if (this.networkID != 369n) { return 0; }
    return await (this.contract as ethers.Contract)['getMinimumRequiredDepositOf'](this.address);
  }

  async GetTimeStampWhenDepositRequired() {
    await this.GetEthersObjects();
    return await this.GetTimeStampWhenDepositRequiredUsingGlobals();
  }
  async GetTimeStampWhenDepositRequiredUsingGlobals() {
    if (this.networkID != 369n) { return 0; }
    return await (this.contract as ethers.Contract)['getTimeStampWhenDepositRequiredOf'](this.address);
    //TODO: Seems to return a value for address 0xa71c0A6c3f388C6917bcc87D505aeEf8b45fB131 when it shouldn't.
  }

  async GetStats() {
    await this.GetEthersObjects();
    return await this.GetStatsUsingGlobals();
  }
  async GetStatsUsingGlobals() {
    if (this.networkID != 369n) { return { lastBalanceIncreaseTimeStamp: 0, lastHighBalance: 0 }; }
    return await (this.contract as ethers.Contract)['getStatsOf'](this.address);
  }

  async GetExemptAddresses() {
    const signer = await this.GetProvider().getSigner();
    const contract = new Contract(this.dai2adAddress, this.dai2adAbi, signer);
    return await contract['getExemptAddresses'](signer.getAddress());
  }

  // async SendToken(amount: number, toAddress: string) {
  //   const signer = await this.GetProvider().getSigner();
  //   const contract = new Contract(this.dai2adAddress, this.dai2adAbi, signer);

  //   // The DAI Contract is currently connected to the Provider,
  //   // which is read-only. You need to connect to a Signer, so
  //   // that you can pay to send state-changing transactions.
  //   const plsxWithSigner = contract.connect(signer);

  //   // Each DAI has 18 decimal places
  //   const plsxAmount = ethers.parseUnits(amount.toString(), 18);

  //   // Send 1 DAI to toAddress
  //   //return await plsxWithSigner.transfer(toAddress, plsxAmount);
  // }
}
