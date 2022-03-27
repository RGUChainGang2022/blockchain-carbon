var express = require('express');
var router = express.Router();
const config = require('../config');
const utils = require('../utils');
const {addBlockToChain, signatureMatches, Blocks} = require("../utils");
const axios = require("axios");
const dhive = require("@hiveio/dhive");
const crypto = require("crypto");

if (config.node_key === "" || config.node_identity === "") {
    const mK = utils.generateMasterKey();

    console.log("Please set the following (Random) values in config.json:");
    console.log("node_key:", mK.toWif());
    console.log("node_identity:", mK.toPublic().toString());
    process.exit(1);
}

function shuffle(array) {
    let counter = array.length;

    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        let index = Math.floor(Math.random() * counter);

        // Decrease counter by 1
        counter--;

        // And swap the last element with it
        let temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }

    return array;
}

async function getBlocks(peer) {
    try {
        const blocksResult = await axios.get(peer);

        if (blocksResult.data.head && blocksResult.data.network === config.network_id) {
            if (blocksResult.data.head > utils.Blocks.count()) {
                // request all blocks from the peer
                const blocksRequest = await axios.get(peer + 'blocks_since/' + (utils.Blocks.count() - 1));

                const blocks = blocksRequest.data;

                // validate the signatures on the blocks and add them to the database if all sigs are valid
                // Using dhive api to validate the signatures

                for (let i = 0; i < blocks.length; i++) {
                    const block = blocks[i];

                    // Take the block.signature and validate it against the block.witness and block.block.previous_block
                    const blockSignature = block.signature;
                    const blockWitness = block.witness;
                    const blockPreviousBlock = block.block.previous_block;

                    // Check if the block is valid
                    // Use dHive signature API to verify the signature recovers into the witness
                    if (signatureMatches(blockSignature, blockWitness, JSON.stringify(block.block))) {
                        console.log("Block " + block.block.id + " is valid");
                        // Check transaction signatures
                        const {signature, data} = block.block.transactions[0];
                        if (signatureMatches(signature, config.network_key_public, JSON.stringify(data))) {
                            console.log("Transaction " + JSON.stringify(data) + " is valid");
                            // Check if the previous block is valid
                            const previousBlock = utils.Blocks.find({number: block.number - 1}).run();

                            // create a sha-256 hash of the previous block
                            const sha256Hash = crypto.createHash("sha256");

                            // hash the string
                            // and set the output format
                            let previousBlockHash = "0000000000000000000000000000000000000000000000000000000000000000";

                            if (block.number > 0) {
                                previousBlockHash = sha256Hash.update(JSON.stringify(previousBlock)).digest("hex");
                            }

                            if (previousBlockHash === blockPreviousBlock) {
                                console.log("Previous block is valid");
                                // This block is gucci

                                // Add the block to the database
                                Blocks.add(block);
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {}
}

const tim = async () => {
    // sync blocks from random 5 peers

    const tempPeers = shuffle(config.peers);

    const loopCount = tempPeers.length > 5 ? 5 : tempPeers.length;

    for (let i = 0; i < loopCount; i++) {
        const peer = tempPeers[i];

        await getBlocks(peer);
    }

    setTimeout(tim, config.sync_frequency * 1000);

};

setTimeout(tim, config.sync_frequency * 1000);

/* GET home page. */
router.get('/', function(req, res, next) {
    res.json({
        "version": config.version,
        "status": "OK",
        "head": utils.Blocks.count(),
        "peers": config.peers,
        "chain": config.network_name,
        "network": config.network_id,
        node: {
            name: config.node_name,
            description: config.node_description,
            public_key: config.node_identity
        }
    })
});

router.post('/add_block', function(req, res, next) {
    return res.json(addBlockToChain(req.body));
});

router.get('/blocks_since/:block_id', function(req, res, next) {
    const block_id = req.params.block_id;
    const blocks = utils.Blocks.find({}).gt('number', block_id).run();
    return res.json(blocks);
});

// get the last x blocks
router.get('/last_blocks/:count', function(req, res, next) {
    try {
        const count = req.params.count;
        const blockCount = utils.Blocks.count();
        const mustBeAbove = blockCount - parseInt(count);

        const blocks = utils.Blocks.find({}).gte("number", mustBeAbove).run();
        return res.json(blocks);
    } catch (e) {
        return res.json({
            "error": e.message
        });
    }
});

router.get("/limited_blocks_since/:block_id/:limit", function(req, res, next) {
    try {
        const blocks = utils.Blocks.find({}).gt('number', req.params.block_id).limit(parseInt(req.params.limit)).run();
        return res.json(blocks);
    } catch (e) {
        return res.json({
            "error": e.message
        });
    }
});

router.get('/blocks', function(req, res, next) {
    const blocks = utils.Blocks.find({}).run();
    return res.json(blocks);
});

module.exports = router;
