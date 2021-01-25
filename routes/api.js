'use strict';
const mongoose = require('mongoose');
const mongodb = require('mongodb');
const fetch = require('node-fetch');
let db = mongoose.connect(process.env.DB, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set('useFindAndModify', false);

module.exports = function (app) {

  const stockSchema = new mongoose.Schema({
    symbol: String,
    likes: {type: Number, default: 0},
    ips: [String]
    });

  const Stock = mongoose.model('Stock', stockSchema);

  app.route('/api/stock-prices')
    .get(function (req, res){
      let responseObj = {}
      responseObj['stockData'] = {}

      // One stock or two?
      let multipleStocks = false

      // 6) Output
      let output = () => {
        return res.json(responseObj)
      }

      // 5a) Create response for 1 stock
      let oneStock = (stockDoc, nextStep) => {
        responseObj['stockData']['stock'] = stockDoc['symbol']
        responseObj['stockData']['price'] = stockDoc['price']
        responseObj['stockData']['likes'] = stockDoc['likes']
        nextStep()
      }

      let stocks = []
      // 5b) Create response for 2 stocks
      let twoStocks = (stockDoc, nextStep) => {
        let newStock = {}
        newStock['stock'] = stockDoc['symbol']
        newStock['price'] = stockDoc['price']
        newStock['likes'] = stockDoc['likes']
        stocks.push(newStock)
        if(stocks.length === 2){
          stocks[0]['rel_likes'] = stocks[0]['likes'] - stocks[1]['likes']
          stocks[1]['rel_likes'] = stocks[1]['likes'] - stocks[0]['likes']
          responseObj['stockData'] = stocks
          nextStep()
        } else {
          return
        }

      }

      // 4) Get price
      let getPrice = (stockDoc, nextStep) => {
        fetch(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stockDoc['symbol']}/quote`)
        .then(response => response.json())
        .then(data => {
            stockDoc['price'] = parseFloat(data['latestPrice'].toFixed(2));
            nextStep(stockDoc, output)
        })
      }

      // 3) Find or Update Stock in DB
      let findOrUpdateStock = (stockName, docUpdate, nextStep) => {
        Stock.findOneAndUpdate(
          {symbol: stockName},
          docUpdate,
          {new: true, upsert: true},
          (error, stockDoc) => {
            if(error){
              console.log(error)
            } else if (!error && stockDoc){
                if(multipleStocks === false){
                  return nextStep(stockDoc, oneStock) // nextStep is "getPrice"
                } else {
                  return nextStep(stockDoc, twoStocks) // nextStep is "getPrice
                }
            }
          }
        )
      }

      // 2) Like stock?
      let likeStock = (stockName, nextStep) => {
        Stock.findOne({symbol: stockName}, (error, stockDoc) => {
          if(!error && stockDoc && stockDoc['ips'] && stockDoc['ips'].includes(req.ip)) {
            return res.send('Error: You have already liked this stock.')
          } else {
            let docUpdate = {$inc: {likes: 1}, $push: {ips: req.ip}}
            nextStep(stockName, docUpdate, getPrice)
          }
        })
      }

      // 1) Process Input (one or two stocks?)
      if(typeof (req.query.stock) === 'string'){
        // one stock
        let stockName = req.query.stock
        let docUpdate = {}
        // if like and it's set to true, go to likeStock step
        if(req.query.like && req.query.like === 'true'){
          likeStock(stockName, findOrUpdateStock)
        // if there is no like request query or it's set to false, skip likeStock and go straight to getPrice
        } else{
            findOrUpdateStock(stockName, docUpdate, getPrice)
      } 
    } else if (Array.isArray(req.query.stock)){
        multipleStocks = true;
        // stock 1
        var stockName = req.query.stock[0]
        // if like and it's set to true, go to likeStock step
        if(req.query.like && req.query.like === 'true'){
          likeStock(stockName, findOrUpdateStock)
        // if there is no like request query or it's set to false, skip likeStock and go straight to getPrice
        } else{
            let docUpdate = {}
            findOrUpdateStock(stockName, docUpdate, getPrice)
        }
        // stock 2
        var stockName = req.query.stock[1]
        // if like and it's set to true, go to likeStock step
        if(req.query.like && req.query.like === 'true'){
          likeStock(stockName, findOrUpdateStock)
        // if there is no like request query or it's set to false, skip likeStock and go straight to getPrice
        } else{
            let docUpdate = {}
            findOrUpdateStock(stockName, docUpdate, getPrice)
        }
      }
  })
}