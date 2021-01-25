const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {

  suite('GET /api/stock-prices => stockData object', function() {
    test('1 stock', function(done) {
      chai.request(server)
      .get('/api/stock-prices')
      .query({stock: 'v'}) // 1
      .end(function(err, res){
        assert.equal(res.body['stockData']['stock'], 'v') // 1
        assert.isNotNull(res.body['stockData']['price'])
        assert.isNotNull(res.body['stockData']['likes'])
        done();
       })
      });

    test('1 stock with like', function(done) {
      chai.request(server)
      .get('/api/stock-prices')
      .query({stock: 'nke', like: true}) // 2 (change every testing)
      .end(function(err, res){
        assert.equal(res.body['stockData']['stock'], 'nke') // 2
        assert.equal(res.body['stockData']['likes'], 1)
        done();
      })
    })

    test('1 stock and attempt second like', function(done) {
      chai.request(server)
      .get('/api/stock-prices')
      .query({stock: 'nke', like: true}) // 2 (change)
      .end(function(err, res){
        assert.equal(res.text, 'Error: You have already liked this stock.')
        done();
      });
    });

    test('2 stocks', function(done) {
      chai.request(server)
      .get('/api/stock-prices')
      .query({stock: ['v', 'nke']}) // 1, 2 (change)
      .end(function(err,res){
        let stockData = res.body['stockData']
        assert.isArray(stockData)
        // gotta plan for either order because arrays are unordered
        if(stockData[0]['stock'] === 'v'){
          assert.equal(stockData[0]['stock'], 'v')
          assert.equal(stockData[0]['likes'], 0)
          assert.equal(stockData[0]['rel_likes'], -1)
          assert.equal(stockData[1]['stock'], 'nke')
          assert.equal(stockData[1]['likes'], 1)
          assert.equal(stockData[1]['rel_likes'], 1)
        }else {
          assert.equal(stockData[1]['stock'], 'v')
          assert.equal(stockData[1]['likes'], 0)
          assert.equal(stockData[1]['rel_likes'], -1)
          assert.equal(stockData[0]['stock'], 'nke')
          assert.equal(stockData[0]['likes'], 1)
          assert.equal(stockData[0]['rel_likes'], 1)
        }
        done()
      });
    });

    test('2 stocks with likes', function(done) {
      chai.request(server)
      .get('/api/stock-prices')
      .query({stock: ['spot', 'znga'], like: true}) // 3 (change), 4 (change)
      .end(function(err,res){
        let stockData = res.body['stockData']
        assert.isArray(stockData)
        // gotta plan for either order because arrays are unordered
        if(stockData[0]['stock'] === 'spot'){ // 3
          assert.equal(stockData[0]['stock'], 'spot') // 3
          assert.equal(stockData[0]['likes'], 1)
          assert.equal(stockData[0]['rel_likes'], 0)
          assert.equal(stockData[1]['stock'], 'znga') // 4
          assert.equal(stockData[1]['likes'], 1)
          assert.equal(stockData[1]['rel_likes'], 0)
        }else {
          assert.equal(stockData[1]['stock'], 'spot') // 3
          assert.equal(stockData[1]['likes'], 1)
          assert.equal(stockData[1]['rel_likes'], 0)
          assert.equal(stockData[0]['stock'], 'znga') // 4
          assert.equal(stockData[0]['likes'], 1)
          assert.equal(stockData[0]['rel_likes'], 0)
        }
        done()
      });
    });
   })
});
