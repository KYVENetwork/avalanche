import Arweave from "arweave";
import {
  UploadFunctionSubscriber,
  ListenFunctionObservable,
  ValidateFunctionSubscriber,
} from "@kyve/logic/dist/faces";
import Web3 from "web3";
import KYVE from "@kyve/logic";
import hash from "object-hash";
import { JWKInterface } from "arweave/node/lib/wallet";

const arweave = new Arweave({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

const upload = async (uploader: UploadFunctionSubscriber, config: any) => {
  const client = new Web3(
    new Web3.providers.WebsocketProvider(config.endpoint)
  );

  client.eth.subscribe("newBlockHeaders").on("data", async (blockHeader) => {
    const tags = [
      { name: "Block", value: blockHeader.hash },
      { name: "Height", value: blockHeader.number.toString() },
    ];

    let block = await client.eth.getBlock(blockHeader.hash, true);

    block.transactions.map((transaction) =>
      tags.push({ name: "Transaction", value: transaction.hash })
    );

    uploader.next({ data: block, tags });
  });
};

const validate = async (
  listener: ListenFunctionObservable,
  validator: ValidateFunctionSubscriber,
  config: any
) => {
  const client = new Web3(
    new Web3.providers.WebsocketProvider(config.endpoint)
  );

  listener.subscribe(async (res) => {
    const height = parseFloat(
      res.transaction.tags.find((tag) => tag.name === "Height")?.value!
    );

    // get block and prepare it
    let block = await client.eth.getBlock(height);

    const txs = [];
    for (const id of block.transactions) {
      const tx = await client.eth.getTransaction(id);

      txs.push(tx);
    }
    // @ts-ignore
    block.transactions = txs;
    // create a hash of the local block
    const localHash = hash(block);

    // get tx data from uploader
    const data = await arweave.transactions.getData(res.id, {
      decode: true,
      string: true,
    });
    const compareHash = hash(JSON.parse(data.toString()));

    validator.next({ valid: localHash === compareHash, id: res.id });
  });
};

export default function main(pool: string, jwk: JWKInterface) {
  const instance = new KYVE(
    {
      pool,
      jwk,
    },
    upload,
    validate
  );

  return instance;
}
