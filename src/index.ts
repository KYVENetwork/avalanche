import fs from "fs";
import Web3 from "web3";
import KYVE from "@kyve/logic";

// TODO: Don't harcode the following constants!!!
const pool = "Avalanche: C-Chain";
const jwk = JSON.parse(fs.readFileSync("./arweave.json").toString());

const upload = async (subscriber: any) => {
  const client = new Web3(
    new Web3.providers.WebsocketProvider("wss://api.avax.network/ext/bc/C/ws")
  );

  client.eth.subscribe("newBlockHeaders").on("data", async (blockHeader) => {
    const tags = [
      { name: "Block", value: blockHeader.hash },
      { name: "Height", value: blockHeader.number },
    ];

    let block = await client.eth.getBlock(blockHeader.number);

    const txs = [];
    for (const id of block.transactions) {
      const tx = await client.eth.getTransaction(id);

      txs.push(tx);
      tags.push({ name: "Transaction", value: tx.hash });
    }
    // @ts-ignore
    block.transactions = txs;

    subscriber.next({ data: block, tags });
  });
};

const validate = async (subscriber: any) => {};

const instance = new KYVE(upload, validate, {
  pool,
  jwk,
});

(async () => {
  await instance.run();
})();
