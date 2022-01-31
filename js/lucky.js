let nftContract;
let currentAddress;
let kaikas = false;
const nftAddress = "0x7727712C2D37c6A30668FD142b0a6B6E5f450145";
const nftAbi = lucky2022_abi;

window.addEventListener("load", function () {
  getTotalSupplyNoWallet();
  initWeb3();
  if (typeof window.web3 !== "undefined") {
    observeAccount();
    startApp();
  } else {
    alert("Kaikas 또는 Metamask를 설치해주세요.");
  }
});

function initWeb3() {
  if (typeof window.caver !== "undefined") {
    window.web3 = new Web3(window.caver);
    kaikas = true;
  } else {
    window.web3 = new Web3(window.ethereum);
    kaikas = false;
  }
}

function observeAccount() {
  try {
    web3.currentProvider.on("accountsChanged", (accounts) => {
      startApp();
    });
    web3.currentProvider.on("chainChanged", (chainId) => {
      window.location.reload();
    });
  } catch (error) {
    console.log(err);
  }
}

async function startApp() {
  try {
    await getAccount();
    showCardList();
  } catch (err) {
    console.log(err);
  }
}

async function getAccount() {
  try {
    if (kaikas) {
      nftContract = new caver.klay.Contract(nftAbi, nftAddress);
      let account = window.klaytn.selectedAddress;
      if (account != null) {
        currentAddress = account;

        $("#my-addr-btn").text(currentAddress);
        $("#my-addr-btn").show();
        $("#connect-btn").hide();
        await getTotalSupply();
      } else {
        $("#connect-btn").show();
        $("#my-addr-btn").hide();
      }
    } else {
      nftContract = new web3.eth.Contract(nftAbi, nftAddress);
      var accounts = await web3.eth.getAccounts();
      if (accounts.length > 0) {
        currentAddress = accounts[0];

        $("#my-addr-btn").text(currentAddress);
        $("#connect-btn").hide();
        $("#my-addr-btn").show();
        await getTotalSupply();
      } else {
        $("#connect-btn").show();
        $("#my-addr-btn").hide();
      }
    }
  } catch (err) {
    $("#connect-btn").show();
    $("#my-addr-btn").hide();
    $("#my-addr-btn").html("Klaytn 지갑을 선택해 주세요.");
  }
}

function detailWallet() {
  window.open("https://scope.klaytn.com/account/" + currentAddress);
}

function connectWallet() {
  if (kaikas) {
    window.klaytn
      .enable()
      .then((accounts) => {
        currentAddress = accounts[0];
        $("#my-addr-btn").text(currentAddress);
        startApp();
      })
      .catch((err) => {
        if (err.code === 4001) {
          console.log("Please connect to Your wallet!");
        } else {
          console.error(err);
        }
      });
  } else {
    window.ethereum
      .request({ method: "eth_requestAccounts" })
      .then((accounts) => {
        currentAddress = accounts[0];
        $("#my-addr-btn").text(currentAddress);
        startApp();
      })
      .catch((err) => {
        if (err.code === 4001) {
          console.log("Please connect to Your wallet!");
        } else {
          console.error(err);
        }
      });
  }
}

async function getTotalSupply() {
  getMintingInfo(nftContract);
}

async function getTotalSupplyNoWallet() {
  let pWeb3 = new Web3(
    new Web3.providers.HttpProvider("https://public-node-api.klaytnapi.com/v1/cypress")
  );
  let pContract = new pWeb3.eth.Contract(nftAbi, nftAddress);
  getMintingInfo(pContract);
}

async function getMintingInfo(contract) {
  let mintedCnt = await contract.methods.totalSupply().call();
  let total_mint_cnt = document.getElementById("total_mint_cnt");
  total_mint_cnt.innerText = mintedCnt;
}

async function mint() {
  try {
    const fee_wei = await nftContract.methods.MINTING_FEE().call();
    const mintingCount = $("#mint_count option:selected").val();

    const wei_value = ethers.BigNumber.from(fee_wei).mul(mintingCount);
    const total_mintingfee = ethers.utils.formatEther(wei_value);

    if (kaikas) {
      let estmated_gas;
      await nftContract.methods
        .publicMint(mintingCount)
        .estimateGas({
          from: currentAddress,
          value: ethers.utils.parseEther(total_mintingfee.toString()),
        })
        .then(function (gasAmount) {
          estmated_gas = gasAmount;
        })
        .catch(function (error) {
        });

      nftContract.methods
        .publicMint(mintingCount)
        .send({
          from: currentAddress,
          gas: estmated_gas,
          value: ethers.utils.parseEther(total_mintingfee.toString()),
        })
        .on("transactionHash", (txid) => {
        })
        .once("allEvents", (allEvents) => {
        })
        .once("Transfer", (transferEvent) => {
        })
        .once("receipt", (receipt) => {
          setMintResult(receipt);
        })
        .on("error", (error) => {
          console.log(error);
        });
    } else {
      nftContract.methods
        .publicMint(mintingCount)
        .send({
          from: currentAddress,
          value: ethers.utils.parseEther(total_mintingfee.toString()),
        })
        .on("transactionHash", (txid) => {
        })
        .once("allEvents", (allEvents) => {
        })
        .once("Transfer", (transferEvent) => {
        })
        .once("receipt", (receipt) => {
          setMintResult(receipt);
        })
        .on("error", (error) => {
          console.log(error);
        });
    }
  } catch (error) {
    console.log("error : ", error);
  }

  async function setMintResult(receipt) {
    if (receipt.status) {
      let resultTokenIds = [];
      if (Array.isArray(receipt.events.Transfer)) {
        receipt.events.Transfer.map((tranfervalue) => {
          resultTokenIds.push(tranfervalue.returnValues.tokenId);
        });
      } else {
        resultTokenIds.push(receipt.events.Transfer.returnValues.tokenId);
      }
      getTotalSupply();
      showCardList();
    }
  }
}

loadItemDetail = async (tokenId) => {
  try {
    let tokenInfoBase64 = await nftContract.methods.tokenURI(tokenId).call();
    let jsonInfo = JSON.parse(atob(tokenInfoBase64.substring(29)));
    return jsonInfo;
  } catch (error) {
    return "";
  }
};

showCardList = async () => {
  let tokenIds = await nftContract.methods.tokensOf(currentAddress).call();

  if (tokenIds.length > 0) {
    let my_item_count = document.getElementById("my_item_count");
    my_item_count.innerText = tokenIds.length;
    $("#minted_item_wrap").show();
  } else {
    my_item_count.innerText = 0;
    $("#minted_item_wrap").hide();
  }

  document.getElementById("minted_item").innerHTML = "";

  const mintedItems = await Promise.all(
    tokenIds.map((id) => {
      return loadItemDetail(id);
    })
  );

  mintedItems.map(item => {
    console.log(item);
    let card = document.createElement("div");
    let imgBox = document.createElement("div");
    let descriptionBox = document.createElement("div");
    let tokenId = document.createElement("div");
    imgBox.innerHTML = '<img width="200" height="200" type="image/svg+xml" src="' + item.image + '"/>';
    tokenId.innerHTML = item.name;
    card.appendChild(imgBox);
    card.appendChild(descriptionBox);
    descriptionBox.appendChild(tokenId);
    document.getElementById("minted_item").appendChild(card);
  });
}