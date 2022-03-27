var express = require('express');
var router = express.Router();
const config = require('../config');
const utils = require('../utils');
const {addBlockToChain} = require("../utils");
const axios = require("axios");

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

async function getBlocks(peer, from) {
    const blocksResult = await axios.get(peer);

    if (blocksResult.data.head) {

    }
}

setInterval(() => {
    // sync blocks from random 5 peers

    const tempPeers = shuffle(config.peers);

    const loopCount = tempPeers.length > 5 ? 5 : tempPeers.length;

    for (let i = 0; i < loopCount; i++) {
        const peer = tempPeers[i];


    }

}, config.sync_frequency * 1000);

/* GET home page. */
router.get('/', function(req, res, next) {
    res.json({
        "version": config.version,
        "status": "OK",
        "head": utils.Blocks.count(),
        "peers": config.peers,
        "chain": config.network_name,
        "network": config.network_id,
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
