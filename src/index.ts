import fs from "fs";
import Web3 from "web3";
import KYVE from "@kyve/logic";

// TODO: Don't harcode the following constants!!!
const pool = "Avalanche: C-Chain";
const jwk = JSON.parse(fs.readFileSync("./arweave.json").toString());
const endpoint = "wss://api.avax.network/ext/bc/C/ws";

const upload = async (subscriber: any) => {
  const client = new Web3(new Web3.providers.WebsocketProvider(endpoint));

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

const validate = async (subscriber: any) => {
  const main = async (
    latestArweaveBlock: number,
    latestArweaveTx: string = ""
  ) => {
    let res = await all(uploadQuery, {
      uploader,
      pool,
      architecture: "Avalanche",
      latest: latestArweaveBlock + 1,
    });

    // get new data
    const index = res.findIndex((edge) => edge.node.id === latestArweaveTx);

    if (index > -1) {
      res = res.reverse().slice(index, res.length - 1);
    }

    for (const edge of res) {
      const id = edge.node.id;
      const height = parseFloat(
        edge.node.tags.find((tag) => tag.name === "Height")?.value!
      );

      // get block and prepare it
      let block = await client.eth.getBlock(height);

      const txs = [];
      for (const id of block.transactions) {
        const tx = await client.eth.getTransaction(id);

        txs.push(tx);
        tags.push({ name: "Transaction", value: tx.hash });
      }
      // @ts-ignore
      block.transactions = txs;
      // create a hash of the local block
      const localHash = hash(block);

      // get tx data from uploader
      const data = await client.transactions.getData(id, {
        decode: true,
        string: true,
      });
      const compareHash = hash(JSON.parse(data.toString()));

      subscriber.next({ valid: localHash === compareHash, id });

      latestArweaveTx = id;
      latestArweaveBlock = edge.node.block.height;
    }

    setTimeout(main, 5000, latestArweaveBlock, latestArweaveTx);
  };

  await main((await client.network.getInfo()).height);
};

const instance = new KYVE(upload, validate, {
  pool,
  jwk,
});

(async () => {
  await instance.run();
})();
