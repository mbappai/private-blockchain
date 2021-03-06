/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message` 
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *  
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');
const bitcoin = require('bitcoinjs-lib');


class Blockchain {

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also everytime you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {
        if( this.height === -1){
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        return new Promise((resolve, reject) => {
            resolve(this.height);
        });
    }

    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block 
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happen during the execution.
     * You will need to check for the height to assign the `previousBlockHash`,
     * assign the `timestamp` and the correct `height`...At the end you need to 
     * create the `block hash` and push the block into the chain array. Don't forget 
     * to update the `this.height`
     * Note: the symbol `_` in the method name indicates in the javascript convention 
     * that this method is a private method. 
     */
    _addBlock(block) {
        let self = this;
        return new Promise(async (resolve, reject) => {

            if(!block){
                reject(Error('No new block to add'))
            }

            if(self.height >= 0){
                // set previous hash if block height is greater than 0
                block.previousBlockHash = self.chain[self.chain.length-1].hash;
            }

            block.time = new Date().getTime().toString().slice(0,-3);
            block.height = self.chain.length ;
            block.hash = SHA256(JSON.stringify(block)).toString();


                    // if block is not genesis; validate before adding to block

                    //validate chain before adding blocks
                    const errorLog = await self.validateChain();
                    // proceed only when there is no errorLog
                    if( errorLog.length === 0){
                        
                        // add block and update chain height
                        self.chain.push(block);
                        self.height++;

                    }else{
                        console.log('New block cannot be added because chain is defective')
                        console.log(errorLog)
                    }

                

            resolve(block)
    
           
        });
    }

    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * This is the first step before submit your Block.
     * The method return a Promise that will resolve with the message to be signed
     * @param {*} address 
     */
    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
            if(address){
                let message = `${address}:${new Date().getTime().toString().slice(0,-3)}:starRegistry`
                resolve(message)
            }else{
                reject(Error('Please provide a valid address'));
            }
        });
    }

    signMessage(_privateKey, message){
        return new Promise((resolve,reject)=>{
            if(_privateKey && message){
                let keyPair = bitcoin.ECPair.fromWIF(_privateKey);
                let privateKey = keyPair.privateKey

                let signature = bitcoinMessage.sign(message, privateKey, keyPair.compressed)
                console.log(signature.toString('base64'))
                resolve(signature.toString('base64'))
            }else{
                reject(Error('Please provide all parameters'))
            }
        })
    }

    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * Algorithm steps:
     * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
     * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
     * 3. Check if the time elapsed is less than 5 minutes
     * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
     * 5. Create the block and add it to the chain
     * 6. Resolve with the block added.
     * @param {*} address 
     * @param {*} message 
     * @param {*} signature 
     * @param {*} star 
     */
    submitStar(address, message, signature, star) {
        let self = this;
        
        return new Promise(async (resolve, reject) => {
            if(!star){
                reject(Error('Please submit a star to add to block'))
            }
            let timeFromMessage =  parseInt(message.split(':')[1]);
            let currentTime = parseInt(new Date().getTime().toString().slice(0,-3));
            let timeDifference = (timeFromMessage/1000) - (currentTime/1000);

            if(timeDifference < 300){

                let messagePrefix = "";
                let isVerified = bitcoinMessage.verify(message,address,signature,messagePrefix);

                // console.log(isVerified)
                if(isVerified){
                    //create the block
                    let starObject = {
                        address,
                        message,
                        signature,
                        star
                    }
                    // store starObject in a block
                    let block = new BlockClass.Block(starObject);
                    // add newly created block (starObject) in the chain array
                    let newBlock = await self._addBlock(block)
                        //resolve with the created block
                        resolve(newBlock)
                }
                reject(Error('Problem occured while verifying address'))
            }
            reject(Error('TIME ELAPSED: Make sure you submit a star within 5 mins after message signing'))


        });
    }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash 
     */
    getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve, reject) => {
            if(!hash){
                reject('Please provide a block hash to search for')
            }
           let targetBlock = self.chain.filter(block=>block.hash == hash)[0];
           resolve(targetBlock);
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block object 
     * with the height equal to the parameter `height`
     * @param {*} height 
     */
    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(p => p.height === height)[0];
            if(block){
                resolve(block);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain 
     * and are belongs to the owner with the wallet address passed as parameter.
     * Remember the star should be returned decoded.
     * @param {*} address 
     */
    getStarsByWalletAddress (address) {
        let self = this;
        let stars = [];
        return new Promise(async(resolve, reject) => {
            for(let block of self.chain){
                //decode data before accessing.
                let decodedBlock = JSON.parse(Buffer.from(block.body,'hex'))
                // let decodedBlock = await block.getBData()

                if(decodedBlock.address === address){
                    stars.push(decodedBlock.star);
                }
            }
            resolve(stars)
        });
    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validateBlock`
     * 2. Each Block should check the with the previousBlockHash
     */
    validateChain() {
        let self = this;
        let errorLog = [];
        return new Promise(async (resolve, reject) => {


            // WE CAN ONLY START VALIDATING CHAIN AFTER THE GENESIS BLOCK
            // HAS BEEN ADDED, HENCE THE CONDITION BELOW.
            if(self.chain.length === 0) resolve([])

            for(let i=0; i<self.chain.length; i++){

                try{
                    // validate two blocks
                    await self.chain[i].validate()
                }catch(err){
                    errorLog.push(`DANGER: Block ${self.chain[i].height} has been tampered with`)
                }
                

                 // compare hashes
                 if(i>0 && self.chain[i].previousBlockHash != self.chain[i-1].hash){
                     errorLog.push(self.chain[i-1]);
                 }


            }
            resolve(errorLog)
                    
                    });
    }

    tamperBlockchain(data){
        let self = this;
        return new Promise(async(resolve,reject)=>{
            // tamper with chain at block 2
            self.chain[2].body = Buffer.from(JSON.stringify(data)).toString('hex');
            self.chain[2].time = new Date().getTime().toString().slice(0,-3);
            self.chain[2].hash = SHA256(JSON.stringify(data)).toString();
            resolve(self.chain[2])
        })
    }

}

module.exports.Blockchain = Blockchain;   